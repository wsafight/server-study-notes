---
title: DuckDB 源码阅读入门
description: 固定 DuckDB v1.5.5，从代理下载、Debug 构建、目录地图、SQLLogicTest 和 LLDB 断点开始阅读源码。
---

这一组源码文章面向第一次读数据库内核的人。目标不是从第一行读到最后一行，也不是背下所有 C++ 类，而是建立一条可以反复验证的路径：先运行一条 SQL，再找到它经过的对象，最后用断点和测试确认自己的理解。

本文固定在 DuckDB [`v1.5.5`](https://github.com/duckdb/duckdb/tree/v1.5.5)，对应提交 `d8cdaa33fda8df955cc76ef58a280f68f4cd43fa`。DuckDB 演进很快，阅读其他版本时，函数名、文件位置和优化规则顺序都可能不同。

## 先准备一份可验证的源码

本机代理监听 `127.0.0.1:7890` 时，可以只为当前命令设置代理，不修改 Git 的全局配置：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
git clone --branch v1.5.5 --depth 1 \
  https://github.com/duckdb/duckdb.git duckdb-src-v1.5.5

cd duckdb-src-v1.5.5
git rev-parse HEAD
git describe --tags --exact-match HEAD
```

最后两条命令应该分别输出固定的提交哈希和 `v1.5.5`。固定版本很重要：否则网页上的源码、自己的断点和文章中的调用链可能对应三个不同版本。

不要把 GitHub 网页当成唯一阅读环境。本地源码可以全文搜索、跳转定义、下断点和修改测试；GitHub 链接更适合在笔记中保存稳定证据。

## 构建 Debug 版本

官方根目录 [`README.md`](https://github.com/duckdb/duckdb/blob/v1.5.5/README.md)给出的开发依赖是 CMake、Python 3 和 C++ 编译器。第一次阅读直接构建 Debug 版本：

```bash
make debug
./build/debug/duckdb
```

Debug 构建没有 Release 版本那样激进的优化，函数不会轻易被内联掉，并且保留断言和调试符号，更适合单步调试。它运行较慢是正常现象，不要用 Debug 耗时判断 DuckDB 的真实性能。

修改代码后有三种常用验证范围：

```bash
# 构建 Debug 并运行默认测试集
make unit

# 直接运行一份 SQLLogicTest
build/debug/test/unittest test/sql/select/test_select.test

# Release 构建下运行完整测试集，耗时明显更长
make allunit
```

具体测试路径可能随版本变化，可以先用 `rg --files test/sql | rg '关键词'` 找到相近用例。源码阅读阶段优先运行最小测试文件；准备提交行为改动时再扩大范围。

## 先认识六个目录

DuckDB 是一个较大的 C++ 工程，但一条普通查询的主干集中在少数目录：

| 目录 | 可以先理解成 | 初次阅读问题 |
| --- | --- | --- |
| [`src/main`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/main) | API 与一次查询的总控 | `Connection::Query` 把 SQL 交给了谁？ |
| [`src/parser`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/parser) | 文本到语法对象 | SQL 语法正确，但表还不存在时能否通过？ |
| [`src/planner`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/planner) | 绑定与逻辑计划 | 表名、列名和函数最终在哪里解析？ |
| [`src/optimizer`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/optimizer) | 等价改写与代价选择 | Filter 为什么会移动，Join 顺序为什么会改变？ |
| [`src/execution`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/execution) 与 [`src/parallel`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/parallel) | 物理算子、Pipeline 与任务 | 一批数据如何从 Source 流到 Sink？ |
| [`src/storage`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/storage) 与 [`src/transaction`](https://github.com/duckdb/duckdb/tree/v1.5.5/src/transaction) | 表存储、缓存、版本与持久化 | 扫描如何看到正确版本，提交后如何恢复？ |

扩展不一定在 `src` 中。Parquet 的主要实现位于 [`extension/parquet`](https://github.com/duckdb/duckdb/tree/v1.5.5/extension/parquet)，而通用多文件扫描框架位于核心代码中。阅读扩展时要同时追扩展实现和核心接口。

## 用一条足够小的 SQL 当线索

在 Debug CLI 中执行：

```sql
CREATE TABLE orders AS
SELECT
    i AS order_id,
    i % 3 AS region_id,
    i * 10 AS amount
FROM range(10) AS generated(i);

SELECT region_id, sum(amount) AS revenue
FROM orders
WHERE amount >= 30
GROUP BY region_id
ORDER BY revenue DESC;
```

这条查询同时包含扫描、过滤、聚合和排序，但数据足够小。源码阅读时始终问四个问题：

1. 当前对象的输入是什么？
2. 它产出的对象是什么？
3. 谁拥有这个对象，生命周期到哪里结束？
4. 这一层改变的是语义、计划结构，还是一批真实数据？

例如 Parser 的输入是字符串，输出是 `SQLStatement`；Binder 的输入是未绑定语法对象，输出是带 Catalog、类型和列绑定的逻辑计划；`PipelineExecutor` 处理的已经是 `DataChunk`。只要分清这些边界，就不会把“解析 SQL”和“扫描数据”混成一个步骤。

## 推荐的源码阅读顺序

不要先打开最大的 `.cpp` 文件从头读。沿着这条主线逐层深入：

```text
Connection::Query
  -> ClientContext::Query / PendingQueryInternal
  -> Parser::ParseQuery
  -> Planner::CreatePlan
  -> Optimizer::Optimize
  -> PhysicalPlanGenerator::Plan
  -> Executor::Initialize
  -> PipelineExecutor::Execute
```

对应的系列文章是：

1. [一条 SQL 的完整生命周期](../source-query-lifecycle/)先建立全局地图。
2. [向量化执行与 Pipeline](../source-vectorized-execution/)观察真实数据如何流动。
3. [优化器与 Join 选择](../source-optimizer/)解释计划为什么改变。
4. [存储、MVCC、WAL 与 Checkpoint](../source-storage-transactions/)进入持久表和事务。
5. [Parquet 扫描实现](../source-parquet-scan/)把核心执行框架与扩展连接起来。

每次只追一条路径。遇到虚函数时，先从运行计划确定具体实现，再跳转到实现类；否则会在几十个候选算子之间迷路。

## 用 LLDB 证明调用链

macOS 可以在 DuckDB 根目录启动 LLDB：

```bash
lldb -- ./build/debug/duckdb
```

在 LLDB 中用正则断点减少 C++ 重载名称带来的麻烦：

```lldb
breakpoint set -r 'duckdb::Parser::ParseQuery'
breakpoint set -r 'duckdb::Planner::CreatePlan'
breakpoint set -r 'duckdb::Optimizer::Optimize'
breakpoint set -r 'duckdb::PhysicalPlanGenerator::Plan'
breakpoint set -r 'duckdb::Executor::Initialize'
run
```

程序进入 CLI 后，粘贴前面的 `SELECT`。断点停下时常用：

```lldb
bt
frame variable
next
step
continue
```

`bt` 回答“谁调用了这里”；`frame variable` 查看当前层的重要输入；`next` 越过不关心的辅助函数；`step` 进入当前调用。第一次不要在表达式模板或序列化模板里逐指令单步，那些细节很快会淹没主线。

调试 SQLLogicTest 时，仓库还提供了 [`scripts/lldb/sqllogictest_breakpoints/sql_break.py`](https://github.com/duckdb/duckdb/blob/v1.5.5/scripts/lldb/sqllogictest_breakpoints/sql_break.py)，可以在大型测试文件中定位当前 SQL，而不必手工计算执行到了哪一条。

## 同时使用计划、搜索和断点

三种工具回答不同问题：

| 工具 | 最适合回答 | 局限 |
| --- | --- | --- |
| `EXPLAIN` / `EXPLAIN ANALYZE` | 这条 SQL 选择了哪些逻辑或物理步骤 | 不展示所有内部对象和调用 |
| `rg` 与 IDE 跳转 | 某个类型在哪里定义、有哪些实现和调用者 | 静态候选不等于本次真正执行的分支 |
| LLDB | 本次运行经过了哪条路径、对象当时是什么值 | 单步范围过大时效率很低 |

一个有效循环通常是：先看计划确定物理算子，用 `rg` 找到构造和执行位置，在入口下断点，最后回到 SQLLogicTest 固化行为。源码注释可以帮助理解意图，但实际控制流和测试才是最终证据。

## 第一次阅读的完成标准

读完这一组文章后，不要求能独立实现数据库。更实际的标准是：

- 能从一条 SQL 找到 Parser、Binder、逻辑算子和物理算子。
- 能解释 `Vector`、`DataChunk`、Source、Operator、Sink 和 Pipeline 的关系。
- 能区分优化器的等价改写、Join 顺序选择和物理算法选择。
- 能说明 MVCC、Undo Buffer、WAL 和 Checkpoint 各自解决什么问题。
- 能从 `parquet_scan` 的注册位置追到 Row Group 分派和列读取循环。
- 修改一个小行为后，能找到对应 SQLLogicTest 并用 Debug 构建验证。

下一章从 API 入口开始，完整走过[一条 SQL 的生命周期](../source-query-lifecycle/)。

---
title: 源码解析：一条 SQL 的完整生命周期
description: 基于 DuckDB v1.5.5，追踪 SQL 从 Connection、Parser、Binder、Optimizer、物理计划到 PipelineExecutor 的完整调用链。
---

这一章只做一件事：追踪下面的 SQL 从字符串变成结果的全过程。

```sql
SELECT region_id, sum(amount) AS revenue
FROM orders
WHERE amount >= 30
GROUP BY region_id
ORDER BY revenue DESC;
```

先记住总图，不必立刻理解每个类：

```text
SQL 字符串
  -> SQLStatement                 Parser：语法是什么
  -> BoundStatement/LogicalPlan  Binder：对象是谁、类型是什么
  -> optimized LogicalPlan       Optimizer：如何等价改写
  -> PhysicalPlan                Physical planner：用什么算法
  -> MetaPipeline/Pipeline       Executor：如何拆成可调度任务
  -> DataChunk                   PipelineExecutor：真实数据如何流动
  -> QueryResult                 Result collector：如何交给调用方
```

本文固定基于 [`v1.5.5`](https://github.com/duckdb/duckdb/tree/v1.5.5)。先完成[源码阅读入门](../source-reading-guide/)中的 Debug 构建，可以一边阅读一边下断点。

## 第一站：Connection 不是执行引擎

C++ API 的 [`Connection::Query`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/main/connection.cpp#L101)只做了很薄的一层封装：设置结果必须物化，然后把查询交给连接持有的 `ClientContext`。

```cpp
unique_ptr<MaterializedQueryResult> Connection::Query(const string &query) {
    QueryParameters query_parameters;
    query_parameters.output_type = QueryResultOutputType::FORCE_MATERIALIZED;
    auto result = context->Query(query, query_parameters);
    // ...
}
```

这里有两个容易忽略的结论：

1. `Connection` 是面向调用方的入口，不负责逐个执行物理算子。
2. 这个 `Query` 重载强制返回 `MaterializedQueryResult`，所以结果最终会完整收集；流式接口会走不同的参数设置，但规划和执行主干仍然相近。

真正管理一次查询状态的是 `ClientContext`。它拥有当前事务、配置、Profiler、活动查询和 `Executor`，因此大部分顶层断点都能从这里串起来。

## 第二站：Parser 只判断语法

[`ClientContext::Query`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/main/client_context.cpp#L1042)先调用 `ParseStatements`。一个字符串可以包含多条 SQL，所以结果是 `vector<unique_ptr<SQLStatement>>`；多条语句随后逐条进入 pending query 和执行流程。

核心解析路径是：

```text
ClientContext::ParseStatementsInternal
  -> Parser::ParseQuery
  -> PostgresParser::Parse
  -> Transformer::TransformParseTree
  -> SQLStatement
```

在 [`Parser::ParseQuery`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parser/parser.cpp#L221)中，DuckDB 先处理解析器扩展和 Unicode 空格，再使用 `PostgresParser` 生成底层 Parse Tree，最后由 `Transformer` 转换成 DuckDB 自己的 `SQLStatement`、`QueryNode` 和 `ParsedExpression` 对象。

此时 `orders` 只是一个名字。下面语句语法正确，因此 Parser 可以通过；但 Binder 会因为 Catalog 里找不到表而报错：

```sql
SELECT amount FROM table_that_does_not_exist;
```

所以“Parser 成功”只说明文本符合语法，不表示列存在、函数重载可选，也不表示类型能计算。

## 第三站：Binder 把名字变成确定对象

普通查询由 [`ClientContext::PendingStatementInternal`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/main/client_context.cpp#L845)创建 Prepared Statement。真正把语法树变成逻辑计划的是 [`Planner::CreatePlan`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/planner/planner.cpp#L46)：

```cpp
binder->SetParameters(bound_parameters);
auto bound_statement = binder->Bind(statement);

this->names = bound_statement.names;
this->types = bound_statement.types;
this->plan = std::move(bound_statement.plan);
```

Binder 可以理解为“把所有含糊名字落实下来”：

- `orders` 对应哪个 Catalog、Schema 和表。
- `region_id` 属于哪个输入，内部 Column Binding 是什么。
- `sum(amount)` 选择哪个函数重载，参数和返回类型是什么。
- `amount >= 30` 是否需要类型转换。
- 聚合后哪些列仍可被引用。

输出不再是接近 SQL 文本的语法树，而是一棵 `LogicalOperator` 树。示例通常会包含 `LogicalGet`、`LogicalFilter`、`LogicalAggregate`、`LogicalProjection` 和 `LogicalOrder` 等节点；实际结构应以当前版本和查询的 `EXPLAIN` 为准。

Parser 与 Binder 的区别可以用错误类型观察：

```sql
-- Parser 错误：语法结构不成立
SELEC amount FROM orders;

-- Binder 错误：语法成立，但列无法绑定
SELECT missing_column FROM orders;

-- Conversion 或执行错误：对象和计划成立，值处理失败
SELECT CAST('not-a-number' AS INTEGER);
```

## 第四站：一次“准备”完成逻辑和物理规划

名称 `CreatePreparedStatementInternal` 容易让初学者以为它只保存 SQL。实际上，[该函数](https://github.com/duckdb/duckdb/blob/v1.5.5/src/main/client_context.cpp#L387)串起了 Planner、Optimizer 和 Physical Plan Generator：

```text
CreatePreparedStatementInternal
  -> Planner::CreatePlan
  -> Optimizer::Optimize             条件满足时
  -> PhysicalPlanGenerator::Plan
  -> PreparedStatementData::physical_plan
```

Prepared Statement 因此不只是字符串模板。`PreparedStatementData` 保存参数、输出列名和类型、语句属性，以及可执行的物理计划。若参数类型尚不能确定，或 Catalog 变化使计划失效，后续还可能重新 Bind，而不是永远复用最初那棵计划。

## 第五站：Optimizer 改写逻辑计划

[`Optimizer::Optimize`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/optimizer.cpp#L326)接收 Binder 产生的逻辑计划。它不会改变查询应有的答案，而会按固定顺序运行一系列 Pass，例如表达式简化、Filter Pushdown、Join Order、未使用列删除、Top-N 和统计传播。

对示例查询，最直观的机会有：

- 只保留 `region_id` 和 `amount`，不扫描无关列。
- 把 `amount >= 30` 保持在尽量靠近扫描的位置。
- 若写成 `ORDER BY revenue DESC LIMIT 3`，尝试把 `ORDER BY + LIMIT` 改成 Top-N。

这里处理的仍是逻辑算子。`LogicalComparisonJoin` 表示“按这些条件连接”，但不一定已经决定使用 Hash Join 还是 Merge Join。优化器的 Pass 顺序和 Join 选择会在[优化器与 Join 选择](../source-optimizer/)中展开。

## 第六站：Physical Plan 决定具体实现

[`PhysicalPlanGenerator::Plan`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/execution/physical_plan_generator.cpp#L23)先解析算子输出类型与列引用，再由 `CreatePlan` 按 `LogicalOperatorType` 分发到不同文件中的重载：

```cpp
switch (op.type) {
case LogicalOperatorType::LOGICAL_GET:
    return CreatePlan(op.Cast<LogicalGet>());
case LogicalOperatorType::LOGICAL_FILTER:
    return CreatePlan(op.Cast<LogicalFilter>());
case LogicalOperatorType::LOGICAL_AGGREGATE_AND_GROUP_BY:
    return CreatePlan(op.Cast<LogicalAggregate>());
// ...
}
```

逻辑节点表达“要做什么”，物理节点表达“由哪个实现来做”。例如：

| 逻辑问题 | 可能的物理实现 |
| --- | --- |
| 从表或 Table Function 读取 | `PhysicalTableScan` |
| 计算过滤表达式 | `PhysicalFilter` |
| 分组聚合 | `PhysicalHashAggregate` 等 |
| 等值连接 | `PhysicalHashJoin` |
| 排序后取少量结果 | `PhysicalTopN` |

“可能”两个字很重要。物理实现依赖查询形态、基数估算、设置和版本，不能只凭 SQL 文本猜测。

## 第七站：Result Collector 也是物理算子

在 [`ClientContext::PendingPreparedStatementInternal`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/main/client_context.cpp#L556)中，DuckDB 创建 `Executor`，再根据是否允许流式结果选择 Result Collector：

```text
physical plan
  -> PhysicalResultCollector
  -> Executor::Initialize
```

这解释了“结果送到哪里”为何是执行计划的一部分。普通 `Connection::Query` 强制物化，Collector 会收集完整结果；流式查询则允许调用方逐批获取。即使扫描和过滤始终向量化，最后把巨大结果一次性转成 DataFrame，仍可能产生很高的客户端内存占用。

## 第八站：物理树被切成 Pipeline

[`Executor::Initialize`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parallel/executor.cpp#L377)不直接递归执行整棵物理树。它先创建 `MetaPipeline`，调用物理算子的 `BuildPipelines`，收集所有 Pipeline，然后构造带依赖关系的 Event 并交给调度器。

[`PhysicalOperator::BuildPipelines`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/execution/physical_operator.cpp#L214)揭示了切分规则：

- 没有子节点且不是 Sink 的算子成为 Source。
- 普通一元算子加入当前 Pipeline。
- Sink 会结束当前数据流，并以自己的子节点创建新的子 Pipeline。

以 Hash Aggregate 为例，可以把它想成一道需要汇总状态的边界：

```text
Pipeline A: TableScan -> Filter -> HashAggregate(Sink)
                                      |
                                      | 聚合状态完成后
                                      v
Pipeline B: HashAggregate(Source) -> Order -> ResultCollector(Sink)
```

图中同一个聚合物理算子可以在一侧吸收输入、完成状态，在依赖满足后从另一侧产出聚合结果。Pipeline Breaker 并不等于整个查询退化为单线程，而是产生了先后依赖。

## 第九站：PipelineExecutor 推动真实数据

调度器最终让任务进入 [`Executor::ExecuteTask`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parallel/executor.cpp#L554)，具体 Pipeline 由 [`PipelineExecutor`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parallel/pipeline_executor.cpp)执行。

它在构造时为中间算子创建 `DataChunk` 与 Local State。主循环可以简化为：

```text
从 Source 获取一个 DataChunk
  -> 依次调用中间 Operator
  -> 把最终 DataChunk 交给 Sink
  -> 重复，直到 Source 耗尽
  -> Combine / Finalize
```

真实实现还必须处理更多状态：

- Source 暂时没有数据并返回 `BLOCKED`。
- 一个输入 Chunk 让算子产生多个输出 Chunk，即 `HAVE_MORE_OUTPUT`。
- Sink 因异步 I/O 或背压暂时阻塞。
- 当前任务用完本轮 Chunk Budget，把执行权交还调度器。
- Source 耗尽后，缓存型算子还需要刷新剩余输出。

因此 Pipeline 不是一个简单的 `while (source.next())`。它是可暂停、可恢复、支持局部与全局状态的执行状态机。下一章会逐行拆解这部分。

## 用断点观察交接物

在 Debug CLI 中对主干下断点：

```lldb
breakpoint set -r 'duckdb::Connection::Query'
breakpoint set -r 'duckdb::Parser::ParseQuery'
breakpoint set -r 'duckdb::Planner::CreatePlan'
breakpoint set -r 'duckdb::Optimizer::Optimize'
breakpoint set -r 'duckdb::PhysicalPlanGenerator::Plan'
breakpoint set -r 'duckdb::Executor::Initialize'
breakpoint set -r 'duckdb::PipelineExecutor::Execute'
```

第一次只记录每个断点的调用栈，不要全部单步。第二次挑一处观察输入输出：例如在 `Planner::CreatePlan` 返回前查看 `plan`，或者在 `PipelineExecutor::Execute` 中查看 `source_chunk.size()`。这样能把静态源码中的候选路径与本次查询真正走过的路径对应起来。

## 把整条链压缩成一句话

DuckDB 先由 Parser 把 SQL 文本变成语法对象，由 Binder 结合 Catalog 和类型系统生成逻辑计划，经过 Optimizer 等价改写，再由 Physical Plan Generator 选择具体算法；Executor 把物理树按 Source、Operator 和 Sink 切成带依赖的 Pipeline，任务最终通过 `DataChunk` 分批推动数据，并由 Result Collector 交付结果。

继续阅读[向量化执行与 Pipeline](../source-vectorized-execution/)，把最后一句中的 `Vector`、`DataChunk` 和执行状态机真正拆开。

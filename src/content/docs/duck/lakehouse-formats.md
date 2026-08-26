---
title: DuckDB 与 Lakehouse 表格式
description: 区分 Parquet 文件集与 Iceberg、Delta、DuckLake 表，理解快照、Catalog、Schema 演进和并发写入边界。
---

DuckDB 可以直接扫描 Parquet，也可以通过扩展访问 Lakehouse 表格式。两者都可能读取相同的数据文件，但元数据、一致性、Schema 演进和并发协议完全不同。选择前先确定需要的是文件查询，还是一个可持续维护的逻辑表。

## 文件集不等于表

下面的查询只会在执行时解析匹配的文件：

```sql
SELECT *
FROM read_parquet(
    's3://analytics/orders/*/*.parquet',
    hive_partitioning = true
);
```

路径本身没有声明哪些文件组成同一快照，也不能原子表达删除、替换、Schema 或分区规则变化。查询列举期间如果发布者继续修改前缀，读者可能看到混合版本。

Iceberg、Delta 等表格式会使用元数据文件或事务日志声明某个快照包含哪些数据文件、删除信息、Schema 和分区信息。查询引擎先解析表元数据，再读取该快照引用的数据文件。表格式解决的是数据集管理协议，Parquet 解决的是列式文件表示。

## 选择访问方式

| 方式 | 适合场景 | 需要额外承担的责任 |
| --- | --- | --- |
| Parquet 路径或 Manifest | 不可变批次、单一发布者、简单交换 | 自行实现版本指针、Schema 契约和清理 |
| Iceberg | 多引擎共享、快照、Schema 与分区演进 | Catalog、元数据维护、Compaction 和兼容矩阵 |
| Delta | 已有 Delta 生态和事务日志 | 日志与检查点维护、特性协议兼容 |
| DuckLake | 以 SQL Catalog 管理 Parquet 的 DuckDB 工作流 | Catalog 数据库可用性、扩展版本和并发验证 |

不要只因为数据位于对象存储就引入表格式。单一批处理发布不可变版本目录时，[Manifest 发布流程](./data-pipelines/)可能更简单。多个引擎并发读写、需要行级变更或长期 Schema 演进时，表格式的元数据协议才开始产生明显价值。

## 读取 Iceberg 与 Delta

DuckDB 通过扩展提供表格式支持。最小的文件目录读取通常形如：

```sql
INSTALL iceberg;
LOAD iceberg;

SELECT count(*)
FROM iceberg_scan('s3://analytics/warehouse/orders');
```

```sql
INSTALL delta;
LOAD delta;

SELECT count(*)
FROM delta_scan('s3://analytics/delta/orders');
```

扩展安装、函数参数、Catalog 接入、Time Travel、删除文件以及写入能力都可能随 DuckDB 和扩展版本变化。生产代码应针对锁定版本保存一组兼容性测试，不要把上述最小形态当作所有部署的固定接口。

优先通过 Catalog 按表名访问，而不是让每个查询猜测元数据目录。Catalog 还承担命名、当前元数据指针、权限和并发提交协调；它的可用性与备份会成为查询链路的一部分。

## 理解 DuckLake

DuckLake 使用 SQL 数据库保存 Catalog 元数据，并将数据存为 Parquet。一个本地实验的基本形态如下：

```sql
INSTALL ducklake;
LOAD ducklake;

ATTACH 'ducklake:metadata.ducklake' AS lake;
USE lake;

CREATE TABLE orders AS
SELECT *
FROM read_parquet('incoming/orders/*.parquet');
```

生产环境通常会把元数据 Catalog 与数据文件放在不同存储中。Catalog 的事务负责协调表元数据，但这不表示对象存储与 Catalog 自动成为一个跨系统 ACID 事务。必须测试提交在上传失败、Catalog 失败、进程中止和重试时的恢复行为。

DuckLake 的 Catalog 后端、并发写入、数据路径、加密和维护命令仍应以锁定版本的官方文档为准。升级时同时测试 DuckDB 核心、`ducklake` 扩展、Catalog 数据库和既有数据文件，而不是只升级客户端包。

## 固定快照与重现结果

生产任务不要默认读取“运行时最新版本”。开始时解析并记录快照 ID、版本号或元数据位置，整个任务重复使用同一引用。任务 Manifest 至少包含：

- 表名、Catalog 地址的非敏感标识和表格式。
- 快照 ID、版本号或提交时间。
- DuckDB 核心与扩展版本。
- 查询版本、读取 Schema 和业务时间区间。
- 输出版本及质量检查结果。

Time Travel 能读取旧快照，但旧数据文件仍可能被清理。审计保留期必须与快照过期、垃圾回收和对象生命周期策略一致；记录一个已经无法解析的快照 ID 不能保证可重现。

## Schema 与分区演进

表格式可以记录列增加、重命名、删除和类型变化，但“元数据允许”不等于所有查询都兼容。使用 `SELECT *` 的下游会在新增列后改变输出；按列位置写入会在重排后出错；收窄类型可能让历史数据无法表示。

发布 Schema 变更前应验证：

- 新旧快照在 DuckDB 中解析为预期类型。
- 关键列的字段标识与名称映射符合表格式规则。
- 旧查询显式列清单仍能执行，新查询能处理历史空值。
- 分区演进后，新旧布局都能被裁剪且不会漏读。
- 其他写入和读取引擎支持目标协议版本与特性。

分区是表的逻辑规则，不应要求业务查询手工拼接物理目录。使用执行计划和对象存储日志确认过滤转成分区与文件裁剪，不能只看到 `WHERE` 就假设已经减少读取。

## 写入与并发边界

读取支持通常早于完整写入支持。确认目标扩展能否处理追加、覆盖、更新、删除、合并、Schema 变更和并发提交，并检查其他引擎产生的删除向量或高级特性。

所有写入任务都应具有唯一运行 ID和幂等键。发生提交冲突时重新读取当前快照并重新计算变更，不要盲目重复最后一次提交。对象已经上传但 Catalog 提交失败时可能留下孤儿文件，只能由理解保留窗口的维护任务清理。

不要同时绕过表协议直接修改数据目录。手工移动、覆盖或删除被快照引用的 Parquet 文件会让元数据保持有效外观，但查询在执行中失败或返回不完整数据。

## 安全与可观测性

Lakehouse 查询同时涉及扩展代码、Catalog 凭据和对象存储凭据。两类凭据分别使用最小权限和短期身份，日志中不记录连接串、签名 URL 或 Secret。生产环境预装扩展并固定来源，做法参见[扩展与安全边界](./extensions-security/)。

监控 Catalog 请求耗时、元数据文件数量、对象列举与 Range Request、扫描字节、删除文件应用成本和快照年龄。性能变慢时先区分元数据规划、远程读取和本地执行，不要直接通过增加线程掩盖 Catalog 或小文件问题。

## 上线检查

使用目标版本和真实对象存储完成以下故障测试：固定快照读取、并发提交冲突、上传中断、Catalog 暂时不可用、凭据过期、Schema 演进、旧快照过期和孤儿文件清理。最后用另一个生产写入引擎生成样本，证明 DuckDB 能正确读取实际启用的协议特性。

## 继续阅读

简单不可变数据集先参考[可重跑数据流水线](./data-pipelines/)；远程文件性能问题参见[对象存储查询](./object-storage/)。

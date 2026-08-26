---
title: DuckDB 查询性能与资源控制
description: 使用执行计划、结构化 Profiling、资源边界、查询取消和结果等价检查优化 DuckDB 分析查询。
---

DuckDB 对分析查询使用向量化执行，并会在合适时并行扫描与计算。优化仍然从减少读取、传输和中间结果开始，而不是先提高线程或内存上限。

## 查看执行计划

```sql
EXPLAIN ANALYZE
SELECT customer_id, sum(amount)
FROM read_parquet('lake/orders/*.parquet')
WHERE created_at >= DATE '2026-08-01'
GROUP BY customer_id;
```

`EXPLAIN` 查看计划，`EXPLAIN ANALYZE` 会实际执行并收集运行信息。重点关注文件扫描数量、过滤是否下推、读取列、估算与实际行数，以及连接、排序和聚合产生的中间数据。

分析命令也会消耗真实 CPU、内存、网络和临时空间，不能对未知大查询无上限运行。

## 保存结构化 Profiling

稳定任务需要把 Profiling 输出保存为机器可解析的制品，而不是只截取终端中的计划树。锁定版本后，可以在隔离环境对单条查询启用 JSON Profiling：

```sql
SET enable_profiling = 'json';
SET profiling_output = 'profiles/orders-2026-08.json';

SELECT customer_id, sum(amount) AS total_amount
FROM read_parquet('lake/orders/*.parquet')
WHERE created_at >= DATE '2026-08-01'
  AND created_at <  DATE '2026-09-01'
GROUP BY customer_id;

PRAGMA disable_profiling;
```

Profiling 配置名称、输出字段和关闭方式会随版本演进，应先在目标版本验证。输出目录必须预先存在、空间有界且只有任务用户可写。每次运行使用唯一文件名，避免并发任务覆盖同一结果。

重点比较查询总延迟、CPU 时间、峰值 Buffer 内存、临时目录写入、输入与输出行数，以及每个算子的耗时和 Cardinality。远程查询还要联合对象存储访问日志观察请求数与读取字节，因为执行器 Profile 不一定包含完整网络成本。

估算行数与实际行数差异很大时，连接顺序和 Hash 表大小可能不理想；某个算子耗时高也不一定是根因，它可能只是消费上游放大的数据。沿计划从扫描开始检查列、过滤、行数和连接粒度。

Profile 可能包含完整 SQL、路径和表达式。文件进入日志或构建制品前应脱敏并设置保留期，不能把签名 URL、连接串或业务常量直接上传到共享系统。

## 减少扫描

- 只选择需要的列，避免习惯性 `SELECT *`。
- 让时间、租户等常用过滤条件与文件分区和 Parquet 统计匹配。
- 避免对过滤列包裹无法下推的转换；可以在数据生产阶段保存规范类型。
- 复用频繁访问的清洗结果，避免每个查询重新解析 CSV 或 JSON。
- 处理大量小文件时先评估合并，减少远程请求和元数据开销。

## 控制连接与聚合

先过滤、投影和预聚合大表，再执行宽连接。检查连接键类型一致，避免字符串与数值之间重复转换。多对多连接可能让结果行数爆炸，应先验证键是否符合预期唯一性。

窗口函数和精确 `COUNT(DISTINCT ...)` 很有用，但需要维护较大的排序或哈希状态。只在业务需要的分区范围执行，并评估近似算法是否满足误差要求。

## 设置资源边界

可以为进程设置线程、内存和临时目录，具体配置名称与行为以目标版本为准：

```sql
SET threads = 4;
SET memory_limit = '8GB';
SET temp_directory = '/data/duckdb-tmp';
```

内存限制不是操作系统 RSS 的严格上限，客户端对象、文件缓存和部分操作仍可能占用额外内存。临时目录应有足够空间、正确权限和独立监控，任务结束后也要处理异常遗留文件。

提高并行度可能与同机应用竞争 CPU 和内存带宽。多任务并行时，单查询使用所有核心通常会降低整体吞吐。

## 持久表与统计信息

反复使用的数据可以导入 DuckDB 持久表，减少文件发现和解析，并使用目标版本支持的统计维护命令帮助优化器估算。是否物化应比较数据更新频率、查询次数、额外存储和刷新成本。

## 截止时间与查询取消

资源限制不能替代时间限制。应用应为每个任务设置总截止时间，并在超时或调用方取消后使用客户端提供的 Interrupt 或 Cancellation API 中止查询。取消通常需要由另一个线程或任务发出，连接对象的并发要求以目标语言绑定为准。

取消后不要立刻把同一连接放回池中。先确认调用返回、事务已回滚或显式回滚，并执行一个轻量查询证明连接仍可用；无法确认状态时直接废弃该连接。外部写出可能已经产生部分文件，仍需由发布协议隔离和清理。

在上线前分别取消纯读取、内存溢写、远程扫描和 `COPY` 写出，记录取消延迟、临时文件回收、远程请求停止时间和连接后续状态。宿主进程强制终止只能作为最后边界，不能代替正常取消路径。

## 建立基线

对代表性数据记录总耗时、CPU 时间、峰值内存、临时磁盘和远程读取字节。固定 DuckDB 与扩展版本、输入 Manifest、Schema、线程、内存、临时目录和对象存储区域，每次只改变一个因素。

先将基线和候选查询结果物化到临时表，再做双向差集，证明优化没有改变重复行、`NULL` 或数值：

```sql
CREATE TEMP TABLE baseline_result AS
SELECT customer_id, sum(amount) AS total_amount
FROM orders
GROUP BY customer_id;

CREATE TEMP TABLE candidate_result AS
SELECT customer_id, sum(amount) AS total_amount
FROM orders
GROUP BY ALL;

(SELECT * FROM baseline_result EXCEPT ALL SELECT * FROM candidate_result)
UNION ALL
(SELECT * FROM candidate_result EXCEPT ALL SELECT * FROM baseline_result);
```

差集应返回零行，同时比较 `DESCRIBE` 结果，避免数值相等但输出类型已经变化。浮点结果如果允许算法顺序带来的舍入差异，应使用事先定义的误差准则，不能临时放宽到“看起来接近”。

预热后运行多次并报告中位数和尾部值，不只保留最快一次。本地缓存会让后续查询明显更快，需要分开记录冷读和热读；对象存储还可能有客户端、代理和服务端缓存。没有受控清缓存方法时，明确记录限制，不要把测试机重启当成生产结论。

基准任务应运行在隔离数据和受控资源中，设置最大持续时间与输出大小。避免用开发机少量数据推断生产对象存储上的表现，也不要在生产主库或共享 Bucket 上通过无界扫描验证优化。

## 继续阅读

使用[可复现实验](./reproducible-lab/)练习采集 Profile 和证明结果等价；扫描成本主要来自文件布局时参见[Parquet 布局](./parquet-layout/)。

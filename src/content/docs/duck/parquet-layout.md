---
title: 为 DuckDB 设计 Parquet 布局
description: 通过列类型、Row Group、压缩、分区和文件大小改善 DuckDB 的 Parquet 扫描与数据维护。
---

Parquet 性能不仅由压缩格式决定。列统计、Row Group、文件数量、排序相关性和分区目录共同决定 DuckDB 能否跳过数据以及需要发起多少文件请求。

## 类型先于压缩

在写出 Parquet 前固定列名、逻辑类型、时区、精度和可空性。把时间、金额或标识全部写成字符串会扩大文件，并把转换成本和错误推迟到每次查询。

多批数据必须使用兼容 Schema。不要依赖 CSV 或 JSON 的偶然推断结果决定长期 Parquet Schema；先显式转换，再检查写出后的 `DESCRIBE` 和样本值。

## Row Group 与裁剪

Parquet 为每个 Row Group 保存列级统计，DuckDB 可以根据过滤条件跳过不可能匹配的组。按常见过滤列排序或聚簇，通常能让 Min/Max 范围更集中。

Row Group 太小会增加元数据和调度开销，太大则降低跳过粒度并增加处理一个组所需的内存。不存在适合所有工作负载的固定行数，应使用真实列宽、选择率和对象存储延迟测试。

用执行计划和 Profiling 观察过滤是否下推、读取了多少文件与 Row Group，而不是只根据 SQL 中出现 `WHERE` 就假设已经裁剪。

## 控制文件数量

大量小文件会放大目录列举、网络往返、文件打开和元数据解析成本。单个超大文件又会限制并行调度和生命周期替换。

目标文件大小应根据：

- 单次查询通常扫描的数据范围。
- 并发线程数和单机内存。
- 本地磁盘或对象存储吞吐与请求延迟。
- 发布、重算和删除的最小业务单位。

定期 Compaction 时要保留输入到输出的 Manifest，确保失败重跑不会重复发布。

## Hive 风格分区

```text
events/
  event_date=2026-08-25/part-000.parquet
  event_date=2026-08-26/part-000.parquet
```

分区目录适合低到中等基数、经常过滤且具有生命周期意义的字段。不要按用户 ID 等高基数字段创建海量目录。

```sql
SELECT count(*)
FROM read_parquet(
    'events/*/*.parquet',
    hive_partitioning = true
)
WHERE event_date = DATE '2026-08-26';
```

确认目录值被解析成预期类型。文件内部同名列与分区列冲突时应先规范数据生产契约。

## 写出分区数据

```sql
COPY (
    SELECT
        *,
        year(occurred_at) AS event_year,
        month(occurred_at) AS event_month
    FROM staged_events
)
TO 'publish/events'
(FORMAT parquet, PARTITION_BY (event_year, event_month), COMPRESSION zstd);
```

分区写出选项、已有目录处理和文件命名能力会随版本变化。不要直接覆盖下游正在读取的目录；先写入新的版本目录，完成行数、校验和与 Schema 验证后，再原子更新 Manifest 或指针。

## 选择压缩编码

Snappy 解压开销低，Zstandard 通常压缩率更好；实际选择取决于 CPU、存储费用和网络吞吐。字典编码对重复字符串有效，但高基数长文本可能收益有限。

使用同一数据集比较文件大小、冷缓存与热缓存耗时、CPU、峰值内存和远程请求数。只比较单次本地读取时间无法代表对象存储上的生产表现。

## 继续阅读

远程访问的请求与凭据边界参见[对象存储查询](./object-storage/)；使用固定生成数据验证布局效果参见[可复现实验](./reproducible-lab/)。

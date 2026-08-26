---
title: DuckDB 可复现实验
description: 使用固定生成数据比较 CSV、Parquet、分区裁剪、连接放大、内存溢写与查询优化，并验证结果等价。
---

这组实验不依赖业务数据或网络服务，适合在本地验证前面章节的结论。目标不是得到一组通用性能数字，而是建立可重复的方法：固定输入与配置，只改变一个因素，同时验证结果没有变化。

## 准备隔离目录

使用一个专用空目录运行 DuckDB CLI：

```bash
mkdir -p duckdb-lab/data duckdb-lab/profiles duckdb-lab/tmp
cd duckdb-lab
duckdb lab.duckdb
```

后续命令会在当前 `duckdb-lab` 目录创建数据库、CSV、Parquet、Profile 和临时文件。不要在包含业务文件的目录直接执行；实验结束时可以整体归档该目录，或在确认路径后删除整个实验目录。

先记录环境并固定资源：

```sql
SELECT version();
SELECT current_setting('TimeZone') AS timezone;

SET TimeZone = 'UTC';
SET threads = 4;
SET memory_limit = '1GB';
SET temp_directory = 'tmp';
```

将 DuckDB 版本、操作系统、CPU、内存、磁盘类型和这些配置与实验结果放在一起。不同机器之间的绝对耗时不能直接比较。

## 生成固定数据

下面生成约一百万行订单。表达式完全由行号决定，相同版本与脚本可以得到相同分布：

```sql
CREATE OR REPLACE TABLE orders AS
SELECT
    i AS order_id,
    1 + (i % 100000) AS customer_id,
    DATE '2025-01-01' + CAST(i % 365 AS INTEGER) AS order_date,
    ['north', 'south', 'east', 'west'][1 + (i % 4)] AS region,
    CASE
        WHEN i % 20 = 0 THEN 'refunded'
        WHEN i % 10 = 0 THEN 'pending'
        ELSE 'paid'
    END AS status,
    CAST(((i * 7919) % 100000) / 100.0 AS DECIMAL(12, 2)) AS amount,
    repeat('x', 64) AS note
FROM range(1, 1000001) AS generated(i);

SELECT
    count(*) AS row_count,
    count(DISTINCT order_id) AS distinct_order_ids,
    min(order_date) AS min_date,
    max(order_date) AS max_date,
    sum(amount) AS total_amount
FROM orders;
```

把最后一条查询的结果保存为基线。生成规模超出本机预算时，可以降低 `range` 上限，但同一轮比较必须使用同一张表。

## 比较 CSV 与 Parquet

从同一个逻辑表写出两种格式：

```sql
COPY orders TO 'data/orders.csv' (HEADER, DELIMITER ',');
COPY orders TO 'data/orders.parquet'
    (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000);
```

先比较文件大小，再分别运行相同聚合：

```sql
SELECT region, sum(amount) AS paid_amount
FROM read_csv(
    'data/orders.csv',
    columns = {
        'order_id': 'BIGINT',
        'customer_id': 'BIGINT',
        'order_date': 'DATE',
        'region': 'VARCHAR',
        'status': 'VARCHAR',
        'amount': 'DECIMAL(12,2)',
        'note': 'VARCHAR'
    },
    header = true
)
WHERE status = 'paid'
  AND order_date >= DATE '2025-08-01'
  AND order_date <  DATE '2025-09-01'
GROUP BY region
ORDER BY region;

SELECT region, sum(amount) AS paid_amount
FROM read_parquet('data/orders.parquet')
WHERE status = 'paid'
  AND order_date >= DATE '2025-08-01'
  AND order_date <  DATE '2025-09-01'
GROUP BY region
ORDER BY region;
```

CSV 读取必须解析行与字段；Parquet 可以只读取查询列，并可能利用 Row Group 统计跳过数据。单次墙钟会受文件缓存影响，每条查询交替运行多次，分开报告第一次和预热后的中位数。

## 验证列裁剪与排序相关性

先比较只读取两个窄列与包含 `note` 的查询。再按常见过滤列排序写出另一个 Parquet：

```sql
COPY (
    SELECT *
    FROM orders
    ORDER BY order_date, order_id
) TO 'data/orders-sorted.parquet'
  (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000);
```

对未排序和已排序文件运行同一小时间区间查询，并用 `EXPLAIN ANALYZE` 或 JSON Profiling 检查扫描行数与耗时：

```sql
EXPLAIN ANALYZE
SELECT order_id, amount
FROM read_parquet('data/orders-sorted.parquet')
WHERE order_date >= DATE '2025-08-01'
  AND order_date <  DATE '2025-08-08';
```

排序本身需要时间、内存和临时磁盘。实验结果应同时记录写出成本与后续读取收益，不能只保留最快的读取结果。

## 验证分区裁剪与小文件成本

写出按月分区的数据集：

```sql
COPY (
    SELECT
        *,
        year(order_date) AS order_year,
        month(order_date) AS order_month
    FROM orders
) TO 'data/orders-partitioned'
  (FORMAT parquet, PARTITION_BY (order_year, order_month), COMPRESSION zstd);
```

限定一个月查询，并检查计划是否只访问目标分区：

```sql
EXPLAIN ANALYZE
SELECT region, sum(amount)
FROM read_parquet(
    'data/orders-partitioned/*/*/*.parquet',
    hive_partitioning = true
)
WHERE order_year = 2025
  AND order_month = 8
GROUP BY region;
```

随后把数据拆成更多、更小的文件再比较。总数据不变时，记录文件数、总字节、规划时间和查询时间。文件越多不一定扫描越快；本地文件打开与远程对象请求都会产生固定成本。

## 观察结构化 Profile

只对目标查询启用输出：

```sql
SET enable_profiling = 'json';
SET profiling_output = 'profiles/august-orders.json';

SELECT region, sum(amount)
FROM read_parquet('data/orders-sorted.parquet')
WHERE order_date >= DATE '2025-08-01'
  AND order_date <  DATE '2025-09-01'
GROUP BY region;

PRAGMA disable_profiling;
```

保存总耗时、CPU 时间、峰值内存、临时目录写入、扫描行数和各算子 Cardinality。Profile 字段随版本变化，因此原始 JSON 与 DuckDB 版本要一起保存。

## 制造并识别连接放大

创建每个客户两行的标签表，然后执行看似正常的连接：

```sql
CREATE OR REPLACE TABLE customer_tags AS
SELECT
    customer_id,
    tag
FROM range(1, 100001) AS customers(customer_id)
CROSS JOIN (VALUES ('new'), ('active')) AS tags(tag);

SELECT count(*) AS order_rows FROM orders;

SELECT count(*) AS joined_rows
FROM orders
JOIN customer_tags USING (customer_id);
```

连接后行数应约为原来的两倍。若目标是一位客户一个维度值，应该先定义确定性规则，把维表降到一行后再连接：

```sql
WITH one_tag_per_customer AS (
    SELECT customer_id, min(tag) AS tag
    FROM customer_tags
    GROUP BY customer_id
)
SELECT count(*) AS joined_rows
FROM orders
JOIN one_tag_per_customer USING (customer_id);
```

真实任务应在连接前检查键的重复分布，连接后检查行数和金额守恒，而不是只抽样查看几行。

## 验证优化结果等价

为两个候选实现分别物化结果，使用 `EXCEPT ALL` 做双向差集：

```sql
CREATE OR REPLACE TEMP TABLE baseline_result AS
SELECT region, sum(amount) AS total_amount
FROM orders
WHERE status = 'paid'
GROUP BY region;

CREATE OR REPLACE TEMP TABLE candidate_result AS
SELECT region, sum(amount) AS total_amount
FROM read_parquet('data/orders.parquet')
WHERE status = 'paid'
GROUP BY ALL;

(SELECT * FROM baseline_result EXCEPT ALL SELECT * FROM candidate_result)
UNION ALL
(SELECT * FROM candidate_result EXCEPT ALL SELECT * FROM baseline_result);
```

结果必须为空，并比较两边 `DESCRIBE`。`EXCEPT` 不保留重复行信息，所以这里必须使用 `EXCEPT ALL`。

## 观察内存与 Spill

在确认实验目录有足够空间后，逐步降低内存限制并执行需要排序或聚合状态的查询：

```sql
SET memory_limit = '128MB';
SET temp_directory = 'tmp';

COPY (
    SELECT *
    FROM orders
    ORDER BY note, amount, order_id
) TO 'data/orders-resorted.parquet' (FORMAT parquet);
```

监控 `tmp` 目录、墙钟时间和进程 RSS。内存限制不是严格的 RSS 上限，数据规模和版本不同也可能让查询直接失败。实验设置总持续时间与目录容量；空间达到阈值时取消查询，不要等待磁盘被写满。

查询结束后确认临时文件按预期回收，再恢复正常配置：

```sql
SET memory_limit = '1GB';
```

## 记录实验结论

每轮使用一行记录版本、输入行数、文件布局、查询 ID、缓存状态、线程、内存、耗时、峰值内存、Spill、读取字节和结果校验。只有结果等价且在多次运行中稳定改善，才能称为优化。

本地实验用于理解机制，不能直接预测对象存储延迟、多租户资源争用或生产数据倾斜。把有效假设带到一份脱敏且分布真实的数据副本，再执行有时间和资源上限的验证。

## 继续阅读

指标与基准方法参见[查询性能与资源控制](./query-optimization/)；将实验文件迁移到远程环境前阅读[对象存储查询](./object-storage/)。

---
title: DuckDB 入门
description: 介绍 DuckDB 的嵌入式 OLAP 定位、文件查询方式、适用场景和并发边界。
---

DuckDB 是一个嵌入进程的分析型数据库（OLAP）。它类似 SQLite 的部署方式，不需要单独启动数据库服务，但使用列式执行和向量化处理，重点优化扫描、聚合、连接和窗口计算。

## 核心特点

- **嵌入式：** 可以通过 CLI，或 Python、R、Java、Node.js 等语言库直接运行。
- **文件查询：** 能直接读取 CSV、JSON、Parquet 等格式，无需先导入传统数据库。
- **向量化执行：** 批量处理数据，适合分析型计算。
- **持久化可选：** 可以使用内存数据库，也可以把表和元数据保存到单个数据库文件。
- **SQL 能力：** 支持事务、复杂连接、窗口函数、CTE 和丰富的分析函数。

## 直接分析文件

下面的查询会读取一组 Parquet 文件并按地区汇总订单：

```sql
SELECT
  region,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount
FROM read_parquet('data/orders/*.parquet')
WHERE created_at >= DATE '2026-08-01'
GROUP BY region
ORDER BY total_amount DESC;
```

查询结果也可以直接导出：

```sql
COPY (
  SELECT *
  FROM read_csv_auto('data/events.csv')
  WHERE event_type = 'purchase'
) TO 'output/purchases.parquet' (FORMAT PARQUET);
```

## 适用场景

- 本地或 Notebook 中的交互式数据分析。
- 在应用中嵌入报表、数据转换和轻量分析功能。
- 对 Parquet 数据湖执行临时查询。
- ETL/ELT 流程中的格式转换、清洗和聚合。
- 单机范围内替代部分 Pandas 处理，利用 SQL 和磁盘溢写处理更大数据集。

## 使用边界

DuckDB 是进程内数据库，不是面向大量远程客户端的数据库服务。它不适合高并发、小事务、持续更新的典型 OLTP 工作负载。

- 同一进程可以并行读取和执行查询，但多进程并发写入同一数据库文件受到限制。
- 查询仍受 CPU、内存和临时磁盘约束，大数据集需要规划溢写目录和磁盘空间。
- 远程对象存储的性能取决于网络、文件布局和过滤下推效果。
- 对长期运行的共享服务，应评估 PostgreSQL、ClickHouse 等客户端/服务端系统。

选择 DuckDB 的关键不是“数据是否很大”，而是工作负载是否适合单机、嵌入式、批量分析。

## 继续阅读

先用[分析 SQL 模式](./analytical-sql/)熟悉常见查询，再通过[类型、NULL 与时间语义](./types-and-time/)建立结果正确性的边界。

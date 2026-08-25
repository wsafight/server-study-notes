---
title: DuckDB 学习路径
description: 从分析 SQL、Parquet 和对象存储到并发边界、PostgreSQL 集成与可重跑流水线系统学习 DuckDB。
---

DuckDB 适合在单机或单进程内执行扫描、连接、聚合和数据转换。它可以直接查询 Parquet、CSV、JSON 和对象存储，也能嵌入应用、分析 PostgreSQL 快照并将结果发布为版本化数据集。

## 1. 定位与分析 SQL

1. [DuckDB 入门](./intro/)：理解嵌入式 OLAP 的定位与并发边界。
2. [分析 SQL 模式](./analytical-sql/)：使用窗口函数、`QUALIFY`、`PIVOT` 和 `ASOF JOIN` 表达分析任务。

## 2. 文件与对象存储

1. [查询与转换数据文件](./data-files/)：控制 Schema 推断、分区裁剪和输出格式。
2. [设计 Parquet 布局](./parquet-layout/)：从 Row Group、文件大小、排序和压缩改善扫描。
3. [查询对象存储](./object-storage/)：管理远程请求、凭据、一致性和版本化发布。

## 3. 性能与并发

1. [查询性能与资源控制](./query-optimization/)：通过执行计划、列裁剪、文件布局和内存限制减少工作量。
2. [并发与事务边界](./concurrency-transactions/)：理解单进程并发、乐观冲突、多进程写入和恢复行为。

## 4. 嵌入与数据流水线

1. [在应用中嵌入 DuckDB](./embedding/)：管理连接、线程、数据库文件和发布生命周期。
2. [扩展与安全边界](./extensions-security/)：固定扩展来源并隔离文件、网络和 Secret 能力。
3. [分析 PostgreSQL 数据](./postgres-integration/)：在直接查询、受控快照和 Parquet 交换之间选择。
4. [构建可重跑数据流水线](./data-pipelines/)：通过 Manifest、质量闸门和幂等发布处理批任务。

## 适用与不适用

适合：本地分析、Notebook、批量数据转换、嵌入式报表、Parquet 数据湖临时查询、事务数据离线分析，以及单机范围内的 ETL。

不适合：大量远程客户端、高并发小事务、依赖多节点在线扩展的服务，或多个独立进程持续写入同一数据库文件的场景。

## 实践建议

使用一组具有真实列数、分区和数据分布的文件做实验。分别记录远程请求、读取字节、总耗时、峰值内存和临时磁盘，比较 CSV 与 Parquet、全列与列裁剪、单个大文件与大量小文件的差异。

再模拟坏行、Schema 演进、磁盘满、对象存储失败、进程中止和重复运行。DuckDB 迭代较快，扩展、配置项和客户端 API 应以项目锁定版本的文档为准，将版本、扩展来源、输入 Manifest 和文件格式参数一同纳入可复现环境。

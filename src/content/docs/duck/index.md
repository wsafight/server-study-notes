---
title: DuckDB 学习路径
description: 从分析 SQL、执行引擎和 Parquet 到 Lakehouse、性能分析、文件运维、源码解析与可重跑流水线系统学习 DuckDB。
---

DuckDB 适合在单机或单进程内执行扫描、连接、聚合和数据转换。它可以直接查询 Parquet、CSV、JSON 和对象存储，也能嵌入应用、读取 Lakehouse 快照、分析 PostgreSQL 数据并发布版本化数据集。

以下顺序从第一次本地分析开始，逐步进入查询正确性、存储布局、性能诊断和生产运行。没有使用经验时，先完成入门篇里的建表、汇总和 Parquet 查询，再选择后续主题；已有任务可以从下面的场景路线进入。

## 1. 基础与查询正确性

1. [DuckDB 入门](./intro/)：安装 CLI，创建第一张表，完成汇总、Parquet 查询和 Python 调用。
2. [分析 SQL 模式](./analytical-sql/)：使用窗口函数、`QUALIFY`、`PIVOT` 和 `ASOF JOIN` 表达分析任务。
3. [类型、NULL 与时间语义](./types-and-time/)：控制转换、金额精度、三值逻辑、时区和稳定排序。

## 2. 文件、对象存储与 Lakehouse

1. [查询与转换数据文件](./data-files/)：安全处理 CSV、JSON、嵌套结构和 Parquet。
2. [设计 Parquet 布局](./parquet-layout/)：从 Row Group、文件大小、排序和压缩改善扫描。
3. [查询对象存储](./object-storage/)：管理远程请求、凭据、一致性和版本化发布。
4. [Lakehouse 表格式](./lakehouse-formats/)：区分 Parquet 文件集与 Iceberg、Delta、DuckLake 的快照和 Catalog 语义。

## 3. 性能、并发与运维

1. [执行引擎与查询成本](./execution-engine/)：理解向量化流水线、阻塞算子、基数估算、裁剪与物化边界。
2. [查询性能与资源控制](./query-optimization/)：使用执行计划、Profiling、资源边界和结果等价检查优化查询。
3. [可复现实验](./reproducible-lab/)：生成固定数据，验证格式、裁剪、连接放大和 Spill 行为。
4. [并发与事务边界](./concurrency-transactions/)：理解单进程并发、乐观冲突和多进程写入限制。
5. [数据库文件运维](./database-operations/)：设计 Checkpoint、备份恢复、升级、迁移和空间治理流程。

## 4. 集成、安全与数据流水线

1. [在应用中嵌入 DuckDB](./embedding/)：管理连接、线程、Arrow、DataFrame 和结果生命周期。
2. [扩展与安全边界](./extensions-security/)：固定扩展来源并隔离文件、网络和 Secret 能力。
3. [分析 PostgreSQL 数据](./postgres-integration/)：在直接查询、受控快照和 Parquet 交换之间选择。
4. [构建可重跑数据流水线](./data-pipelines/)：通过 Manifest、质量闸门和幂等发布处理批任务。

## 5. 源码解析

源码篇固定基于 DuckDB `v1.5.5`，先用已掌握的 SQL 和执行计划建立直觉，再进入 C++ 对象与调用链。没有 C++ 内核阅读经验时，按以下顺序学习：

1. [源码阅读入门](./source-reading-guide/)：通过代理下载固定版本，完成 Debug 构建、目录导航、SQLLogicTest 和 LLDB 调试。
2. [一条 SQL 的完整生命周期](./source-query-lifecycle/)：从 `Connection` 追到 Parser、Binder、Optimizer、物理计划和 Executor。
3. [向量化执行与 Pipeline](./source-vectorized-execution/)：理解 `Vector`、`DataChunk`、SelectionVector、Source、Operator 与 Sink。
4. [优化器与 Join 选择](./source-optimizer/)：阅读 Pass 顺序、Filter Pushdown、Join Order、基数估算和物理 Join 选择。
5. [存储、MVCC、WAL 与 Checkpoint](./source-storage-transactions/)：连接 Row Group、Buffer Manager、事务可见性和崩溃恢复。
6. [Parquet 扫描实现](./source-parquet-scan/)：追踪扩展注册、Bind、列裁剪、Row Group 调度与向量化解码。

## 按场景选择路线

| 目标 | 建议路线 |
| --- | --- |
| 从未使用过 DuckDB | 入门 -> 数据文件 -> 分析 SQL -> 类型语义 -> 执行引擎 |
| 本地分析与 Notebook | 入门 -> 分析 SQL -> 类型语义 -> 数据文件 |
| 理解 SQL 为什么快或慢 | 执行引擎 -> 查询优化 -> 可复现实验 |
| 从 SQL 进入 DuckDB 源码 | 执行引擎 -> 源码阅读入门 -> SQL 生命周期 -> 向量化执行 |
| 深入优化器与 Join | 查询优化 -> SQL 生命周期 -> 源码优化器 |
| 深入存储与 Parquet 实现 | 并发事务 -> 源码存储事务 -> Parquet 布局 -> Parquet 扫描源码 |
| 优化远程 Parquet | Parquet 布局 -> 对象存储 -> 执行引擎 -> 查询优化 |
| 嵌入应用或报表服务 | 嵌入应用 -> 并发事务 -> 文件运维 -> 扩展安全 |
| 构建离线数据任务 | 数据文件 -> 类型语义 -> 数据流水线 -> 查询优化 |
| 读取共享数据湖表 | 对象存储 -> Lakehouse 表格式 -> 扩展安全 |
| 分析 PostgreSQL | PostgreSQL 集成 -> 数据流水线 -> Parquet 布局 |

## 适用边界

适合：本地分析、Notebook、批量数据转换、嵌入式报表、Parquet 数据湖临时查询、事务数据离线分析，以及单机范围内的 ETL。

不适合：大量远程客户端、高并发小事务、依赖多节点在线扩展的服务，或多个独立进程持续写入同一数据库文件的场景。

实践时先运行[可复现实验](./reproducible-lab/)理解机制，再换成具有真实列数、分区和数据分布的脱敏样本。记录 DuckDB 与扩展版本、输入 Manifest、远程请求、读取字节、总耗时、峰值内存和临时磁盘，并模拟坏行、Schema 演进、磁盘满、对象存储失败、进程中止和重复运行。

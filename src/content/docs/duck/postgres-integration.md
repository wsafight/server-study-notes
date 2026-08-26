---
title: 使用 DuckDB 分析 PostgreSQL 数据
description: 通过 PostgreSQL 扩展、受控快照和 Parquet 交换在 DuckDB 中分析事务数据。
---

PostgreSQL 适合并发事务与在线服务，DuckDB 适合单机扫描和聚合。二者结合的关键不是让 DuckDB 直接对生产主库执行任意大查询，而是为分析建立可控、可重复的数据快照边界。

## 直接附加 PostgreSQL

DuckDB 的 PostgreSQL 扩展可以把远程 Schema 映射为可查询对象。具体连接和 Secret 语法随版本变化，下面展示基本形态：

```sql
INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=app host=db.internal user=analytics_reader'
AS pg_source (TYPE postgres, READ_ONLY);

SELECT count(*)
FROM pg_source.public.orders
WHERE created_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00';
```

使用专用只读角色、TLS 和短期凭据，不在 SQL 中包含密码。连接前设置数据库侧 `statement_timeout`，并通过连接池或资源组限制分析并发。

## 理解下推边界

扩展可以把部分过滤和投影下推到 PostgreSQL，但复杂表达式、连接或聚合是否下推取决于扩展和版本。使用 DuckDB 计划、PostgreSQL `pg_stat_activity`、`pg_stat_statements` 和网络字节共同确认。

如果过滤未下推，DuckDB 可能通过网络拉取整表后再计算。即使下推成功，一个高成本聚合也可能在主库消耗大量 I/O 和 Buffer。先在只读副本或专用分析副本测试。

## 快照一致性

一次分析包含多条查询时，需要明确它们是否来自同一 PostgreSQL 快照。逐表、逐查询读取可能跨越并发提交，产生相互不一致的事实表和维表。

可选方案包括：

- 在受控事务快照内完成短时间读取。
- 从同一数据库备份或副本恢复点导出。
- 使用 CDC 的一致位点构建离线表。
- 为每批数据记录源端高水位和提取时间。

长时间保持 PostgreSQL 事务快照会阻止 Vacuum 清理，应避免用一个持续数小时的事务换取简单一致性。

## 使用 Parquet 解耦

周期性分析更适合先导出不可变 Parquet：

```sql
COPY (
    SELECT *
    FROM pg_source.public.orders
    WHERE created_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
      AND created_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
)
TO 'snapshot/orders/2026-08.parquet'
(FORMAT parquet, COMPRESSION zstd);
```

导出后记录源端范围、行数、主键 Min/Max、Schema、时间区间和校验和。DuckDB 后续重复分析本地或对象存储快照，不再给在线库施加相同负载。

## 增量提取

仅按 `updated_at > last_time` 提取容易漏掉相同时间戳、迟到提交和时钟精度边界。使用稳定复合游标，例如 `(updated_at, id)`，范围采用左闭右开，并保留可重叠重读窗口后按主键去重。

删除需要 Tombstone、CDC 或周期性全量对账，不能从“新版本不存在某行”自动推断。Schema 变更应在发布前验证 DuckDB 类型映射和历史文件兼容性。

## 生产保护

把分析查询标记为独立 `application_name`，监控其连接数、扫描行、读取块、临时文件和复制延迟。准备 Kill Switch，在主库压力、备份或故障切换期间暂停提取。

最终结果要能追溯到 PostgreSQL 恢复点或增量位点、DuckDB 版本、查询版本和输入 Manifest，才能可靠重现。

## 继续阅读

将提取过程做成可重跑批任务参见[数据流水线](./data-pipelines/)；快照写成长期 Parquet 时参见[Parquet 布局](./parquet-layout/)。

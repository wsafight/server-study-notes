---
title: PostgreSQL VACUUM 与 Autovacuum
description: 理解死元组、空间复用、可见性映射、事务 ID 冻结和 Autovacuum 调优。
---

PostgreSQL 的 MVCC 更新通常创建新行版本，旧版本在不再对任何事务可见后成为死元组。`VACUUM` 标记其空间可复用、维护可见性映射，并冻结旧事务 ID 以防止回卷。

## 普通 VACUUM 做什么

```sql
VACUUM (VERBOSE, ANALYZE) app.orders;
```

普通 `VACUUM` 可以与常规读写并发，通常不会把表文件立即缩小返还操作系统。被清理空间主要供同一表后续写入复用。

`ANALYZE` 更新优化器统计信息，它与垃圾回收是不同任务。Autovacuum 会根据表变化自动触发 vacuum 或 analyze。

## 什么阻止了清理

- 长时间运行或 idle in transaction 的事务仍可能看到旧版本。
- 逻辑复制槽长时间不消费，保留所需 WAL 或目录信息。
- 副本反馈与长查询可能延长可见性边界。
- Autovacuum 被关闭、资源不足或反复被冲突操作取消。

先查看事务年龄和活动：

```sql
SELECT pid, usename, state, xact_start, query_start, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;
```

终止会话是破坏性操作，执行前要确认负责人、业务影响和事务重试能力。

## 监控表状态

```sql
SELECT
  schemaname,
  relname,
  n_live_tup,
  n_dead_tup,
  last_autovacuum,
  autovacuum_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

这些是统计估算，可能延迟或被重置。还应关注事务 ID 年龄、Autovacuum 进度、表与索引尺寸趋势，以及日志中的取消或超时。

## 调优思路

Autovacuum 阈值通常由固定阈值加表行数比例决定。超大表即使变化了大量行，也可能因为比例尚未达到而触发较晚；更新极频繁的表可以设置更积极的表级参数。

调优应同时考虑：

- 工作进程数量与每个进程的维护内存。
- cost delay 与 cost limit 对 I/O 节奏的影响。
- 表级触发阈值、数据更新速率和业务低峰。
- 存储吞吐和其他维护任务竞争。

## 谨慎使用 VACUUM FULL

`VACUUM FULL` 重写表并需要强锁，可以把空间返还操作系统，但会阻塞业务并需要额外磁盘。它不是日常清理命令。生产使用前应评估 `pg_repack` 等替代方案、外键与扩展兼容、复制影响和失败回退。

最有效的治理通常是消除长事务、让 Autovacuum 及时运行、降低无意义更新，并为大批量删除设计分区生命周期。仅在表已经严重膨胀后手工维护，往往已经太晚。

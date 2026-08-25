---
title: PostgreSQL 观测与性能基线
description: 使用 pg_stat_activity、pg_stat_statements、等待事件和系统统计建立 PostgreSQL 生产观测体系。
---

数据库监控需要同时回答负载发生了什么、时间消耗在哪里、资源是否接近边界，以及变化从何时开始。单个 CPU 或连接数告警无法定位查询、锁、WAL 和存储之间的因果关系。

## 建立四层信号

1. 业务层：请求率、错误率、端到端延迟和受影响租户。
2. SQL 层：归一化语句的调用次数、累计时间、行数、Buffers、WAL 和临时文件。
3. 数据库层：活跃会话、等待事件、锁、事务年龄、复制延迟和 Checkpoint。
4. 主机层：CPU、内存、磁盘延迟、吞吐、队列和网络。

所有信号必须使用一致时钟和实例标识，故障切换后也要能区分旧主库、新主库和只读副本。

## 当前会话与等待

```sql
SELECT pid,
       usename,
       application_name,
       state,
       wait_event_type,
       wait_event,
       now() - xact_start AS xact_age,
       now() - query_start AS query_age,
       left(query, 160) AS query
FROM pg_stat_activity
WHERE backend_type = 'client backend'
ORDER BY xact_start NULLS LAST;
```

`active` 不等于正在使用 CPU，会话可能在等待锁、I/O、客户端或 IPC。首先按 `wait_event_type` 分类，再结合锁链、系统 I/O 和调用方日志解释。

监控长事务和 `idle in transaction`，它们可能占用连接、持锁并阻止 Vacuum 清理。查询文本可能包含敏感信息，采集与展示需要权限和脱敏策略。

## pg_stat_statements

`pg_stat_statements` 按归一化查询聚合资源消耗，通常需要在 `shared_preload_libraries` 配置后重启，并在数据库内创建扩展。具体字段随 PostgreSQL 版本变化。

```sql
SELECT queryid,
       calls,
       total_exec_time,
       mean_exec_time,
       rows,
       shared_blks_hit,
       shared_blks_read,
       temp_blks_written,
       left(query, 160) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

累计耗时适合找总体成本，平均耗时会掩盖尾延迟，调用次数则能发现高频小查询。用应用路由和 Trace 关联 `queryid`，避免只看到 SQL 而不知道谁发起。

统计重置、实例重启和扩展容量都会影响时间窗口。采集端应保存单调计数器并计算增量，不要直接比较两个不同重置周期的累计值。

## 容量与维护状态

持续观测：

- 数据库和表大小、增长速度、死元组和 Autovacuum 时间。
- Buffer 命中与物理读取，但不要把命中率当作唯一目标。
- WAL 生成速率、归档失败、复制槽保留量和副本重放延迟。
- Checkpoint 频率、写入量和后台写行为。
- 临时文件、排序或 Hash Spill，以及磁盘剩余空间。
- 连接池等待、数据库后端数和被拒绝连接。

较新版本提供 `pg_stat_io` 等更细的 I/O 视图，使用前应核对版本字段和计数语义。

## 告警设计

告警应对应用户影响或即将耗尽的预算，例如错误率、延迟 SLO、磁盘剩余时间、复制恢复点风险和事务年龄。固定连接数或命中率阈值应结合实例容量和业务基线。

为发布、批处理、Vacuum、备份和故障切换增加时间线标记。每次事故后，把临时查询沉淀为有保留期、低基数且可执行的仪表盘或告警。

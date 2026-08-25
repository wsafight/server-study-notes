---
title: 使用 Performance Schema 诊断 MySQL
description: 通过语句摘要、等待事件、事务和锁表定位 MySQL 资源消耗，并控制采集开销。
---

Performance Schema 在服务器内部采集语句、阶段、等待、锁、事务和连接等运行信息。它更适合回答“时间花在哪里”和“哪些语句累计成本最高”，但历史表有容量上限，不是永久审计日志。

## 从 sys Schema 开始

MySQL 的 `sys` Schema 对 Performance Schema 与 Information Schema 提供了更易读的视图。先找累计延迟或扫描成本较高的语句：

```sql
SELECT
  db,
  exec_count,
  total_latency,
  avg_latency,
  rows_examined,
  rows_sent,
  query
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 20;
```

语句通常按规范化 digest 聚合，字面量被替换。结合调用次数、平均耗时、扫描行数和业务流量判断优先级，不能只优化最慢的一次执行。

## 查看原始语句摘要

```sql
SELECT
  SCHEMA_NAME,
  DIGEST_TEXT,
  COUNT_STAR,
  SUM_TIMER_WAIT,
  AVG_TIMER_WAIT,
  SUM_ROWS_EXAMINED,
  SUM_ROWS_SENT,
  SUM_CREATED_TMP_DISK_TABLES
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

计时器通常以皮秒等内部单位呈现，使用 `sys.format_time()` 或 sys 视图更容易阅读。摘要从服务器启动或表被清空后累计，需要记录采集窗口和流量变化。

## 等待与锁

```sql
SELECT * FROM performance_schema.data_lock_waits;
SELECT * FROM performance_schema.data_locks;
```

锁等待表用于观察当前关系，死锁结束后记录会消失。死锁还需结合错误日志和 `SHOW ENGINE INNODB STATUS`，参见[诊断 InnoDB 死锁](../deadlock/)。

其他等待摘要可以显示文件 I/O、表锁、互斥量等累计时间。高等待时间可能是高负载的结果，必须结合吞吐、硬件和调用路径判断。

## 当前会话与事务

Performance Schema 的 thread、statement 与 transaction 表可关联连接、当前 SQL 和事件。使用 `sys.session`、`sys.processlist` 可以快速查看活跃会话，但查询文本可能包含敏感数据，导出前要脱敏并限制访问权限。

## 配置采集

采集由 instrument 和 consumer 控制：instrument 决定观测哪些操作，consumer 决定写入当前或历史表。默认配置会随 MySQL 版本和发行版变化。

启用更细粒度的阶段、等待和长历史会增加 CPU 与内存开销。应先确认当前设置，在测试环境测量开销，再针对诊断目标临时或长期开启。不要一次打开所有 instrument 并无限扩大历史表。

## 诊断闭环

1. 从应用 SLO、慢日志或摘要定位候选 SQL。
2. 获取代表性参数、Schema、统计和执行计划。
3. 区分 CPU、I/O、锁、网络和连接池等待。
4. 修改 SQL、索引或事务后比较同一流量窗口。
5. 保存查询、采集窗口和结论，避免指标重置后失去上下文。

Performance Schema 提供数据库内部证据，仍需与应用追踪和操作系统指标对齐，才能解释完整请求延迟。

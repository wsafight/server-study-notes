---
title: 诊断 PostgreSQL 锁等待
description: 使用 pg_stat_activity、pg_locks 和阻塞链定位长事务、DDL 与并发更新问题。
---

PostgreSQL 使用表级、行级、页面级和咨询锁等多种锁保护并发操作。正常的短暂等待并非故障；需要关注的是等待持续时间、阻塞链和对业务 SLO 的影响。

## 找出被谁阻塞

`pg_blocking_pids()` 可以返回阻塞某个会话的 PID：

```sql
SELECT
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  now() - blocked.query_start AS blocked_for,
  blocked.wait_event_type,
  blocked.wait_event,
  pg_blocking_pids(blocked.pid) AS blocking_pids,
  blocked.query AS blocked_query
FROM pg_stat_activity AS blocked
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
ORDER BY blocked_for DESC;
```

再查询阻塞 PID 的事务开始时间、状态和 SQL。`state = 'idle in transaction'` 表示当前没有执行语句，但事务仍打开，可能继续持有锁和旧快照。

`pg_locks` 用于查看锁模式、对象和是否已获得；行锁等待有时表现为对事务 ID 的等待，需要结合 `pg_stat_activity` 解读，而不是只筛选某一种锁类型。

## 常见来源

- 应用开启事务后执行远程调用或等待输入。
- 多个事务以不同顺序更新同一组资源。
- DDL 等待旧事务，同时后续查询又排在 DDL 后方。
- 缺少索引让外键检查、更新或删除扫描更多数据。
- 批量任务一次修改过多行，长期持有行锁并产生大量 WAL。

PostgreSQL 检测到死锁后会中止其中一个事务。应用应回滚并有限重试完整事务，且保证外部副作用幂等。

## 设置等待上界

可以根据工作负载设置会话或事务级超时：

```sql
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
```

三个超时处理不同问题。超时值应让在线请求快速失败，同时给迁移和维护任务使用单独策略。设置后还要确保客户端正确回滚失败事务。

## 处理阻塞会话

优先联系会话负责人，让应用提交、回滚或停止任务。确需终止时，`pg_cancel_backend()` 只取消当前查询，`pg_terminate_backend()` 会终止会话并回滚事务；后者影响更大，而且大事务回滚也需要时间和 I/O。

在托管数据库或高可用环境中，权限与代理层可能改变处理方式。执行前应保存 PID、事务、SQL、应用名、客户端地址和阻塞链证据。

## 长期修复

- 缩短事务并统一资源访问顺序。
- 为外键引用列和过滤条件建立经过验证的索引。
- 大批量任务分批提交并限速，但保持业务一致性。
- 应用连接设置明确的 `application_name`，便于归属。
- 告警最长事务、最长锁等待和 idle in transaction，而不只监控连接数。

增加连接数或锁超时通常只会推迟问题。真正的修复是限制事务工作量、建立正确索引，并让失败路径可回滚、可重试。

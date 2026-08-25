---
title: PostgreSQL 事务与隔离级别
description: 理解 PostgreSQL 快照、Read Committed、Repeatable Read 和 Serializable 的行为并设计可重试事务。
---

PostgreSQL 通过 MVCC 让读取和写入在多数情况下不互相阻塞，但 MVCC 不会自动保证业务操作正确。隔离级别、锁定读、唯一约束和重试策略必须一起设计。

## Read Committed

默认的 `READ COMMITTED` 在每条语句开始时取得新快照。同一事务中的两次查询可能看到不同的已提交结果，因此“先查再改”不能仅依赖第一次查询。

```sql
BEGIN;

SELECT balance
FROM account
WHERE id = 42
FOR UPDATE;

UPDATE account
SET balance = balance - 100
WHERE id = 42 AND balance >= 100;

COMMIT;
```

对单行条件更新，直接在 `UPDATE` 中表达前置条件通常比应用先读后写更可靠。需要读取后决定多行变更时，可以锁定目标行，并统一访问顺序减少死锁。

## Repeatable Read

`REPEATABLE READ` 中，事务后续普通查询复用同一快照，适合需要一致视图的多步读取。PostgreSQL 的实现会避免不可重复读和幻读，但并发事务仍可能基于共同快照做出相互冲突的决定，形成写偏差。

当数据库检测到无法继续的并发更新时，事务可能以 SQLSTATE `40001` 失败。应用必须回滚整个事务，并从业务操作入口重试，而不是只重放最后一条 SQL。

## Serializable

`SERIALIZABLE` 使用 Serializable Snapshot Isolation 跟踪读写依赖，使成功提交的结果等价于某个串行顺序。它不会把所有读取都变成阻塞锁，但可能主动中止存在危险依赖的事务。

适合用 Serializable 表达跨行不变量时，需要：

- 将整个业务事务封装为可重放单元。
- 对 `40001` 使用有上限的退避重试。
- 确保事务中的外部调用不会在重试时重复产生副作用。
- 监控冲突率，冲突持续偏高时重新设计访问模式。

只读报表可以评估 `SERIALIZABLE READ ONLY DEFERRABLE`，让数据库等待一个安全快照，以减少执行期间被中止的可能。

## 显式锁与约束

隔离级别不是唯一工具：

- 唯一约束适合保证去重和自然键唯一性。
- 外键保证引用关系，但删除和更新也会参与锁竞争。
- `SELECT ... FOR UPDATE` 锁定即将修改的行。
- Advisory Lock 适合数据库对象之外的协作键，但需要统一命名、粒度和释放策略。

不要用表锁替代清晰的数据模型。锁范围越大，吞吐下降和排队传播越明显。

## 事务生命周期

事务应尽量短，不要在事务内等待用户输入、远程 API、消息队列或长时间计算。为会话设置合理的 `idle_in_transaction_session_timeout`，并监控长事务，因为它们会阻止 VACUUM 推进可清理边界。

Savepoint 可以回滚事务中的局部步骤，但不会释放 Savepoint 之前获得的锁，也不能让包含外部副作用的流程自动安全重试。

## 重试与验证

将 SQLSTATE `40001` 和 `40P01` 作为可重试候选，但限制尝试次数和总截止时间。每次重试都应重新读取数据、重新计算结果，并保留相同幂等键。

测试时至少并发执行两个事务，控制语句交错顺序，验证最终不变量、失败类型和重试次数。单线程成功不能证明并发正确性。

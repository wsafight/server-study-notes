---
title: MySQL 事务与隔离级别
description: 理解 InnoDB 四种隔离级别、一致性读、锁定读和事务边界的实际行为。
---

事务把一组读写操作组织为一个原子单元。隔离级别决定一个事务能够观察到其他并发事务的哪些变化，但它不会自动保证库存不为负、状态只能前进等业务不变量。

## 四种隔离级别

| 隔离级别 | 一致性读的主要行为 | 典型取舍 |
| --- | --- | --- |
| `READ UNCOMMITTED` | 可能读到其他事务未提交的版本 | 很少用于业务系统 |
| `READ COMMITTED` | 每条一致性读语句创建新快照 | 能看到事务期间其他事务已提交的变化 |
| `REPEATABLE READ` | 同一事务通常复用第一次一致性读建立的快照 | InnoDB 默认级别 |
| `SERIALIZABLE` | 普通读取在特定条件下转为加锁读取 | 并发能力最低，锁等待更多 |

SQL 标准中的异常定义与 InnoDB 的具体实现不能简单画等号。InnoDB 在 `REPEATABLE READ` 下通过 MVCC 让一致性读避免常见幻读，并在锁定读和写入时使用记录锁、间隙锁或 Next-Key Lock。具体锁范围仍取决于索引、条件和执行计划。

## 一致性读与当前读

普通 `SELECT` 通常是非锁定一致性读，读取快照中的可见版本：

```sql
SELECT balance FROM account WHERE id = 42;
```

`SELECT ... FOR UPDATE`、`SELECT ... FOR SHARE`、`UPDATE` 和 `DELETE` 需要读取当前可用版本并加锁。它们与同一事务中的普通 `SELECT` 可能观察到不同时间点的数据：

```sql
START TRANSACTION;
SELECT balance FROM account WHERE id = 42 FOR UPDATE;
UPDATE account SET balance = balance - 100 WHERE id = 42;
COMMIT;
```

需要排他更新的数据应明确使用锁定读或单条条件更新，不能假设普通查询读到的值在提交前保持不变。

## 查看与设置隔离级别

```sql
SELECT @@transaction_isolation;

SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
```

修改全局默认值只影响之后建立的会话。连接池可能长期复用连接，应在创建连接时显式初始化，并在归还连接前清理未提交事务和会话状态。

## 正确划分事务边界

- 事务应尽量短，不要在事务中等待用户输入、调用远程接口或执行大批量计算。
- 锁定多行时保持稳定顺序，降低死锁概率。
- 为锁等待和语句设置合理超时，但超时后仍要显式回滚事务。
- 捕获死锁或序列化失败时，应重试完整业务事务，而不是只重试最后一条 SQL。
- 不要用提高隔离级别替代唯一约束、检查约束或条件更新。

选择隔离级别前，先写出业务允许看到什么、冲突时谁应失败，以及失败后如何重试。默认级别只是起点，不是正确性的证明。

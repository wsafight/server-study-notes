---
title: 使用 SELECT FOR UPDATE 处理并发
description: 在事务中使用 InnoDB 锁定读，并理解索引、隔离级别、间隙锁和死锁影响。
---

`SELECT ... FOR UPDATE` 是锁定读。它读取最新可见数据，并对扫描到的索引记录加排他锁，让其他事务的冲突更新或锁定读等待。

## 额度扣减示例

```sql
START TRANSACTION;

SELECT quota
FROM accounts
WHERE id = 42
FOR UPDATE;

-- 应用检查 quota >= 10；不足时执行 ROLLBACK

UPDATE accounts
SET quota = quota - 10
WHERE id = 42;

COMMIT;
```

锁必须位于显式事务中，并尽快提交或回滚。不要在持锁期间调用远程服务、等待用户输入或执行耗时计算。

如果逻辑只是条件扣减，一条原子 `UPDATE` 通常更简单：

```sql
UPDATE accounts
SET quota = quota - 10
WHERE id = 42
  AND quota >= 10;
```

检查影响行数即可判断是否成功，减少一次网络往返和持锁时间。

## 锁定范围

InnoDB 锁定的是扫描到的索引记录和相关间隙，不是抽象的“某一行条件”。使用唯一索引等值查询通常锁定范围最小；缺少合适索引时，执行计划可能扫描并锁住大量记录，效果接近整表不可写。

在默认 `REPEATABLE READ` 下，范围查询和不存在的键还可能涉及 Gap Lock 或 Next-Key Lock；`READ COMMITTED` 的间隙锁更少，但不能因此忽略执行计划。

## 生产注意事项

- 所有事务按一致顺序访问多条记录，降低死锁概率。
- 正确处理死锁和锁等待超时，整个事务应支持幂等重试。
- 使用 `EXPLAIN` 确认访问索引，但不要把 `FORCE INDEX` 当作锁范围保证。
- 监控事务时长、锁等待和长时间未提交连接。

进程内锁只能协调单个应用实例。跨实例并发应依靠数据库原子操作、事务约束，或经过严格设计的分布式协调机制。

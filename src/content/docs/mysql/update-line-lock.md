---
title: 使用条件 UPDATE 避免并发覆盖
description: 通过单条原子 UPDATE、影响行数和乐观锁处理额度扣减等并发写入。
---

先查询、在应用中计算、再写回的“读改写”流程会产生丢失更新。两个请求可能读到相同旧值，然后把相同结果写回。

```sql
SELECT quota FROM accounts WHERE id = 42;
-- 应用计算 quota - 10
UPDATE accounts SET quota = :new_quota WHERE id = 42;
```

如果业务只是扣减额度，可以把检查和更新合并为一条 SQL：

```sql
UPDATE accounts
SET quota = quota - 10
WHERE id = 42
  AND quota >= 10;
```

InnoDB 会对匹配的索引记录加锁，并在锁内重新检查条件。调用方必须检查影响行数：

- `1` 表示扣减成功。
- `0` 表示记录不存在或额度不足，需要按业务返回或继续查询原因。

主键条件让锁定范围最小。缺少索引的条件可能扫描并锁住大量记录，因此原子 SQL 仍需要正确索引。

## 乐观锁

需要在应用中完成复杂计算时，可以增加版本列：

```sql
UPDATE accounts
SET quota = :new_quota,
    version = version + 1
WHERE id = :id
  AND version = :old_version;
```

影响行数为 0 表示数据已被其他事务修改，应用应重新读取并在有限次数内重试。

无论使用条件更新还是乐观锁，都要考虑请求超时后的不确定结果。对转账、扣款等操作增加业务幂等键和唯一约束，避免客户端重试导致重复执行。

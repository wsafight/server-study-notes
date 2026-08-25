---
title: MySQL 索引设计与验证
description: 根据查询模式设计联合索引，并用执行计划验证选择性、覆盖和写入成本。
---

索引的目标是减少需要读取和排序的数据，而不是让每个查询都出现 `key`。设计索引必须从真实 SQL、参数分布和读写比例出发。

## 从查询模式设计联合索引

例如订单列表查询：

```sql
SELECT id, created_at, amount
FROM orders
WHERE customer_id = 42
  AND status = 'paid'
  AND created_at >= '2026-08-01'
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

可以评估以下索引：

```sql
CREATE INDEX idx_orders_customer_status_created
ON orders (customer_id, status, created_at DESC, id DESC);
```

前两列用于等值过滤，后两列用于范围和稳定排序。具体列顺序仍要结合条件是否总会出现、各列分布以及其他查询复用情况验证。

## 重要原则

- 联合索引遵循最左前缀，前导列缺失时通常无法高效定位后续列。
- 高选择性经常有利，但低基数列在数据倾斜或联合索引中也可能很有效。
- 索引包含查询所需列时可以形成覆盖索引，减少回表，但索引也会变宽。
- 长字符串可以使用前缀索引，但前缀可能无法覆盖查询，也会降低唯一性判断能力。
- 每个二级索引都会增加写入、Buffer Pool 和磁盘成本，应删除确认冗余的索引。

## 保持条件可索引

对索引列做计算、函数或隐式类型转换，可能让普通索引无法直接定位：

```sql
-- 不利于普通 age 索引
WHERE age + 10 = 30

-- 改为
WHERE age = 20

-- 不利于普通 created_at 索引
WHERE YEAR(created_at) = 2026

-- 改为半开区间
WHERE created_at >= '2026-01-01'
  AND created_at < '2027-01-01'
```

MySQL 8.0 也支持函数索引或生成列索引，但应先确认表达式稳定且查询确实需要。

`LIKE 'prefix%'` 可以利用字符串索引范围，`LIKE '%middle%'` 通常不能。`OR` 并非必然放弃索引，优化器可能使用 Index Merge 或改写为多个范围；是否有效要看成本。

## 验证而不是猜测

```sql
EXPLAIN ANALYZE
SELECT ...;
```

比较实际扫描行数、循环次数、排序和总耗时，并使用接近生产的数据分布测试。优化器选全表扫描有时是正确结果，例如表很小或条件会返回大部分行。

删除疑似无用索引前，可在 MySQL 8.0 中先将普通二级索引设为不可见并观察：

```sql
ALTER TABLE orders ALTER INDEX idx_old INVISIBLE;
```

索引提示 `USE INDEX`、`FORCE INDEX` 应作为最后手段，因为数据分布变化后，硬编码选择可能比优化器计划更差。

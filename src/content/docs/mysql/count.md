---
title: 正确使用 COUNT 统计行数
description: 说明 COUNT 各种写法的语义、InnoDB 执行特点和大表计数方案。
---

不同 `COUNT` 写法首先是语义区别，不存在适用于所有查询的固定性能排序。

```sql
SELECT COUNT(*) FROM orders;
SELECT COUNT(order_id) FROM orders;
SELECT COUNT(paid_at) FROM orders;
```

- `COUNT(*)` 统计满足条件的行，包括含有 `NULL` 的行。
- `COUNT(column)` 只统计该列不为 `NULL` 的行。
- `COUNT(1)` 统计常量表达式非 `NULL` 的行，通常与 `COUNT(*)` 等价，但可读性不如后者。

统计行数时优先使用能够表达意图的 `COUNT(*)`。MySQL 优化器会根据成本选择合适的访问路径，不能依赖 `COUNT(*) > COUNT(1) > COUNT(主键)` 之类的经验排序。

## InnoDB 的执行特点

InnoDB 需要遵守 MVCC 可见性，不能像某些存储引擎一样直接返回一个全局精确行数。无条件 `COUNT(*)` 通常仍要扫描可见记录，优化器可能选择体积较小的二级索引。

带过滤条件时，应让条件能够使用合适的索引：

```sql
CREATE INDEX idx_orders_status ON orders (status);

SELECT COUNT(*)
FROM orders
WHERE status = 'pending';
```

对于超大表上的高频精确计数，可以维护汇总表或异步计数器；如果只需要估算值，可以读取统计信息，但不要把估算行数当作精确业务数据。

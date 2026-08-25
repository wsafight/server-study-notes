---
title: 正确使用 WHERE 与 HAVING
description: 区分聚合前过滤和聚合后过滤，并优化统计查询的数据访问量。
---

`WHERE` 在分组和聚合之前过滤明细行，`HAVING` 在分组之后过滤聚合结果。能够放在 `WHERE` 的条件应尽早过滤，减少后续聚合的数据量。

下面的查询统计指定时间后订单数超过 10000 的用户：

```sql
SELECT
  user_id,
  COUNT(*) AS order_count
FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY user_id
HAVING COUNT(*) > 10000
ORDER BY order_count DESC
LIMIT 100;
```

- 时间条件针对明细行，放在 `WHERE`。
- `COUNT(*) > 10000` 依赖聚合结果，放在 `HAVING`。
- MySQL 允许 `HAVING order_count > 10000` 引用别名，但直接写聚合表达式更容易移植到其他数据库。

可以评估 `(created_at, user_id)` 或 `(user_id, created_at)` 等索引，但最优顺序取决于时间范围的选择性、分组方式和其他查询。使用 `EXPLAIN ANALYZE` 验证扫描行数、临时表与排序成本。

---
title: 正确使用 WHERE 与 HAVING
description: 区分聚合前过滤和聚合后过滤，并优化统计查询的数据访问量。
---

`WHERE` 在分组和聚合之前过滤明细行，`HAVING` 在分组之后过滤聚合结果。条件放错位置可能改变结果，也可能让数据库先扫描和聚合大量无关数据。

## 逻辑处理顺序

理解查询时可以按 `FROM/JOIN`、`WHERE`、`GROUP BY`、聚合、`HAVING`、`SELECT`、`ORDER BY` 和 `LIMIT` 的逻辑顺序分析。优化器可以在不改变语义的前提下重排物理执行，但不能把依赖聚合结果的条件简单提前。

## 正确划分条件

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

不依赖聚合的普通列条件通常应放在 `WHERE`。把 `created_at` 条件写入 `HAVING`，可能无法在聚合前有效缩小扫描范围。

## 常见误区

- 没有 `GROUP BY` 的聚合查询仍只有一个隐式分组，`HAVING` 可以过滤这个最终结果。
- `HAVING` 不是用来绕过 `WHERE` 或 SQL Mode 检查的通用过滤器。
- 在 `ONLY_FULL_GROUP_BY` 下，选择未分组、又不能由分组列函数依赖确定的字段会报错；不要用任意值掩盖不明确的结果粒度。
- 对外连接，把右表条件从 `ON` 移到 `WHERE` 可能改变是否保留未匹配行，与是否使用 `HAVING` 是另一层语义问题。

## 性能验证

可以评估 `(created_at, user_id)` 或 `(user_id, created_at)` 等索引，但最优顺序取决于时间范围的选择性、分组方式和其他查询。聚合往往还需要临时表或排序，不能只根据是否命中索引判断。

使用 `EXPLAIN ANALYZE` 比较调整前后的实际扫描行数、分组数、临时表、排序和总耗时，并用包含空分组、边界时间与数据倾斜的样本验证结果没有变化。

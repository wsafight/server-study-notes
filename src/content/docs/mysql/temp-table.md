---
title: 分析 MySQL 内部临时表
description: 说明内部临时表的常见触发条件、诊断指标和优化方向。
---

MySQL 在执行复杂查询时可能创建内部临时表，用于保存中间结果。它与用户显式创建的 `CREATE TEMPORARY TABLE` 不是同一个概念。

常见触发场景包括：

- `UNION` 或需要物化的派生表、CTE。
- `GROUP BY` 与 `ORDER BY` 使用不同的列或顺序。
- 某些 `DISTINCT`、聚合、窗口函数和半连接执行计划。
- 排序列不属于连接顺序中的第一张表。

这些语法不一定都会创建临时表，最终应以执行计划为准。

## 诊断方式

```sql
SHOW SESSION STATUS LIKE 'Created_tmp%';

EXPLAIN ANALYZE
SELECT customer_id, COUNT(*)
FROM orders
GROUP BY customer_id
ORDER BY COUNT(*) DESC;
```

`Created_tmp_tables` 表示创建的内部临时表数量，`Created_tmp_disk_tables` 表示其中落到磁盘的数量。两者是会话或全局累计值，应比较查询执行前后的差值。

## 优化方向

- 减少中间结果的行数和行宽，只查询后续步骤需要的列。
- 为过滤、连接和排序设计合适的联合索引。
- 检查是否能让 `GROUP BY` 与 `ORDER BY` 使用相同的索引顺序。
- 调整临时表内存参数前先评估并发量，避免每个连接都占用过多内存。

磁盘临时表并不一定意味着查询有问题。应结合查询耗时、扫描行数、内存预算和磁盘延迟判断是否值得优化。

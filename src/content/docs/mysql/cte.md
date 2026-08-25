---
title: MySQL 公用表表达式 CTE
description: 使用普通与递归 CTE 拆分复杂查询，并安全遍历树形数据。
---

MySQL 8.0 支持公用表表达式（Common Table Expression，CTE）。CTE 通过 `WITH` 为一个查询结果命名，可以提升复杂 SQL 的可读性，并在同一语句中引用多次。

## 普通 CTE

```sql
WITH paid_orders AS (
  SELECT customer_id, amount
  FROM orders
  WHERE status = 'paid'
    AND created_at >= '2026-08-01'
)
SELECT
  customer_id,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount
FROM paid_orders
GROUP BY customer_id;
```

CTE 主要是语句组织方式，不保证结果只计算一次。优化器可能合并 CTE，也可能将它物化为内部临时结果，应通过 `EXPLAIN` 查看具体计划。

## 递归 CTE

递归 CTE 由锚点查询和递归查询组成，两者通常使用 `UNION ALL` 连接：

```sql
WITH RECURSIVE sequence AS (
  SELECT 1 AS n

  UNION ALL

  SELECT n + 1
  FROM sequence
  WHERE n < 5
)
SELECT n FROM sequence;
```

递归部分必须有能够终止的条件。MySQL 使用 `cte_max_recursion_depth` 限制递归层数，默认值通常为 1000；不要仅依赖该限制阻止错误循环。

## 遍历组织树

假设部门表包含 `id`、`parent_id` 和 `name`，查询部门 `1` 及其所有后代：

```sql
WITH RECURSIVE organization AS (
  SELECT
    id,
    parent_id,
    name,
    0 AS depth,
    CAST(id AS CHAR(1000)) AS path
  FROM departments
  WHERE id = 1

  UNION ALL

  SELECT
    child.id,
    child.parent_id,
    child.name,
    parent.depth + 1,
    CONCAT(parent.path, ',', child.id)
  FROM departments AS child
  JOIN organization AS parent
    ON child.parent_id = parent.id
  WHERE FIND_IN_SET(child.id, parent.path) = 0
)
SELECT id, parent_id, name, depth, path
FROM organization
ORDER BY path;
```

锚点中的 `CAST` 为后续路径预留足够类型长度，`FIND_IN_SET` 用于防止脏数据形成循环。生产系统还应通过约束或写入校验阻止环，而不是只在查询时处理。

递归结果的自然输出顺序没有保证。需要层级顺序时显式维护 `depth`、`path` 或其他排序键。树很深、数据量很大或查询频繁时，应比较闭包表、物化路径和应用层遍历等替代模型。

参考：[MySQL WITH 文档](https://dev.mysql.com/doc/refman/8.4/en/with.html)。

---
title: 处理 SUM 返回 NULL
description: 解释空结果集或全 NULL 列上 SUM 的返回值及安全处理方式。
---

当查询没有匹配行，或参与聚合的值全部为 `NULL` 时，`SUM()` 返回 `NULL`。这符合 SQL 聚合语义，但如果应用把结果直接拆箱为数字，可能出现空指针异常或类型错误。

## 区分三种结果

- 没有匹配行：当前筛选范围内不存在记录。
- 有匹配行但聚合列全为 `NULL`：存在记录，但所有值都未知或缺失。
- 聚合结果为 `0`：存在可参与计算的值，合计恰好为零。

业务如果需要区分“没有数据”和“合计为零”，就不能只返回一个经过 `COALESCE` 的数字。可以同时返回 `COUNT(*)`、`COUNT(amount)` 和 `SUM(amount)`。

## 在聚合外处理默认值

```sql
SELECT
  COUNT(*) AS matched_rows,
  COUNT(amount) AS valued_rows,
  COALESCE(SUM(amount), 0) AS total_amount
FROM orders
WHERE user_id = 42;
```

应在 `SUM()` 外层使用 `COALESCE`。只写 `SUM(COALESCE(amount, 0))` 仍无法处理“没有任何匹配行”的情况，因为聚合函数没有输入值时依然返回 `NULL`。

只写 `SUM(COALESCE(amount, 0))` 会把单行中的 `NULL` 当作零，但没有任何匹配行时，聚合仍然没有输入，结果依旧是 `NULL`。

## 分组与外连接

带 `GROUP BY` 时，没有输入行意味着对应分组根本不会出现。外层 `COALESCE` 只能处理已经返回的分组，不能凭空生成缺少的日期或用户。需要完整时间序列时，先生成日期维度，再使用 `LEFT JOIN` 连接事实数据。

```sql
SELECT
  d.day,
  COALESCE(SUM(o.amount), 0) AS total_amount
FROM calendar AS d
LEFT JOIN orders AS o
  ON o.created_at >= d.day
 AND o.created_at < d.day + INTERVAL 1 DAY
WHERE d.day >= '2026-08-01'
  AND d.day < '2026-09-01'
GROUP BY d.day
ORDER BY d.day;
```

连接条件放在 `ON` 中，避免 `WHERE` 对右表的条件把 `LEFT JOIN` 意外变成内连接。

## 类型与业务边界

相关聚合函数的语义不同：

- `COUNT(*)` 统计匹配行数，没有匹配行时返回 `0`。
- `COUNT(column)` 只统计该列非 `NULL` 的行。
- `SUM(column)` 忽略单个 `NULL`，但没有非 `NULL` 输入时返回 `NULL`。

金额汇总应使用 `DECIMAL` 或最小货币单位的整数，避免浮点累计误差。还要确认驱动将高精度结果映射为什么类型，防止在 JavaScript 等客户端中再次丢失精度。

## 验证用例

至少测试无匹配行、全 `NULL`、包含正负值、总和为零和超大累计值。API 契约应明确返回 `null`、数字零还是同时返回行数，不要让不同调用方各自猜测。

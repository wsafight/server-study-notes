---
title: 处理 SUM 返回 NULL
description: 解释空结果集或全 NULL 列上 SUM 的返回值及安全处理方式。
---

当查询没有匹配行，或参与聚合的值全部为 `NULL` 时，`SUM()` 返回 `NULL`。如果应用把结果直接拆箱为数字，可能出现空指针异常或类型错误。

```sql
SELECT COALESCE(SUM(amount), 0) AS total_amount
FROM orders
WHERE user_id = 42;
```

应在 `SUM()` 外层使用 `COALESCE`。只写 `SUM(COALESCE(amount, 0))` 仍无法处理“没有任何匹配行”的情况，因为聚合函数没有输入值时依然返回 `NULL`。

相关函数的语义不同：

- `COUNT(*)` 统计匹配行数，没有匹配行时返回 `0`。
- `COUNT(column)` 只统计该列非 `NULL` 的行。
- `SUM(column)` 忽略单个 `NULL`，但没有非 `NULL` 输入时返回 `NULL`。

金额汇总还应使用 `DECIMAL` 或最小货币单位的整数，避免浮点累计误差。

---
title: 处理 NULL 参与数值运算
description: 解释 SQL 三值逻辑下的 NULL 算术，并在业务语义允许时使用 COALESCE。
---

`NULL` 表示未知或缺失，不是数字零。任何数值与 `NULL` 做加减乘除，结果通常仍是 `NULL`：

## 算术传播

```sql
SELECT
  id,
  total,
  used,
  total - used AS available
FROM quotas;
```

如果 `total` 或 `used` 为空，`available` 也为空。只有当业务明确规定缺失值等价于 `0` 时，才使用 `COALESCE`：

```sql
SELECT
  id,
  COALESCE(total, 0) AS total,
  COALESCE(used, 0) AS used,
  COALESCE(total, 0) - COALESCE(used, 0) AS available
FROM quotas;
```

## COALESCE 放在哪里

`COALESCE(total - used, 0)` 会在任意输入为空时把整个结果变成零；分别写 `COALESCE(total, 0) - COALESCE(used, 0)` 则定义两个字段各自的默认值。两种写法可能代表不同业务规则。

聚合函数通常忽略单个 `NULL`，但没有非空输入时 `SUM()` 仍返回 `NULL`，参见[处理 SUM 返回 NULL](../sum-npe/)。不要假设行级表达式与聚合表达式的空值处理相同。

## 比较与过滤

`NULL = 0` 和 `NULL <> 0` 的结果都是 Unknown，在 `WHERE` 中不会通过。检查空值必须使用 `IS NULL` 或 `IS NOT NULL`：

```sql
SELECT id
FROM quotas
WHERE total IS NULL
   OR used IS NULL;
```

`NOT IN` 的候选集合中如果包含 `NULL`，也可能让结果变成 Unknown。反连接场景应明确空值约束，并评估 `NOT EXISTS`。

## 从数据模型解决

如果 `NULL` 表示“额度尚未设置”，直接替换为 `0` 会把未知值误判为没有额度。更稳妥的做法是：

- 对业务必填数值使用 `NOT NULL`，并在写入时提供真实值。
- 只有缺失确实等价于零时才使用 `DEFAULT 0`。
- 需要区分多种缺失原因时，使用明确状态列，而不是让一个 `NULL` 承担所有语义。

增加 `NOT NULL` 前先统计和修复历史空值，并验证应用、批处理和复制链路都不再写入空值。

## 验证边界

为两个输入分别测试正数、零、负数和 `NULL`，确认展示、排序、过滤、聚合和 API 序列化结果。空值问题应在数据契约中解决，不能只依赖页面展示时临时替换。

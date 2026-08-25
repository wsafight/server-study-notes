---
title: 处理 NULL 参与数值运算
description: 解释 SQL 三值逻辑下的 NULL 算术，并在业务语义允许时使用 COALESCE。
---

任何数值与 `NULL` 做加减乘除，结果通常仍是 `NULL`：

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

如果 `NULL` 表示“额度尚未设置”，直接替换为 `0` 可能把未知值误判为没有额度。更稳妥的做法是在表结构中根据领域约束使用 `NOT NULL DEFAULT 0`，或让应用显式处理“未知”状态。

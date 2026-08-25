---
title: 处理 IN 子查询中的 LIMIT 限制
description: 使用派生表、JOIN 或 CTE 改写 MySQL 不支持 LIMIT 的 IN 子查询。
---

部分 MySQL 版本不支持在 `IN`、`ALL`、`ANY` 或 `SOME` 子查询中直接使用 `LIMIT`，会返回类似错误：

```text
This version of MySQL doesn't yet support
'LIMIT & IN/ALL/ANY/SOME subquery'
```

目标如果是找到最近出现的 10 个版本，再返回这些版本的所有记录，可以先在派生表中完成分组和限制，再连接原表：

```sql
SELECT t.*
FROM test AS t
JOIN (
  SELECT code_ver
  FROM test
  WHERE code_ver NOT LIKE '%DevBld%'
  GROUP BY code_ver
  ORDER BY MAX(event_date) DESC
  LIMIT 10
) AS recent USING (code_ver);
```

MySQL 8.0 也可以使用 CTE 提高可读性：

```sql
WITH recent AS (
  SELECT code_ver
  FROM test
  WHERE code_ver NOT LIKE '%DevBld%'
  GROUP BY code_ver
  ORDER BY MAX(event_date) DESC
  LIMIT 10
)
SELECT t.*
FROM test AS t
JOIN recent USING (code_ver);
```

原查询若使用 `DISTINCT code_ver ORDER BY event_date`，同一版本有多个时间时排序语义并不清晰。使用 `MAX(event_date)` 明确“最近出现”的定义。

`NOT LIKE '%DevBld%'` 因前导通配符通常无法使用普通索引。如果这是高频条件，应考虑增加结构化的构建类型列。最终使用 `EXPLAIN ANALYZE` 检查派生表大小、扫描次数和连接索引。

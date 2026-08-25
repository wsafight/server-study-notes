---
title: 处理 IN 子查询中的 LIMIT 限制
description: 使用派生表、JOIN 或 CTE 改写 MySQL 不支持 LIMIT 的 IN 子查询。
---

部分 MySQL 版本不支持在 `IN`、`ALL`、`ANY` 或 `SOME` 子查询中直接使用 `LIMIT`。改写前先明确目标是限制候选值、限制最终明细行，还是为每个分组取 Top N，这三种语义不能互换。

## 识别版本限制

不受支持的写法会返回类似错误：

```text
This version of MySQL doesn't yet support
'LIMIT & IN/ALL/ANY/SOME subquery'
```

先在目标 MySQL 版本运行最小复现并检查执行计划。不要只因为语法报错就去掉 `LIMIT`，这可能把候选集合扩大到整张表。

## 使用派生表改写

如果目标是找到最近出现的 10 个版本，再返回这些版本的所有记录，可以先在派生表中完成分组和限制，再连接原表：

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

这里的 `LIMIT 10` 只限制版本数量，最终结果可能包含远多于 10 条明细记录。调用方必须明确接受这个结果粒度。

## 使用 CTE 表达阶段

MySQL 8.0 可以使用 CTE 提高可读性：

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

CTE 主要改善逻辑分段，不保证物化或自动获得更快计划。优化器如何处理 CTE 与派生表应以目标小版本的执行计划为准。

## 定义确定性顺序

原查询若使用 `DISTINCT code_ver ORDER BY event_date`，同一版本有多个时间时排序语义并不清晰。使用 `MAX(event_date)` 明确“最近出现”的定义。若多个版本的最大时间相同，还应增加稳定 Tie-breaker，避免每次选择的 10 个版本不同。

## 性能与验证

`NOT LIKE '%DevBld%'` 因前导通配符通常无法使用普通索引。如果这是高频条件，应考虑增加结构化的构建类型列。最终使用 `EXPLAIN ANALYZE` 检查派生表大小、扫描次数和连接索引。

测试少于 10 个版本、恰好 10 个、并列时间、单个版本大量明细和没有匹配行。改写后的结果应先与原业务定义比较，再讨论性能。

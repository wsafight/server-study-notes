---
title: 使用 EXPLAIN 分析执行计划
description: 解读 MySQL 的访问方式、扫描估算和附加操作，并用 EXPLAIN ANALYZE 校验实际执行。
---

`EXPLAIN` 展示优化器计划如何访问表、选择索引、连接和处理结果。它适合回答“数据库准备做什么”，但传统输出中的行数和成本大多是估算值。

```sql
EXPLAIN
SELECT id, amount
FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

MySQL 8.0 还可以使用更详细的格式：

```sql
EXPLAIN FORMAT=TREE SELECT ...;
EXPLAIN FORMAT=JSON SELECT ...;
```

## 常见字段

| 字段 | 关注点 |
| --- | --- |
| `type` | 表访问方式，例如 `const`、`ref`、`range`、`index`、`ALL` |
| `possible_keys` | 优化器认为可能使用的索引 |
| `key`、`key_len` | 实际选择的索引和使用长度 |
| `ref` | 用于索引查找的列或常量 |
| `rows` | 预计需要读取的行数 |
| `filtered` | 读取后预计通过条件的比例 |
| `Extra` | 覆盖索引、排序、临时表等附加信息 |

不能只凭一个字段下结论。小表使用 `ALL` 可能比索引访问更快；`Using filesort` 表示需要额外排序，不代表一定写磁盘；`Using temporary` 也需要结合结果规模和耗时判断。

## 校验实际执行

`EXPLAIN ANALYZE` 会真正执行查询，并返回每个节点的实际时间、行数和循环次数：

```sql
EXPLAIN ANALYZE
SELECT id, amount
FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

它比估算计划更能发现基数估算偏差、循环放大和错误的连接顺序。由于查询会被实际执行，不要直接对未知成本的语句或有副作用的操作使用；应先在测试环境或受控数据范围内验证。

如果估算与实际差异很大，应检查统计信息、数据倾斜、相关列和参数分布，再决定更新统计信息、创建直方图、调整索引或改写查询。

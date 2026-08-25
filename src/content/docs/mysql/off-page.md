---
title: 理解 InnoDB 溢出列
description: 说明不同行格式如何存储长 VARCHAR、TEXT、BLOB，以及溢出页对查询和索引的影响。
---

InnoDB 按页读写数据，默认页大小通常是 16 KiB。一行包含很长的 `VARCHAR`、`TEXT`、`BLOB` 或 `JSON` 时，部分列数据可以存到独立的溢出页，聚簇索引记录中保存指向它的引用。

## 行格式差异

- `COMPACT` 和 `REDUNDANT` 行格式通常在记录中保留长列的前 768 字节，再保存约 20 字节的溢出页指针。
- MySQL 8.0 默认的 `DYNAMIC` 行格式可以把长列主体完全放到溢出页，聚簇记录主要保留指针。
- `COMPRESSED` 与 `DYNAMIC` 的溢出策略相近，但还涉及页压缩。

查看表的行格式：

```sql
SELECT table_name, row_format
FROM information_schema.tables
WHERE table_schema = 'app_db'
  AND table_name = 'articles';
```

是否溢出取决于页大小、行格式、其他列宽度和记录开销，不能只用“某列超过 768 字节”判断。

## 性能影响

读取溢出列可能需要访问额外页面。如果列表查询只需要 ID、标题和时间，不要使用 `SELECT *` 把正文或大 JSON 一起读取：

```sql
SELECT id, title, created_at
FROM articles
ORDER BY created_at DESC
LIMIT 50;
```

二级索引也不能无限包含长字符串，必要时使用经过验证的前缀索引、生成列或全文索引。

把大列拆到附表可以降低热点主表行宽，但会增加 JOIN 和一致性维护成本。是否拆分应根据访问频率、缓存命中、更新模式和实际 I/O 测量决定。

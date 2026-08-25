---
title: 优化深度分页
description: 使用 Keyset Pagination、覆盖索引和延迟关联降低大 OFFSET 的扫描成本。
---

`LIMIT offset, size` 需要找到并丢弃前 `offset` 行。偏移量越大，扫描、回表和排序成本通常越高；并发写入时还可能出现重复或遗漏记录。

## 优先使用游标分页

按创建时间和唯一主键组成稳定顺序，把上一页最后一条记录作为游标：

```sql
SELECT id, created_at, title
FROM books
WHERE created_at < :last_created_at
   OR (created_at = :last_created_at AND id < :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

对应索引：

```sql
CREATE INDEX idx_books_created_id
ON books (created_at DESC, id DESC);
```

首屏不传游标条件。游标字段必须形成唯一、稳定的排序，否则相同时间的数据可能重复或遗漏。对移动端滚动列表和“下一页”场景，Keyset Pagination 通常比页码更合适。

## 必须跳到指定页时

可以先只从覆盖索引中定位主键，再关联完整行：

```sql
SELECT b.id, b.title, b.description
FROM books AS b
JOIN (
  SELECT id
  FROM books
  ORDER BY created_at DESC, id DESC
  LIMIT 100000, 20
) AS page_ids USING (id)
ORDER BY b.created_at DESC, b.id DESC;
```

这种延迟关联减少了深度扫描阶段的回表和行宽，但仍然要跳过 100000 个索引项，不能消除 OFFSET 的线性成本。

## 其他注意事项

- 搜索结果需要相关度、复杂筛选或跨字段检索时，可评估专用搜索引擎。
- 精确总页数可能比取一页数据更昂贵，可以异步统计或只返回“是否有下一页”。
- 分页期间数据持续变化时，明确需要实时视图还是一致快照。
- 前端虚拟列表只能降低渲染成本，不能优化数据库 OFFSET。

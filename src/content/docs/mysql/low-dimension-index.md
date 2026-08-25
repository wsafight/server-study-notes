---
title: 低基数列什么时候适合建索引
description: 从数据分布、查询比例和联合索引理解状态、布尔等低基数列的索引价值。
---

低基数列只有少量不同值，例如订单状态或布尔标记。不同值少不等于索引必然无效，真正重要的是查询能过滤掉多少行，以及索引能否同时满足排序、覆盖等需求。

假设任务表中 99.9% 的记录已经完成，只有少量任务处于 `pending`。下面的查询仍可能从状态索引中获益：

```sql
SELECT id, scheduled_at
FROM jobs
WHERE status = 'pending'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at, id
LIMIT 100;
```

可以评估联合索引：

```sql
CREATE INDEX idx_jobs_status_schedule
ON jobs (status, scheduled_at, id);
```

索引不仅定位稀少的 `pending` 行，还提供需要的排序。反过来，如果查询值覆盖表中大部分行，优化器可能正确地选择全表扫描。

## 验证方式

- 查看每个值的行数和变化趋势，不只统计 distinct 数量。
- 使用接近生产分布的数据运行 `EXPLAIN ANALYZE`。
- 数据高度倾斜且估算不准时，评估更新统计信息或创建直方图。
- 计算索引对写入、存储和 Buffer Pool 的额外成本。

低基数列单独索引可能收益有限，但作为符合查询顺序的联合索引前导列或覆盖列，仍可能非常有效。

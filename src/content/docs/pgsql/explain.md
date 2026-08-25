---
title: 使用 EXPLAIN 分析 PostgreSQL 查询
description: 阅读 PostgreSQL 执行计划的估算、实际行数、循环、Buffer 和排序信息。
---

`EXPLAIN` 展示优化器选择的计划，`EXPLAIN ANALYZE` 会实际执行并记录运行信息。优化目标通常是减少不必要的行、循环、随机 I/O、排序溢写和重复计算，而不是强制某一种扫描方式。

## 从安全选项开始

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS, SUMMARY)
SELECT customer_id, sum(total_amount)
FROM orders
WHERE created_at >= current_date - interval '30 days'
GROUP BY customer_id;
```

`ANALYZE` 会执行语句。对 `INSERT`、`UPDATE`、`DELETE` 或调用有副作用的函数，应在可回滚事务和隔离环境中测试：

```sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE ...;
ROLLBACK;
```

即使回滚，查询仍会产生锁、WAL、触发器和资源消耗，不能因此直接在生产运行。

## 阅读顺序

执行计划是树，从最深层节点产生数据，向上层传递。重点对比：

- `cost`：优化器根据成本参数得到的相对估算，不是毫秒。
- `rows`：每次循环的估算行数。
- `actual time` 与 `actual rows`：实际首行、总时间和每次循环行数。
- `loops`：节点执行次数，总处理量需要结合循环数理解。
- `Rows Removed by Filter`：读取后被条件过滤的工作量。
- `Buffers`：共享、本地和临时块的命中、读取、写入。

估算行数与实际值相差很大时，优先检查统计信息、数据倾斜、列相关性和参数分布。可以评估提高特定列统计目标或建立扩展统计，而不是先调整全局成本参数。

## 常见节点

- `Seq Scan`：顺序扫描，读取大比例数据时可能比索引更合理。
- `Index Scan`：通过索引定位后访问堆表。
- `Index Only Scan`：所需列来自索引，但可见性检查可能仍访问堆表。
- `Bitmap Index/Heap Scan`：汇总多个索引位置后按页面访问堆表。
- `Nested Loop`：外层结果较小时高效，估算错误时可能放大内层访问。
- `Hash Join`、`Merge Join`：适合不同数据规模、排序和内存条件。

排序或哈希节点显示磁盘批次、临时读写时，说明工作集超过对应操作可用内存。`work_mem` 是每个计划节点、每个并行工作进程可能使用的上限之一，不能按“连接数乘一次”简单调大。

## 生产分析流程

1. 从 `pg_stat_statements` 按累计时间、平均时间和调用次数定位候选 SQL，再用应用追踪补充 P95、P99 等尾延迟。
2. 保存查询文本、参数分布、Schema、统计信息和计划。
3. 用代表性数据比较改写、索引或统计调整。
4. 验证结果正确性、并发、WAL、锁和其他查询退化。
5. 上线后继续观察完整业务周期。

计划可能因参数、统计更新和版本升级变化。重要查询应保留基线并在升级前回放，而不是把一次计划文本当作永久事实。

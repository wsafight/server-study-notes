---
title: PostgreSQL 查询规划器与统计信息
description: 使用 pg_stats、扩展统计和执行计划定位基数估算错误并改善 PostgreSQL 查询规划。
---

规划器根据表和列统计信息估算每个节点会产生多少行，再比较顺序扫描、索引扫描、连接顺序和连接算法的成本。执行计划不理想时，首先确认估算为何错误，而不是直接关闭某种执行节点。

## 识别估算偏差

使用 `EXPLAIN (ANALYZE, BUFFERS)` 比较每个节点的估算行数与实际行数。某个早期节点相差几个数量级，错误会继续影响后续连接顺序、Hash Table 大小和内存使用。

```sql
EXPLAIN (ANALYZE, BUFFERS, SETTINGS)
SELECT *
FROM orders
WHERE tenant_id = 42
  AND status = 'pending';
```

先确认查询参数是否具有代表性。Prepared Statement 可能在多次执行后选择通用计划，若不同租户的数据量差异很大，通用计划未必适合每个参数。

## 查看列统计

```sql
SELECT attname,
       null_frac,
       n_distinct,
       most_common_vals,
       most_common_freqs,
       histogram_bounds,
       correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename = 'orders';
```

- `n_distinct` 描述不同值数量，负数表示与表行数的比例关系。
- Most Common Values 捕获热点值。
- Histogram 描述不在热点列表中的值分布。
- `correlation` 反映逻辑值顺序与物理行顺序的相关程度，会影响扫描成本估算。

统计信息是抽样结果，并且只描述单列时无法表达列间关系。

## 增加统计目标

对分布复杂且影响关键查询的列，可以提高统计目标后重新分析：

```sql
ALTER TABLE orders
ALTER COLUMN tenant_id SET STATISTICS 1000;

ANALYZE orders (tenant_id, status);
```

更高目标会增加 `ANALYZE` 时间、统计存储和规划成本，不应对所有列统一拉高。完成后再次比较估算误差和规划耗时。

## 扩展统计

当条件列存在依赖或组合分布时，创建扩展统计：

```sql
CREATE STATISTICS orders_tenant_status_stats
    (dependencies, mcv, ndistinct)
ON tenant_id, status
FROM orders;

ANALYZE orders;
```

`dependencies` 表达函数依赖，`mcv` 记录常见组合，`ndistinct` 改善组合不同值估算。扩展统计不会自动为查询创建索引，也不能替代准确的连接条件。

## 统计信息为何过期

Autovacuum 同时负责自动 `ANALYZE`，触发阈值与表规模和修改行数有关。批量导入、分区切换或数据分布突变后，应主动评估是否需要分析新数据。分区表需要同时关注父表和活跃分区的统计状态。

不要频繁无条件执行全库 `ANALYZE`。记录表修改规模、上次分析时间和关键计划变化，针对变化的数据集处理。

## 诊断顺序

1. 找到第一个实际行数明显偏离估算的节点。
2. 判断原因是统计过期、数据倾斜、列相关、表达式还是参数化计划。
3. 使用 `pg_stats` 和真实分布查询验证假设。
4. 选择更新统计、扩展统计、改写条件或调整索引。
5. 用多组典型参数重新比较计划、耗时、Buffers 和临时文件。

成本参数调整属于环境级决策，应基于存储和缓存基线；它不应被用来掩盖明显错误的基数估算。

---
title: 源码解析：优化器与 Join 选择
description: 基于 DuckDB v1.5.5，理解优化 Pass 顺序、Filter Pushdown、Join Order、基数估算、Build Side 和物理 Join 算法选择。
---

优化器不是一个接收 SQL、一次性吐出“最佳计划”的黑盒。在 DuckDB `v1.5.5` 中，它是一组按顺序运行的 Pass：有的简化表达式，有的移动 Filter，有的重排 Join，有的删除无关列，最后物理规划器再选择 Hash Join、Merge Join 或 Nested Loop Join 等具体实现。

这一章用三表查询贯穿源码：

```sql
SELECT c.segment, p.category, sum(o.amount) AS revenue
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id
JOIN products AS p ON o.product_id = p.product_id
WHERE o.order_date >= DATE '2026-08-01'
  AND c.active
GROUP BY c.segment, p.category;
```

## 先分清三类决定

一条 Join 查询至少有三种不同决定：

1. **等价改写：** Filter 能否提前，未使用列能否删除，表达式能否简化。
2. **逻辑 Join 顺序：** 先连接 `orders` 与 `customers`，还是先连接 `orders` 与 `products`。
3. **物理算法与方向：** 使用 Hash Join 还是范围 Join，哪一侧作为 Hash Table 的 Build Side。

它们发生在不同代码中。把所有变化都叫“CBO 选择”会掩盖真正原因，也很难找到正确断点。

## Optimizer 是有顺序的 Pass 管线

[`Optimizer::RunBuiltInOptimizers`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/optimizer.cpp#L111)明确写出了顺序。删去部分细节后，主线是：

```text
Expression Rewriter
  -> CTE Inlining
  -> Filter Pullup
  -> Filter Pushdown
  -> CTE Filter Pusher
  -> IN Clause / Deliminator 等改写
  -> Join Order
  -> Join Elimination
  -> Remove Unused Columns
  -> Column Lifetime
  -> Build Side / Probe Side
  -> Limit Pushdown / Row Group Pruner / Top-N
  -> Late Materialization
  -> Statistics Propagation
  -> Column Lifetime（第二轮）
  -> Reorder Filter
  -> Join Filter Pushdown
```

顺序会影响后续 Pass 能看到的信息。例如先做 Filter Pushdown，再做 Join Order，关系的有效基数可能更小；先删除无关列并分析列生命周期，再估算 Build Side 的行宽，会比只看原始表宽更合理。

这不是跨版本契约。阅读其他版本时，首先重新打开 `optimizer.cpp`，不要沿用这张表猜测。

## Filter Pushdown 如何落到扫描

[`FilterPushdown::Rewrite`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/filter_pushdown.cpp#L98)按逻辑算子类型分发。遇到 `LogicalFilter` 时拆分 AND 条件，交给 `FilterCombiner` 推导和合并；遇到 Join、Projection、Aggregate 时，根据列绑定和语义决定能否继续下推。

Filter 不能盲目穿过所有节点。例如 Outer Join 的保留侧、Window、带副作用或可能抛错的表达式，都需要额外语义判断。正确目标不是“Filter 越低越好”，而是“在不改变结果和错误语义的前提下尽可能早过滤”。

到达 `LogicalGet` 后，[`PushdownGet`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/pushdown/pushdown_get.cpp#L42)会尝试两层下推：

```text
表达式 Filter
  -> FilterCombiner
  -> TableFilterSet                 可转成扫描过滤器的部分
  -> LogicalGet::table_filters
  -> Table Function / 表扫描实现

剩余表达式
  -> 保留为 LogicalFilter
```

因此在 `EXPLAIN` 里看到扫描节点带 Filters，和看到扫描上方单独的 Filter，并不是同一种执行位置。Parquet 还会利用这些 `TableFilter` 做 Row Group 统计裁剪，后面再对幸存数据做行级过滤。

## 删除无关列为什么影响 Join 内存

`RemoveUnusedColumns` 与 `ColumnLifetimeAnalyzer` 不只是让计划看起来更短。Hash Join 的 Build Side 通常需要保存连接键和后续仍被引用的 Payload。如果查询最后只使用 `customers.segment`，客户表中地址、备注等宽列越早退出生命周期，Hash Table 就越小。

这也是为什么 `SELECT *` 会改变的不只是最终网络传输。它延长了更多列的生命周期，可能放大扫描、Join 状态和结果物化成本。

## Join Order 先构建关系图

[`JoinOrderOptimizer::Optimize`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/join_order/join_order_optimizer.cpp#L24)让 `QueryGraphManager` 从计划中抽取可重排关系和连接条件，形成关系图；不能安全重排的节点递归优化子树，但保留边界。

随后 `PlanEnumerator`：

1. 为单个关系初始化 Leaf Plan。
2. 枚举图上连通的关系集合。
3. 为同一关系集合保留当前代价更低的组合。
4. 从最佳组合重建逻辑 Join 树。

[`CostModel::ComputeCost`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/join_order/cost_model.cpp#L13)在此版本主要使用中间 Join 的估算基数：

```text
cost(join(left, right))
  = estimated_cardinality(left JOIN right)
  + cost(left)
  + cost(right)
```

所以 Join 顺序的核心问题是避免过早产生巨大中间结果。它不是完整模拟 CPU Cache、磁盘或某种物理 Join 的精细成本模型。

精确枚举可能组合爆炸。`v1.5.5` 在关系数达到 12 时直接进入近似求解；精确枚举产生 10000 个 Pair 后也会回退到启发式方案。这些阈值是当前实现细节，不应写进业务兼容逻辑。

## 基数估算错了会怎样

优化器需要估算：日期条件能留下多少订单、`active` 有多大选择率、连接键是否接近唯一，以及 Join 会产生多少行。单列 Min/Max、Distinct 和 Table Function 提供的统计可以帮助，但列相关性、热点 Key、复杂表达式和外部数据都可能造成偏差。

如果维表键本应唯一却包含重复值，Join 输出会被放大。优化器不是“算错了结果”，而是使用的分布假设不足，选择了在真实数据上代价较高的顺序。

用 `EXPLAIN` 查看估算行数，用 `EXPLAIN ANALYZE` 查看真实执行行数。重点找第一个明显偏离的节点，而不是只盯最终最慢节点：上游一次十倍低估可能经过多个 Join 继续放大。

需要注意，`Optimizer` 后段确实有一个 `StatisticsPropagator` Pass，但 Join Order 自己也通过关系统计和 Cardinality Estimator 估算组合。不能因为源码顺序中 `STATISTICS_PROPAGATION` 出现在 Join Order 后面，就断言 Join 排序前完全没有统计。

## Build Side 不只是“行数少的一侧”

等值 Hash Join 通常用右侧作为 Build Side、左侧作为 Probe Side。[`BuildProbeSideOptimizer`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/optimizer/build_probe_side_optimizer.cpp#L109)可以交换子节点和 Join 条件，让更合适的一侧位于右边。

它的 `GetBuildSize` 会估算：

- 行数乘以 Tuple 的估算行宽。
- Hash 值和 Hash Table Entry 开销。
- `VARCHAR`、`LIST`、`ARRAY` 等变长类型的额外惩罚。
- 列数量与嵌套列带来的成本。

因此 100 万行的窄整数 Key，未必比 80 万行的宽字符串 Payload 更贵。源码还考虑子树中已有 Join、Row ID 绑定和 Join Type 是否允许翻转。

## 物理规划器选择 Join 算法

逻辑顺序和左右方向确定后，[`PlanComparisonJoin`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/execution/physical_plan/plan_comparison_join.cpp#L22)才选择具体物理实现。`v1.5.5` 的主要决策可简化为：

```text
没有条件             -> PhysicalCrossProduct
存在等值条件          -> PhysicalHashJoin
可用的范围条件        -> IEJoin 或 Piecewise Merge Join
支持的非等值条件      -> PhysicalNestedLoopJoin
更通用的剩余条件      -> PhysicalBlockwiseNLJoin
```

范围 Join 还受条件数量、Join Type、两侧估算基数和设置阈值影响。例如至少两个范围条件才可能使用 IEJoin；较小输入会关闭某些范围算法。不要把这张简图当作强制 Hint，最终以目标版本的物理计划为准。

等值 Join 构造 `PhysicalHashJoin` 后，还会携带 Join Stats 和 Join Filter Pushdown 信息。Build Pipeline 先构建 Hash Table，依赖完成后 Probe Pipeline 才能用另一侧的 Key 查找匹配。

## 用禁用 Pass 做对照实验

DuckDB 提供 `duckdb_optimizers()` 查看当前版本的优化器名称：

```sql
SELECT name
FROM duckdb_optimizers()
ORDER BY name;
```

在一次可丢弃实验中，可以禁用单个 Pass 比较计划：

```sql
SET disabled_optimizers = 'filter_pushdown';
EXPLAIN SELECT * FROM orders WHERE order_date >= DATE '2026-08-01';

SET disabled_optimizers = '';
```

也可以分别实验 `join_order`、`build_side_probe_side` 或 `top_n`。这用于理解机制，不是生产调优的首选方案：禁用一个 Pass 会改变后续 Pass 的输入，差异不一定只局限于一个节点。

调试源码时，先在 `Optimizer::RunOptimizer` 观察 `type`，再把断点移到目标实现：

```lldb
breakpoint set -r 'duckdb::FilterPushdown::PushdownGet'
breakpoint set -r 'duckdb::JoinOrderOptimizer::Optimize'
breakpoint set -r 'duckdb::PlanEnumerator::SolveJoinOrder'
breakpoint set -r 'duckdb::BuildProbeSideOptimizer::TryFlipJoinChildren'
breakpoint set -r 'duckdb::PhysicalPlanGenerator::PlanComparisonJoin'
```

## 一套排查顺序

遇到 Join 查询慢或内存高时，按决策层次收集证据：

1. 检查 Filter 是否留在扫描附近，扫描列是否只包含所需列。
2. 比较每个节点的估算行数和实际行数，找到最早的严重偏差。
3. 验证 Join Key 的 NULL、Distinct、热点和唯一性，不只看总行数。
4. 确认 Join 顺序和 Build Side，估算 Build 行宽与 Payload。
5. 确认最终物理算法，再看它形成的 Pipeline、状态和 Spill 行为。
6. 每次改写都用双向 `EXCEPT ALL`、类型和 NULL 语义验证结果等价。

优化器只能依据它能看到的表达式、统计和设置做选择。把数据分布、类型和约束表达得更清楚，通常比依赖 SQL 书写顺序猜计划更可靠。

下一章进入[存储、MVCC、WAL 与 Checkpoint](../source-storage-transactions/)，解释扫描所看到的“表”在内存和磁盘上究竟由什么组成。

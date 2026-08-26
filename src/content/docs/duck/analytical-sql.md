---
title: DuckDB 分析 SQL 模式
description: 使用窗口函数、QUALIFY、PIVOT、ASOF JOIN 和嵌套类型表达常见 DuckDB 分析任务。
---

DuckDB 支持面向列式执行的分析 SQL。好的查询先明确结果粒度、排序规则和时间边界，再选择窗口、聚合或连接；把所有逻辑堆进一个巨大查询通常不利于验证和复用。

## 窗口函数与 QUALIFY

窗口函数保留输入行，同时在分区内计算排名、累计值或相邻行差异：

```sql
SELECT
    customer_id,
    order_id,
    ordered_at,
    amount,
    row_number() OVER (
        PARTITION BY customer_id
        ORDER BY ordered_at DESC, order_id DESC
    ) AS recency_rank,
    sum(amount) OVER (
        PARTITION BY customer_id
        ORDER BY ordered_at, order_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_amount
FROM orders
QUALIFY recency_rank <= 3;
```

窗口排序必须包含稳定的 Tie-breaker，否则相同时间的数据可能得到不稳定顺序。明确使用 `ROWS`、`RANGE` 或 `GROUPS` Frame，不要依赖默认 Frame 猜测累计语义。

## 条件聚合与 PIVOT

指标列数量固定时，条件聚合简单且可移植：

```sql
SELECT
    date_trunc('month', ordered_at) AS month,
    sum(amount) FILTER (WHERE status = 'paid') AS paid_amount,
    count(*) FILTER (WHERE status = 'refunded') AS refund_count
FROM orders
GROUP BY ALL
ORDER BY month;
```

`PIVOT` 和 `UNPIVOT` 适合在宽表与长表之间转换。动态类别会改变结果 Schema，进入稳定流水线前应固定允许的类别或在下游处理 Schema 演进。具体语法能力随 DuckDB 版本变化，应以锁定版本测试。

## ASOF JOIN

时间序列常需要为每条事件匹配同一实体在该时刻之前最近的一条状态：

```sql
SELECT
    t.symbol,
    t.traded_at,
    t.price,
    q.bid,
    q.ask
FROM trades AS t
ASOF LEFT JOIN quotes AS q
    ON t.symbol = q.symbol
   AND t.traded_at >= q.quoted_at;
```

匹配前应去除或定义同一时间点重复状态的规则，并限制允许的最大时间差。否则很久以前的记录也可能被当作有效状态。

## Top N 与代表值

需要每组最大值对应的其他列时，可以使用窗口排名，或在适合的场景评估 `arg_max`、`arg_min`。不要先对数值取 `max()` 再随意选择同组另一列，它们可能来自不同行。

对近似基数、分位数和采样函数，应记录误差容忍度和版本。探索阶段接受近似并不代表财务结算或审计输出也能接受。

## List、Struct 与 Map

嵌套类型适合保留 Parquet 或 JSON 的层次结构，减少不必要的展开。使用 `unnest` 前先估算元素数量，因为多个数组展开可能产生乘法级行数。

如果某个嵌套字段经常用于过滤、连接或数据质量约束，应在标准化阶段提取为有类型列。嵌套结构适合传递局部上下文，不应掩盖结果粒度。

## 让查询可验证

将复杂分析拆成命名清楚的 CTE 或临时表，并在每个阶段验证：

- 主键或预期粒度是否唯一。
- 连接前后的行数和金额是否意外放大。
- `NULL`、空集合和缺失时间如何处理。
- 排序和时间窗口是否包含确定性边界。
- 输出 Schema、类型和时区是否符合契约。

最后使用 `EXPLAIN ANALYZE` 检查查询是否重复扫描输入、生成超大中间结果或把排序与 Hash 结构推到内存边界。

## 继续阅读

涉及金额、空值和时间窗口时参见[类型、NULL 与时间语义](./types-and-time/)；查询正确但成本过高时进入[查询性能与资源控制](./query-optimization/)。

---
title: DuckDB 执行引擎与查询成本
description: 从向量化执行、流水线、阻塞算子、统计估算和存储裁剪理解 DuckDB 查询为何快或为何耗尽资源。
---

如果还没有完成建表和文件查询，先运行[DuckDB 入门](./intro/)中的示例。本文不会要求你记住数据库内核代码，而是从一条已经能运行的 SQL 出发，逐层解释它为什么快、什么时候会变慢。

面对一条分析 SQL，先问三个问题：

1. **读多少：** 打开多少文件，读取多少列和行？
2. **中间状态多大：** 连接、分组和排序过程中需要记住多少数据？
3. **结果送到哪里：** 返回几行，是否要全部转换成 Python 或 DataFrame 对象？

后面的向量化、流水线、基数和 Spill，都是为了更准确地回答这三个问题。本文讨论 DuckDB 1.x 中相对稳定的执行思想；物理算子名称、优化规则和 Profile 字段会随版本变化，最终仍要用目标版本验证。

## 从一条汇总 SQL 开始

沿用入门篇中的 `orders` 表，查看各地区已支付订单的总金额：

```sql
EXPLAIN ANALYZE
SELECT
    region,
    sum(amount) AS total_amount
FROM orders
WHERE status = 'paid'
GROUP BY region
ORDER BY total_amount DESC;
```

先不看算子名称，这条查询的数据流可以简化为：

```text
orders 表
   -> 扫描需要的 region、status、amount 三列
   -> 过滤掉 status 不是 paid 的行
   -> 按 region 分组并累加 amount
   -> 对少量地区汇总结果排序
   -> 返回结果
```

这已经能解释大部分成本。订单表可能有一亿行，所以扫描和过滤处理很多数据；分组阶段只需维护每个地区的累计金额；如果只有几十个地区，最后的排序几乎不重要。反过来，若按 `order_id` 分组，分组数接近订单数，中间状态就会大很多。

`EXPLAIN` 只展示计划，`EXPLAIN ANALYZE` 会真实执行并记录实际行数与耗时。计划通常把最终结果显示在上方、扫描显示在下方；分析数据流时可以从最底部扫描开始向上读。

## SQL 如何变成执行计划

DuckDB 不会严格按照 SQL 文本从上到下执行。它大致经过五步，英文名称只是阅读计划或源码时的对照：

| 阶段 | 白话解释 | 主要工作 |
| --- | --- | --- |
| Parser 与 Binder | 先确认问题能不能成立 | 解析语法，找到表和列，确定函数与数据类型 |
| 逻辑优化 | 在答案不变的前提下改写问题 | 提前过滤、删除无关列、简化表达式、调整连接顺序 |
| 物理计划 | 为每一步选择具体算法 | 选择扫描、Hash Join、聚合、排序等实现 |
| Pipeline 调度 | 把能连续工作的步骤连起来 | 将任务拆分并交给一个或多个线程分批执行 |
| 结果交付 | 把答案交给调用方 | 返回 Batch、写入表或文件、转换为 Arrow |

例如下面查询把事实数据与客户维表连接。优化器可能把日期过滤推进 Parquet 扫描，并自行决定先处理哪一侧，而不是照着 SQL 的书写顺序机械执行：

```sql
EXPLAIN ANALYZE
SELECT d.plan, sum(f.amount) AS revenue
FROM read_parquet('data/events/*.parquet') AS f
JOIN customer_dim AS d USING (customer_id)
WHERE f.event_date >= DATE '2026-08-01'
  AND f.event_date <  DATE '2026-09-01'
GROUP BY d.plan
ORDER BY revenue DESC;
```

阅读计划时从扫描端向结果端追踪五件事：读了哪些文件和列、过滤后剩多少行、连接前后行数如何变化、哪些节点维护全局状态、最终结果在哪里物化。不要只寻找耗时最高的最后一个节点；它可能只是在消费上游已经放大的数据。

## 向量化不是逐行执行

最直观但低效的执行方式，是取出一行，依次判断状态、读取地区、累加金额，然后再取下一行。DuckDB 会一次处理一批数据。

同一列的一批值称为 Vector（向量），多个列向量组成一个 `DataChunk`。过滤时不一定复制所有值，可以先保存“这一批中哪些位置符合条件”的选择向量；后续算子只处理这些位置。内置表达式因此能在紧凑循环中批量计算，减少逐行解释和函数调用开销。

当前实现常见的标准向量大小是 2048 行，但这是内部实现细节，不应作为业务分批大小或兼容性契约。重要的是以下成本差异：

- 内置 SQL 函数通常留在向量化执行路径中。
- Python 等语言的逐行 UDF 需要频繁跨越运行时边界，可能失去批处理优势。
- Arrow 可以减少部分数据交换复制，但连接、排序、类型转换和结果持有仍会分配内存。
- `fetchall()` 或转换为 DataFrame 可能在客户端一次物化完整结果，即使引擎内部一直分批执行。

RSS 表示操作系统看到的整个进程内存。因此，“查询执行时没有超出 `memory_limit`”不表示把结果转换成 DataFrame 后 RSS 也安全。大结果优先流式消费，或直接使用 `COPY` 写出文件，并分别测量引擎内存与宿主进程内存。

## 流式算子与阻塞算子

可以连续接收并产出 `DataChunk` 的扫描、过滤和普通投影，通常能像流水线一样边读边处理。另一些步骤必须先记住大量信息，无法收到一批就立即给出最终答案。

Hash 是一种通过键快速查找数据的结构。Hash Join 通常先为连接的一侧建立查找表，再用另一侧的键查找匹配行；Hash Aggregate 则为每个分组键保存一份计数、求和等聚合状态。

| 算子形态 | 主要状态 | 资源风险 |
| --- | --- | --- |
| 扫描、过滤、投影 | 当前 Batch 与解码缓冲区 | 读取列过宽、表达式 CPU 高、远程请求多 |
| Hash Join 构建侧 | 连接键、Payload 与哈希表 | 构建侧估算错误或多对多连接导致内存和输出爆炸 |
| Hash Aggregate | 每个分组的键与聚合状态 | 高基数分组接近输入行数，状态无法保持很小 |
| Sort、Window | 排序键、分区和中间 Runs | 大范围排序、单个超大窗口分区、临时磁盘不足 |
| 结果物化 | 完整结果或客户端对象 | `SELECT *` 返回大量宽行，应用内存超过引擎预算 |

这类必须建立较多状态的步骤常被称为阻塞算子或 Pipeline Breaker。“阻塞”不等于“单线程”，也不表示所有输入必须永久留在内存。DuckDB 可以对部分算子使用并行局部状态、合并和外部执行；内存不足时，部分计算会 Spill，也就是把中间数据暂时写到磁盘。但不同算子、数据类型与版本的溢写能力并不相同，`memory_limit` 也不是操作系统 RSS 的硬上限。

估算内存时先看状态规模，而不只看输入文件大小：

- Hash Join 近似受构建侧行数、键宽度、Payload 和哈希开销控制。
- Hash Aggregate 近似受不同分组数和每组聚合状态控制。
- Sort 与 Window 受参与计算的行数、行宽和分区倾斜控制。
- 并行任务会产生局部状态；增加 `threads` 可能提高吞吐，也可能提高峰值内存并争用带宽。

`LIMIT` 只限制最终结果，不保证上游工作同样受限。`ORDER BY ... LIMIT` 可能使用 Top-N 优化，而窗口、聚合或连接仍可能必须处理全部输入；应以实际物理计划为准。

## 基数就是“有多少行”

执行计划中的 Cardinality（基数）可以先理解为行数。优化器需要预估每一步会产生多少行，才能决定连接顺序、Hash Join 用哪一侧建立查找表，以及为中间状态准备多少资源。`EXPLAIN ANALYZE` 则让我们比较估算行数和真实行数。

持久表统计、Parquet 元数据与过滤条件能提供信息，但以下场景经常让单列统计不够：

- 两个过滤列高度相关，例如国家与城市。
- 连接键严重倾斜，少量 Key 占据大部分行。
- 连接键并不唯一，实际是多对多关系。
- 过滤或连接键经过复杂函数、类型转换或 UDF。
- 外部 Table Function 无法提供准确基数。
- 参数在不同执行中对应完全不同的选择率。

不要通过强制交换 SQL 中表的左右顺序来猜连接计划。先比较估算行数与实际行数，再验证键的分布和唯一性：

```sql
SELECT
    sum(rows_per_key) AS rows,
    count(*) AS distinct_keys,
    max(rows_per_key) AS max_rows_per_key
FROM (
    SELECT customer_id, count(*) AS rows_per_key
    FROM events
    GROUP BY customer_id
) AS key_distribution;
```

这条查询同时给出总行数、不同键数量和最大热点键规模。发现估算偏差后，可尝试提前过滤、把复杂表达式规范化为明确类型、对重复使用的阶段建立临时表，或在目标版本使用支持的统计维护能力。每次修改都要检查结果类型与重复行，而不只比较耗时。

## 存储裁剪发生在多个层次

减少扫描不是一个单独开关，而是一组从粗到细的机会：

1. 分区目录或 Manifest 排除不相关文件。
2. Parquet Row Group 统计或 DuckDB 持久存储的 Zone Map 排除不可能命中的范围。
3. 列裁剪避免读取未引用的列。
4. 过滤选择向量避免后续算子处理不匹配的行。

Zone Map 可以理解为一段数据的“最小值与最大值标签”，它不是 B-Tree 索引。查询八月份数据时，如果某段的日期范围完全在七月，DuckDB 可以直接跳过这一段。数据按常用范围列排序或聚簇时，多个段的 Min/Max 重叠较少，跳过效果更好；随机分布时，每段都可能覆盖完整范围，标签存在却无法排除数据。

优先使用类型一致、边界明确的范围谓词：

```sql
WHERE event_time >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND event_time <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
```

DuckDB 能重写部分表达式，但不能假设任意包裹列的函数都可下推。对同一逻辑条件比较计划中的过滤位置、扫描文件数、读取行数和远程请求字节。排序换来的裁剪收益也必须和写入排序成本、数据更新方式一起计算。

## CTE、视图与物化边界

CTE 是以 `WITH` 开头、给一段子查询命名的写法。它能让复杂 SQL 更易读，但不等于固定的临时表。DuckDB 可能根据引用次数、表达式性质和版本规则选择内联或物化，也支持显式提示：

```sql
WITH recent AS MATERIALIZED (
    SELECT customer_id, amount
    FROM read_parquet('data/events/*.parquet')
    WHERE event_date >= DATE '2026-08-01'
)
SELECT customer_id, sum(amount)
FROM recent
GROUP BY customer_id;
```

物化可以避免重复扫描或重复计算，但会写入中间状态，也可能阻止更深的过滤下推。`AS NOT MATERIALIZED` 允许优化器考虑内联，并不保证所有查询都能内联。视图通常也不提供持久计算结果。

需要稳定的阶段边界、复用中间结果或单独建立质量检查时，显式临时表通常比依赖 CTE 启发式更容易观测。代价是额外写入、生命周期管理和可能的磁盘占用。选择前比较完整计划，而不是比较某一段 SQL 的字符数。

## 建立可解释的成本模型

排查时可以用下面的近似式组织证据，它不是 DuckDB 优化器内部公式：

```text
总时间 ≈ 文件发现与请求延迟
       + 读取字节 / 有效带宽
       + 解码和表达式 CPU
       + 连接、聚合、排序的状态构建
       + Spill 读写
       + 结果序列化与客户端消费
```

不同现象对应不同的第一证据：

| 现象 | 优先检查 |
| --- | --- |
| CPU 高、读取字节少 | 表达式、解压、类型转换、UDF、Hash 或排序计算 |
| 远程查询首字节慢 | 文件列举、请求数、区域、凭据获取与小文件 |
| 峰值内存高 | Join 构建侧、分组数、窗口分区、线程数与结果物化 |
| 临时磁盘大量写入 | 哪个阻塞算子 Spill、磁盘带宽与空间余量 |
| 输出行数异常增加 | 多对多连接、非唯一维表、`UNNEST` 或交叉连接 |
| 计划在不同数据上波动 | 统计、参数选择率、倾斜、Schema 或版本变化 |

## 一组递进实验

在可丢弃目录中生成事实表和维表，固定版本、线程、内存和临时目录：

```sql
SET threads = 4;
SET memory_limit = '512MB';
SET temp_directory = 'tmp';

CREATE OR REPLACE TABLE fact_events AS
SELECT
    i AS event_id,
    1 + (i % 100000) AS customer_id,
    DATE '2025-01-01' + CAST(i % 365 AS INTEGER) AS event_date,
    CAST((i * 7919) % 100000 AS INTEGER) AS amount_cents
FROM range(1, 10000001) AS generated(i);

CREATE OR REPLACE TABLE customer_dim AS
SELECT
    i AS customer_id,
    ['free', 'pro', 'enterprise'][1 + (i % 3)] AS plan
FROM range(1, 100001) AS customers(i);

EXPLAIN ANALYZE
SELECT
    d.plan,
    sum(f.amount_cents) AS revenue_cents
FROM fact_events AS f
JOIN customer_dim AS d USING (customer_id)
WHERE f.event_date >= DATE '2025-08-01'
  AND f.event_date <  DATE '2025-09-01'
GROUP BY d.plan
ORDER BY revenue_cents DESC;
```

依次只改变一个因素：

1. 对窄日期范围与全年范围运行同一连接聚合，比较估算行数、实际行数和扫描耗时。
2. 给 `customer_dim` 中一部分 Key 复制多行，观察连接放大如何传播到聚合。
3. 比较直接范围谓词与业务中的复杂转换谓词，确认过滤是否仍在扫描端。
4. 让同一清洗结果被引用两次，比较 CTE 内联、`AS MATERIALIZED` 与显式临时表。
5. 降低内存限制后运行高基数聚合或全量排序，记录 Spill、临时目录增长和取消延迟。
6. 分别流式读取、转换为 DataFrame 和 `COPY` 写出同一大结果，比较 DuckDB 指标与进程 RSS。

每轮保存 `EXPLAIN ANALYZE`、JSON Profile、输入行数、输出行数、结果校验、墙钟时间、CPU、RSS 和临时磁盘峰值。只有查询结果通过 `EXCEPT ALL` 双向差集且类型一致，性能比较才成立。

## 继续阅读

[查询性能与资源控制](./query-optimization/)说明如何采集 Profile、设置边界并验证结果等价；[Parquet 布局](./parquet-layout/)继续展开 Row Group、排序和小文件成本；[可复现实验](./reproducible-lab/)提供完整的本地实验脚本。准备进入实现时，从[一条 SQL 的完整生命周期](./source-query-lifecycle/)建立调用地图，再阅读[向量化执行与 Pipeline](./source-vectorized-execution/)。

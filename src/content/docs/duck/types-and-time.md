---
title: DuckDB 类型、NULL 与时间语义
description: 控制 DuckDB 类型转换、NULL、DECIMAL、浮点数、时间戳和时区语义，避免分析结果出现静默偏差。
---

分析查询即使成功执行，也可能因为类型提升、`NULL`、精度或时区理解错误而返回错误结果。稳定任务应先声明输入与输出契约，再使用显式转换和边界测试证明语义符合预期。

## 先固定类型契约

CSV 和 JSON 的自动推断适合探索，不适合决定长期表结构。读取后先检查列名与类型：

```sql
DESCRIBE
SELECT *
FROM read_parquet('incoming/orders/*.parquet');

SELECT
    typeof(order_id) AS order_id_type,
    typeof(amount) AS amount_type
FROM read_parquet('incoming/orders/*.parquet')
LIMIT 1;
```

规范化阶段显式转换关键字段。必须合法的数据使用 `CAST` 让任务快速失败；允许隔离的数据使用 `TRY_CAST`，并统计转换失败数：

```sql
CREATE TEMP TABLE normalized_orders AS
SELECT
    CAST(order_id AS BIGINT) AS order_id,
    TRY_CAST(amount AS DECIMAL(18, 2)) AS amount,
    filename
FROM read_csv(
    'incoming/orders/*.csv',
    all_varchar = true,
    filename = true
);

SELECT count(*) AS invalid_amount_rows
FROM normalized_orders
WHERE amount IS NULL;
```

这个计数还会包含源值本来就是空值的记录。需要区分“源值缺失”和“转换失败”时，应在规范化表中同时保留原始列或独立错误码。

不要依赖字符串、整数、日期之间的隐式转换。表达式、`UNION`、比较和连接可能选择共同类型；版本升级或新增文件也可能改变类型组合。关键连接键、过滤列和最终输出都应显式对齐类型。

## 正确处理 NULL

`NULL` 表示未知或缺失，不等于空字符串、零，也不能使用 `= NULL` 判断。SQL 比较可能得到 `TRUE`、`FALSE` 或 `NULL`，而 `WHERE` 只保留结果为 `TRUE` 的行。

```sql
SELECT *
FROM orders
WHERE cancelled_at IS NULL;
```

聚合函数通常忽略 `NULL`，但 `count(*)` 统计所有行，`count(column)` 只统计该列非空的行。报表应同时输出分母与缺失数，避免平均值悄悄排除未知值：

```sql
SELECT
    count(*) AS row_count,
    count(amount) AS amount_count,
    count(*) FILTER (WHERE amount IS NULL) AS missing_amount_count,
    avg(amount) AS average_known_amount
FROM orders;
```

使用 `NOT IN` 时，只要候选集合含 `NULL`，结果就可能全部变成未知。反连接优先写成 `NOT EXISTS`，并显式定义空键规则：

```sql
SELECT c.customer_id
FROM customers AS c
WHERE NOT EXISTS (
    SELECT 1
    FROM blocked_customers AS b
    WHERE b.customer_id = c.customer_id
);
```

需要把两个可空值的 `NULL` 视为相等时，使用 `IS NOT DISTINCT FROM`，不要到处用哨兵值替换；哨兵可能与真实数据冲突，也会改变排序和统计。

## 金额与浮点数

金额、费率和需要精确十进制舍入的指标优先使用 `DECIMAL(precision, scale)`。精度决定总位数，Scale 决定小数位数；输入超出范围时应失败或进入隔离流程。

```sql
SELECT
    order_id,
    CAST(unit_price AS DECIMAL(18, 2))
      * CAST(quantity AS INTEGER) AS line_amount
FROM order_lines;
```

乘法、除法、聚合和不同精度列混算时，结果类型可能扩大或转成其他数值类型。使用 `typeof` 检查关键表达式，并在发布边界再次转换成声明的精度。舍入规则必须由业务定义，不要依赖展示层截断。

`FLOAT` 和 `DOUBLE` 适合测量值和近似计算，但二进制浮点数不能精确表示所有十进制小数。不要直接用浮点等值判断对账结果；使用业务容差，并单独拒绝或标记 `NaN` 与无穷值。

## 区分本地时间与绝对时刻

`TIMESTAMP` 表示没有时区的日期时间，适合“门店每天 09:00 开门”这类墙上时间；`TIMESTAMPTZ` 表示时间线上的绝对时刻，适合日志、交易和跨地区事件。`TIMESTAMPTZ` 的显示受会话时区影响，但表示的时刻不因此改变。

生产任务先固定会话时区，并让带时区输入保留偏移量：

```sql
SET TimeZone = 'UTC';

SELECT TIMESTAMPTZ '2026-08-26 09:00:00+08:00' AS occurred_at;
```

将某地墙上时间解释为一个绝对时刻，以及把绝对时刻投影到某地时间，是方向相反的操作：

```sql
SELECT
    TIMESTAMP '2026-08-26 09:00:00'
        AT TIME ZONE 'Asia/Shanghai' AS instant,
    TIMESTAMPTZ '2026-08-26 01:00:00+00:00'
        AT TIME ZONE 'Asia/Shanghai' AS local_time;
```

不要用固定 `+08:00` 代替所有地区的命名时区。涉及夏令时的本地时间可能重复或根本不存在，解析策略必须由业务指定并用转换日样本测试。没有来源时区的字符串不能仅靠数据库推断其真实时刻。

## 使用半开时间区间

批处理和分区过滤使用左闭右开区间 `[start, end)`，避免小数秒精度和批次衔接问题：

```sql
SELECT *
FROM events
WHERE occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00:00'
  AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00:00';
```

不要使用 `23:59:59` 表示一天结束。时间戳可能具有更细精度，后续系统也可能提高精度。按业务时区划分“自然日”时，应先在该时区计算日边界，再转换为绝对时刻过滤。

## 保证排序可重复

SQL 未声明 `ORDER BY` 时不保证输出顺序。窗口函数、Top N、分页和导出文件需要稳定结果时，排序键必须包含唯一 Tie-breaker：

```sql
SELECT *
FROM events
ORDER BY occurred_at, event_id;
```

同时明确 `NULLS FIRST` 或 `NULLS LAST`。文本比较还受大小写、Unicode 规范化和 Collation 影响；标识符连接前应在数据生产阶段统一规范，而不是依赖当前环境的显示顺序。

## 发布前验证

为类型契约建立机器可判断的检查：

- `DESCRIBE` 结果与声明 Schema 一致。
- 必填列没有 `NULL`，宽松转换失败数在阈值内。
- 金额汇总与来源守恒，输出精度和舍入符合契约。
- 时间最小值、最大值和分区边界符合预期时区。
- 主键、连接键没有因为转换截断或出现重复。
- 相同输入重复执行后，排序和结果校验和一致。

类型或时区规则变化属于数据契约变更。发布前应使用旧数据、新数据、边界值和目标 DuckDB 版本共同回归，而不是只验证查询能否执行。

## 继续阅读

输入契约的落地方式参见[查询与转换数据文件](./data-files/)，批量任务中的质量闸门参见[可重跑数据流水线](./data-pipelines/)。

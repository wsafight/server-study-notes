---
title: 使用 DuckDB 查询与转换数据文件
description: 安全读取 CSV、JSON 与 Parquet，控制 Schema、分区裁剪、远程访问和导出结果。
---

DuckDB 可以把文件直接作为表查询，省去先导入数据库的步骤。生产管道仍应显式管理 Schema、文件列表和异常数据，避免完全依赖抽样推断。

## 读取 Parquet

```sql
SELECT
  region,
  count(*) AS order_count,
  sum(amount) AS total_amount
FROM read_parquet('lake/orders/year=2026/month=08/*.parquet', hive_partitioning = true)
WHERE status = 'paid'
GROUP BY region;
```

Parquet 保存列统计和分列数据。DuckDB 可以进行列裁剪、过滤下推和分区裁剪，只读取查询需要的列与 Row Group。谓词写法、文件统计和远程文件系统会影响能否下推。

大量很小的文件会增加列表、打开和元数据请求开销；单个过大文件又会限制并行和增量管理。文件大小、Row Group 和分区粒度应根据查询条件、对象存储请求成本和写入方式测试。

## 控制 CSV Schema

探索时可以自动推断：

```sql
SELECT *
FROM read_csv_auto('incoming/orders.csv');
```

稳定管道应显式指定关键列和格式，避免后续文件中的空值、日期或超长数字改变推断结果：

```sql
SELECT *
FROM read_csv(
  'incoming/orders.csv',
  columns = {
    'order_id': 'BIGINT',
    'created_at': 'TIMESTAMP',
    'amount': 'DECIMAL(18,2)'
  },
  header = true
);
```

对无法解析的记录，应明确选择任务失败、隔离坏行还是使用宽松模式，并输出坏行数量和来源文件。静默转为 `VARCHAR` 可能把质量问题推迟到下游。

## 读取 JSON 与嵌套结构

JSON 输入可能是一个顶层数组，也可能是每行一个对象的 NDJSON。稳定管道应明确输入格式和列类型，不要让抽样结果决定长期 Schema：

```sql
CREATE TEMP TABLE raw_events AS
SELECT *
FROM read_json(
    'incoming/events/*.ndjson',
    format = 'newline_delimited',
    columns = {
        'event_id': 'UBIGINT',
        'occurred_at': 'VARCHAR',
        'payload': 'STRUCT(user_id BIGINT, items STRUCT(sku VARCHAR, quantity INTEGER)[])'
    },
    filename = true
);
```

`STRUCT` 和 `LIST` 可以保留 JSON 层次，只有确实需要按元素连接或聚合时才展开数组：

```sql
SELECT
    event_id,
    try_strptime(occurred_at, '%Y-%m-%dT%H:%M:%S%z') AS occurred_at,
    payload.user_id,
    item.sku,
    item.quantity,
    filename
FROM raw_events,
LATERAL unnest(payload.items) AS items(item);
```

展开会改变结果粒度。展开前后应分别记录事件数和元素数；多个数组同时展开可能产生笛卡尔积。经常用于过滤或连接的嵌套字段，应在规范化阶段提取为有类型列。

探索未知 JSON 时可以先推断 Schema，再使用 `DESCRIBE` 或 `json_structure` 检查结果；进入生产后，将确认过的结构写进读取参数或使用 `json_transform` 转换。不同文件增加可选字段时，可以按列名合并，但必须验证缺失字段、类型冲突和嵌套结构变化。把所有内容退化成 `JSON` 或 `VARCHAR` 只会把兼容性问题推迟到查询阶段。

对坏记录建立隔离流程，而不是默认忽略解析错误：先在受限环境按文件或分片读取，失败时记录来源文件和批次，再把可疑输入移入隔离区。使用宽松解析选项前，要在锁定版本中确认它适用的 JSON 格式以及会跳过哪些错误，并将跳过数设为质量闸门。

不可信 JSON 还需要限制文件数、单文件大小、单对象大小、嵌套深度和数组元素数量。语法解析成功不代表数据有效，枚举、时间范围、主键和业务必填字段仍需单独检查。

## 批量读取与来源追踪

使用受控 glob 或明确文件清单批量读取，并保留文件名列，便于定位异常数据。不同文件 Schema 不一致时，可以按列名对齐，但缺失列和类型提升规则必须经过验证。

不要让外部请求直接拼接文件路径、URL 或 SQL。文件读取能力等同于数据访问权限，应限制允许目录、远程域名、凭据范围和扩展安装来源。

## 导出结果

```sql
COPY (
  SELECT customer_id, sum(amount) AS total_amount
  FROM read_parquet('lake/orders/*.parquet')
  GROUP BY customer_id
) TO 'output/customer_totals.parquet'
  (FORMAT PARQUET, COMPRESSION ZSTD);
```

写出前先使用临时路径，完成后校验行数、Schema 和文件大小，再通过原子重命名或对象存储发布流程暴露结果，避免消费者读取半成品。

## 远程对象存储

远程 HTTP 或对象存储通常需要相应扩展和凭据。使用最小权限、短期凭据和明确区域，监控请求次数、读取字节、重试和限流。生产环境应预装并锁定扩展，避免运行时从未审查来源下载代码。

网络错误可能发生在查询执行中途。输出任务应可重试且幂等，并通过清单或完成标记区分完整数据集与部分结果。

## 继续阅读

长期保存分析文件时继续学习[Parquet 布局](./parquet-layout/)；规范化类型与时间字段时参见[类型、NULL 与时间语义](./types-and-time/)；希望理解列裁剪、Row Group 裁剪与解码实现时继续阅读[Parquet 扫描源码](./source-parquet-scan/)。

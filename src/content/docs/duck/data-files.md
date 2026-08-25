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

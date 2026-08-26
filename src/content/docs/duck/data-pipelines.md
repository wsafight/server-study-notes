---
title: 使用 DuckDB 构建可重跑数据流水线
description: 设计分阶段、幂等、可验证的 DuckDB 批处理和 Parquet 发布流程。
---

DuckDB 很适合在单机任务中完成抽取、清洗、连接、聚合和 Parquet 写出。可靠流水线的核心不是一条 SQL 有多短，而是同一输入能否产生同一输出、失败能否安全重跑、结果能否追溯。

## 分离四个阶段

1. Ingest：读取不可变输入并记录 Manifest。
2. Normalize：显式转换类型、时区、枚举和缺失值。
3. Transform：按明确粒度连接与聚合。
4. Publish：验证后发布新版本，不修改读取中的数据集。

阶段之间可以使用临时表、持久 DuckDB 文件或版本化 Parquet。选择取决于数据量、失败重算成本和中间结果是否需要审计。

## 固定输入 Manifest

通配符路径的文件集合可能在任务运行中变化。开始时先解析并保存输入对象列表、大小、修改标识和业务分区；重试复用同一 Manifest，而不是再次扫描活动目录。

Manifest 还应记录：

- DuckDB 和扩展版本。
- 查询或代码提交版本。
- 配置、时区和重要资源限制。
- 上游数据版本或数据库恢复点。
- 预期输出 Schema 和分区策略。

## 显式规范化

```sql
CREATE TEMP TABLE normalized_orders AS
SELECT
    order_id::BIGINT AS order_id,
    customer_id::BIGINT AS customer_id,
    try_strptime(ordered_at, '%Y-%m-%dT%H:%M:%S%z') AS ordered_at,
    amount::DECIMAL(18, 2) AS amount,
    upper(trim(status)) AS status,
    filename
FROM read_csv(
    $input_files,
    columns = {
        'order_id': 'VARCHAR',
        'customer_id': 'VARCHAR',
        'ordered_at': 'VARCHAR',
        'amount': 'VARCHAR',
        'status': 'VARCHAR'
    },
    filename = true
);
```

示例中的 `$input_files` 应由调用方通过参数安全绑定。`try_` 转换便于把坏数据送入隔离表，但不能静默丢弃；必须统计失败行并保存来源文件和原始值。

## 建立质量闸门

发布前至少检查：

- 关键列空值与类型转换失败数。
- 业务主键重复和连接后的行数放大。
- 输入与输出行数、金额或其他守恒指标。
- 枚举值、时间范围和数值范围。
- 每个输出分区的文件数、行数与大小。
- Schema 是否与声明契约兼容。

质量规则应返回可机器判断的结果。达到阻断阈值时保留中间产物和诊断，不要发布半成品。

## 幂等发布

为每次运行写入唯一临时目录，例如 `dataset/_staging/<run_id>/`。验证通过后写 Manifest，并原子更新当前版本指针。失败重跑可以生成新 Run，也可以在内容和输入完全一致时复用同一目标。

不要直接向最终分区追加未知数量的文件；任务在一半失败会留下无法区分的部分输出。旧版本应保留一个回滚窗口，并由独立清理任务删除。

## 增量与迟到数据

高水位必须包含稳定 Tie-breaker，并保存本批起止边界。为迟到数据保留重叠窗口，在新版本中按业务主键和来源版本确定性去重。

增量任务需要周期性全量对账，以发现删除、历史修正和上游遗漏。把“处理成功”与“数据完整”视为两个不同信号。

## 资源与可观测性

设置内存、线程和临时目录边界，记录输入字节、输出字节、总耗时、峰值内存、Spill、各阶段行数和质量结果。使用 `EXPLAIN ANALYZE` 优化稳定的高成本阶段，而不是只看整个任务墙钟时间。

对空输入、重复输入、Schema 新增列、坏行、磁盘满、进程中止和发布指针失败做故障测试。一个可靠流水线应能明确回答从哪里继续，以及哪些输出对消费者可见。

## 继续阅读

输入转换规则参见[类型、NULL 与时间语义](./types-and-time/)；需要多引擎共享快照和并发提交时评估[Lakehouse 表格式](./lakehouse-formats/)。

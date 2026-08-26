---
title: 源码解析：Parquet 扫描实现
description: 基于 DuckDB v1.5.5，追踪 parquet_scan 的扩展注册、Bind、文件调度、列裁剪、Row Group 裁剪和向量化解码。
---

DuckDB 查询 Parquet 时，不会先把整个文件导入成内部表。Parquet 扩展把文件扫描注册成 Table Function，Binder 确定 Schema 和所需列，执行器再把文件与 Row Group 分给任务，逐批解码成 `DataChunk`。

本文固定基于 DuckDB [`v1.5.5`](https://github.com/duckdb/duckdb/tree/v1.5.5)。我们追踪这条查询：

```sql
SELECT event_date, sum(amount) AS revenue
FROM read_parquet('events/*.parquet')
WHERE event_date >= DATE '2026-08-01'
  AND event_date <  DATE '2026-09-01'
GROUP BY event_date
ORDER BY event_date;
```

总调用图是：

```text
ParquetExtension::Load
  -> 注册 parquet_scan / read_parquet
  -> MultiFileBind + ParquetReader 读取 Schema/Footer
  -> LogicalGet + 所需列 + TableFilter
  -> PhysicalTableScan
  -> MultiFileInitGlobal / Local
  -> 文件与 Row Group 分派
  -> ParquetReader::PrepareScan
  -> ParquetReader::Scan
  -> DataChunk
```

## 第一站：扩展注册 Table Function

[`ParquetExtension::LoadInternal`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_extension.cpp#L843)取得 `ParquetScanFunction::GetFunctionSet()`，把同一组扫描能力注册为 `parquet_scan` 和 `read_parquet`，同时注册 `parquet_metadata` 等辅助函数和 Parquet `COPY` 实现。

[`ParquetScanFunction::GetFunctionSet`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L390)创建 `MultiFileFunction<ParquetMultiFileInfo>`，并声明关键能力：

```cpp
table_function.filter_pushdown = true;
table_function.filter_prune = true;
table_function.late_materialization = true;
```

这不是说任意 SQL 表达式都一定能推进 Parquet Reader，而是告诉核心优化和执行框架：该 Table Function 支持接收可转换的 Filter、参与文件裁剪，并能在合适计划中延迟读取部分列。

扩展还注册了 Replacement Scan。[`ParquetScanReplacement`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_extension.cpp#L739)会把：

```sql
SELECT * FROM 'events/data.parquet';
```

改写成对 `parquet_scan` 的 Table Function 引用。简写语法和显式 `read_parquet(...)` 最终会汇入同一套扫描实现。

## 第二站：通用 MultiFile 框架负责“多个文件”

Parquet 扩展没有自己重写所有 Glob、Hive Partition、`union_by_name`、虚拟列和并行文件调度。核心的 [`MultiFileFunction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/common/multi_file/multi_file_function.hpp)负责通用骨架，`ParquetMultiFileInfo` 提供格式特定接口。

这种分层可以理解为：

| 通用 MultiFile 层 | Parquet 层 |
| --- | --- |
| 展开路径和 Glob、管理文件列表 | 读取 Parquet Footer 和 Schema |
| 对齐多文件列、虚拟列、Hive Partition | 将 Parquet 物理/逻辑类型转为 DuckDB 类型 |
| 创建 Global/Local State、切换文件 | 把单个文件切成 Row Group 工作 |
| 把 Table Function 结果交给执行器 | 解码 Column Chunk 和 Page |

阅读 `parquet_multi_file_info.cpp` 时，如果调用突然进入模板，不要认为路径断了；文件轮换和状态管理就在核心模板中。

## 第三站：Bind 阶段必须先知道 Schema

Binder 要解析 `event_date` 和 `amount`，因此执行前至少要获得列名与类型。`MultiFileBind` 通常会为首个文件创建 Reader，Parquet Reader 从 Footer 元数据解析 Schema；[`ParquetMultiFileInfo::BindReader`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L146)再让通用 MultiFile Reader 完成列对齐。

Bind Data 会保存：

- Parquet 读取选项和多文件选项。
- 输出列名、类型与文件列映射。
- 初始文件行数、Row Group 数、文件大小等估算信息。
- 已创建的初始 Reader，执行时满足条件可直接复用。

[`FinalizeBindData`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L493)从初始 Reader 取得行数和 Row Group 数；[`GetCardinality`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L512)对单文件可直接使用元数据行数，多文件则尝试元数据缓存或按首文件与文件大小估算。

这说明“查询还没开始产出行”不等于“没有 I/O”。打开文件、读取 Footer、展开远程文件列表和合并 Schema 都可能发生在 Bind 或初始化阶段，尤其会影响对象存储查询的首字节延迟。

## 第四站：列裁剪变成 `column_ids`

示例查询只需要 `event_date` 和 `amount`。Binder 与 `RemoveUnusedColumns` 让 `LogicalGet` 只保留相关列，物理 Table Scan 初始化时把所需 `column_indexes` 传给 MultiFile State，最终形成 `BaseFileReader::column_ids` 到 Parquet 文件列的映射。

[`ParquetReader::Scan`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_reader.cpp#L1396)只遍历这些 `column_ids`，为对应 `ColumnReader` 准备 Buffer 和读取数据。未引用的 `payload` 大列不应因为和 `amount` 在同一行就自动解码。

列裁剪仍会产生必要的元数据 I/O，而且嵌套列的父子层次可能需要 Definition/Repeat Level。它表示避免读取无关数据列，不表示整个文件只发生一次精确 Range Request。

## 第五站：Filter 先成为 TableFilter

核心优化器的 `FilterPushdown::PushdownGet` 把可支持表达式转换为 `TableFilterSet`，随 `LogicalGet` 进入 Table Function。`MultiFileInitGlobal` 保存 Filters，Reader 初始化后让 `ParquetReader` 持有对应过滤信息。

因此过滤可能在三层发挥作用：

```text
文件级：Hive Partition / 文件名等信息排除文件
  -> Row Group 级：Footer Min/Max 或 Bloom Filter 排除整组
  -> 行级：先解码过滤列，SelectionVector 留下匹配行
```

只有最后一层真正逐行判断。前两层是保守裁剪：只有能证明不可能匹配时才跳过。

## 第六站：一个 Row Group 是一个并行工作单元

[`ParquetReadGlobalState`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L45)保存下一个 Row Group 索引等共享进度；每个线程有 `ParquetReadLocalState`，其中包含自己的 `ParquetReaderScanState`。

[`ParquetReader::TryInitializeScan`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_multi_file_info.cpp#L701)在 MultiFile Global State 的保护下领取一个 Row Group：

```cpp
lstate.group_indexes = {gstate.row_group_index};
gstate.row_group_index++;
```

然后 `PrepareScan` 调用 `InitializeScan`，创建本线程的 Thrift 协议、Root Column Reader、Filter State 和解码 Buffer。一个文件有多个 Row Group 时就有天然并行度；多个文件时，通用 MultiFile 层还会继续切换 Reader。

小文件很多并不等于无限加速。文件打开、Footer 请求、任务调度和远程延迟会增加；单个巨大 Row Group 又可能限制可并行工作数量。布局要同时考虑裁剪、吞吐和元数据成本。

## 第七站：Row Group 统计与 Bloom Filter 裁剪

开始新组时，[`PrepareRowGroupBuffer`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_reader.cpp#L1192)为所需列取得 `ColumnReader`，并在有 Filter 时读取该 Row Group 的列统计。

```text
TableFilter.CheckStatistics(Min/Max)
  -> FILTER_ALWAYS_FALSE：把 offset 移到组末尾，整组跳过
  -> FILTER_ALWAYS_TRUE：后续可能省掉重复判断
  -> NO_PRUNING_POSSIBLE：必须读取数据
```

如果 Min/Max 不能排除，且类型与文件元数据支持，代码还会尝试 Parquet Bloom Filter。Bloom Filter 可以证明“某个值一定不在”，但命中只表示“可能存在”，仍要读取和验证。

源码对字符串统计、浮点 NaN、嵌套列和生成列有专门分支，原因是错误解释统计可能错误跳过真实结果。裁剪必须保守，宁可多读，不能少返回正确行。

## 第八站：预取整组还是按列预取

幸存 Row Group 进入读取前，Reader 估算所需列压缩字节占整个 Row Group Span 的比例。若没有 Filter 且几乎读取整组，可能预取完整 Row Group；否则注册各个所需列的范围。

有非可选 Filter 时会启用 Lazy Fetch 思路：先确保过滤列可读，不急着把其余列全部取回。过滤选择率很高时，后续 Payload 列仍可能需要大量读取；过滤后没有行时，Reader 可以直接 Skip 其余列。

这个分支对远程文件尤其重要。对象存储成本既取决于读取字节，也取决于 Range Request 数量与延迟。列很少时按列请求节省字节，列接近整组时合并预取可能减少请求开销。

## 第九站：先读 Filter 列，再 Select 其余列

[`ParquetReader::Scan`](https://github.com/duckdb/duckdb/blob/v1.5.5/extension/parquet/parquet_reader.cpp#L1396)每次最多选择一个 `STANDARD_VECTOR_SIZE` 范围，并设置输出 Chunk 行数。

有 Filter 时，核心循环是：

1. 按 Adaptive Filter 给出的顺序读取过滤列。
2. `ColumnReader::Filter` 更新 `SelectionVector` 和 `filter_count`。
3. 如果已经没有行，其他列直接 `Skip`。
4. 对仍需读取的列调用 `ColumnReader::Select`，只选择幸存位置。
5. 若行数减少，对整个结果 `DataChunk::Slice`。

没有 Filter 时，则对每个所需列直接 `Read` 当前批次。无论哪条路径，最终输出都是普通 `DataChunk`，上层 Filter、Join 和 Aggregate 不需要知道数据来自 Parquet Page 还是 DuckDB 持久表。

这正是 Table Function 边界的价值：格式特定代码负责把外部编码变成 Vector，执行引擎继续复用统一的 Pipeline 接口。

## 生成一个可观察文件

下面按递增日期写 Parquet，使不同 Row Group 的日期 Min/Max 分离：

```sql
COPY (
    SELECT
        i AS event_id,
        DATE '2026-01-01' + CAST(i // 1000 AS INTEGER) AS event_date,
        i % 100 AS amount,
        repeat('x', 100) AS payload
    FROM range(100000) AS generated(i)
) TO 'events.parquet' (
    FORMAT parquet,
    ROW_GROUP_SIZE 10000
);
```

先查看 Footer 中的 Row Group 统计：

```sql
SELECT
    row_group_id,
    row_group_num_rows,
    stats_min,
    stats_max,
    total_compressed_size
FROM parquet_metadata('events.parquet')
WHERE path_in_schema = 'event_date'
ORDER BY row_group_id;
```

再比较窄范围和全范围：

```sql
EXPLAIN ANALYZE
SELECT sum(amount)
FROM read_parquet('events.parquet')
WHERE event_date = DATE '2026-01-15';

EXPLAIN ANALYZE
SELECT sum(amount)
FROM read_parquet('events.parquet')
WHERE event_date >= DATE '2026-01-01';
```

最后加入和去掉 `payload`，比较列裁剪。不要只比较墙钟时间；本地小文件很容易被 Cache 掩盖。还应记录计划、Row Group 扫描指标、读取列、文件请求和读取字节。

## 推荐断点

```lldb
breakpoint set -r 'duckdb::ParquetScanFunction::GetFunctionSet'
breakpoint set -r 'duckdb::ParquetMultiFileInfo::BindReader'
breakpoint set -r 'duckdb::ParquetReader::TryInitializeScan'
breakpoint set -r 'duckdb::ParquetReader::PrepareScan'
breakpoint set -r 'duckdb::ParquetReader::PrepareRowGroupBuffer'
breakpoint set -r 'duckdb::ParquetReader::Scan'
```

先查看 `file.path`、`column_ids`、`group_idx_list` 和 `filters`，再进入具体 `ColumnReader`。Parquet 的嵌套类型、Dictionary Page、Definition Level 和压缩解码是下一层主题；在理解文件、Row Group、列和 Chunk 四个边界之前，不必先陷入每种编码的位操作。

继续阅读[Parquet 布局](../parquet-layout/)和[查询数据文件](../data-files/)，把源码中的裁剪条件转化为可操作的文件大小、排序和 Schema 设计。

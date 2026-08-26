---
title: 源码解析：存储、MVCC、WAL 与 Checkpoint
description: 基于 DuckDB v1.5.5，从 DataTable、RowGroup、ColumnSegment、Buffer Manager 到 MVCC、Undo Buffer、WAL 和 Checkpoint 理解持久表。
---

执行引擎看到的是一批批 `DataChunk`，但持久表不可能只是一个永远驻留内存的大 Chunk。DuckDB 需要组织列式数据、按事务判断行是否可见、在内存不足时管理 Buffer，并在崩溃后恢复已经提交的修改。

这一章固定基于 DuckDB [`v1.5.5`](https://github.com/duckdb/duckdb/tree/v1.5.5)，先建立四层分工：

```text
列式存储       DataTable -> RowGroup -> ColumnData -> ColumnSegment -> Block
事务可见性     RowVersionManager + Update/Undo 信息
崩溃恢复       WAL
缩短恢复链路   Checkpoint
```

这四层互相协作，但不是同一个机制。

## DataChunk 与 RowGroup 不在同一层

`DataChunk` 是算子之间短期流动的一批数据，默认容量常见为 2048 行。`RowGroup` 是表存储的较大横向分段，包含多个列的数据和行版本信息。扫描一个 Row Group 会连续产出许多 DataChunk。

```text
一个持久 RowGroup
  column 0: [ColumnSegment][ColumnSegment]...
  column 1: [ColumnSegment][ColumnSegment]...
  column 2: [ColumnSegment][ColumnSegment]...
  MVCC:     每个向量范围的插入/删除版本

扫描输出
  DataChunk 1 -> DataChunk 2 -> ...
```

不要把 DuckDB 内部 Row Group 和 Parquet Row Group 当作同一个 C++ 对象。两者都是横向分段思想，但一个属于 DuckDB 持久存储，一个来自 Parquet 文件格式，元数据和读取实现完全不同。

## 持久表的对象层次

[`DataTable`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/data_table.hpp#L48)代表一张物理表，持有类型、索引以及 `RowGroupCollection` 等状态，并提供扫描、Append、Update、Delete 和 Checkpoint 接口。

[`RowGroupCollection`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/row_group_collection.hpp#L34)管理按 Row ID 范围排列的 Row Group。并行表扫描可以从 Collection 领取不同 Row Group 范围。

[`RowGroup`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/row_group.hpp#L69)包含：

- 多个 `ColumnData`，每个顶层列一个入口。
- 插入和删除可见性的 `RowVersionManager`。
- 列元数据、Delete 元数据和统计。
- 扫描、Append、Update、Delete 与 Checkpoint 方法。

[`ColumnData`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/column_data.hpp#L50)负责一列或嵌套列的一层数据，并用 `ColumnSegmentTree` 管理 Segment。[`ColumnSegment`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/column_segment.hpp)对应一段连续行范围，关联压缩函数、统计、Block Handle 和 Segment State。

因此“DuckDB 是列存”不表示一列只有一个连续大数组。列仍被分成 Segment，Segment 通过 Block Manager 连接磁盘与内存。

## 扫描先裁剪，再判断可见性

持久表扫描进入 [`RowGroup::Scan`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/table/row_group.cpp#L694)后，主线可简化为：

```text
RowGroup 级 Zone Map
  -> Column Segment 级 Zone Map
  -> RowVersionManager 生成当前事务可见的 SelectionVector
  -> 先读取过滤列并执行 TableFilter
  -> 读取或选择其余投影列
  -> DataChunk
```

[`RowGroup::CheckZonemap`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/table/row_group.cpp#L613)用列统计检查一个过滤条件是否在整个 Row Group 上恒假；若是，就不初始化该组列扫描。进入组内后，`CheckZonemapSegments` 还能跳过更细的 Segment 范围。

Zone Map 是 Min/Max 等统计，不是 B-Tree。数据按日期大致有序时，日期范围条件容易排除整段；完全随机时，每段 Min/Max 可能都覆盖很宽范围，统计存在却无法跳过。

裁剪只说明“这段不可能产生匹配行”。对幸存数据仍要做 MVCC 和行级过滤，不能把统计判断当成精确结果。

## Buffer Manager 连接逻辑块和内存

持久 Segment 不需要永远驻留内存。它保存对 Block 的引用，扫描时通过 `BufferManager::Pin` 取得 `BufferHandle`：

```text
BlockHandle
  -> 已在内存：增加 Reader 计数，返回 BufferHandle
  -> 不在内存：先为所需空间驱逐可驱逐块，再从磁盘加载

BufferHandle 生命周期结束
  -> Unpin
  -> Reader 计数下降，块重新具备被驱逐的可能
```

[`StandardBufferManager::Pin`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/standard_buffer_manager.cpp#L303)必须处理并发加载、内存预留和可复用 Buffer；[`Unpin`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/standard_buffer_manager.cpp#L396)则在无 Reader 后把适合的块加入驱逐队列。

“Unpin”不是删除磁盘数据，“Evict”也不必然等于 Spill：

- 持久块被驱逐后，可以从数据库文件重新读取。
- 可销毁的临时 Buffer 可能直接重建。
- 需要保留的临时中间数据可能写入 `temp_directory`，再在以后读回。

`memory_limit` 主要约束 Buffer Manager 能追踪和管理的内存，并不严格等于整个进程 RSS。C++ 对象、第三方库和客户端结果仍可能占用额外内存。

## 每个事务有两种时间标识

[`DuckTransaction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/transaction/duck_transaction.hpp#L31)保存：

- `start_time`：事务开始时看到的快照边界。
- `transaction_id`：标识该事务尚未提交的修改。
- `commit_id`：成功提交后分配的提交时间。

[`DuckTransactionManager::StartTransaction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/transaction/duck_transaction_manager.cpp#L59)让 Start Timestamp 从较小区域递增，而未提交 Transaction ID 从 `TRANSACTION_ID_START` 的高值区域递增。这样版本字段既能表示已提交时间，也能表示某个活动事务自己的未提交修改。

可见性核心在 [`chunk_info.cpp`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/table/chunk_info.cpp#L12)：一个插入版本在 `id < start_time` 或 `id == transaction_id` 时可见；删除版本满足相同规则时，该行不可见。

白话解释是：

- 看见自己在本事务内写入的行。
- 看见快照开始前已经提交的行。
- 看不见其他事务尚未提交的行。
- 看不见快照开始前已删除，或自己刚删除的行。
- 仍能看见在自己快照开始后才被其他事务删除的旧版本。

## RowVersionManager 生成可见行

每个 [`RowGroup`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/row_group.hpp#L86)可以延迟创建 `RowVersionManager`。如果一段数据没有版本变化，扫描可以直接认为整批可见；发生 Append 或 Delete 后，版本信息按标准 Vector 范围存放在 `ChunkInfo` 中。

[`ChunkConstantInfo`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/table/chunk_info.hpp#L59)适合整批共享同一插入和删除版本；需要逐行差异时转为 `ChunkVectorInfo`，其中插入和删除版本可按位置记录。`GetSelVector` 根据当前 `TransactionData` 只返回可见位置。

这种设计让“没有删除的整批已提交行”走快速路径，而不要求每次扫描都读取两列完整的版本号。

## LocalStorage 与 UndoBuffer 各管什么

事务修改不会直接等价于“覆盖数据库文件中的旧值”。[`DuckTransaction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/transaction/duck_transaction.hpp#L98)同时持有：

- `LocalStorage`：保存事务本地 Append 等尚未合并到主表的数据。
- `UndoBuffer`：保存 Update、Delete、Catalog 修改等需要提交、回滚或供旧快照访问的信息。

[`UndoBuffer`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/transaction/undo_buffer.hpp#L30)的注释直接说明：旧版本既用于 Rollback，也可能仍被更早开始的事务读取。提交后不能立刻清空所有旧版本；只有当最低活动事务不再需要它们时，Cleanup 才能回收。

Delete 冲突也不是最后提交时才发现。`ChunkVectorInfo::Delete` 看到目标位置已被另一个事务标记删除时，会抛出 `TransactionException`。这体现 DuckDB 的乐观并发风格：读取通常不加逐行读锁，但冲突写入不能静默覆盖。

## 提交、回滚和清理是三件事

提交路径集中在 [`DuckTransactionManager::CommitTransaction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/transaction/duck_transaction_manager.cpp#L301)与 [`DuckTransaction`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/transaction/duck_transaction.cpp)：

```text
决定是否需要 WAL / 自动 Checkpoint
  -> 在需要时把事务变化写入 WAL
  -> 分配 commit_id
  -> 合并 LocalStorage，提交 UndoBuffer 中的版本
  -> Flush 持久化提交状态
  -> 发布 last_commit
  -> 从活动事务集合移除
  -> 等旧快照不再需要后 Cleanup
```

若中途失败，代码会 Revert 已完成的提交步骤、截断失败事务写入的 WAL，并执行 Rollback。Rollback 负责撤销自己的未提交修改；Cleanup 则负责在未来安全时回收旧版本，两者不能混为一谈。

## WAL 解决“已提交但主文件尚未更新”

[`WriteAheadLog`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/storage/write_ahead_log.hpp#L39)的职责写得很明确：事务提交前记录修改，崩溃或关闭后可以重放。

WAL 记录的不是数据库文件每个物理块的简单镜像。它有 Create/Drop、Insert、Delete、Update、Sequence、Checkpoint 等类型，并为 Entry 写入长度和 Checksum。事务的 [`WriteToWAL`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/transaction/duck_transaction.cpp#L191)把 LocalStorage 和 UndoBuffer 中的变化序列化为可重放记录。

启动持久数据库时，[`StorageManager`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/storage_manager.cpp#L501)先从数据库文件加载最近 Checkpoint，再调用 `WriteAheadLog::Replay` 重放之后的 WAL：

```text
database file 中的 checkpoint
  + checkpoint 之后完整有效的 WAL entries
  = 恢复后的已提交状态
```

WAL 解决 Durability，不负责决定某行对当前快照是否可见；那是 MVCC 的职责。

## Checkpoint 把长期状态写回数据库文件

如果永远只保留初始数据库文件加不断增长的 WAL，启动恢复会越来越慢。Checkpoint 把当前 Catalog、表 Row Group、Column Segment 元数据和相关块写入持久数据库结构，并更新可加载的 Checkpoint 入口。

[`SingleFileCheckpointWriter::CreateCheckpoint`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/storage/checkpoint_manager.cpp)遍历 Catalog，`DataTable::Checkpoint` 再让 Row Group 和各列选择复用已有持久数据或写出新 Segment。完成后，Storage Manager 可以移除或轮换已经被 Checkpoint 覆盖的 WAL。

Checkpoint 不是 Backup：

- 它仍然修改同一个数据库的持久状态。
- 无法替代独立介质、时间点保留和恢复演练。
- 进程崩溃恢复成功，不代表误删、文件损坏或主机丢失也能恢复。

## 一组事务实验

用两个连接观察快照和冲突，比只读类定义更直观。伪代码如下：

```python
import duckdb

con1 = duckdb.connect("mvcc.duckdb")
con2 = duckdb.connect("mvcc.duckdb")

con1.execute("CREATE OR REPLACE TABLE counters(id INTEGER PRIMARY KEY, value INTEGER)")
con1.execute("INSERT INTO counters VALUES (1, 10)")

con1.execute("BEGIN TRANSACTION")
print(con1.execute("SELECT * FROM counters").fetchall())

con2.execute("UPDATE counters SET value = 20 WHERE id = 1")

# con1 的活动快照仍按自己的事务边界读取
print(con1.execute("SELECT * FROM counters").fetchall())
con1.execute("COMMIT")
```

具体隔离语义和冲突行为应结合[并发与事务边界](../concurrency-transactions/)中的可运行测试。源码调试可从这些断点开始：

```lldb
breakpoint set -r 'duckdb::RowGroup::Scan'
breakpoint set -r 'duckdb::RowVersionManager::GetSelVector'
breakpoint set -r 'duckdb::DuckTransactionManager::CommitTransaction'
breakpoint set -r 'duckdb::DuckTransaction::WriteToWAL'
breakpoint set -r 'duckdb::SingleFileCheckpointWriter::CreateCheckpoint'
```

## 一句话串起四层

DataTable 用 Row Group 和 Column Segment 组织列式持久数据，扫描通过 Buffer Manager Pin 所需块、用 Zone Map 裁剪范围，再由 RowVersionManager 生成当前事务可见的 SelectionVector；事务的 LocalStorage 与 UndoBuffer 保存未提交和旧版本状态，WAL 让已提交变化可在崩溃后重放，Checkpoint 则把长期状态合并回数据库文件并缩短恢复链路。

下一章阅读[Parquet 扫描实现](../source-parquet-scan/)，对比外部列式文件怎样复用同一套 Table Function、Pipeline 和 DataChunk 接口。

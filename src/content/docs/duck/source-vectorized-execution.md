---
title: 源码解析：向量化执行与 Pipeline
description: 基于 DuckDB v1.5.5，从 Vector、SelectionVector、DataChunk 到 Source、Operator、Sink 和 PipelineExecutor 理解执行引擎。
---

上一章追踪了 SQL 如何到达 `PipelineExecutor`。这一章开始看真实数据：DuckDB 为什么不逐行解释表达式，一批数据如何穿过算子，以及聚合、连接和排序为什么会把物理树切成多个 Pipeline。

本文基于 DuckDB [`v1.5.5`](https://github.com/duckdb/duckdb/tree/v1.5.5)。先记住一句话：`Vector` 是一列的一批值，`DataChunk` 是多列组成的一批行，Pipeline 则让一批批 `DataChunk` 从 Source 流经 Operator，最后进入 Sink。

## 从“逐行”换成“按列的一批”

考虑这个过滤和计算：

```sql
SELECT order_id, amount * 0.9 AS discounted
FROM orders
WHERE amount >= 100;
```

逐行模型会反复做“取一行、解析类型、判断、调用乘法、写一行”。DuckDB 的执行函数通常一次收到一批 `amount`，在紧凑循环中完成比较和乘法。这样更容易利用 CPU Cache、编译器优化和低函数调用开销。

这并不表示一条 SIMD 指令就完成整个查询。向量化首先是一种执行接口：算子传递的是一批值，不是一个通用 Row 对象。具体函数是否使用 SIMD、采用哪种编码和是否复制数据，要继续看对应实现。

## Vector 不等于 `std::vector<Value>`

[`Vector`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/common/types/vector.hpp#L141)保存逻辑类型、物理数据指针、Validity Mask、主 Buffer 和辅助 Buffer。Validity Mask 用位表示 NULL，字符串和嵌套类型还会使用辅助存储。

`v1.5.5` 的 [`VectorType`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/common/enums/vector_type.hpp#L13)包括：

| 类型 | 白话解释 | 典型收益 |
| --- | --- | --- |
| `FLAT_VECTOR` | 每个位置都有普通值 | 最直接的连续批处理 |
| `CONSTANT_VECTOR` | 整批重复一个值 | 不必存 2048 份常量 |
| `DICTIONARY_VECTOR` | 用 SelectionVector 映射到底层值 | 过滤和切片可以少复制 |
| `SEQUENCE_VECTOR` | 起点加固定增量 | 紧凑表示连续序列 |
| `FSST_VECTOR` | FSST 压缩字符串 | 某些字符串路径避免提前完全解压 |

不同编码给执行函数带来一个问题：如果每个函数都分别处理五种布局，代码会急剧膨胀。因此 `Vector::ToUnifiedFormat` 把常见读取方式统一为三样东西：数据指针、Validity Mask 和 SelectionVector。访问第 `i` 个逻辑值时，本质上读取 `data[sel[i]]` 并检查相同位置是否有效。

“Unified”不等于总是复制成 Flat Vector。对 Flat、Constant 和 Dictionary，很多转换只需组织引用和索引；只有确实需要连续可写数据时才应 Flatten。

## DataChunk 是算子之间的包裹

[`DataChunk`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/include/duckdb/common/types/data_chunk.hpp#L23)拥有一组等长 `Vector`、当前行数和容量。可以把一个三列 Chunk 想成：

```text
count = 4

order_id : [101, 102, 103, 104]
region_id: [  1,   2,   1,   3]
amount   : [ 80, 120, 150,  60]
```

所有列必须有相同的逻辑行数，`count` 才能让下游把第 `i` 个位置视作同一行。默认 `STANDARD_VECTOR_SIZE` 在此版本中是 2048，但它是内部默认容量，不是文件 Row Group 大小，也不是应用 API 的稳定批大小。

`DataChunk::Reset` 不只是把行数清零，还会通过 Vector Cache 把各列恢复到初始化后的可复用状态。这让 Pipeline 可以循环使用中间 Chunk，减少每批数据重新分配内存。

## SelectionVector 如何避免复制

假设过滤 `amount >= 100` 后，只保留原 Chunk 的位置 1 和 2：

```text
SelectionVector = [1, 2]
count = 2
```

结果列可以通过 Dictionary Vector 引用原始 Buffer：

```text
order_id -> 原始 order_id Buffer + [1, 2] -> [102, 103]
amount   -> 原始 amount Buffer   + [1, 2] -> [120, 150]
```

[`DataChunk::Slice`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/common/types/data_chunk.cpp#L302)对每列调用 `Vector::Slice`。如果输入本来就是 Dictionary Vector，代码还会合并选择关系，避免无休止叠加多层字典。

这也是 `DataChunk` 可以“拥有可写 Buffer，同时暂时引用别的 Chunk”的原因。少复制提升性能，但带来严格的生命周期要求：被引用的底层 Buffer 必须活得足够久。阅读算子时要特别关注 `Reference`、`Slice`、`Move` 和 `Copy`，它们语义不同。

## Source、Operator 和 Sink 不是固定的三种业务算子

物理执行接口把一个 Pipeline 中的角色分为：

| 角色 | 核心动作 | 示例 |
| --- | --- | --- |
| Source | `GetData`，产生 Chunk | 表扫描、Parquet 扫描、已完成的聚合状态 |
| Operator | `Execute`，输入 Chunk 变输出 Chunk | Filter、Projection |
| Sink | `Sink`，消费 Chunk 并维护状态 | Hash Aggregate 构建、Hash Join 构建、Result Collector |

同一个复杂物理算子可能跨越 Pipeline 边界，在一个 Pipeline 中作为 Sink 收集状态，完成后又在下游 Pipeline 中作为 Source 产出结果。角色描述的是当前数据流位置，不是给 C++ 类贴上的永久标签。

`PhysicalOperator` 同时区分 Global State 和 Local State。多个线程可以各持有 Local State，减少每批都争用全局锁；Pipeline 完成时通过 `Combine` 汇总到全局状态，再由 `Finalize` 完成一次性的收尾。这是“可以并行”与“最后必须形成一个一致结果”之间的桥梁。

## Pipeline 是怎样切出来的

通用入口 [`PhysicalOperator::BuildPipelines`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/execution/physical_operator.cpp#L214)递归物理树：叶子 Source 结束向下寻找，普通一元算子加入当前 Pipeline，Sink 则创建子 MetaPipeline。Join 等多子节点算子还会重载构建逻辑，表达更复杂的依赖。

对于连接后聚合，可以近似画成：

```text
Pipeline 1: customer_dim Scan -> HashJoin Build Sink
                                      |
                                      | build 完成
                                      v
Pipeline 2: events Scan -> Filter -> HashJoin Probe -> Aggregate Sink
                                                       |
                                                       | aggregate 完成
                                                       v
Pipeline 3: Aggregate Source -> Result Collector Sink
```

每一条线内部可以一批批流动；竖向依赖必须先满足。这就是 Pipeline Breaker 的实质：某个算子需要先形成状态，后续数据流才能开始。它不是“所有数据都变成一张临时表”的同义词，也不必然是单线程。

## PipelineExecutor 的主循环

[`PipelineExecutor` 构造函数](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parallel/pipeline_executor.cpp#L12)为每个中间算子创建输出 `DataChunk` 和 `OperatorState`，同时取得 Local Source/Sink State。主循环 [`Execute(idx_t max_chunks)`](https://github.com/duckdb/duckdb/blob/v1.5.5/src/parallel/pipeline_executor.cpp#L188)反复做三件事：

```text
FetchFromSource(source_chunk)
  -> ExecutePushInternal(source_chunk)
       -> Operator::Execute(...)
       -> ...
       -> Sink(final_chunk)
```

但每个接口都可能返回状态，而不是简单的成功或失败：

| 返回值 | 含义 |
| --- | --- |
| `NEED_MORE_INPUT` | 当前输入已经处理完，可以取下一批 |
| `HAVE_MORE_OUTPUT` | 同一输入还能产生更多输出，先不要覆盖它 |
| `FINISHED` | 当前 Pipeline 已经不需要更多数据 |
| `BLOCKED` | 当前因异步 I/O 或背压不能继续，注册唤醒后再恢复 |

`in_process_operators` 栈保存“同一输入仍有输出”的算子位置。`remaining_sink_chunk` 则确保 Sink 阻塞时，不会丢掉尚未消费的最终 Chunk。执行预算让一个任务处理一定数量的 Chunk 后归还调度权，避免单个 Pipeline 长时间独占线程。

Source 耗尽也不一定立即结束。缓存型 Operator 可能还有不足一个标准 Vector 的结果，`TryFlushCachingOperators` 会调用 `FinalExecute` 把它们推出去。最后 `PushFinalize` 调用 Sink 的 `Combine`，再结束当前线程的局部状态。

## 并行单位不是“每个算子一个线程”

DuckDB 的任务围绕 Pipeline、数据分区和 Source 可并行能力组织，不是给每个物理算子永久分配一个线程。多个线程可以从同一个并行 Source 领取不同工作，并各自推动完整 Pipeline。

这带来两个实际结论：

- 增大 `threads` 可能提高扫描和计算吞吐，也会增加 Local State、并发 Buffer 和内存带宽竞争。
- Pipeline 中出现一个普通 Filter 不会创建新线程；它通常就在取得 Source Chunk 的同一任务里完成。

分析内存时也不能只计算 `2048 * 列宽`。Chunk 是短期流动数据，Hash Table、分组状态、排序 Runs、解码 Buffer 和每线程 Local State 才可能占据主要内存；部分算子还会通过 Buffer Manager 和临时文件 Spill。

## 一个可观察的实验

先让执行只有一个线程，减少调试噪声：

```sql
SET threads = 1;

CREATE OR REPLACE TABLE numbers AS
SELECT i, i % 10 AS bucket
FROM range(10000) AS generated(i);

EXPLAIN ANALYZE
SELECT bucket, sum(i)
FROM numbers
WHERE i % 2 = 0
GROUP BY bucket
ORDER BY bucket;
```

在 LLDB 中逐步增加断点：

```lldb
breakpoint set -r 'duckdb::PipelineExecutor::PipelineExecutor'
breakpoint set -r 'duckdb::PipelineExecutor::FetchFromSource'
breakpoint set -r 'duckdb::PipelineExecutor::ExecutePushInternal'
breakpoint set -r 'duckdb::PipelineExecutor::PushFinalize'
```

观察 `pipeline.operators.size()`、`source_chunk.size()`、`final_chunk.size()` 和 `in_process_operators`。不要期待每批都是 2048 行：最后一批会更小，Filter 后的 Chunk 也会缩小，某些 Source 或 Operator 还能主动产生不同大小的批次。

## 常见误解

**Vector 就是完整的一列。** 不是。它通常只表示当前一批，完整列由扫描过程分批产生。

**向量化意味着完全零复制。** 不是。Reference 和 Dictionary 可以避免一部分复制，但算术输出、类型转换、Flatten、物化和跨边界交付仍可能分配或复制。

**阻塞算子就是异步 BLOCKED。** 不是。Pipeline Breaker 指需要建立状态而切断流水线；返回 `BLOCKED` 指当前调用暂时不能推进，两者解决的问题不同。

**增加线程只影响速度。** 不是。每线程 Local State 和并发工作集也会影响峰值内存、I/O 和调度成本。

下一章进入[优化器与 Join 选择](../source-optimizer/)，观察逻辑计划怎样决定这些 Pipeline 最终由哪些物理算子组成。

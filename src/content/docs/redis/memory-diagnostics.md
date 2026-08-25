---
title: Redis 内存与 Big Key 诊断
description: 从内存组成、Key 抽样、碎片、淘汰和客户端缓冲定位 Redis 容量问题。
---

Redis 的内存不只包含 Key 和 Value，还包括对象元数据、过期字典、复制积压、客户端缓冲、脚本、Lua、allocator 碎片和持久化期间的 Copy-on-Write。容量规划不能只把序列化后的 Value 大小相加。

## 查看实例内存

```bash
redis-cli INFO memory
redis-cli MEMORY STATS
```

重点观察：

- `used_memory`：Redis 分配器统计的内存。
- `used_memory_rss`：操作系统观察到的驻留内存。
- `used_memory_dataset`：数据集使用量的估算。
- `mem_fragmentation_ratio`：RSS 与分配内存关系的线索，不是单独的故障结论。
- `maxmemory` 与淘汰策略：是否有明确容量边界。

RSS 高于数据集可能来自 allocator 碎片、释放后尚未归还系统的页、复制/客户端缓冲或 fork Copy-on-Write。RSS 低于分配量则可能有部分页面被换出，通常需要检查宿主机内存压力。

## 找出异常 Key

单个 Key 可以估算内存：

```bash
redis-cli MEMORY USAGE cache:product:8421 SAMPLES 10
redis-cli TYPE cache:product:8421
redis-cli TTL cache:product:8421
```

`MEMORY USAGE` 是包含结构开销的近似值，嵌套结构通过抽样估算。全库排查可在副本或低峰使用 `redis-cli --bigkeys`、`--memkeys`，但这些工具会扫描 Key 空间，仍需评估实例规模和网络开销。

只找最大 Key 不够，还应按 Key 模板聚合数量、平均大小、总内存和 TTL 分布。大量小 Key 的元数据开销也可能超过少量大 Key。

## 淘汰与过期

```bash
redis-cli INFO stats
redis-cli INFO keyspace
```

持续增长的 `evicted_keys` 表示达到 `maxmemory` 后发生淘汰，业务上可能表现为命中率下降和数据库回源上升。`expired_keys` 是累计过期数量，必须结合速率、Key 总量和延迟观察。

大量 Key 同时过期可能增加主动过期工作和回源压力。为 TTL 增加业务允许的抖动，并避免将淘汰策略当作正常生命周期管理。

## Big Key 的影响

Big Key 会放大网络传输、单线程命令执行、复制、AOF、删除和故障切换成本。处理方式取决于结构：

- 大 String 拆分或把内容放到对象存储。
- 大 Hash、Set、Sorted Set 按业务维度分片，并使用有限范围读取。
- 删除释放成本高的 Key 时评估 `UNLINK`，同时监控后台释放队列和内存。
- 避免对大集合执行全量集合运算或一次返回全部元素。

## 建立容量闭环

按业务 Key 模板持续采样，监控内存增长率、TTL 覆盖率、淘汰、碎片、fork 峰值、客户端缓冲和复制积压。预留故障转移、持久化和流量突增空间，并通过实际数据分布压测。

达到容量上限时，先确定是哪类数据增长和为什么增长，再选择缩短 TTL、限制元素、压缩、拆分实例或扩容。直接执行全库清理既危险，也无法修复无上限的数据模型。

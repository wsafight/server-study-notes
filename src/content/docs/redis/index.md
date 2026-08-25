---
title: Redis 学习路径
description: 按数据建模、缓存设计、持久化、高可用和生产诊断组织 Redis 学习内容。
---

Redis 的优势是低延迟和丰富的内存数据结构，但它也容易把无上限集合、热点、缓存一致性和故障切换问题带到请求主链路。学习时应同时关注命令语义、复杂度、数据规模和失败行为。

## 1. 数据与 Key 设计

- [核心数据结构与选型](./data-structures/)：根据访问模式选择 String、Hash、Set、Sorted Set 或 Stream。
- [生产使用守则](./regulations/)：限制 Key、Value、批次、TTL 和脚本的工作量上界。
- [HyperLogLog](./hyperloglog/)与[Roaring Bitmap](./roaring-bitmap/)：理解近似统计和压缩集合的空间取舍。

## 2. 缓存与并发

- [缓存模式与一致性](./cache-patterns/)：处理穿透、击穿、雪崩和数据库更新后的失效窗口。
- [使用 Pipeline](./pipeline/)：减少网络往返，同时控制服务端输出缓冲和单批大小。
- [实现分布式锁](./distributed-lock/)：正确释放租约，并用 fencing token 防止过期持有者继续写入。

## 3. 数据安全与高可用

- [RDB 与 AOF 持久化](./persistence/)：根据可接受的数据丢失窗口选择策略，并持续验证恢复。
- [Sentinel、复制与 Cluster](./high-availability/)：理解异步复制、选主、Hash Slot 和客户端重连。

## 4. 生产诊断

[内存与 Big Key 诊断](./memory-diagnostics/)从实例内存、Key 分布、碎片和淘汰趋势定位容量问题；[Redis 延迟诊断](./latency-diagnostics/)进一步区分命令执行、事件循环、网络、客户端池、复制和持久化成本。

当数据量超过内存经济边界，又希望保留部分 Redis 协议兼容性时，可以评估[使用 Pika 承载大容量数据](./pika/)。兼容产品的命令、延迟和一致性语义可能不同，迁移前必须根据实际命令集测试。

## 实验建议

准备一个可丢弃实例，分别模拟大 Value、批量命令、集中失效、慢消费者、主节点退出和 AOF 恢复。每次实验同时记录客户端延迟、`INFO`、慢日志、延迟监控和系统资源，避免只看命令是否返回成功。

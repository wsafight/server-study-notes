---
title: Redis 延迟诊断
description: 从命令执行、事件循环、客户端、网络、持久化和宿主机逐层定位 Redis 尾延迟。
---

Redis 延迟可能来自服务端命令执行、事件循环阻塞、fork、持久化、网络、客户端连接池或宿主机调度。先确定延迟测量位置，不能把客户端总耗时全部归因于 Redis 命令。

## 分解延迟

客户端总时间通常包含：

```text
连接池等待 + DNS/连接/TLS + 网络 RTT + 服务端排队与执行 + 响应读取
```

记录连接复用、Pipeline 批次、请求与响应字节、重试次数和服务端地址。代理、Cluster 重定向和跨区域访问也会增加额外跳转。

## Slow Log

```bash
redis-cli SLOWLOG GET 20
redis-cli SLOWLOG LEN
```

Slow Log 记录超过阈值的命令执行时间，通常不包含客户端网络 I/O。它适合发现集合全量读取、复杂脚本等慢命令，但不能解释连接池等待或响应传输。

阈值过高会漏掉大量中等延迟，过低则迅速覆盖历史。调整 `slowlog-log-slower-than` 和 `slowlog-max-len` 前先确认目标版本默认值、内存开销和隐私风险。

## 延迟监控与命令统计

```bash
redis-cli LATENCY LATEST
redis-cli LATENCY DOCTOR
redis-cli INFO commandstats
```

Latency Monitor 只有在配置阈值后才采集相关内部事件。`INFO commandstats` 提供每类命令累计调用、CPU 时间和错误等信息，适合寻找总成本较高的命令族。

支持的版本还可以使用命令延迟直方图查看分布。任何累计统计都要记录重启和重置时间，避免比较不同窗口。

## 常见服务端来源

- Big Key 的读取、删除、集合运算或序列化。
- `KEYS`、大范围 `ZRANGE`、复杂 Lua/Functions 等单次工作量无上限。
- AOF 重写、RDB 保存时 fork 与 Copy-on-Write。
- 内存压力、Swap、透明大页或虚拟机调度停顿。
- 主从全量同步、输出缓冲积压或网络带宽饱和。
- 集中过期、主动碎片整理或模块执行。

结合 `INFO memory`、`INFO persistence`、`INFO replication`、宿主机 PSI、CPU 和网络判断，不能因为时间相近就直接认定因果。

## 测量环境基线

`redis-cli --intrinsic-latency` 用于测量运行命令所在主机的调度基线，应在 Redis 所在主机并限制持续时间使用。它会占用一个 CPU 核心，生产执行前需要审批和负载评估。

客户端侧 `redis-cli --latency` 测量往返延迟，会受到运行位置和网络影响。分别从应用节点与同机测试有助于区分网络和服务端。

## 处理步骤

1. 按时间和 Key 模板定位受影响命令，不在生产执行全量高成本扫描。
2. 限制单次元素与字节数，拆分 Big Key 或将大内容迁出 Redis。
3. 使用 Pipeline 减少 RTT，但控制批次和服务端输出缓冲。
4. 将持久化、复制和批任务与在线流量错峰并设置资源上限。
5. 修复客户端池、重试或跨区域路径，避免只调整 Redis 参数。

修改后同时比较 P50、P99、吞吐、CPU、内存、网络和复制。平均延迟下降不能证明尾延迟和故障恢复已经改善。

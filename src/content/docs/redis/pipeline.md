---
title: 使用 Pipeline 减少 Redis RTT
description: 解释 Redis Pipeline 的吞吐收益、ioredis 用法以及原子性和批次限制。
---

客户端逐条发送 Redis 命令时，每条命令都要等待一次网络往返时间（RTT）。Pipeline 允许客户端连续发送一批命令，再批量读取响应，从而减少等待网络往返的次数并提高吞吐。

Pipeline 不会把多条命令变成一条 Redis 命令，也不保证只发生一次系统调用。收益取决于网络延迟、批次大小、命令成本和客户端实现。

## ioredis 示例

```js
const pipeline = redis.pipeline();

pipeline.set('user:42:name', 'Alice');
pipeline.get('user:42:name');

const results = await pipeline.exec();

for (const [error, value] of results) {
  if (error) {
    console.error(error);
    continue;
  }
  console.log(value);
}
```

连接、超时等批次级错误仍可能让 `exec()` 直接失败；命令执行错误通常出现在结果数组中。调用方必须同时处理这两类错误。

## Pipeline 不是事务

Pipeline 中某条命令失败时，其他命令仍可能执行。它不提供隔离性或原子性，也不能让后续命令使用前一条命令刚返回的结果。

- 需要原子执行一组命令时，评估 `MULTI`/`EXEC` 或 Lua/Redis Function。
- 同一种批量操作优先使用 `MGET`、`MSET` 等原生命令。
- Redis Cluster 中，一批 Key 可能分布在不同节点；客户端需要按 slot 拆分并分别发送。

## 控制批次大小

Pipeline 过大会占用客户端和服务端缓冲区，延长单批处理时间，并让超时后的重试成本上升。不要套用固定的“100 条”限制，应同时约束命令数和总字节数，通过压测选择满足 P99 延迟和内存预算的批次。

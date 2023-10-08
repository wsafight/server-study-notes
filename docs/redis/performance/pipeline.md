# 使用 pipeline 减少 RTT 提升吞吐量

Redis 中有很多命令不支持批量操作，需要多次发送命令。
多次发送命令就会有多次网络请求。客户端与服务端网络延迟越大。网络请求消耗的时间就越长。

使用 pipeline 命令可以一次在网络请求执行多条命令。该指令将多条命令在内存中排队，然后一次将它们发送到 Redis 服务端。这样性能可以提高 50% ~ 300%。

事实上 pipeline 不仅仅可以减少客户端的等待时间，它还可以极大地提高了 Redis 服务器中每秒可以执行的操作数量。这是因为，Redis 命令都会执行系统调用 read 和 write 方法，这意味着从用户态到内核态。上下文切换会带来巨大的速度损失。

当使用 pipeline 时，多个命令只会涉及到一次系统调用，大大减少了系统的上下文切换。

使用 JavaScript ioredis 为例。

```js
// 开启 pipeline
const pipeline = redis.pipeline();
pipeline.set("foo", "bar");
pipeline.del("cc");
pipeline.exec((err, results) => {
  // 无论如何 err 是 null, result 返回一个数组。
  // 该数组根据执行命令顺序返回错误或结果
  // 看出 pipeline 中间出错不会终止，而是继续执行下一条命令
  // result 数组里面是元组 [err, result]
});

// 也提供了链式调用
redis
  .pipeline()
  .set("foo", "bar")
  .del("cc")
  .exec((err, results) => {});

// `exec` 也可以返回 Promise
const promise = redis.pipeline().set("foo", "bar").get("foo").exec();
promise.then((result) => {
  // result === [[null, 'OK'], [null, 'bar']]
});
```

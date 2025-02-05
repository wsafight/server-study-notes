---
title: HyperLogLog 去重计数
---

Redis 在 2.8.9 版本添加了 HyperLogLog 结构。

Redis HyperLogLog 是用来做基数统计的算法，HyperLogLog 的优点是，在输入元素的数量或者体积非常非常大时，计算基数所需的空间总是固定的、并且是很小的。

HyperLogLog 提供不精确的去重计数方案，虽然不精确，但是也不是非常离谱，标准误差小于 1%。也就是说在特定场景下完全能够接受。

举一个实际的例子，在开发和维护网页的过程中，开发者往往需要统计网站的 PV 和 UV 数据。

如果统计 PV 数据，可以直接给每个网页配置一个 redis 计数器，但是 UV 需要去重，同一个用户一天内多次访问只能计数一次。这就要求每一个网页请求都需要带上用户的 ID。

而页面的 UV 是允许有一定的误差的，此时我们就可以使用 HyperLogLog 解构，可以大大减少存储量。

## 使用方式

HyperLogLog 提供了两个指令 pfadd 和 pfcount，根据字面意思很好理解，一个是增加计数，一个是获取计数。

```bash
pfadd test user1 
# 1 代表完成
pfcount test
# 1 返回数量
pfadd test user2
# 1 代表完成
pfcount test
# 2 返回数量
```

但是，因为 HyperLogLog 只会根据输入元素来计算基数，而不会储存输入元素本身，所以 HyperLogLog 不能像集合那样，返回输入的各个元素。

HyperLogLog 除了提供上面的 pfadd 和 pfcount 之外，还提供了第三个指令 pfmerge，用于将多个 pf计数值累加在一起形成一个新的 pf 值。

## 实现原理

在 Redis 里面，每个 HyperLogLog 键只需要花费 12 KB 内存，就可以计算接近 2^64 个不同元素的基 数。这和计算基数时，元素越多耗费内存就越多的集合形成鲜明对比。相比 set 存储方案， HyperLogLog 所使用的空间那就只能算九牛之一毛了 。

不过你也不必过于担心，因为 Redis 对 HyperLogLog 的存储进行了优化，在计数比较小时，它的存储空间采用稀疏矩阵存储，空间占用很小，仅仅在计数慢慢变大、 稀疏矩阵占用空间渐渐超过了阎值时，才会一次性转变成稠密矩阵，会占用 12kB 的空间。


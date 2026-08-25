---
title: 使用 MySQL Ticket Server 生成分布式 ID
description: 通过自增步长和专用 Ticket 表生成唯一 ID，并评估顺序、可用性和扩展限制。
---

MySQL 自增列可以构建简单的 Ticket Server。多个发号实例使用不同起始偏移和相同步长，生成互不冲突的 ID 序列。

[Flickr Ticket Servers](https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/) 曾使用两个独立数据库分别生成奇数和偶数 ID。这种方案强调唯一与高可用，不保证跨节点严格递增。

## Ticket 表

```sql
CREATE TABLE tickets64 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stub CHAR(1) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tickets64_stub (stub)
) ENGINE = InnoDB;
```

每次在同一数据库连接中执行：

```sql
REPLACE INTO tickets64 (stub) VALUES ('a');
SELECT LAST_INSERT_ID();
```

`REPLACE` 会删除相同 `stub` 的旧行并插入新行，从而分配新的自增 ID。该表必须专用于发号，避免 `REPLACE` 的删除/插入语义影响其他数据。

## 多节点步长

两个节点可以分别配置：

```text
Node 1: auto_increment_increment = 2
        auto_increment_offset = 1

Node 2: auto_increment_increment = 2
        auto_increment_offset = 2
```

扩展到 `n` 个节点时，步长设为 `n`，偏移分别为 `1..n`。故障切换和新增节点必须保留唯一偏移，否则可能产生冲突。

## 使用边界

- ID 只保证唯一和单节点递增，跨节点返回顺序不严格递增。
- 数据库连接、提交延迟和主键热点决定发号吞吐。
- 事务回滚和 `REPLACE` 会产生 ID 空洞，这是正常现象。
- 调用必须从执行 `REPLACE` 的同一连接读取 `LAST_INSERT_ID()`。
- 数据库不可用时无法发号，需要超时、重试和节点摘除机制。

需要无数据库依赖、携带时间或机房信息时，可以评估 Snowflake 类算法；需要一次获取一段 ID 时，可以使用号段模式降低数据库请求频率。

---
title: 利用 MySQL 产生分布式 id
---

MySQL 可以产生自增ID，利用多台 MySQL 服务器也可以组成一个高性能的分布式发号器。

假设用 8 台 MySQL 服务器协同工作，第一台 MySQL 初始值是1，每次自增8，第二台 MySQL 初始值是 2，每次自增 8，依次类推。前面用一个 round-robin load balancer 挡着，每来一个请求，由 round-robin balancer 随机地将请求发给 8 台 MySQL 中的任意一个，然后返回一个 ID。

[Flickr 票务服务使用了这中方案](https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/)。Flickr 票务服务器是一个专用的数据库服务器，上面只有一个数据库，在该数据库中有用于 32 位 ID 数据表 Tickets32 和用于 64 位 ID 的数据表 Tickets64。

该方案的缺点是缺点是 ID 是不是严格递增的，只是粗略递增的。


## 创建数据表数据表
```SQL
CREATE TABLE `tbl_name` {
    `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `row_name` char(1) NOT NULL DEFAULT '',
    PRIMARY KEY (`id`),
    UNIQUE KEY `row_name` (`row_name`)
} ENGINE=InnoDB
```

每次我们想要生成并获取 id 时。利用 REPLACE INTO 生成新的 ID。执行如下所示

```SQL
REPLACE INTO `tbl_name` (`row_name`) VALUES ('a')
SELECT LAST_INSERT_ID()
```

- auto_increment_offset表示自增长字段从那个数开始，他的取值范围是1 .. 65535
- auto_increment_increment表示自增长字段每次递增的量，其默认值是1，取值范围是1 .. 65535

如果有两台服务器设定如下所示

```
Server 1:
auto-increment-increment = 2
auto-increment-offset = 1

Server 2:
auto-increment-increment = 2
auto-increment-offset = 2
```


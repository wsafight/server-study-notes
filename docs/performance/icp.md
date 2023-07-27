# 索引下推

索引下推(Index Condition PushDown，简称ICP)，是MySQL5.6版本的新特性，它能减少回表查询次数，提高查询效率。

针对一张表使用联合索引的情况下

- MySQL 5.6 前会使用索引检索最左索引，然后回表在对比其他值
- MySQL 5.6 后会使用索引检索最左索引，然后在检索查询语句中其他条件是否在联合索引中，如果在则继续过滤


该功能默认开启，可以使用下述语句关闭索引下推。

```MYSQL
SET optimize_switch = 'index_condition_pushdown=off'
```

在满足一定的条件下，存储引擎层会在回表查询之前对数据进行过滤，可以减少存储引擎回表查询的次数。

下面是索引下推的条件：

- ICP 用于非聚簇索引，聚簇索引本省包含表数据，无需下推
- ICP 需要使用联合索引
- WHERE 条件是 and 而并非 or
- ICP 不支持子查询为条件
- ICP 不支持存储函数作为条件
- ICP 不支持虚拟列上建立的索引
- ICP 用于 range，ref，eq_ref,ref_or_null 访问方法
# 建立索引

MYSQL 索引有很多用途，例如。

- 保持数据完整性（主键，外键以及唯一键）
- 优化数据访问性能
- 改进表的连接操作(join)
- 对结果进行排序（order）
- 简化聚合数据操作(group)

但添加索引会导致数据表插入慢数倍。

mk-duplicate-key-checker

通常建立索引是数据库优化的重要方式，在决定添加索引之前，通常应该至少做两项检查: 首先验证表现有的结构，然后确认表的大小。

展示 table_name 的结构，\G 语句终止符可以让返回的结果垂直展示。

```SQL
SHOW CREATE TABLE table_name\G
```

```SQL
SHOW INDEXES FROM table_name\G
```

```SQL
SHOW TABLE STATUS LIKE table_name\G
```

对于 InnoDB 表， SHOW TABLE STATUS 除了表保留的物理大小外，没有给出准确的统计数据。行数只是 SQL 优化中使用的粗略估计。

在分析完数据表后，就可以创建索引了。

注意： 当创建非主键索引时，KEY 和 INDEX 关键字可以互换。但创建主键索引时只能使用 KEY 关键宇

```SQL
ALTER TABLE <table>
    ADD PRIMARY KEY [index-name] (<column>)

ALTER TABLE <table>
    ADD [UNIQUE] KEY|INDEX [index-name] (<column>):
```

添加倒叙索引。

创建索引是一件非常耗时的工作，并且会阻塞其他操作。 开发者可以使用一条 ALTER 语句将给定表上多个索引创建的语句合并
起来。

https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html

```SQL
SET (@session.optimizerswitch='indexmerge intersection=off'
```

索引合并（Index Merge）：MySQL把使用多个索引来完成一次查询的执行方法称之为index merge（索引合并）。将把从多个辅助索引获得的主键ID值取Intersection交集、Union并集、Sort-Union排序并集后再统一回表，以减少回表次数（随机IO）。

索引条件下推（Index Condition Pushdown,ICP）：ICP是一种在存储引擎层使用索引过滤数据的一种优化方式。是对联合索引进行二次过滤之后回表。用于二级索引的range、 ref、 eq_ref或ref_or_null扫描，如果部分where条件能使用索引的字段，MySQL Server会把这部分下推到引擎层，可以利用index过滤的where条件在存储引擎层进行数据过滤。

基于块的嵌套循环连接（Block Nested-Loop Join，BNL）：先将驱动表得到的结果集存放在Join Buffer内存结构中，再和被驱动表进行匹配查询。减少被驱动表的I/O代价。

Multi-Range Read（MRR）：MRR在本质上是一种用空间换时间的算法。MRR 通过把「随机磁盘读」，转化为「顺序磁盘读」，从而提高了索引查询的性能。严格意义上说属于非Join的优化算法，对于辅助索引上的范围查询进行优化，收集辅助索引对应主键id，进行排序后再回表，每次传递一组排好序的主键id值给被驱动表，随机IO转换成顺序IO。

Batched Key Access（BKA）：BKA算法结合了NLJ、BNL、MRR算法的特性。即用到了NLJ的被驱动表关联字段索引减少关联匹配的次数；又使用到了BNL的Join Buffer，用以暂存驱动表连接数据减少访问驱动表；还用到了MRR的收集辅助索引主键id后排序再回表查询，随机IO转换成顺序IO等优化特性集一身，可以把BKA看做是NLJ算法的加强版。即一次性将驱动表存放在Join Buffer中查询所需的一组字段值经过MRR接口将对应主键ID值排好序后再与被驱动表的连接字段（有索引）进行Join操作。

嵌套循环连接（Simple Nested-Loop Join/Nested-Loop Join）：笛卡尔积。

基于索引的嵌套循环连接（Index Nested-Loop Join，NLJ）：进行Join查询时，可以用上被驱动表的索引。


oak-online-alter-table


删除无效的索引其实更是一种优化。
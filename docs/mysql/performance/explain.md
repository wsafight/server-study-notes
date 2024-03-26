# 使用 EXPLAIN 来分析 SQL 查询问题

Query Execution Plan 是查询执行计划。而 EXPLAIN 可以帮助开发人员分析 SQL 问题,explain 显示了 mysql 如何使用索引来处理select语句以及连接表,可以帮助选择更好的索引和写出更优化的查询语句。

当 MysQL 要执行一个 SQL 查询的时候，它首先会对该 SOL 语句进行语法检查，然后构造一个 QEP, QEP 决定了 MySQL 从底层存储引擎中获取信息的方式。如果想要查看 MysQL 查询优 化器为 SQL 语句构造的 QEP，只需要在 SELECT 语句前加上如下的EXPLAIN 关键字前缀。即：

```SQL
EXPLAIN SELECT * FROM inventory WHERE item_id = 1232
```

注意：根据底层使用的不同存储引擎， 受影响的行数这个指标可能是一个估计值，但也可能是一个精确值。即使受影响的行数是一个估计值，但通常，这个估计值也足以使优化器做出一个有充分依据的决定。

生成的 QEP 并不确定，它可能会根据很多因素而发生改变。MySQL 不会将一个 QEP 和某个给定查询绑定， QEP 将由 SQL 语句每次执行时的实际情况确定。即便使用存储过程也是如此。尽管在存储过程中 SQL 语句都是预先解析过的，但 QEP 仍然会在每次调用存储过程的时候才被确定。

有两个可选的关键字可以和 EXPLAIN 命令一起使用: PARTITIONS 和 EXTENDED 关键字。

EXPLAIN PARTITIONS 可以获取分区表的信息，partitions 会有分区表的信息，如果该命令用于检查针对非分区表的查询，则不会产生错误，但列的值 partitions 始终为 NULL。

EXPLAIN EXTENDED 可以显示扩展的信息，这些信息不是 EXPLAIN 输出的一部分，但可以通过发出 SHOW WARNINGS 后面的语句来查看 EXPLAIN。




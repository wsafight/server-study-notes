# SQL 事务隔离级别

SQL-92 标准中定义了 4 种事务隔离级别，由低到高分别是：
- 未提交读(Read uncommitted)
- 提交读(Read committed)
- 可重复读(Repeatable reads)
- 串行化(Serializable)

不同的事务隔离级别可以让开发者权衡性能与问题（脏读，幻读，不可重复读）的权重。以便开发者根据不同的业务指定不同的隔离级别。

脏读是指当前事务获取了其他事务还没有提交（可能会发生回滚）的数据。那么当前事务基于这条数据所做的操作可能就有问题。即：读到其他事务没有提交的数据。

不可重复读是指在一个事务内多次读取同一条数据却返回了不同的结果，这是由于在多次读取的过程中另一个事务操作了这一条数据。即：事务在两次读取数据的过程中有其他事务对数据进行了修改（update,delete）。导致两次读取数据的结果不同。

幻读是指一个事务在进行范围查询的过程中。其他事务写入(delete,insert，update)了符合当前事务的查询条件的数据。当前事务没有感知继续执行操作，但是用户会发现对应范围内的数据没有被全部处理，就像发生了幻觉一样。一般解决的方法是增加范围锁，锁定检测范围为只读。

根据上述问题和隔离级别，可以排一下问题的严重性：

脏读 > 不可重复读 > 幻读

- 未提交读(Read uncommitted) 啥都没解决，但并发非常好
- 提交读(Read committed) 不会出现脏读（大型互联网企业用的级别）
- 可重复读(Repeatable reads) 不会出现脏读和不可重复读（MySQL 默认级别）
- 串行化(Serializable) 啥都解决了

既然有脏读，那么就应该会有脏写（一个事务修改另外一个未提交事务修改的数据），那么为什么 SQL-92 标准中并没有指出脏写现象呢？这是因为脏写现象对于一致性的影响太严重了，必须要解决这个问题，所以无论哪一个隔离级别都不允许脏写的情况发生。

查看隔离级别的语法如下：

```SQL
--  查看系统变量
SHOW VARIABLES LIKE 'transaction_isolation'

SHOW @@transaction_isolation;
```

注： transaction_isolation 是 MySQL 5.7.20 版本引入的，再此之前的版本使用的变量是 tx_isolation。

设置隔离级别的语法如下：

```SQL
-- 全局设置
SET GLOBAL TRANSACTION ISOLATION LEVEL level

-- 会话设置
SET SESSION TRANSACTION ISOLATION LEVEL level

-- 仅适用于下一个开启的事务
SET TRANSACTION ISOLATION LEVEL level
```

其中 level 有 4 个可选值：
- READ UNCOMMITTED
- READ COMMITTED
- REPEATABLE READ
- SERIALIZABLE

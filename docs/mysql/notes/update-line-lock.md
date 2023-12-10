# 使用数据库更新行级锁处理并发问题

如果当前 InnoDB 中事务的隔离界别是 RC 或者更高级别，会使用行级锁来处理对应 UPDATE 操作。

对比以下两个代码操作：

```SQL
SELECT `quota` FROM `table_name` WHERE `id` = 'xxx'

-- 添加判断 quota >= 10 ，直接返回额度不足
-- 执行数据操作 newQuota = quota - 10

UPDATE `table_name` SET `quota` = newQuota WHERE `id` = 'xxx'
```


```SQL
UPDATE `table_name` SET `quota` = `quota` - 10 WHERE `id` = 'xxx' AND `quota` >= 10
```

如果当前用户量请求较少的情况下，上述两个代码都没有问题。但是如果用户量稍微大一点，第一个代码就会出现异常，由于多个请求同一时间都会获取到相同额度，减少额度后更新都是相同的数据。从而导致实际的额度远远小于数据库额度。

第二个代码不会出现上述问题，由于行级锁的存在，UPDATE 语句只能串行执行。

注：当前也可以使用乐观锁（注意业务）和分布式锁来处理，但不要使用对应编程语言或操作系统的锁机制处理，因为对应处理只会对单机系统有效。



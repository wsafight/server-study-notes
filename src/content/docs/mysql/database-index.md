---
title: 索引优化
---

1.维度高的列创建索引

数据列中不重复值出现的个数,这个数量越高,维度就越高
如数据表中存在8行数据a ,b ,c,d,a,b,c,d这个表的维度为4
要为维度高的列创建索引,如性别和年龄,那年龄的维度就高于性别
性别这样的列不适合创建索引,因为维度过低

2.对 where,on,group by,order by 中出现的列使用索引

3.对较小的数据列使用索引,这样会使索引文件更小,同时内存中也可以装载更多的索引键

4.为较长的字符串使用前缀索引

5.不要过多创建索引,除了增加额外的磁盘空间外,对于DML操作的速度影响很大,因为其每增删改一次就得从新建立索引

6.使用组合索引,可以减少文件索引大小,在使用时速度要优于多个单列索引


```sqL
SELECT `sname` FROM `stu` WHERE `age`+10=30;-- 不会使用索引,因为所有索引列参与了计算

SELECT `sname` FROM `stu` WHERE LEFT(`date`,4) <1990; -- 不会使用索引,因为使用了函数运算,原理与上面相同

SELECT * FROM `houdunwang` WHERE `uname` LIKE'后盾%' -- 走索引

SELECT * FROM `houdunwang` WHERE `uname` LIKE "%后盾%" -- 不走索引

-- 正则表达式不使用索引,这应该很好理解,所以为什么在SQL中很难看到regexp关键字的原因

-- 字符串与数字比较不使用索引;
CREATE TABLE `a` (`a` char(10));
EXPLAIN SELECT * FROM `a` WHERE `a`="1" -- 走索引
EXPLAIN SELECT * FROM `a` WHERE `a`=1 -- 不走索引

select * from dept where dname='xxx' or loc='xx' or deptno=45 --如果条件中有or,即使其中有条件带索引也不会使用。换言之,就是要求使用的所有字段,都必须建立索引, 我们建议大家尽量避免使用or 关键字

-- 如果mysql估计使用全表扫描要比使用索引快,则不使用索引
```

前缀索引兼顾索引大小和查询速度

组合索引

vc_Name,vc_City,i_Age
vc_Name,vc_City
vc_Name

只是在大数据导入时,可以先删除索引,再批量插入数据,最后再添加索引;

使用查询提示

- USE INDEX
- FORCE INDEX
- iGNORE INDEX

使用 USE 提示会让 MySOL 从指定的索引中选择一个。FORCE 会对基于开销的优化器产生影响，让优化器更倾向于索引扫描而不是全表扫描。

添加或者改变表上的索引并不会影响到 一个在特定索引中指 定的硬编码 SQL 语句，所以查询提示应该是你最后考虑的方案。


频繁执行且速度很快的 SQL 语句通常被认为不是必须要调整的。但提升这些查询的速度能够为系统资源带来非常大的益处， 这些资源使得你的数据库系统能够处理更多的 SQL 语句。

SHOW INDEX STATISTICS 是谷歌的一个补丁，收集 sql 语句并监控引擎使用。


[mysqld]
全面查询日志
general_log=1
general_log_file=/path/to/file

慢 sql 日志
slow_query_log=1
slow_query_log_file=/path/to/file 
long_query_time=0.2
log_output=FILE

二进制日志
log_bin=/path/to/file
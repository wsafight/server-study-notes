# 慢查询日志

在优化 MySQL 时，通常需要对数据库进行分析。分析慢查询日志是一个非常重要的手段。

## 开启慢查询日志

在配置文件 my.cnf 或 my.ini 中在 [mysqld] 一行下面加入两个配置参数：

log-slow-queries=/data/mysqldata/slow-query.log

long_query_time=5

注：log-slow-queries 参数为慢查询日志存放的位置，一般这个目录要有 MySQL 的运行帐号的可写权限，一般都将这个目录设置为 MySQL 的数据存放目录。

long_query_time=5 中的 5 表示查询超过五秒才记录。

还可以在 my.cnf 或者 my.ini 中添加 log-queries-not-using-indexes 参数，表示记录下没有使用索引的查询。

## 慢查询日志分析



如果是云数据库的话，我们可以直接进行分析：



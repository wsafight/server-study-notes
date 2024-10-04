# 服务器配置关键参数

## max_connections

设置 MySQL 允许访问的最大连接数量

## interactive_timeout | wait_timeout

设置交互连接的超时时间 | 非交互连接的超时时间

## max_allowed_packet 

控制 MySQL 可以接收的数据包的大小

## sync_binlog

设置每写多少次缓冲会向磁盘同步一次 binlog 日志（可以是 1）

## sort_buffer_size

设置每个会话使用的排序缓存区的大小

## join_buffer_size

设置每个会话使用的连接缓存区的大小

## read_buffer_size

设置了当对一个 MYISAM 引擎进行表扫描时所分配的读缓存池的大小

## read_rnd_buffer_size

设置索引缓冲区大小

## binlog_cache_size

设置每个会话用于缓存未提交的事务缓存大小

## innodb_flush_log_at_trx_commit

- 0: 每秒进行一次重做日志的磁盘刷新操作
- 1: 每次事务提交都会刷新事务日志到磁盘中
- 3: 每次事务提交写入系统缓存每秒向磁盘刷新一次

## innodb_buffer_pool_size

innodb 缓存池的大小，可以为系统可用内存的 75 %

## innodb_buffer_pool_instances

innodb 缓存池的实例个数，每个实例的大小为总缓存池大小/实例个数

## innodb_file_per_table

设置每个表独立使用一个表空间文件
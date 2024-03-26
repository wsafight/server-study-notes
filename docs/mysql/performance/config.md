# 设置优化

在服务器的 BIOS 设置中，可调整下面的几个配置，目的是发挥 CPU 最大性能，或者避免经典的 NUMA 问题：

1、选择 Performance Per Watt Optimized(DAPC) 模式，发挥 CPU 最大性能，跑 DB 这种通常需要高运算量的服务就不要考虑节电了；

2、关闭 C1E 和 C States 等选项，目的也是为了提升 CPU 效率；

3、Memory Frequency（内存频率）选择 Maximum Performance（最佳性能）；

4、内存设置菜单中，启用 Node Interleaving，避免 NUMA 问题；

下面几个是按照 IOPS 性能提升的幅度排序，对于磁盘 I/O 可优化的一些措施：

1、使用 SSD 或者 PCIe SSD 设备，至少获得数百倍甚至万倍的 IOPS 提升；

2、购置阵列卡同时配备 CACHE 及 BBU 模块，可明显提升 IOPS（主要是指机械盘，SSD 或 PCIe SSD 除外。同时需要定期检查 CACHE 及 BBU 模块的健康状况，确保意外时不至于丢失数据）；

3、有阵列卡时，设置阵列写策略为 WB，甚至 FORCE WB（若有双电保护，或对数据安全性要求不是特别高的话），严禁使用 WT 策略。并且闭阵列预读策略，基本上是鸡肋，用处不大；

4、尽可能选用 RAID-10，而非 RAID-5；

5、使用机械盘的话，尽可能选择高转速的，例如选用 15 KRPM，而不是 7.2 KRPM 的盘，不差几个钱的；

在文件系统层，下面几个措施可明显提升 IOPS 性能：

1、使用 deadline/noop 这两种 I/O 调度器，千万别用 cfq（它不适合跑 DB 类服务）；

2、使用 xfs 文件系统，千万别用 ext3，ext4 勉强可用，但业务量很大的话，则一定要用 xfs；

3、文件系统 mount 参数中增加：noatime, nodiratime, nobarrier 几个选项（nobarrier 是 xfs 文件系统特有的）；

针对关键内核参数设定合适的值，目的是为了减少 swap 的倾向，并且让内存和磁盘 I/O 不会出现大幅波动，导致瞬间波峰负载：

1、将 vm.swappiness 设置为 5-10 左右即可，甚至设置为 0（RHEL 7 以上则慎重设置为 0，除非你允许 OOM kill 发生），以降低使用 SWAP 的机会；

2、将 vm.dirty_background_ratio 设置为 5-10，将 vm.dirty_ratio 设置为它的两倍左右，以确保能持续将脏数据刷新到磁盘，避免瞬间 I/O 写，产生严重等待（和 MySQL 中的 innodb_max_dirty_pages_pct 类似）；

3、将 net.ipv4.tcp_tw_recycle、net.ipv4.tcp_tw_reuse 都设置为 1，减少 TIME_WAIT，提高 TCP 效率；

4、至于网传的 read_ahead_kb、nr_requests 这两个参数，我经过测试后，发现对读写混合为主的 OLTP 环境影响并不大（应该是对读敏感的场景更有效果），不过没准是我测试方法有问题，可自行斟酌是否调整；

建议调整下面几个关键参数以获得较好的性能（可使用本站提供的 my.cnf 生成器生成配置文件模板）：

1、选择 Percona 或 MariaDB 版本的话，强烈建议启用 thread pool 特性，可使得在高并发的情况下，性能不会发生大幅下降。此外，还有 extra_port 功能，非常实用， 关键时刻能救命的。还有另外一个重要特色是 QUERY_RESPONSE_TIME 功能，也能使我们对整体的 SQL 响应时间分布有直观感受；

2、设置 default-storage-engine=InnoDB，也就是默认采用 InnoDB 引擎，强烈建议不要再使用 MyISAM 引擎了，InnoDB 引擎绝对可以满足 99% 以上的业务场景；

3、调整 innodb_buffer_pool_size 大小，如果是单实例且绝大多数是 InnoDB 引擎表的话，可考虑设置为物理内存的 50% ~ 70% 左右；

4、根据实际需要设置 innodb_flush_log_at_trx_commit、sync_binlog 的值。如果要求数据不能丢失，那么两个都设为 1。如果允许丢失一点数据，则可分别设为 2 和 10。而如果完全不用 care 数据是否丢失的话（例如在 slave 上，反正大不了重做一次），则可都设为 0。这三种设置值导致数据库的性能受到影响程度分别是：高、中、低，也就是第一个会令数据库最慢，最后一个则相反；

5、设置 innodb_file_per_table = 1，使用独立表空间，我实在是想不出来用共享表空间有什么好处了；

6、设置 innodb_data_file_path = ibdata1:1G:autoextend，千万不要用默认的 10M，否则在有高并发事务时，会受到不小的影响；

7、设置 innodb_log_file_size=256M，设置 innodb_log_files_in_group=2，基本可满足 90% 以上的场景；

8、设置 long_query_time = 1，而在 5.5 版本以上，已经可以设置为小于 1 了，建议设置为 0.05（50 毫秒），记录那些执行较慢的 SQL，用于后续的分析排查；

9、根据业务实际需要，适当调整 max_connection（最大连接数）、max_connection_error（最大错误数，建议设置为 10 万以上，而 open_files_limit、innodb_open_files、table_open_cache、table_definition_cache 这几个参数则可设为约 10 倍于 max_connection 的大小；

10、常见的误区是把 tmp_table_size 和 max_heap_table_size 设置的比较大，曾经见过设置为 1G 的，这 2 个选项是每个连接会话都会分配的，因此不要设置过大，否则容易导致 OOM 发生；其他的一些连接会话级选项例如：sort_buffer_size、join_buffer_size、read_buffer_size、read_rnd_buffer_size 等，也需要注意不能设置过大；

11、由于已经建议不再使用 MyISAM 引擎了，因此可以把 key_buffer_size 设置为 32M 左右，并且强烈建议关闭 query cache 功能；

关于 MySQL 的管理维护的其他建议有：

1、通常地，单表物理大小不超过 10GB，单表行数不超过 1 亿条，行平均长度不超过 8KB，如果机器性能足够，这些数据量 MySQL 是完全能处理的过来的，不用担心性能问题，这么建议主要是考虑 ONLINE DDL 的代价较高；

2、不用太担心 mysqld 进程占用太多内存，只要不发生 OOM kill 和用到大量的 SWAP 都还好；

3、在以往，单机上跑多实例的目的是能最大化利用计算资源，如果单实例已经能耗尽大部分计算资源的话，就没必要再跑多实例了；

4、定期使用 pt-duplicate-key-checker 检查并删除重复的索引。定期使用 pt-index-usage 工具检查并删除使用频率很低的索引；

5、定期采集 slow query log，用 pt-query-digest 工具进行分析，可结合 Anemometer 系统进行 slow query 管理以便分析 slow query 并进行后续优化工作；

6、可使用 pt-kill 杀掉超长时间的 SQL 请求，Percona 版本中有个选项 innodb_kill_idle_transaction 也可实现该功能；

7、使用 pt-online-schema-change 来完成大表的 ONLINE DDL 需求；

8、定期使用 pt-table-checksum、pt-table-sync 来检查并修复 mysql 主从复制的数据差异；

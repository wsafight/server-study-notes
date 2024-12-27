---
title: MySQL 自增 id 重复利用
---

在 MySQL 8.0 版本前，当 MySQL 重新启动服务时候，innodb 的自增 ID，会在服务重启后，自动设置为记录中最大 ID + 1。
```SQL
select max(id)+1 from tbl_name
```

也就是说，如果在 MySQL 停止服务前一刻如果将最新的一条信息删除的话，数据表再插入记录，ID 依旧是之前的删除的那一条。

极端情况下，数据库重启服务前删除了当前表最大 ID 的记录，服务恢复后插入记录再去关联 ID 就会出现问题。

在 8.0 版本前的解决方案有两个
- 软删除（不进行物理删除，而是在数据表中添加一个字段来确定当前数据是否可用）
- 使用 innodb_autoinc_persistent
```SQL
innodb_autoinc_persistent=on
innodb_autoinc_persistent_interval=1
```

innodb_autoinc_persistent 配置为 on 责表示将 AUTO_INCREMENT 值实时存储在聚集索引根页。off 则采用原有方式只存储在内存中（可能会丢失）。

innodb_autoinc_persistent_interval 配置则表示每多少次间隔插入数据，如果自增为 1，innodb_autoinc_persistent_interval 为 100。就是每插入 100 条数据就会持久化一次，如果自增为 2 则每插入 50 条数据会持久化一次。

auto_incrememt_increment = 1 时候
- innodb_autoinc_persistent_interval=1 时性能损耗在 1% 以下。
- innodb_autoinc_persistent_interval=100 时性能损耗可以忽略。
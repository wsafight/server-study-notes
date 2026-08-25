---
title: 理解 InnoDB MVCC
description: 从隐藏列、undo 版本链和 Read View 理解一致性读，并识别长事务带来的清理压力。
---

MVCC（Multi-Version Concurrency Control）让读取者在多数情况下无需阻塞写入者。InnoDB 会保留记录的历史版本，并根据事务的 Read View 判断哪个版本可见。

## 版本从哪里来

InnoDB 聚簇索引记录包含用于事务处理的内部信息，其中包括最近修改该记录的事务标识，以及指向 undo 记录的回滚指针。更新一行时，新值写入当前记录，旧值通过 undo 信息形成可追溯的版本链。

undo 同时服务于两个目标：

- 事务回滚时撤销尚未提交的修改。
- 一致性读需要历史版本时重建可见数据。

这不意味着每次更新都复制完整数据页，也不意味着历史版本会永久保留。没有活跃事务再需要某个版本后，Purge 线程才能逐步清理相关 undo。

## Read View 如何决定可见性

Read View 记录创建快照时仍活跃的事务范围。读取某个版本时，InnoDB 会判断产生它的事务在快照创建前是否已经提交；不可见时沿 undo 链寻找更早版本。

快照时机与隔离级别有关：

- `READ COMMITTED` 通常为每条一致性读语句创建 Read View。
- `REPEATABLE READ` 通常从事务中的第一次一致性读开始复用同一个 Read View。
- `START TRANSACTION WITH CONSISTENT SNAPSHOT` 可在支持的隔离级别下显式建立一致性快照。

锁定读和写操作读取当前版本并参与加锁，不能用普通快照读的规则推断其结果。

## 长事务为什么危险

长期保持旧 Read View 会阻止相关历史版本及时清理，可能造成 undo 增长、Buffer Pool 压力和更长的版本链。即使事务没有执行大量写入，只要它持续持有旧快照，也可能扩大清理成本。

可以先查看当前 InnoDB 事务：

```sql
SELECT
  trx_id,
  trx_state,
  trx_started,
  trx_mysql_thread_id,
  trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

结合 `SHOW ENGINE INNODB STATUS` 中的 History list length、应用链路和连接池状态判断是否存在异常长事务。单个瞬时数值不能直接证明故障，应观察趋势并定位持有者。

## 工程建议

- 查询量很大的导出任务应分批执行，或使用专用副本，避免长期占用生产主库快照。
- 禁止连接“忘记提交”，并监控事务年龄而不只监控语句耗时。
- 批量更新控制每批行数和提交间隔，兼顾锁、redo、undo 与复制压力。
- 不要通过频繁强制 `PURGE` 之类的思路掩盖长事务，应先修复事务边界。

MVCC 降低了读写冲突，但没有消除写写冲突、锁等待和业务竞态。理解版本可见性后，仍需使用约束、原子更新和重试来保证业务正确性。

---
title: MySQL 学习路径
description: 按表结构、查询优化、事务并发和生产运维组织 MySQL 学习内容。
---

这一章以 InnoDB 和 MySQL 8.x 为主要背景。建议先理解一次查询如何经过 Server 层与存储引擎，再进入索引、事务和运维主题。命令和行为可能随小版本或云厂商实现变化，生产操作前应在目标环境验证。

## 1. 建立整体模型

- [MySQL 架构与查询流程](./architecture/)：连接、优化器、Buffer Pool、redo log 与 binlog 如何协作。
- [MySQL 连接池与并发控制](./connection-pooling/)：根据数据库容量限制连接、排队和重连。
- [关系数据库规范化设计](./paradigm/)：从数据依赖出发设计表，而不是先堆字段。
- [建表设计检查清单](./create-spec/)：把类型、约束、索引和生命周期变成可执行的评审项。
- [正确设计 NULL 与 NOT NULL](./not-null/)：理解 SQL 三值逻辑和约束语义。

## 2. 理解索引与查询

先阅读 [MySQL 索引设计与验证](./database-index/)，再结合 [为什么数据库索引常用 B+ 树](./why-b-plus-tree/) 和 [B+ 树的分裂与合并](./b-plus-tree/) 理解索引的读写成本。

遇到慢查询时，按下面的顺序收集证据：

1. 使用[慢查询日志](./slow-query-log/)定位高延迟或累计耗时高的 SQL。
2. 通过 [Performance Schema](./performance-schema/)区分语句、锁和等待成本。
3. 用 [EXPLAIN](./explain/) 比较估算行数、访问路径和实际执行时间。
4. 按 [SQL 性能优化方法论](./methodology/)验证修改前后的结果与资源消耗。
5. 再处理[深度分页](./limit-pref/)、[内部临时表](./temp-table/)和[数据倾斜](./data-skew/)等具体问题。

## 3. 掌握事务与并发

- [事务与隔离级别](./transaction-isolation/)：区分一致性读、当前读和不同隔离级别的快照时机。
- [InnoDB MVCC](./mvcc/)：理解 Read View、undo 版本链和长事务风险。
- [使用 SELECT FOR UPDATE](./exclusive-lock/)与[条件 UPDATE](./update-line-lock/)：根据业务不变量选择并发控制方式。
- [诊断与处理死锁](./deadlock/)：让业务具备完整事务重试能力，并缩小锁定范围。

## 4. 面向生产运维

- [二进制日志](./binlog/)、[复制与故障切换](./replication/)和[备份恢复](./backup-recovery/)共同决定数据的可恢复性。
- [安全执行在线 DDL](./online-ddl/)与[重建 InnoDB 表](./re-building/)关注元数据锁、额外空间和复制延迟。
- [安全清理过期数据](./clear/)和[数据库迁移与切流](./sync-table/)需要限速、校验与回滚路径。
- 分库分表之前，先评估[分库边界](./sub-treasury/)、[分表成本](./split-table/)和[分片倾斜](./data-skew/)。

## 推荐实践方式

不要只记结论。为每个主题准备一套可丢弃的测试实例，记录 Schema、数据规模、SQL、执行计划和观测指标。涉及事务、DDL、复制或恢复的实验应至少覆盖成功、超时、进程退出和网络中断几种路径。

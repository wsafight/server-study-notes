---
title: MySQL 学习路径
description: 按表结构、查询优化、事务并发和生产运维组织 MySQL 学习内容。
---

这一章以 InnoDB 和 MySQL 8.x 为主要背景，从表结构和标识设计进入索引、SQL、事务、复制与数据拆分。命令和行为可能随小版本或云厂商实现变化，生产操作前应在目标环境验证。

## 1. 入门与数据建模

- [MySQL 架构与查询流程](./architecture/)：连接、优化器、Buffer Pool、redo log 与 binlog 如何协作。
- [MySQL 连接池与并发控制](./connection-pooling/)：根据数据库容量限制连接、排队和重连。
- [关系数据库规范化设计](./paradigm/)：从数据依赖出发设计表，而不是先堆字段。
- [建表设计检查清单](./create-spec/)：把类型、约束、索引和生命周期变成可执行的评审项。
- [正确设计 NULL 与 NOT NULL](./not-null/)：理解 SQL 三值逻辑和约束语义。
- [理解 InnoDB 溢出列](./off-page/)：评估长列、行格式、页访问和主键扫描成本。

## 2. 主键与标识

- [规划自增主键容量](./auto-increment/)：根据整数范围、写入速率和保留周期估算耗尽时间。
- [理解自增 ID 的复用与空洞](./auto-increment-err/)：区分版本、重启、回滚和批量分配行为。
- [处理自增主键即将耗尽](./over-max-id/)：提前告警，并选择扩容、迁移或替代标识。
- [使用 Ticket Server 生成分布式 ID](./uid/)：理解批量取号、唯一性、趋势递增和可用性边界。

自增值只提供生成机制，不保证连续、无空洞或业务顺序。不要把 ID 差值直接当作精确计数。

## 3. 索引与性能分析

先阅读 [MySQL 索引设计与验证](./database-index/)，再结合 [为什么数据库索引常用 B+ 树](./why-b-plus-tree/)和 [B+ 树的分裂与合并](./b-plus-tree/)理解访问结构的读写成本。[低基数列索引](./low-dimension-index/)进一步说明选择度不是唯一判断标准。

遇到慢查询时，按下面的顺序收集证据：

1. 使用[慢查询日志](./slow-query-log/)定位高延迟或累计耗时高的 SQL。
2. 通过 [Performance Schema](./performance-schema/)区分语句、锁和等待成本。
3. 用 [EXPLAIN](./explain/)比较估算行数、访问路径和实际执行时间。
4. 按 [SQL 性能优化方法论](./methodology/)验证修改前后的结果与资源消耗。
5. 再处理[深度分页](./limit-pref/)和[内部临时表](./temp-table/)等具体成本。

[SOAR](./soar/)和 [pt-duplicate-key-checker](./pt-duplicate-key-checker/)可以辅助审核 SQL 与重复索引，但工具输出必须结合目标版本、数据分布和实际执行计划复核。

## 4. SQL 查询与语义

- [COUNT 的选择](./count/)和 [GROUP_CONCAT](./group-concat/)分别说明行数统计与分组字符串聚合的语义和资源边界。
- [WHERE 与 HAVING](./having/)区分聚合前过滤与聚合后过滤，[CTE](./cte/)用于组织复杂查询。
- [改写受限子查询](./subquery-limit/)和[字符串匹配](./match/)关注版本限制、索引和可读性。
- [存储过程的边界](./procedure/)说明何时应把流程保留在应用层。
- [NULL 数值运算](./number-null/)和 [SUM 返回 NULL](./sum-npe/)要求先定义“未知”“无行”和零的业务差别。

## 5. 事务与并发

- [事务与隔离级别](./transaction-isolation/)：区分一致性读、当前读和不同隔离级别的快照时机。
- [InnoDB MVCC](./mvcc/)：理解 Read View、undo 版本链和长事务风险。
- [使用 SELECT FOR UPDATE](./exclusive-lock/)与[条件 UPDATE](./update-line-lock/)：根据业务不变量选择并发控制方式。
- [诊断与处理死锁](./deadlock/)：让业务具备完整事务重试能力，并缩小锁定范围。

## 6. 日志、恢复与变更

- [二进制日志](./binlog/)、[复制与故障切换](./replication/)和[备份恢复](./backup-recovery/)共同决定数据的可恢复性。
- [安全执行在线 DDL](./online-ddl/)与[重建 InnoDB 表](./re-building/)关注元数据锁、额外空间和复制延迟。
- [安全清理过期数据](./clear/)需要限速和恢复边界；[TRUNCATE 与 DELETE](./truncate/)不能只按执行速度选择。
- [数据库迁移与安全切流](./sync-table/)需要双写或增量同步、校验、观察窗口和回滚路径。

## 7. 分库分表

先评估[分库策略与边界](./sub-treasury/)，再判断[分表策略与成本](./split-table/)。任何分片方案都必须持续监控[数据倾斜](./data-skew/)、跨分片查询、扩容重分布和全局唯一性。

分片增加的是分布式系统复杂度。单库索引、归档、冷热分层和容量升级仍有空间时，不应把分库分表当作默认优化手段。

## 推荐实践方式

为每个主题准备一套可丢弃的测试实例，记录 MySQL 精确版本、SQL Mode、Schema、数据规模、SQL、执行计划和观测指标。涉及事务、DDL、复制或恢复的实验应至少覆盖成功、超时、进程退出、磁盘不足和网络中断几种路径。

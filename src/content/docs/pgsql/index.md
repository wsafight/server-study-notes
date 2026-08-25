---
title: PostgreSQL 学习路径
description: 从数据建模、事务、查询规划到在线变更、高可用和权限治理建立 PostgreSQL 生产知识体系。
---

本章面向需要开发和运维 PostgreSQL 服务端应用的工程师。内容从类型和事务语义出发，延伸到查询规划、分区、JSONB、Vacuum、复制、恢复和安全治理。示例采用现代 PostgreSQL 通用语法，系统视图字段和工具选项可能随大版本变化，执行前应核对目标版本文档。

## 1. 原理与数据建模

1. [架构与查询流程](./architecture/)：理解后端进程、共享内存、WAL 和 MVCC。
2. [数据类型与约束设计](./data-types-modeling/)：让精度、时间和完整性边界在数据库中可验证。
3. [事务与隔离级别](./transactions-isolation/)：区分语句快照、事务快照、写偏差和序列化重试。

## 2. 查询与性能

1. [索引类型与设计](./indexes/)：根据等值、范围、全文、空间和大表相关性选择访问结构。
2. [JSONB 建模与索引](./jsonb/)：划分关系字段与文档属性，并控制 GIN 写放大。
3. [查询规划器与统计信息](./planner-statistics/)：从基数估算偏差定位数据倾斜和列相关性。
4. [使用 EXPLAIN](./explain/)：比较估算与实际行数、Buffer 命中和节点循环。
5. [声明式分区设计](./partitioning/)：评估分区裁剪、唯一性和生命周期维护成本。

## 3. 运行与维护

1. [连接池与 PgBouncer](./connection-pooling/)：限制后端并发，并理解事务池的会话兼容边界。
2. [观测与性能基线](./monitoring/)：连接业务信号、SQL 聚合、等待事件和主机资源。
3. [VACUUM 与 Autovacuum](./vacuum/)：理解死元组、可见性、冻结和长事务影响。
4. [诊断锁等待](./locks/)：从阻塞会话定位事务边界和访问顺序。
5. [在线 Schema 变更](./schema-migrations/)：通过 Expand-Contract、并发索引和分批回填控制风险。

## 4. 高可用、安全与部署

1. [流复制与逻辑复制](./replication/)：理解 WAL、同步提交、复制槽和故障切换。
2. [备份与时间点恢复](./backup-recovery/)：根据 RPO、RTO 设计逻辑或物理恢复。
3. [角色、权限与行级安全](./security/)：收紧所有权、默认权限、`search_path` 和租户边界。
4. [使用 Pigsty 部署 PostgreSQL](./pigsty/)：评估集成高可用、监控、备份和扩展管理的自建方案。

无论使用 Pigsty、云数据库还是自行部署，都需要单独验证故障切换、客户端重连、WAL 归档、恢复演练、权限和升级路径。

## 实践环境

建议准备一套可丢弃实例，打开 `pg_stat_statements`，构造有数据倾斜、列相关和长事务的测试表。观察查询、索引、事务、DDL 与分区维护对 `pg_stat_activity`、`pg_locks`、统计估算、WAL、复制延迟和表膨胀的影响。

不要直接在生产使用 `EXPLAIN ANALYZE` 测试未知写语句，也不要为了临时消除告警执行 `VACUUM FULL` 或终止会话。先理解命令是否会实际执行、持有什么锁，以及如何回滚。

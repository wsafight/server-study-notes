---
title: PostgreSQL 学习路径
description: 从进程架构、索引、执行计划、MVCC、锁和恢复建立 PostgreSQL 生产知识体系。
---

本章面向需要开发和运维 PostgreSQL 服务端应用的工程师。示例采用现代 PostgreSQL 通用语法，系统视图字段和工具选项可能随大版本变化，执行前应核对目标版本文档。

## 推荐顺序

1. [架构与查询流程](./architecture/)：理解后端进程、共享内存、WAL 和 MVCC。
2. [索引类型与设计](./indexes/)：根据等值、范围、全文、空间和大表相关性选择访问结构。
3. [使用 EXPLAIN](./explain/)：比较估算与实际行数、Buffer 命中和节点循环。
4. [VACUUM 与 Autovacuum](./vacuum/)：理解死元组、可见性、冻结和长事务影响。
5. [诊断锁等待](./locks/)：从阻塞会话定位事务边界和访问顺序。
6. [备份与时间点恢复](./backup-recovery/)：根据 RPO、RTO 设计逻辑或物理恢复。

## 部署与运维

[使用 Pigsty 部署 PostgreSQL](./pigsty/)介绍一套集成高可用、监控、备份与扩展管理的自建方案。无论使用 Pigsty、云数据库还是自行部署，都需要单独验证故障切换、客户端重连、WAL 归档、恢复演练和升级路径。

## 实践环境

建议准备一套可丢弃实例，打开 `pg_stat_statements`，构造有数据倾斜的测试表，并观察不同查询、索引和事务对 `pg_stat_activity`、`pg_locks`、WAL 与表膨胀的影响。

不要直接在生产使用 `EXPLAIN ANALYZE` 测试未知写语句，也不要为了临时消除告警执行 `VACUUM FULL` 或终止会话。先理解命令是否会实际执行、持有什么锁，以及如何回滚。

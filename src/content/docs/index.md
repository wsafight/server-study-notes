---
title: 服务端学习笔记
description: 面向生产环境的数据库、Linux、网络、可靠性和嵌入式分析学习路径。
template: splash
sidebar:
  hidden: true
---

这里记录服务端系统从数据存储、操作系统、网络协议到可靠性治理的核心知识。文章重点说明适用边界、失败方式、诊断证据和上线验证，不把某个命令、参数或固定阈值当作普遍答案。

## 从哪里开始

| 目标 | 建议起点 | 形成的能力 |
| --- | --- | --- |
| 开发可靠的在线服务 | [服务可靠性](./reliability/) → [网络与 HTTP](./network/) → 数据库事务 | 设计超时、幂等、并发和失败恢复 |
| 诊断接口延迟 | [系统化故障排查](./linux/troubleshooting/) → [可观测性](./reliability/observability/) | 建立时间线并从请求定位到资源与依赖 |
| 维护事务数据库 | [MySQL](./mysql/) 或 [PostgreSQL](./pgsql/) | 分析计划、锁、复制、备份和变更风险 |
| 设计缓存与共享状态 | [Redis](./redis/) | 控制一致性、热点、内存和故障切换边界 |
| 构建本地分析任务 | [DuckDB](./duck/) | 查询 Parquet、对象存储和数据库快照 |

第一次阅读建议先选一个真实问题，不必从第一篇顺序读完整个站点。每完成一个主题，都用可丢弃环境验证成功、失败、超时和恢复路径。

## 主题地图

| 主题 | 关注范围 | 学完后应能回答 |
| --- | --- | --- |
| [MySQL](./mysql/) | 建模、索引、事务、复制、恢复和在线 DDL | SQL 为什么慢，变更和故障切换会影响什么 |
| [PostgreSQL](./pgsql/) | 类型、事务、规划器、分区、Vacuum、高可用和安全 | 快照和统计如何影响正确性与计划，如何安全维护 |
| [Redis](./redis/) | 数据结构、缓存、持久化、高可用、内存和延迟 | 哪些数据适合放入内存，故障时可能丢失或重复什么 |
| [DuckDB](./duck/) | 分析 SQL、Parquet、对象存储、嵌入和数据流水线 | 如何构建可重跑、资源有界的单机分析任务 |
| [Linux](./linux/) | CPU、内存、磁盘、网络、进程和服务管理 | 哪个资源或进程发生变化，证据是否足以支持结论 |
| [网络与 HTTP](./network/) | DNS、TCP、TLS、HTTP、代理和负载均衡 | 请求在哪一跳失败，超时、重试和连接如何传播 |
| [服务可靠性](./reliability/) | SLO、可观测性、幂等、过载保护、发布和事故响应 | 允许失败多少，如何发现、止损、恢复并防止复发 |

## 沿请求链路学习

一次典型请求可以按下面的顺序拆解：

1. [DNS](./network/dns/)把服务名解析成地址，[TCP](./network/tcp/)和 [TLS](./network/tls/)建立可信连接。
2. [HTTP](./network/http/)表达请求语义，[反向代理](./network/reverse-proxy/)负责路由、连接池、健康检查和部分流量保护。
3. 应用使用[超时与重试](./reliability/timeout-retry/)、[幂等](./reliability/idempotency/)和[限流](./reliability/rate-limiting/)控制失败与副作用。
4. [Redis 缓存模式](./redis/cache-patterns/)降低回源压力，但会引入失效窗口和热点风险。
5. [MySQL 事务](./mysql/transaction-isolation/)或 [PostgreSQL 事务](./pgsql/transactions-isolation/)维护数据不变量，连接池限制进入数据库的并发。
6. [Linux 资源证据](./linux/)与[可观测性信号](./reliability/observability/)说明时间最终消耗在哪一层。

## 按问题选择入口

| 现象或任务 | 第一组入口 | 继续验证 |
| --- | --- | --- |
| 接口变慢 | [系统化故障排查](./linux/troubleshooting/)、[可观测性](./reliability/observability/) | 网络分段计时、数据库执行计划和资源饱和度 |
| 请求超时或偶发失败 | [超时、重试与退避](./reliability/timeout-retry/) | DNS、TCP、TLS、代理日志和截止时间传播 |
| MySQL 查询变慢 | [慢查询日志](./mysql/slow-query-log/)、[EXPLAIN](./mysql/explain/) | Performance Schema、索引和数据分布 |
| PostgreSQL 计划不准 | [规划器与统计信息](./pgsql/planner-statistics/)、[EXPLAIN](./pgsql/explain/) | 统计过期、数据倾斜、列相关和参数化计划 |
| 缓存延迟或容量异常 | [Redis 延迟诊断](./redis/latency-diagnostics/)、[内存诊断](./redis/memory-diagnostics/) | Big Key、热点、淘汰、持久化和客户端池 |
| 发布期间出现错误 | [优雅启动与停机](./reliability/graceful-shutdown/) | Readiness、连接排空、重试、迁移兼容和回滚 |
| 重复请求产生副作用 | [幂等请求设计](./reliability/idempotency/) | 唯一约束、事务边界、消息重投和外部副作用 |
| 分析在线事务数据 | [DuckDB 分析 PostgreSQL](./duck/postgres-integration/) | 只读副本、快照一致性、Parquet 和源端负载 |
| 远程 Parquet 查询慢 | [Parquet 布局](./duck/parquet-layout/)、[对象存储查询](./duck/object-storage/) | 小文件、Row Group、列裁剪和请求数量 |

## 实践与生产边界

1. 先写清业务 SLO、数据规模、并发模型和允许的失败范围。
2. 在可丢弃环境复现成功、超时、进程退出、磁盘不足、网络分区和恢复路径。
3. 保存配置、请求参数、执行计划、日志与时间线，避免只记录最终结论。
4. 每次修改只验证一个主要假设，并保留回滚或向前修复方案。
5. 把一次排障沉淀为监控、测试、容量模型或发布检查项。

文档中的阈值、命令和系统视图需要结合目标版本、部署环境和业务负载验证。生产操作前应明确权限、影响范围、终止条件和恢复步骤；示例凭据、地址和数据不能直接复制到真实环境。

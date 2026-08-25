---
title: 服务端学习笔记
description: 面向生产环境的数据库、Linux、网络、可靠性和嵌入式分析学习路径。
template: splash
sidebar:
  hidden: true
---

这里记录服务端系统从数据存储、操作系统、网络协议到可靠性治理的核心知识。文章重点说明适用边界、失败方式、诊断证据和上线验证，不把某个命令或固定阈值当作普遍答案。

## 按主题学习

| 主题 | 主要内容 | 建议入口 |
| --- | --- | --- |
| MySQL | 数据建模、索引、事务、复制、恢复和在线 DDL | [MySQL 学习路径](./mysql/) |
| Linux | CPU、内存、磁盘、网络、进程和系统排障 | [Linux 运维与性能排查](./linux/) |
| Redis | 缓存、数据结构、持久化、高可用和延迟诊断 | [Redis 学习路径](./redis/) |
| PostgreSQL | 建模、事务、规划器、分区、运维、高可用和安全 | [PostgreSQL 学习路径](./pgsql/) |
| 网络与 HTTP | TCP、DNS、HTTP、TLS、反向代理和负载均衡 | [网络与 HTTP 学习路径](./network/) |
| 服务可靠性 | SLO、可观测性、重试、幂等、限流和事故响应 | [服务可靠性学习路径](./reliability/) |
| DuckDB | 分析 SQL、Parquet、对象存储、嵌入和数据流水线 | [DuckDB 学习路径](./duck/) |

## 按问题选择入口

- **接口变慢：** 从[系统化故障排查](./linux/troubleshooting/)建立时间线，结合[可观测性信号](./reliability/observability/)和数据库执行计划定位成本。
- **请求超时或偶发失败：** 先理解[超时、重试与退避](./reliability/timeout-retry/)，再检查 [DNS](./network/dns/)、[TCP](./network/tcp/)和代理链路。
- **数据库变慢：** 分别使用 [MySQL EXPLAIN](./mysql/explain/)或 [PostgreSQL EXPLAIN](./pgsql/explain/)比较估算与实际执行。
- **PostgreSQL 计划估算不准：** 从[查询规划器与统计信息](./pgsql/planner-statistics/)检查数据倾斜、列相关和统计过期。
- **需要分析在线事务数据：** 先选择[使用 DuckDB 分析 PostgreSQL 数据](./duck/postgres-integration/)中的只读副本、快照或 Parquet 解耦方案。
- **远程 Parquet 查询慢：** 结合[Parquet 布局](./duck/parquet-layout/)和[对象存储查询](./duck/object-storage/)检查小文件、裁剪和请求数量。
- **缓存不稳定：** 从[缓存模式与一致性](./redis/cache-patterns/)和[Redis 延迟诊断](./redis/latency-diagnostics/)开始。
- **发布期间出现错误：** 检查[优雅启动与停机](./reliability/graceful-shutdown/)、负载均衡健康检查和数据库连接池行为。
- **重复请求产生副作用：** 使用[幂等请求设计](./reliability/idempotency/)将去重状态与业务提交放在同一正确性边界。

## 推荐实践方式

1. 先写清业务 SLO、数据规模、并发模型和允许的失败范围。
2. 在可丢弃环境复现成功、超时、进程退出、网络分区和恢复路径。
3. 保存配置、请求参数、执行计划、日志与时间线，避免只记录最终结论。
4. 每次修改只验证一个主要假设，并保留回滚或向前修复方案。
5. 把一次排障沉淀为监控、测试、容量模型或发布检查项。

文档中的阈值和命令需要结合目标版本、部署环境和业务负载验证。生产操作前应明确权限、影响范围、终止条件和恢复步骤。

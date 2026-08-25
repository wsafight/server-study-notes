---
title: DuckDB 查询对象存储
description: 安全配置 DuckDB HTTP、S3 兼容存储凭据，并控制远程 Parquet 查询的请求量与一致性。
---

DuckDB 可以通过扩展读取 HTTP 和 S3 兼容对象存储上的文件。远程查询的瓶颈往往是文件列举、Range Request 数量、跨区域延迟和凭据管理，而不是本地扫描算子。

## 加载访问能力

```sql
INSTALL httpfs;
LOAD httpfs;

SELECT count(*)
FROM read_parquet('https://data.example.com/events/2026-08/*.parquet');
```

`INSTALL` 会下载扩展，`LOAD` 在当前环境加载它。生产镜像应固定 DuckDB 版本和扩展来源，提前安装并校验，而不是允许运行时从未知网络获取本地原生代码。

## 使用 Secret 管理凭据

根据部署环境使用 Credential Chain、Workload Identity 或临时令牌。不要把 Access Key 写进 SQL、Notebook、命令历史或错误日志。

```sql
CREATE SECRET object_store (
    TYPE s3,
    PROVIDER credential_chain
);

SELECT *
FROM read_parquet('s3://analytics-prod/events/*.parquet');
```

Secret 的持久化、Scope 和 Provider 能力随客户端和版本变化。验证进程重启后的行为、文件权限、令牌刷新，以及日志是否会泄露 URL 查询参数。

S3 兼容服务还可能需要显式 Endpoint、Region、URL Style 和 TLS 设置。不要为了兼容测试环境全局关闭证书验证。

## 减少远程请求

- 在路径中包含日期等分区过滤，减少对象列举范围。
- 读取 Parquet 而不是远程 CSV，以利用列裁剪和统计下推。
- 合并大量小文件，减少 HEAD、GET 和 Range Request。
- 只选择需要的列，并尽早使用可下推过滤条件。
- 让计算与对象存储处于同一区域，避免高延迟和跨区域费用。

使用 Query Profiling、对象存储访问日志和网络指标联合观察。冷缓存测试与热缓存测试要分开记录。

## 一致性与数据发布

分析任务可能在列举后、读取前遇到对象新增或替换。不要让消费者扫描一个仍在写入的前缀，也不要原地覆盖已发布文件。

更稳妥的流程是：

1. 写入唯一版本目录。
2. 验证文件数量、大小、Schema、行数与校验和。
3. 写入不可变 Manifest。
4. 原子更新一个小型当前版本指针。
5. 在保留窗口后清理旧版本。

重跑任务应生成新版本或安全复用同一内容寻址路径，避免部分旧文件和部分新文件混合。

## 失败与重试

远程读取可能遇到限流、临时网络失败、过期令牌和对象缺失。外层任务应设置总截止时间和有抖动的有限重试；不要让每个文件读取层层重试，导致请求放大。

记录失败对象、HTTP 状态、尝试次数和已完成阶段。任务成功标准必须包含输出验证，而不是仅以最后一条查询返回作为完成标志。

## 安全边界

运行不可信 SQL 时，文件系统、网络、扩展安装和 Secret 访问都必须视为能力边界。为任务使用最小权限 Bucket Policy，只允许需要的前缀和操作，并将写出路径与原始输入路径分离。

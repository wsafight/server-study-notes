# 服务端学习笔记

[English](./README.md)

这是一个面向实际服务端工程场景的学习笔记集合，使用
[Astro Starlight](https://starlight.astro.build/) 构建并发布。内容主要关注数据库原理、
生产运维、网络协议、可靠性设计、性能分析和常见故障处理。

在线文档：<https://wsafight.github.io/server-study-notes/>

## 内容范围

- **MySQL：** 数据建模、索引与查询、事务并发、复制、备份恢复和在线 DDL
- **Linux：** 系统化故障排查，以及 CPU、内存、磁盘、网络和 systemd 运维
- **网络与 HTTP：** TCP、DNS、HTTP、TLS、反向代理和负载均衡
- **服务可靠性：** SLO、可观测性、超时重试、幂等、限流、优雅停机和事故响应
- **Redis：** 数据结构、缓存一致性、持久化、高可用、分布式锁和内存诊断
- **PostgreSQL：** 数据建模、事务、规划器统计、索引、分区、JSONB、观测、迁移、恢复和安全
- **DuckDB：** 分析 SQL、Parquet 布局、对象存储、并发、PostgreSQL 集成和可重跑数据流水线

网站为每个主题提供独立学习路径：

- [MySQL](https://wsafight.github.io/server-study-notes/mysql/)
- [Linux](https://wsafight.github.io/server-study-notes/linux/)
- [网络与 HTTP](https://wsafight.github.io/server-study-notes/network/)
- [服务可靠性](https://wsafight.github.io/server-study-notes/reliability/)
- [Redis](https://wsafight.github.io/server-study-notes/redis/)
- [PostgreSQL](https://wsafight.github.io/server-study-notes/pgsql/)
- [DuckDB](https://wsafight.github.io/server-study-notes/duck/)

## 环境要求

- [Bun](https://bun.sh/) 1.4.0
- 通过 Node.js 运行 Astro 时需要 Node.js 22.12 或更高版本，CI 使用 Node.js 24

项目统一使用 Bun 管理依赖，`bun.lock` 是可复现安装的唯一锁文件。

## 本地开发

```bash
git clone https://github.com/wsafight/server-study-notes.git
cd server-study-notes
bun install --frozen-lockfile
bun run dev
```

浏览器访问 <http://localhost:4321/server-study-notes/>。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动本地开发服务器 |
| `bun run build` | 执行 Astro 检查并生成生产构建 |
| `bun run preview` | 本地预览生产构建 |
| `bun outdated` | 检查可更新的依赖 |

## 编写文档

1. 在 `src/content/docs/<主题>/` 下新增 Markdown 文件。
2. Frontmatter 包含准确、简洁的 `title` 和 `description`。
3. 文章先说明问题和适用边界，再给出诊断、示例、风险与验证方式。
4. 将文档 slug 加到 `astro.config.mjs` 对应学习阶段，避免创建孤立页面。
5. 代码围栏语言标识使用小写，例如 `sql`、`bash` 或 `javascript`。
6. 新增主题时同步维护该目录的 `index.md` 学习路径。
7. 提交前运行 `bun run build`。

示例：

```markdown
---
title: 查询执行计划
description: 阅读并分析 MySQL EXPLAIN 输出。
---

## 概述

在这里编写正文。
```

当前 Starlight 内容集合只加载 `src/content/docs/` 下的文件。每个一级主题的 `index.md` 负责
组织学习顺序，`astro.config.mjs` 负责网站侧边栏。根目录的 `docs/` 保存旧版笔记，不会发布到网站。

## 项目结构

```text
.
├── public/                     # 原样复制的静态资源
├── src/content/docs/           # 网站发布的 Markdown 文档
├── src/content.config.ts       # Starlight 内容集合配置
├── src/styles/custom.css       # 网站自定义样式
├── astro.config.mjs            # 站点、导航和插件配置
├── bun.lock                    # Bun 依赖锁文件
└── .github/workflows/docs.yml  # GitHub Pages 部署工作流
```

## 依赖维护

先通过 `bun outdated` 检查新版本，再使用 `bun update --latest <package>` 明确升级指定依赖。
当前 TypeScript 固定在最新兼容的 6.x 版本，因为 `astro check` 暂不支持 TypeScript 7 的
编程 API。请将 TypeScript 保持在 6.x，并在每次升级依赖后重新运行 `bun run build`。

## 自动部署

推送到 `main` 分支后会触发 GitHub Pages 工作流。工作流使用 Bun 安装依赖，在 Node.js 24
环境中构建站点，上传 `dist/` 并发布生成的页面。

## 许可证

[MIT](./LICENSE)

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

## 文档维护

只有 `src/content/docs/` 下的 Markdown 会发布到网站。每个一级主题的 `index.md` 组织学习路径，
`astro.config.mjs` 定义侧边栏，根目录 `docs/` 中的旧稿仅作历史归档。

新增、修改或迁移文章前请阅读[贡献与写作规范](./CONTRIBUTING.md)，其中包含文章结构、版本说明、
安全示例、链接维护和提交前检查要求。

## 项目结构

```text
.
├── public/                     # 原样复制的静态资源
├── src/content/docs/           # 网站发布的 Markdown 文档
├── src/content.config.ts       # Starlight 内容集合配置
├── src/styles/custom.css       # 网站自定义样式
├── docs/README.md              # 未发布旧稿的归档说明
├── CONTRIBUTING.md             # 贡献流程与文档写作规范
├── astro.config.mjs            # 站点、导航和插件配置
├── bun.lock                    # Bun 依赖锁文件
└── .github/workflows/docs.yml  # GitHub Pages 部署工作流
```

## 依赖维护

先通过 `bun outdated` 检查新版本，再使用 `bun update --latest <package>` 明确升级指定依赖。
TypeScript 当前保持在 Astro Check 兼容的 6.x 版本。每次升级后都要执行冻结安装和完整构建。

## 自动部署

推送到 `main` 分支后会触发 GitHub Pages 工作流。工作流使用 Bun 安装依赖，在 Node.js 24
环境中构建站点，上传 `dist/` 并发布生成的页面。

## 许可证

[MIT](./LICENSE)

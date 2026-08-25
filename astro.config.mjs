// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import starlightImageZoom from "starlight-image-zoom";
import starlightSidebarTopics from "starlight-sidebar-topics";

// https://astro.build/config
export default defineConfig({
  site: "https://wsafight.github.io",
  base: "server-study-notes",
  markdown: {
    processor: unified(),
  },
  redirects: {
    "/": "/server-study-notes/mysql/",
  },
  integrations: [
    starlight({
      title: "服务端学习笔记",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/wsafight/server-study-notes",
        },
      ],
      locales: {
        root: {
          label: "简体中文",
          lang: "zh-CN",
        },
      },
      plugins: [
        starlightSidebarTopics([
          {
            label: "MySQL",
            link: "/mysql/",
            icon: "database",
            items: [
              {
                label: "入门与数据建模",
                items: [
                  "mysql",
                  "mysql/architecture",
                  "mysql/paradigm",
                  "mysql/create-spec",
                  "mysql/not-null",
                  "mysql/off-page",
                ],
              },
              {
                label: "主键与标识",
                items: [
                  "mysql/auto-increment",
                  "mysql/auto-increment-err",
                  "mysql/over-max-id",
                  "mysql/uid",
                ],
              },
              {
                label: "索引与性能分析",
                items: [
                  "mysql/database-index",
                  "mysql/why-b-plus-tree",
                  "mysql/b-plus-tree",
                  "mysql/low-dimension-index",
                  "mysql/explain",
                  "mysql/slow-query-log",
                  "mysql/methodology",
                  "mysql/limit-pref",
                  "mysql/temp-table",
                  "mysql/soar",
                  "mysql/pt-duplicate-key-checker",
                ],
              },
              {
                label: "SQL 查询与语义",
                items: [
                  "mysql/count",
                  "mysql/group-concat",
                  "mysql/having",
                  "mysql/cte",
                  "mysql/subquery-limit",
                  "mysql/match",
                  "mysql/procedure",
                  "mysql/number-null",
                  "mysql/sum-npe",
                ],
              },
              {
                label: "事务与并发",
                items: [
                  "mysql/transaction-isolation",
                  "mysql/mvcc",
                  "mysql/exclusive-lock",
                  "mysql/update-line-lock",
                  "mysql/deadlock",
                ],
              },
              {
                label: "日志、恢复与变更",
                items: [
                  "mysql/binlog",
                  "mysql/replication",
                  "mysql/backup-recovery",
                  "mysql/online-ddl",
                  "mysql/re-building",
                  "mysql/clear",
                  "mysql/truncate",
                  "mysql/sync-table",
                ],
              },
              {
                label: "分库分表",
                items: [
                  "mysql/sub-treasury",
                  "mysql/split-table",
                  "mysql/data-skew",
                ],
              },
            ],
          },
          {
            label: "Linux",
            link: "/linux/",
            icon: "setting",
            items: [
              {
                label: "排查方法",
                items: [
                  "linux",
                  "linux/troubleshooting",
                  "linux/perf",
                ],
              },
              {
                label: "资源诊断",
                items: [
                  "linux/uptime",
                  "linux/sysstat-mpstat",
                  "linux/sysstat-pidstat",
                  "linux/vmstat",
                  "linux/memory",
                  "linux/sysstat-iostat",
                  "linux/disk-io",
                  "linux/network",
                ],
              },
              {
                label: "系统运维",
                items: [
                  "linux/systemd-journal",
                  "linux/account-expired",
                  "linux/instance-quota",
                  "linux/stress",
                ],
              },
            ],
          },
          {
            label: "Redis",
            link: "/redis/",
            icon: "seti:redis",
            items: [
              {
                label: "基础与数据模型",
                items: [
                  "redis",
                  "redis/data-structures",
                  "redis/regulations",
                  "redis/hyperloglog",
                  "redis/roaring-bitmap",
                ],
              },
              {
                label: "缓存与并发",
                items: [
                  "redis/cache-patterns",
                  "redis/pipeline",
                  "redis/distributed-lock",
                ],
              },
              {
                label: "可靠性与诊断",
                items: [
                  "redis/persistence",
                  "redis/high-availability",
                  "redis/memory-diagnostics",
                ],
              },
              {
                label: "兼容替代方案",
                items: ["redis/pika"],
              },
            ],
          },
          {
            label: "PostgreSQL",
            link: "/pgsql/",
            icon: "seti:pgsql",
            items: [
              {
                label: "原理与查询",
                items: [
                  "pgsql",
                  "pgsql/architecture",
                  "pgsql/indexes",
                  "pgsql/explain",
                ],
              },
              {
                label: "事务与维护",
                items: [
                  "pgsql/vacuum",
                  "pgsql/locks",
                  "pgsql/backup-recovery",
                ],
              },
              {
                label: "部署方案",
                items: ["pgsql/pigsty"],
              },
            ],
          },
          {
            label: "DuckDB",
            link: "/duck/",
            icon: "seti:db",
            items: [
              {
                label: "嵌入式分析",
                items: [
                  "duck",
                  "duck/intro",
                  "duck/data-files",
                  "duck/query-optimization",
                  "duck/embedding",
                ],
              },
            ],
          },
        ]),
        starlightImageZoom(),
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
  compressHTML: true,
});

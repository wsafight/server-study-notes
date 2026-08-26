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
                  "mysql/connection-pooling",
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
                  "mysql/performance-schema",
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
                  "linux/cgroups",
                  "linux/sysstat-iostat",
                  "linux/disk-io",
                  "linux/network",
                ],
              },
              {
                label: "系统运维",
                items: [
                  "linux/systemd-journal",
                  "linux/file-descriptors",
                  "linux/account-expired",
                  "linux/instance-quota",
                  "linux/stress",
                ],
              },
            ],
          },
          {
            label: "网络与 HTTP",
            link: "/network/",
            icon: "link",
            items: [
              {
                label: "请求链路",
                items: [
                  "network",
                  "network/tcp",
                  "network/dns",
                  "network/http",
                  "network/tls",
                  "network/reverse-proxy",
                ],
              },
            ],
          },
          {
            label: "服务可靠性",
            link: "/reliability/",
            icon: "approve-check-circle",
            items: [
              {
                label: "目标与观测",
                items: [
                  "reliability",
                  "reliability/slo",
                  "reliability/observability",
                ],
              },
              {
                label: "流量与正确性",
                items: [
                  "reliability/timeout-retry",
                  "reliability/idempotency",
                  "reliability/rate-limiting",
                ],
              },
              {
                label: "发布与响应",
                items: [
                  "reliability/graceful-shutdown",
                  "reliability/incident-response",
                ],
              },
            ],
          },
          {
            label: "Redis",
            link: "/redis/",
            icon: "server",
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
                  "redis/latency-diagnostics",
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
            icon: "database",
            items: [
              {
                label: "原理与建模",
                items: [
                  "pgsql",
                  "pgsql/architecture",
                  "pgsql/data-types-modeling",
                  "pgsql/transactions-isolation",
                ],
              },
              {
                label: "查询与性能",
                items: [
                  "pgsql/indexes",
                  "pgsql/jsonb",
                  "pgsql/planner-statistics",
                  "pgsql/explain",
                  "pgsql/partitioning",
                ],
              },
              {
                label: "运行与维护",
                items: [
                  "pgsql/connection-pooling",
                  "pgsql/monitoring",
                  "pgsql/vacuum",
                  "pgsql/locks",
                  "pgsql/schema-migrations",
                ],
              },
              {
                label: "高可用、安全与部署",
                items: [
                  "pgsql/replication",
                  "pgsql/backup-recovery",
                  "pgsql/security",
                  "pgsql/pigsty",
                ],
              },
            ],
          },
          {
            label: "DuckDB",
            link: "/duck/",
            icon: "seti:db",
            items: [
              {
                label: "基础与查询正确性",
                items: [
                  "duck",
                  "duck/intro",
                  "duck/analytical-sql",
                  "duck/types-and-time",
                ],
              },
              {
                label: "文件、对象存储与 Lakehouse",
                items: [
                  "duck/data-files",
                  "duck/parquet-layout",
                  "duck/object-storage",
                  "duck/lakehouse-formats",
                ],
              },
              {
                label: "性能、并发与运维",
                items: [
                  "duck/execution-engine",
                  "duck/query-optimization",
                  "duck/reproducible-lab",
                  "duck/concurrency-transactions",
                  "duck/database-operations",
                ],
              },
              {
                label: "源码解析",
                items: [
                  "duck/source-reading-guide",
                  "duck/source-query-lifecycle",
                  "duck/source-vectorized-execution",
                  "duck/source-optimizer",
                  "duck/source-storage-transactions",
                  "duck/source-parquet-scan",
                ],
              },
              {
                label: "集成、安全与数据流水线",
                items: [
                  "duck/embedding",
                  "duck/extensions-security",
                  "duck/postgres-integration",
                  "duck/data-pipelines",
                ],
              },
            ],
          },
        ], {
          exclude: ["/"],
        }),
        starlightImageZoom(),
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
  compressHTML: true,
});

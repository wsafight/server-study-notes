// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from "starlight-sidebar-topics";
import starlightImageZoom from 'starlight-image-zoom'


// https://astro.build/config
export default defineConfig({
  site: "https://wsafight.github.io",
  base: "server-study-notes",
  redirects: {
    "/": "/server-study-notes/mysql/paradigm",
  },
  integrations: [
    starlight({
      title: "服务端学习笔记",
      social: {
        github: "https://github.com/wsafight/server-study-notes",
      },
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
            link: "/mysql/paradigm",
            icon: "open-book",
            items: [
              {
                label: "操作与管理",
                items: [
                  "mysql/paradigm",
                  "mysql/create-spec",
                  "mysql/sub-treasury",
                  "mysql/split-table",
                  "mysql/group-concat",
                  "mysql/temp-table",
                  "mysql/sync-table",
                  "mysql/pt-duplicate-key-checker",
                  "mysql/count",
                  "mysql/binlog",
                  "mysql/auto-increment",
                  "mysql/uid",
                  "mysql/over-max-id",
                  "mysql/subquery-limit",
                  "mysql/clear",
                  "mysql/match",
                  "mysql/procedure",
                  "mysql/cte",
                  "mysql/update-line-lock",
                  "mysql/exclusive-lock",
                  "mysql/having",
                  "mysql/truncate",
                ],
              },
              {
                label: "分析与优化",
                items: [
                  "mysql/architecture",
                  "mysql/methodology",
                  "mysql/explain",
                  "mysql/slow-query-log",
                  "mysql/re-building",
                  "mysql/database-index",
                  "mysql/not-null",
                  "mysql/off-page",
                  "mysql/b-plus-tree",
                  "mysql/why-b-plus-tree",
                  "mysql/soar",
                  "mysql/low-dimension-index",
                  "mysql/limit-pref",
                  "mysql/data-skew",
                ],
              },
              {
                label: "安全与错误",
                items: [
                  "mysql/auto-increment-err",
                  "mysql/sum-npe",
                  "mysql/number-null",
                ],
              }
            ],
          },
          {
            label: "Linux",
            link: "/linux/instance-quota",
            icon: "open-book",
            items: [
              {
                label: "操作与管理",
                items: [
                  'linux/instance-quota',
                  'linux/account-expired',
                ]
              }, 
              {
                label: "分析与优化",
                items: [
                  'linux/perf',
                  'linux/uptime',
                  'linux/sysstat-mpstat',
                  'linux/sysstat-pidstat',
                  'linux/sysstat-iostat',
                  'linux/stress',
                  'linux/vmstat',
                ]
              }
            ],
          },
          {
            label: "Redis",
            link: "/redis/regulations",
            icon: "open-book",
            items: [
              {
                label: "操作与管理",
                items: [
                  'redis/regulations',
                  'redis/hyperloglog',
                ]
              }, 
              {
                label: "分析与优化",
                items: [
                  'redis/pipeline',
                  'redis/roaring-bitmap',
                ]
              },
              {
                label: "替代品",
                items: [
                  'redis/pika',
                ]
              }
            ],
          },
          {
            label: "PostgreSQL",
            link: "/pgsql/pigsty",
            icon: "open-book",
            items: [
              {
                label: "操作与管理",
                items: [
                  'pgsql/pigsty',
                ]
              }, 
            ]
          },
          {
            label: "DuckDB",
            link: "/duck/intro",
            icon: "open-book",
            items: [
              {
                label: "操作与管理",
                items: [
                  'duck/intro',
                ]
              }, 
            ]
          }
        ]),
        starlightImageZoom(),
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
  compressHTML: true,
});

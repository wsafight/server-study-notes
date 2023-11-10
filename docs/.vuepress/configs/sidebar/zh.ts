import type { SidebarConfig } from '@vuepress/theme-default'

export const zh: SidebarConfig = {
  '/mysql/': [
    {
      text: '操作与管理',
      children: [
        '/mysql/notes/README.md',
        '/mysql/notes/paradigm.md',
        '/mysql/notes/sub-treasury.md',
        '/mysql/notes/split-table.md',
        '/mysql/notes/group_concat.md',
        '/mysql/notes/temp-table.md',
        '/mysql/notes/sync-table.md',
        '/mysql/notes/pt-duplicate-key-checker.md',
        '/mysql/notes/count.md',
        '/mysql/notes/binlog.md',
        '/mysql/notes/uid.md',
        '/mysql/notes/over-max-id.md',
        '/mysql/notes/subquery-limit.md',
        '/mysql/notes/clear.md',
        '/mysql/notes/match.md',
        '/mysql/notes/procedure.md'
      ],
    },
    {
      text: '分析与优化',
      children: [
        '/mysql/performance/README.md',
        '/mysql/performance/explain.md',
        '/mysql/performance/re-building.md',
        '/mysql/performance/database-index.md',
        '/mysql/performance/profiling.md',
        '/mysql/performance/config.md',
        '/mysql/performance/off-page.md',
        '/mysql/performance/b-plus-tree.md',
        '/mysql/performance/why-b-plus-tree.md',
        '/mysql/performance/soar.md',
        '/mysql/performance/low-dimension-index.md',
        '/mysql/performance/hot-update.md',
        '/mysql/performance/icp.md',
        '/mysql/performance/limit.md',
        '/mysql/performance/data-skew.md',
      ],
    },
    {
      text: '安全与错误',
      children: [
        '/mysql/error/README.md',
        '/mysql/error/auto-increment.md',
        '/mysql/error/lose-data.md',
        '/mysql/error/number-null.md',
        '/mysql/error/split-page.md',
        '/mysql/error/xss.md',
      ],
    },
  ],
  '/linux/': [
    {
      text: '操作与管理',
      children: [
        '/linux/notes/README.md',
      ],
    },
    {
      text: '分析与优化',
      children: [
        '/linux/performance/README.md',
        '/linux/performance/uptime.md',
        '/linux/performance/sysstat-mpstat.md',
        '/linux/performance/sysstat-pidstat.md',
        '/linux/performance/sysstat-iostat.md',
        '/linux/performance/stress.md',
        '/linux/performance/vmstat.md',

      ],
    },
    {
      text: '网络',
      children: [
        '/linux/network/README.md',
      ],
    },
  ],
  '/redis/': [
    {
      text: '操作与管理',
      children: [
        '/redis/notes/README.md',
        '/redis/notes/regulations.md',
        '/redis/notes/pika.md',
      ],
    },
    {
      text: '分析与优化',
      children: [
        '/redis/performance/README.md',
        '/redis/performance/pipeline.md',
      ],
    },
  ],
}
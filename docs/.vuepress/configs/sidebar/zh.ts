import type { SidebarConfig } from '@vuepress/theme-default'

export const zh: SidebarConfig = {
  '/notes/': [
    {
      text: '设计与使用',
      children: [
        '/notes/paradigm.md',
        '/notes/sub-treasury.md',
        '/notes/split-table.md',
        '/notes/group_concat.md',
        '/notes/temp-table.md',
        '/notes/pt-duplicate-key-checker.md',
        '/notes/count.md',
        '/notes/binlog.md',
        '/notes/uid.md',
        '/notes/over-max-id.md',
        '/notes/subquery-limit.md',
        '/notes/clear.md',
        '/notes/match.md'
      ],
    },
  ],
  '/performance/': [
    {
      text: '分析与优化',
      children: [
        '/performance/explain.md',
        '/performance/re-building.md',
        '/performance/database-index.md',
        '/performance/profiling.md',
        '/performance/config.md',
        '/performance/off-page.md',
        '/performance/b-plus-tree.md',
        '/performance/why-b-plus-tree.md',
        '/performance/soar.md',
        '/performance/low-dimension-index.md',
        '/performance/hot-update.md',
        '/performance/icp.md',
        '/performance/limit.md'
      ],
    },
  ],
  '/error/': [
    {
      text: '安全与错误',
      children: [
        '/error/auto-increment.md',
        '/error/lose-data.md',
        '/error/number-null.md',
        '/error/split-page.md',
        '/error/xss.md',
      ],
    },
  ],
}
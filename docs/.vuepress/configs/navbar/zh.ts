import type { NavbarConfig } from '@vuepress/theme-default'
// @ts-ignore
import { version } from '../meta'

export const zh: NavbarConfig = [
  {
    text: 'MySQL',
    children: [
      '/mysql/notes/README.md', 
      '/mysql/performance/README.md',
      '/mysql/error/README.md',
    ],
  },
  {
    text: 'Linux',
    children: [
      '/linux/notes/README.md', 
      '/linux/performance/README.md',
    ],
  },
  {
    text: 'Redis',
    children: [
      '/redis/notes/README.md', 
      '/redis/performance/README.md', 
    ],
  },
  {
    text: 'DevOps',
    children: [
      '/devops/theory/README.md', 
      '/devops/tools/README.md', 
    ],
  }
]

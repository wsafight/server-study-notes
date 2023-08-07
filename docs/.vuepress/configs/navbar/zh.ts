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
    link: '/linux/notes/',
  },
  // {
  //   text: '安全与错误',
  //   link: '/error/',
  // },
]

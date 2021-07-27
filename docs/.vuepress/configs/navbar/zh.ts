import type { NavbarConfig } from '@vuepress/theme-default'
// @ts-ignore
import { version } from '../meta'

export const zh: NavbarConfig = [
  {
    text: '设计与使用',
    link: '/notes/',
  },
  {
    text: '分析与优化',
    link: '/performance/',
  },
  {
    text: '安全与错误',
    link: '/error/',
  },
]

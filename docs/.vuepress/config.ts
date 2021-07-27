import { defineUserConfig } from 'vuepress'
import type { DefaultThemeOptions } from 'vuepress'

export default defineUserConfig<DefaultThemeOptions>({
  base: '/MySQL-notes/',
  locales: {
    // 键名是该语言所属的子路径
    // 作为特例，默认语言可以使用 '/' 作为其路径。
    '/': {
      lang: 'zh-CN',
      title: 'MySQL 笔记',
      description: '记录使用 Mysql 数据库',
    },
    '/en/': {
      lang: 'en-US',
      title: 'MySQL notes',
      description: 'Record using MySQL database',
    },
  },
  themeConfig: {
    locales: {
      '/': {
        selectLanguageName: '简体中文',

      },
      '/en/': {
        selectLanguageName: 'English',
      },
    },
  }
})
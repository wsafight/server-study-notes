import { defineUserConfig } from 'vuepress'
import type { DefaultThemeOptions } from 'vuepress'
import { navbar, sidebar } from './configs'

export default defineUserConfig<DefaultThemeOptions>({
  base: '/server-study-notes/',
  locales: {
    // 键名是该语言所属的子路径
    // 作为特例，默认语言可以使用 '/' 作为其路径。
    '/': {
      lang: 'zh-CN',
      title: '服务端学习笔记',
      description: '记录使用服务端中遇到的各种问题',
    },
    '/en/': {
      lang: 'en-US',
      title: 'Server study notes',
      description: 'Record various problems encountered in using the server',
    },
  },
  themeConfig: {
    locales: {
      '/': {
        selectLanguageName: '简体中文',
        selectLanguageText: '选择语言',
        selectLanguageAriaLabel: '选择语言',
        navbar: navbar.zh,
        sidebar: sidebar.zh,
      },
      '/en/': {
        selectLanguageName: 'English',
        selectLanguageText: 'Languages',
        selectLanguageAriaLabel: 'Languages',
        navbar: navbar.en,
        sidebar: sidebar.en,
      },
    },
  }
})
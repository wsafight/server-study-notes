import type { SidebarConfig } from '@vuepress/theme-default'

export const en: SidebarConfig = {
  '/en/notes/': [
    {
      text: 'notes',
      children: [
        '/en/notes/getting-started.md'
      ],
    },
  ],
}
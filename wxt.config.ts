import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import MarkdownItGithubAlerts from 'markdown-it-github-alerts';
import MarkdownItLinkAttr from 'markdown-it-link-attributes';
import MarkdownItTaskCheckbox from 'markdown-it-task-checkbox';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import Markdown from 'unplugin-vue-markdown/vite';
import { defineConfig } from 'wxt';

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import packageJson from './package.json';

import type { Wxt } from 'wxt';

const extensionPermissions = ['storage', 'tabs', 'contextMenus'] as const;
const gzkMatches = ['*://www.guozaoke.com/*'];
const chromiumProfile = resolve('.wxt/chrome-data');

const ensureChromiumProfile = (wxt: Wxt) => {
  if (wxt.config.command !== 'serve' || wxt.config.browser === 'firefox') {
    return;
  }

  mkdirSync(chromiumProfile, {
    recursive: true,
  });
};

export default defineConfig({
  srcDir: 'src',
  publicDir: 'public',
  imports: false,
  modules: ['@wxt-dev/module-vue', '@wxt-dev/unocss', '@wxt-dev/webextension-polyfill'],
  alias: {
    '@': resolve('src'),
  },
  vue: {
    vite: {
      include: [/\.vue$/, /\.md$/],
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('un-');
          },
        },
      },
    },
  },
  unocss: {
    excludeEntrypoints: ['background', 'set-appearance', 'block-user', 'hide-topic', 'upload-bili-img'],
  },
  hooks: {
    ready: ensureChromiumProfile,
  },
  vite: () => ({
    plugins: [
      VueI18nPlugin({
        include: resolve('src/i18n/locales/**'),
      }),
      Components({
        dts: false,
        resolvers: [ElementPlusResolver()],
      }),
      Markdown({
        markdownItSetup(md) {
          md.use(MarkdownItGithubAlerts, {
            titles: {
              tip: '提示',
              note: '注意',
              important: '重要',
              warning: '警告',
              caution: '注意',
            },
          });

          md.use(MarkdownItLinkAttr, {
            attrs: {
              target: '_blank',
            },
          });

          md.use(MarkdownItTaskCheckbox);
        },
      }),
    ],
  }),
  manifest: ({ browser, manifestVersion }) => ({
    name: '过早客 Plus',
    description: packageJson.description,
    version: packageJson.version,
    permissions:
      browser === 'firefox'
        ? [...extensionPermissions, 'https://s.ee/', 'https://api.bilibili.com/']
        : [...extensionPermissions],
    host_permissions: browser === 'firefox' ? undefined : ['https://s.ee/'],
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'gzkerplus@gmail.com',
            },
          }
        : undefined,
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    commands: {
      'block-keyword': {
        suggested_key: {
          default: 'Alt+Shift+K',
          mac: 'Alt+Shift+K',
        },
        description: '将选中文本添加到主题屏蔽关键字',
      },
    },
    web_accessible_resources:
      manifestVersion === 3
        ? [
            {
              matches: gzkMatches,
              resources: ['icon/*.png', 'font/*.ttf'],
            },
          ]
        : ['icon/*.png', 'font/*.ttf'],
  }),
  webExt: {
    startUrls: ['https://www.guozaoke.com/'],
    chromiumProfile,
    keepProfileChanges: true,
  },
  zip: {
    dotSources: true,
    includeSources: [
      'src/**',
      'public/**',
      'patches/**',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'wxt.config.ts',
      'uno.config.ts',
      'tsconfig*.json',
      '.nvmrc',
      'README.md',
      'SOURCE_CODE_REVIEW.md',
    ],
    excludeSources: [
      '.git/**',
      '.wxt/**',
      '.output/**',
      'dist/**',
      'node_modules/**',
      '.env*',
      '.codex-remote-attachments/**',
    ],
  },
});

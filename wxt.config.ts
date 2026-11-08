import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import MarkdownItGithubAlerts from 'markdown-it-github-alerts';
import MarkdownItLinkAttr from 'markdown-it-link-attributes';
import MarkdownItTaskCheckbox from 'markdown-it-task-checkbox';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import Markdown from 'unplugin-vue-markdown/vite';
import { defineConfig, normalizePath } from 'wxt';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BILI_IMAGE_HOST_ORIGIN, BILI_IMAGE_PAGE_ORIGIN, DARK_MODE_CLASS, SM_IMAGE_HOST_ORIGIN } from './src/constants';
import packageJson from './package.json';
import { iconFiles } from './uno.config';

import type { Wxt } from 'wxt';

const extensionPermissions = ['storage', 'contextMenus'] as const;
const optionalPermissions = ['downloads'] as const;
const imageHostingOrigins = [`${SM_IMAGE_HOST_ORIGIN}/*`, `${BILI_IMAGE_PAGE_ORIGIN}/*`] as const;
const biliImageHostPermission = `${BILI_IMAGE_HOST_ORIGIN}/*`;
const gzkMatches = ['*://www.guozaoke.com/*'];
const chromiumProfile = resolve('.wxt/chrome-data');
const firefoxProfile = resolve('.wxt/firefox-data');

const isPreferenceMap = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getChromiumPreferences = (): Record<string, unknown> => {
  const preferencesPath = resolve(chromiumProfile, 'Default', 'Preferences');

  if (!existsSync(preferencesPath)) {
    return {};
  }

  try {
    const preferences = JSON.parse(readFileSync(preferencesPath, 'utf8')) as unknown;

    if (!isPreferenceMap(preferences) || !isPreferenceMap(preferences.devtools)) {
      return {};
    }

    return {
      devtools: preferences.devtools,
    };
  } catch {
    return {};
  }
};

const getBrowserManifestFields = (browser: string) => {
  const permissions = [...extensionPermissions];

  if (browser === 'firefox') {
    return {
      permissions,
      optional_permissions: [...optionalPermissions, ...imageHostingOrigins, biliImageHostPermission],
      browser_specific_settings: {
        gecko: {
          id: 'gzkerplus@gmail.com',
        },
      },
    };
  }

  return {
    permissions,
    optional_permissions: [...optionalPermissions, 'scripting'],
    optional_host_permissions: [...imageHostingOrigins],
  };
};

const getWebAccessibleResources = (manifestVersion: number) => {
  if (manifestVersion === 3) {
    return [
      {
        matches: gzkMatches,
        resources: ['icon/*.png', 'font/*.woff2'],
      },
    ];
  }

  return ['icon/*.png', 'font/*.woff2'];
};

const ensureBrowserProfile = (wxt: Wxt) => {
  if (wxt.config.command !== 'serve') {
    return;
  }

  const browserProfile = wxt.config.browser === 'firefox' ? firefoxProfile : chromiumProfile;

  mkdirSync(browserProfile, {
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
    ready: ensureBrowserProfile,
    'vite:build:extendConfig': (entrypoints, config) => {
      if (
        !entrypoints.some((entrypoint) => {
          return entrypoint.type === 'content-script';
        })
      ) {
        return;
      }

      config.plugins?.push({
        name: 'gzkp-icon-dependencies',
        apply: (config) => {
          return config.mode === 'development';
        },
        generateBundle(_options, bundle) {
          for (const output of Object.values(bundle)) {
            if (output.type !== 'chunk') {
              continue;
            }

            const usesHeaderIcons = output.moduleIds.some((id: string) => {
              return id.endsWith('/components/GzkHeader.vue');
            });

            if (usesHeaderIcons) {
              // WXT uses chunk module IDs to decide which content scripts to rebuild.
              output.moduleIds.push(...iconFiles.map(normalizePath));
            }
          }
        },
      });
    },
  },
  vite: () => ({
    plugins: [
      {
        name: 'gzkp-element-dark',
        enforce: 'pre',
        transform(code: string, id: string) {
          const path = id.replace(/\?.*$/, '').replaceAll('\\', '/');

          if (!path.endsWith('/element-plus/theme-chalk/dark/css-vars.css')) {
            return;
          }

          return {
            code: code.replaceAll('html.dark', `html.${DARK_MODE_CLASS}`),
            map: null,
          };
        },
      },
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
    ...getBrowserManifestFields(browser),
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
    web_accessible_resources: getWebAccessibleResources(manifestVersion),
  }),
  webExt: {
    startUrls: ['https://www.guozaoke.com/'],
    chromiumPref: getChromiumPreferences(),
    chromiumProfile,
    firefoxProfile,
    keepProfileChanges: true,
  },
  suppressWarnings: {
    firefoxDataCollection: true,
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

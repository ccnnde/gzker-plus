import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import HtmlMinifier from 'vite-plugin-html-minifier';
import WebExtension, { readJsonFile } from 'vite-plugin-web-extension';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import MarkdownItLinkAttr from 'markdown-it-link-attributes';
import MarkdownItTaskCheckbox from 'markdown-it-task-checkbox';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import Markdown from 'unplugin-vue-markdown/vite';

import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const target = process.env.TARGET || 'chrome';

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');

  return {
    name: '过早客 Plus',
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('un-');
          },
        },
      },
    }),
    VueI18nPlugin({
      include: path.resolve(__dirname, './src/i18n/locales/**'),
    }),
    AutoImport({
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
    UnoCSS(),
    HtmlMinifier(),
    Markdown({
      markdownItSetup(md) {
        md.use(MarkdownItLinkAttr, {
          attrs: {
            target: '_blank',
          },
        });

        md.use(MarkdownItTaskCheckbox);
      },
    }),
    WebExtension({
      browser: target,
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'manifest.json'],
      webExtConfig: {
        startUrl: ['https://www.guozaoke.com/'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import htmlMinifier from 'vite-plugin-html-minifier';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

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
    vue(),
    vueI18nPlugin({
      include: path.resolve(__dirname, './src/i18n/locales/**'),
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    htmlMinifier(),
    webExtension({
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

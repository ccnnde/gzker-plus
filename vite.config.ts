import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import htmlMinifier from 'vite-plugin-html-minifier';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import path from 'path';

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
});

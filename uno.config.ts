import { defineConfig, presetIcons, presetTagify, presetUno, transformerVariantGroup } from 'unocss';

import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const iconsDirectory = new URL('./src/assets/icons/', import.meta.url);

export const iconFiles = readdirSync(iconsDirectory)
  .filter((name: string) => {
    return name.endsWith('.svg');
  })
  .map((name: string) => {
    return fileURLToPath(new URL(name, iconsDirectory));
  });

export default defineConfig({
  configDeps: iconFiles,
  presets: [
    presetUno({
      prefix: 'uno-',
    }),
    presetTagify({
      prefix: 'un-',
    }),
    presetIcons({
      collections: {
        gzkp: (name: string) => {
          return readFile(new URL(`${name}.svg`, iconsDirectory), 'utf8');
        },
      },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
      warn: true,
    }),
  ],
  blocklist: ['i-mdi-arrow-top-right-thick-1'],
  transformers: [transformerVariantGroup()],
});

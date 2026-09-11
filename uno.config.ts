import { defineConfig, presetIcons, presetTagify, presetUno, transformerVariantGroup } from 'unocss';

export default defineConfig({
  presets: [
    presetUno({
      prefix: 'uno-',
    }),
    presetTagify({
      prefix: 'un-',
    }),
    presetIcons({
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

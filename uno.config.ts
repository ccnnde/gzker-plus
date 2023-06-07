import { defineConfig, presetAttributify, presetIcons, presetTagify, presetUno, transformerVariantGroup } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
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
  transformers: [transformerVariantGroup()],
});

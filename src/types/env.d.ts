/// <reference types="vite/client" />

declare module 'element-plus/dist/locale/en.mjs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const en: any;
  export default en;
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zhCn: any;
  export default zhCn;
}

declare module 'element-plus/es/utils/index.mjs' {
  export * from 'element-plus/es/utils';
}

declare module '*.md' {
  import type { ComponentOptions } from 'vue';

  const Component: ComponentOptions;
  export default Component;
}

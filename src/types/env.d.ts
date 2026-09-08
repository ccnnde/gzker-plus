/// <reference types="vite/client" />

declare module '*.md' {
  import type { ComponentOptions } from 'vue';

  const Component: ComponentOptions;
  export default Component;
}

declare module 'markdown-it-link-attributes';
declare module 'markdown-it-task-checkbox';

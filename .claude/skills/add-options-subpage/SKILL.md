---
name: add-options-subpage
description: 在扩展选项页面中添加新子页面。含路由、Vue 页面、侧边栏导航的完整流程。
---

# 添加选项子页面

## 前提

先阅读：

- `.codebuddy/knowledge/architecture.md` — storage.sync 跨标签页同步和 Pinia Store 模式
- `.codebuddy/knowledge/external-integrations.md` — Element Plus 和 UnoCSS 图标

## 文件结构

```
src/router/index.ts        # 路由配置
src/constants/index.ts     # 路由名称/路径常量
src/views/{feature}/       # 页面组件
src/i18n/locales/          # 中英文翻译
```

> `src/layout/OptionsAside.vue` 会自动遍历路由渲染侧边栏，**无需手动修改**。

## 实现流程

### 步骤 1: 添加路由名称和路径

在 `src/constants/index.ts` 中：

```typescript
export const enum OptionsRouteNames {
  // ...已有
  MyFeature = 'myFeature',
}

export const OptionsRoutePaths: Record<OptionsRouteNames, string> = {
  // ...已有
  [OptionsRouteNames.MyFeature]: '/my-feature',
};
```

### 步骤 2: 配置路由

在 `src/router/index.ts` 中（文件头部加 `// @unocss-include`）：

```typescript
{
  path: OptionsRoutePaths[OptionsRouteNames.MyFeature],
  name: OptionsRouteNames.MyFeature,
  component: () => import('@/views/my-feature/MyFeature.vue'),
  meta: {
    title: OptionsRouteNames.MyFeature,
    icon: 'i-mdi-star-outline',
  },
},
```

图标从 [Iconify/MDI](https://icones.js.org/collection/mdi) 选择。

### 步骤 3: 创建页面组件

在 `src/views/my-feature/MyFeature.vue` 中，使用 `<script setup lang="ts">` + `<style lang="scss" scoped>`。

### 步骤 4: 添加国际化

在 `zh.json` 和 `en.json` 中添加 `options.myFeature` 翻译（侧边栏自动通过 `meta.title` 映射 key）。

### Markdown 页面

如果页面内容适合 Markdown，直接在路由中用 `.md` 文件作为 component：

```typescript
component: () => import('@/markdown/MyFeature.md'),
```

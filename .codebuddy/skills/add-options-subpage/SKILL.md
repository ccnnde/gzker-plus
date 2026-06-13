---
name: add-options-subpage
description: 在扩展的选项页面中添加一个新的子页面。包含路由配置、Vue 页面创建和侧边栏导航集成的完整流程。
---

# 添加选项子页面

## 前提阅读

在执行本 Skill 前，先阅读以下知识库文件以获取必要的背景知识：

- `.codebuddy/knowledge/architecture.md` - 理解 storage.sync 跨标签页同步机制和 Pinia Store 模式
- `.codebuddy/knowledge/external-integrations.md` - 了解 Element Plus 组件库和 UnoCSS 图标的使用方式

## 概述

选项页面是一个 Vue SPA（Single Page Application），使用 `vue-router` 的 hash 模式管理路由。子页面通过左侧导航栏切换。

## 文件结构

```
src/
├── router/index.ts                   # 路由配置
├── options.html / options.ts         # SPA 入口
├── layout/
│   ├── OptionsAside.vue              # 侧边栏导航
│   └── OptionsHeader.vue             # 顶部标题栏
├── views/
│   ├── basic-setting/                # 基本设置子页面
│   │   ├── BasicSetting.vue          # 设置页面入口
│   │   └── *.vue                     # 各设置项
│   ├── bili-images/
│   │   └── BiliImages.vue
│   └── blocked-topics/
│       └── BlockedTopics.vue
└── i18n/locales/
    ├── zh.json                        # 中文翻译
    └── en.json                        # 英文翻译
```

## 实现流程

### 步骤 1: 添加路由定义

在 `src/constants/index.ts` 中添加路由名称和路径：

```typescript
// 路由名称枚举
export const enum OptionsRouteNames {
  BasicSetting = 'basicSetting',
  BlockedTopics = 'blockedTopics',
  BiliImages = 'biliImages',
  ImageHosting = 'imageHosting',
  ChangeLog = 'changeLog',
  About = 'about',
  // 新增
  MyFeature = 'myFeature',
}

// 路由路径映射
export const OptionsRoutePaths: Record<OptionsRouteNames, string> = {
  [OptionsRouteNames.BasicSetting]: '/basic-setting',
  [OptionsRouteNames.BlockedTopics]: '/blocked-topics',
  [OptionsRouteNames.BiliImages]: '/bili-images',
  [OptionsRouteNames.ImageHosting]: '/image-hosting',
  [OptionsRouteNames.ChangeLog]: '/change-log',
  [OptionsRouteNames.About]: '/about',
  // 新增
  [OptionsRouteNames.MyFeature]: '/my-feature',
};
```

### 步骤 2: 配置路由

在 `src/router/index.ts` 中添加新路由：

```typescript
{
  path: OptionsRoutePaths[OptionsRouteNames.MyFeature],
  name: OptionsRouteNames.MyFeature,
  component: () => import('@/views/my-feature/MyFeature.vue'),
  meta: {
    title: OptionsRouteNames.MyFeature,
    icon: 'i-mdi-star-outline',  // @unocss-include - UnoCSS 图标类名
  },
},
```

可用图标来自 [Iconify/MDI](https://icones.js.org/collection/mdi)，在文件头部添加 `// @unocss-include` 注释确保 UnoCSS 识别图标类名。

### 步骤 3: 创建页面组件

在 `src/views/my-feature/` 中创建 `MyFeature.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useStorageStore } from '@/stores/storage';

import type { OptionsKey } from '@/constants';

const storage = useStorageStore();
const listData = ref([]);

const loadData = async () => {
  // 加载数据
};
</script>

<template>
  <div class="my-feature-page">
    <h2>功能标题</h2>
    <!-- 功能 UI -->
  </div>
</template>

<style lang="scss" scoped>
.my-feature-page {
  // 样式
}
</style>
```

### 步骤 4: 添加国际化

在 `src/i18n/locales/zh.json` 和 `en.json` 中添加翻译：

```json
{
  "options": {
    "myFeature": "我的功能"
  }
}
```

侧边栏导航文本通过路由 meta 的 `title` 自动读取国际化翻译：
- 翻译 key 格式: `options.{routeName}`
- 例如路由名 `MyFeature` → key 为 `options.myFeature`

### 步骤 5: 侧边栏自动注册

`src/layout/OptionsAside.vue` 会自动读取 `routes` 数组渲染导航菜单，无需手动修改侧边栏。

只需确保：
1. 路由配置了 `meta.title`
2. 路由配置了 `meta.icon`
3. 国际化文件中有对应翻译 key

`OptionsAside.vue` 遍历所有含 `meta` 的路由自动渲染导航菜单，无需手动修改侧边栏。

## 关键模式

### 数据存储访问

```typescript
import { useStorageStore } from '@/stores/storage';

const storage = useStorageStore();
const options = computed(() => storage.options);

// 读取特定选项
const myOption = computed(() => {
  return storage.options?.[OptionsKey.MyFeature];
});
```

### 设置更新

```typescript
import { setStorage } from '@/utils';

const updateSetting = async () => {
  const newOptions = { ...storage.options };
  newOptions[OptionsKey.MyFeature] = { checked: newValue };

  await setStorage({ options: newOptions });
};
```

### Markdown 页面

如需使用 Markdown 作为页面内容（如 `ImageHosting`、`ChangeLog`、`About`），直接在路由 component 中导入 `.md` 文件：

```typescript
{
  path: OptionsRoutePaths[OptionsRouteNames.MyFeature],
  name: OptionsRouteNames.MyFeature,
  component: () => import('@/markdown/MyFeature.md'),
  meta: {
    title: OptionsRouteNames.MyFeature,
    icon: 'i-mdi-information-outline',
  },
},
```

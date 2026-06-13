---
name: add-content-script
description: 添加一个新的 Content Script，注入到过早客论坛页面中。包含脚本创建、Vue 应用挂载和在主入口注册的完整流程。
---

# 添加 Content Script

## 前提阅读

在执行本 Skill 前，先阅读以下知识库文件以获取必要的背景知识：

- `.codebuddy/knowledge/architecture.md` - 理解 Content Script 注入机制和存储同步流程
- `.codebuddy/knowledge/forum-domain.md` - 了解论坛页面 DOM 结构和已有 CSS 选择器

## 概述

Content Script 是注入到 `www.guozaoke.com` 论坛页面的脚本，可以为论坛添加 UI 组件和交互功能。所有 Content Script 通过 `src/scripts/index.ts` 统一注册。

## 架构说明

```
src/scripts/
├── index.ts              # 主入口 - 注册所有脚本
├── block-keyword.ts      # 关键字屏蔽
├── block-user.ts         # 用户屏蔽
├── dblclick-to-top.ts    # 双击回到顶部
├── float-user-info.ts    # 悬浮用户信息
├── header.ts             # 顶部导航增强
├── hide-gzk-info.ts      # 隐藏论坛信息
├── hide-topic.ts         # 隐藏主题
├── set-appearance.ts     # 设置外观
├── topic.ts              # 主题增强
└── upload-bili-img.ts    # B站图床上传
```

## 实现流程

### 步骤 1: 创建脚本文件

在 `src/scripts/` 中创建新文件，遵循命名规范（kebab-case）：

```typescript
// src/scripts/my-feature.ts
import { createScriptApp } from '@/utils';
import { SELECTOR_SOME_ELEMENT } from '@/constants/selector';

import MyFeatureComponent from '@/components/MyFeature.vue';

import type { Pinia } from 'pinia';

export const createMyFeatureApp = (pinia: Pinia) => {
  const containerParentNode = document.querySelector(SELECTOR_SOME_ELEMENT);

  if (!containerParentNode) {
    return;
  }

  createScriptApp({
    root: MyFeatureComponent,
    pinia,
    containerId: 'gzk-my-feature-app',
    containerParentNode,
  });
};
```

### 步骤 2: 在 `src/scripts/index.ts` 中注册

```typescript
// 添加导入
import { createMyFeatureApp } from './my-feature';

// 在 setupApp 函数中添加条件调用
const setupApp = async () => {
  const { options } = await getStorage();

  // ... 已有代码

  if (options[OptionsKey.MyFeature]?.checked) {
    createMyFeatureApp(pinia);
  }
};
```

### 步骤 3: 创建对应的 Vue 组件

在 `src/components/` 中创建组件：

```vue
<script setup lang="ts">
import { ElementConfig } from '@/directives';
</script>

<template>
  <ElementConfig>
    <div class="my-feature">
      <!-- 功能 UI -->
    </div>
  </ElementConfig>
</template>

<style lang="scss" scoped>
.my-feature {
  // 样式（注意 scoped）
}
</style>
```

### 步骤 4: 添加 CSS 选择器（如需要）

在 `src/constants/selector.ts` 中添加新的 DOM 选择器：

```typescript
export const SELECTOR_MY_ELEMENT = '.some-css-class';
```

### 步骤 5: 添加选项开关（如需要）

如果功能需要用户开关控制：
- 在 `OptionsKey` 枚举中添加新键
- 在 `defaultExtensionOptions` 中添加默认值
- 在 `Options` 类型中添加对应字段
- 在 `src/views/basic-setting/` 中添加设置 UI

## 关键工具函数

### `createScriptApp`

```typescript
interface ScriptAppOptions {
  root: Component;              // Vue 根组件
  pinia: Pinia;                 // Pinia 实例
  containerId: string;          // 挂载容器 ID（格式: 'gzk-{name}-app'）
  containerParentNode: Element | null;  // 父容器 DOM 节点
}
```

### `getStorage` / `setStorage`

```typescript
import { getStorage, setStorage } from '@/utils';

const { options } = await getStorage();
await setStorage({ options: newOptions });
```

### CSS 选择器常量

位置: `src/constants/selector.ts`

```typescript
export const SELECTOR_LOGIN_USER_LINK = '.navbar-right a[href^="/u/"]';
export const SELECTOR_TOP_NAVBAR = '.navbar-fixed-top';
export const SELECTOR_TOPIC_LINK = 'a[href^="/t/"]';
export const SELECTOR_USER_AVATAR = '.avatar';
export const SELECTOR_USER_LINK = 'a[href^="/u/"]';
export const SELECTOR_NODE_LINK = 'a[href^="/go/"], a[href^="/node/"]';
export const SELECTOR_MSG_UNREAD_INDICATOR = 'a[href="/notifications"]';
```

## 代码规范提醒

- 函数至少三行
- if/for/try 必须使用花括号并展开
- 语句块前后留空行
- 使用 `const enum` 定义枚举
- 使用 `import type` 导入类型
- 容器 ID 使用 `gzk-{name}-app` 格式

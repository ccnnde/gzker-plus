---
name: add-content-script
description: 添加新的 Content Script，注入 Vue 应用到论坛页面。含脚本创建、挂载和主入口注册。
---

# 添加 Content Script

## 前提

先阅读以下背景知识：

- `.codebuddy/knowledge/architecture.md` — Content Script 注入机制和存储同步
- `.codebuddy/knowledge/forum-domain.md` — 论坛 DOM 结构和 CSS 选择器

## 实现流程

### 步骤 1: 创建脚本文件

在 `src/scripts/` 中创建 kebab-case 命名的文件：

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
import { createMyFeatureApp } from './my-feature';

// 在 setupApp 中添加条件调用
if (options[OptionsKey.MyFeature]?.checked) {
  createMyFeatureApp(pinia);
}
```

### 步骤 3: 创建对应的 Vue 组件

在 `src/components/` 中用 `<script setup lang="ts">` + `<style lang="scss" scoped>` 创建组件。

### 步骤 4: 添加选项开关（如需用户可控制）

- 在 `OptionsKey` 枚举中添加新键
- 在 `defaultExtensionOptions` 中添加默认值
- 在 `Options` 类型中添加对应字段
- 在 `src/views/basic-setting/` 中添加设置 UI

## 关键工具

| 函数                            | 用途                              |
| ------------------------------- | --------------------------------- |
| `createScriptApp(options)`      | 注入独立 Vue App，共享 Pinia 实例 |
| `getStorage()` / `setStorage()` | 读写 browser.storage.sync         |
| CSS 选择器常量                  | 位于 `src/constants/selector.ts`  |

## 规范

- 容器 ID 格式：`gzk-{name}-app`
- 函数至少三行，if/for/try 必须花括号展开
- 使用 `const enum` 定义枚举

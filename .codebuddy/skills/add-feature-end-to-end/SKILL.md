---
name: add-feature-end-to-end
description: 为项目端到端地添加一个完整的新功能。覆盖从需求分析到代码生成、测试验证的全部流程，涉及 Content Script、Vue 组件、选项配置、国际化等多个层面。
---

# 端到端添加新功能

## 前提阅读

在执行本 Skill 前，先阅读以下知识库文件以获取必要的背景知识：

- `.codebuddy/knowledge/architecture.md` - 理解三进程架构、数据流和模块依赖关系
- `.codebuddy/knowledge/forum-domain.md` - 如功能涉及论坛页面，了解页面结构和 URL 模式

## 概述

本技能指导为"过早客 Plus"浏览器扩展从零到一添加一个完整功能。一个功能通常涉及多个层面：Content Script（注入论坛页面）、Vue 组件（UI 渲染）、选项配置（用户设置）、国际化（中英文翻译）等。

## 功能开发流程

### 步骤 1: 需求分析

明确以下问题：
- 这个功能在哪里生效？（论坛列表页、帖子详情页、全局？）
- 用户是否需要开关控制？（如果需要，添加到选项页面）
- 是否需要新消息类型？（Background 和 Content Script 之间的通信）
- 是否需要新的存储字段？

### 步骤 2: 添加类型定义和常量

如需新的枚举、存储字段或类型，在对应文件中添加：

**枚举/常量**: `src/constants/index.ts`
```typescript
// 新增选项开关
export const enum OptionsKey {
  // ... 已有
  NewFeature = 'newFeature',
}

// 新增消息类型（如需要）
export const enum ExtensionMessageType {
  // ... 已有
  NewFeatureAction,
}
```

**默认选项**: 在 `defaultExtensionOptions` 中添加默认值
```typescript
[OptionsKey.NewFeature]: {
  checked: true, // 或自定义结构
},
```

**类型定义**: `src/types/index.ts`
```typescript
export interface Options {
  // ... 已有
  [OptionsKey.NewFeature]: CheckedOption; // 或其他结构
}
```

### 步骤 3: 创建 Content Script（如需要）

在 `src/scripts/` 中创建新文件：

```typescript
// src/scripts/new-feature.ts
import { createScriptApp } from '@/utils';
import NewFeatureComponent from '@/components/NewFeature.vue';

import type { Pinia } from 'pinia';

export const createNewFeatureApp = (pinia: Pinia) => {
  createScriptApp({
    root: NewFeatureComponent,
    pinia,
    containerId: 'gzk-new-feature-app',
    containerParentNode: document.body,
  });
};
```

在 `src/scripts/index.ts` 中注册：

```typescript
import { createNewFeatureApp } from './new-feature';

// 在 setupApp 中添加条件调用
if (options[OptionsKey.NewFeature].checked) {
  createNewFeatureApp(pinia);
}
```

### 步骤 4: 创建 Vue 组件

在 `src/components/` 中创建组件：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStorageStore } from '@/stores/storage';

import type { OptionsKey } from '@/constants';

interface Props {
  optionKey: OptionsKey;
}

const props = defineProps<Props>();

const storage = useStorageStore();
const isEnabled = computed(() => {
  return storage.options?.[props.optionKey]?.checked;
});
</script>

<template>
  <div v-if="isEnabled" class="new-feature-container">
    <!-- 功能 UI -->
  </div>
</template>

<style lang="scss" scoped>
.new-feature-container {
  // 样式
}
</style>
```

### 步骤 5: 添加选项页面 UI（如需要）

在 `src/views/basic-setting/` 中创建或修改设置项：

```vue
<script setup lang="ts">
import { useStorageStore } from '@/stores/storage';
import { OptionsKey } from '@/constants';

import type { SettingProps } from '@/types';

const props = defineProps<SettingProps<OptionsKey.NewFeature>>();
const storage = useStorageStore();
</script>

<template>
  <el-form-item>
    <el-switch :model-value="storage.options?.[OptionsKey.NewFeature].checked"
      @update:model-value="(val) => { /* update storage */ }" />
  </el-form-item>
</template>
```

将新选项添加到 `src/views/basic-setting/BasicSetting.vue` 的配置列表中。

### 步骤 6: 添加国际化

在 `src/i18n/locales/zh.json` 和 `en.json` 中添加翻译：

```json
{
  "settings": {
    "newFeature": {
      "name": "新功能",
      "description": "启用新功能"
    }
  }
}
```

### 步骤 7: 质量检查

```bash
pnpm format          # 格式化
pnpm lint:fix        # ESLint 修复
pnpm type-check      # 类型检查（可选，用户手动执行）
```

### 步骤 8: 提交

使用 `git-commit-message` skill 生成提交信息，scope 视情况选择 `scripts`、`components`、`views` 等。

## 关键模式

### 存储读写

```typescript
// 读取整个存储
const { options } = await getStorage();

// 读取特定选项
const newFeatureOption = options[OptionsKey.NewFeature];

// 写入
await setStorage({
  options: newOptions,
});
```

### 消息通信（Content Script → Background）

```typescript
// Content Script 发送
await runtime.sendMessage({
  msgType: ExtensionMessageType.NewFeatureAction,
  data: 'some data',
});

// Background 接收
runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  if (message.msgType === ExtensionMessageType.NewFeatureAction) {
    // 处理
  }
});
```

## 文件变更清单模板

添加新功能时典型的文件变更：

```
src/constants/index.ts          # 新枚举值、常量
src/types/index.ts              # 新类型定义
src/scripts/new-feature.ts      # Content Script（新文件）
src/scripts/index.ts            # 注册新脚本
src/components/NewFeature.vue   # Vue 组件（新文件）
src/views/basic-setting/*.vue   # 选项 UI
src/i18n/locales/zh.json        # 中文翻译
src/i18n/locales/en.json        # 英文翻译
```

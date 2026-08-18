---
name: add-feature-end-to-end
description: 端到端添加完整新功能。覆盖需求分析、类型定义、Content Script、Vue 组件、选项配置、国际化。
---

# 端到端添加新功能

## 前提

先阅读：

- `.codebuddy/knowledge/architecture.md` — 三进程架构、数据流和模块依赖
- `.codebuddy/knowledge/forum-domain.md` — 论坛页面结构和 URL 模式（如涉及论坛页面）

## 开发流程

### 步骤 1: 需求分析

明确：功能在哪生效？需不需要用户开关？需不需要 Background 通信？需不需要新存储字段？

### 步骤 2: 添加类型和常量

**枚举/常量** (`src/constants/index.ts`)：

```typescript
export const enum OptionsKey {
  NewFeature = 'newFeature',
}

export const enum ExtensionMessageType {
  NewFeatureAction, // 如需新消息类型
}
```

**默认选项** — 在 `defaultExtensionOptions` 中添加。
**类型定义** (`src/types/index.ts`) — 在 `Options` 接口中添加字段。

### 步骤 3: 创建 Content Script（如需注入论坛页面）

```typescript
// src/scripts/new-feature.ts
export const createNewFeatureApp = (pinia: Pinia) => {
  createScriptApp({
    root: NewFeatureComponent,
    pinia,
    containerId: 'gzk-new-feature-app',
    containerParentNode: document.body,
  });
};
```

在 `src/scripts/index.ts` 中注册条件调用。

### 步骤 4: 创建 Vue 组件

在 `src/components/` 中，使用 `<script setup lang="ts">` + `<style lang="scss" scoped>`。

### 步骤 5: 添加选项 UI（如需）

在 `src/views/basic-setting/` 中创建设置项组件，添加到 `BasicSetting.vue` 配置列表。

### 步骤 6: 添加国际化

同步更新 `zh.json` 和 `en.json`。

### 步骤 7: 质量检查

```bash
pnpm format && pnpm lint:fix && pnpm styl-lint:fix
```

然后 `read_lints` 检查变更文件。

### 步骤 8: 提交

使用 `git-commit-message` 技能生成提交信息。

## 典型文件变更清单

```
src/constants/index.ts          # 枚举、常量
src/types/index.ts              # 类型定义
src/scripts/new-feature.ts      # Content Script（新文件）
src/scripts/index.ts            # 注册新脚本
src/components/NewFeature.vue   # Vue 组件（新文件）
src/views/basic-setting/*.vue   # 选项 UI
src/i18n/locales/zh.json        # 中文
src/i18n/locales/en.json        # 英文
```

---
name: code-quality-check
description: 代码生成后执行自动化质量检查。运行 Prettier 格式化、ESLint 检查修复和 TypeScript 类型检查。
---

# 代码质量检查

## 概述

代码生成完成后，执行质量检查确保代码符合项目规范。共四步：格式化 → ESLint → Stylelint → IDE 诊断（含类型检查）。

## 检查流程

### 步骤 1: Prettier 格式化

```bash
pnpm format
```

格式化所有文件，包括缩进、引号、分号、行宽等。

### 步骤 2: ESLint 检查并修复

```bash
pnpm lint:fix
```

自动修复可修复的问题（如导入排序），报告需要手动修复的问题。

### 步骤 3: 样式检查并修复

```bash
pnpm styl-lint:fix
```

自动修复 CSS 属性排序等问题。

### 步骤 4: IDE 诊断检查（必经）

使用 `read_lints` 检查**所有变更文件**。TS 插件在此步骤即可报告类型错误，覆盖 ESLint/Stylelint/TypeScript 三类问题。

**关键：如果发现残留错误，必须修复后再次 `read_lints`，直到零诊断。** 自动修复工具无法处理所有问题（见下方不可自动修复列表），这些必须手工修复。

> **说明：** 此步骤已覆盖类型检查。`pnpm type-check` 会全量扫描整个项目，耗时长且可能因环境差异失败（如未安装依赖），仅在步骤 4 无法复现用户报告的跨文件类型问题时才需要。

## 自动修复无法处理的错误

以下错误 `pnpm lint:fix` 或 `pnpm styl-lint:fix` **无法自动修复**，必须手工处理：

| 工具 | 错误码 | 说明 | 修复方式 |
|------|--------|------|----------|
| Stylelint | `no-descending-specificity` | 低优先级选择器放在了高优先级后面 | 重排选择器顺序：`.foo` → `.foo:hover` → `.foo .bar` |
| ESLint | `no-explicit-any` | 使用了 `any` 类型 | 替换为具体类型或加 `eslint-disable` |
| ESLint | `@typescript-eslint/no-unused-vars` | 未使用的变量 | 移除变量或重命名为 `_xxx` |
| ESLint | `vue/no-duplicate-attributes` | 模板中重复属性 | 合并 `class` 和 `:class` 为单个 `:class` 数组 |
| TS | `2322` | 类型不匹配（如 `KeyboardEvent` vs `Event`） | 参数类型放宽为 `Event`，内部 `as` 断言 |

## AI 手工检查清单

以下项目需要 AI 在生成代码时手工确认（无法被工具自动检查）：

- [ ] 函数至少三行（签名行 → 函数体 → 闭合）
- [ ] if/for/try 语句块使用花括号展开，至少三行
- [ ] 语句块（函数之间、不同逻辑块之间）有适当空行
- [ ] 使用 `const enum` 而非普通 `enum`
- [ ] 类型导入使用 `import type`
- [ ] `.vue` 文件使用 `<script setup lang="ts">`
- [ ] 样式使用 `<style lang="scss" scoped>`
- [ ] 组件命名符合规范（PascalCase 文件名）
- [ ] 文件命名符合规范（kebab-case）
- [ ] Composable 以 `use` 开头

## 常见 Stylelint 问题

| 错误 | 解决方案 |
|------|---------|
| `order/properties-order` | 执行 `pnpm styl-lint:fix` 自动重新排序 |
| `no-descending-specificity` | 不可自动修复。原则：低优先级写前面。例如 `.foo {}` → `.foo:hover {}` → `.foo .bar {}` |

### no-descending-specificity 示例

```scss
// ❌ 错误 — .item-remove 优先级低于 .item:hover .item-remove，却写在后面
.item {
  &:hover {
    .item-remove { opacity: 1; }  // 0,2,0
  }
}
.item-remove { opacity: 0; }       // 0,1,0  ← 必须移到 .item 前面

// ✅ 正确 — 低优先级在前
.item-icon { ... }
.item-text { ... }
.item-remove {
  opacity: 0;

  &:hover { color: red; }
}
.item {
  &:hover {
    .item-remove { opacity: 1; }
  }
}
```

## Lint-staged 自动检查

提交代码时，husky + lint-staged 会自动执行：

```
Prettier  →  格式化所有文件
Stylelint →  检查 .scss 和 .vue 文件
ESLint   →  检查 .js/.ts/.vue 文件
vue-tsc  →  TypeScript 类型检查
```

如果 lint-staged 检查失败，提交会被阻止。

## 常见问题处理

### Prettier 格式化后与 ESLint 冲突

执行顺序：先 `format`，再 `lint:fix`，ESLint 会进一步修复与 Prettier 的冲突。

```bash
pnpm format && pnpm lint:fix
```

### TypeScript 类型错误

常见原因：
1. 缺少类型导入 → 添加 `import type`
2. 函数参数未标注类型 → 添加类型注解
3. 使用了 `any` → 替换为具体类型

### ESLint 错误

| 错误 | 解决方案 |
|------|---------|
| `no-explicit-any` | 使用具体类型，必要时加 `eslint-disable` 注释 |
| `simple-import-sort/imports` | 执行 `pnpm lint:fix` 自动修复导入排序 |
| `@typescript-eslint/no-unused-vars` | 移除未使用的变量或添加下划线前缀 |

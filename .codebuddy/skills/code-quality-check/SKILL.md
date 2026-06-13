---
name: code-quality-check
description: 代码生成后执行自动化质量检查。运行 Prettier 格式化、ESLint 检查修复和 TypeScript 类型检查。
---

# 代码质量检查

## 概述

代码生成完成后，执行自动化质量检查确保代码符合项目规范。检查分三层：格式化、Lint 检查、类型检查。

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

### 步骤 3: TypeScript 类型检查（可选）

```bash
pnpm type-check
```

**注意：** 此步骤可能因项目环境差异而失败（如未安装依赖），这不影响代码质量，用户可在本地手动执行。

### 步骤 4: 样式检查（可选）

```bash
pnpm styl-lint
```

只涉及 `.scss` 和 `.vue` 文件的样式检查。

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

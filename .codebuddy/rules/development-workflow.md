---
description: 标准开发工作流。从编码到质量检查到提交的完整流程。
alwaysApply: true
---

# 开发工作流

## 编码原则

### DRY (Don't Repeat Yourself)

避免重复字面量。跨函数/跨文件使用的字符串常量、URL 片段、配置值等应提取为共享常量或配置。

```typescript
// ❌ 错误 - 重复字面量
const doSearch = () => {
  const url = 'https://example.com/search?q=' + keyword;
};
const openExternal = () => {
  window.open('https://example.com/search?q=' + keyword);
};

// ✅ 正确 - 提取为共享常量
import { SEARCH_PREFIX } from '@/constants';

const doSearch = () => {
  const url = SEARCH_PREFIX + keyword;
};
const openExternal = () => {
  window.open(SEARCH_PREFIX + keyword);
};
```

## 标准流程

```
编码 → 质量检查 → Git 提交
```

### 1. 编码阶段

- 遵守所有 `.codebuddy/rules/` 中定义的规则
- 生成代码后执行 `pnpm lint:fix` 自动修复导入排序等 ESLint 可处理的问题

### 2. 质量检查（强制）

**每次代码改动后必须执行质量检查，不允许跳过。** 具体流程见 `code-quality-check` skill。

最小检查流程：
```bash
pnpm format && pnpm lint:fix && pnpm styl-lint:fix
```
然后使用 `read_lints` 检查所有变更文件，确保零诊断。

### 3. Git 提交

使用 `git-commit-message` skill 生成规范的提交信息。提交时 husky + lint-staged 会自动执行 Prettier / Stylelint / ESLint / vue-tsc 检查。

## 质量工具边界

| 工具 | 负责内容 |
|------|---------|
| **Prettier** | 代码格式化（缩进、引号、分号、行宽等） |
| **ESLint** | 代码质量（导入排序、禁止 any、未使用变量等） |
| **Stylelint** | 样式检查（CSS/SCSS 规范） |
| **vue-tsc** | TypeScript 类型检查 |
| **AI 手工遵守** | 函数至少三行、花括号展开、语句块空行、模板标签对齐、`const enum`、箭头函数 |

## 新增文件清单

| 类型 | 位置 | 说明 |
|------|------|------|
| Vue 组件 | `src/components/` | 可复用组件 |
| View 页面 | `src/views/{feature}/` | 选项页面的功能视图 |
| Content Script | `src/scripts/` | 注入到论坛页面的脚本 |
| Composable | `src/composables/` | 组合式函数 |
| API 函数 | `src/api/index.ts` | 论坛 API 调用 |
| 类型定义 | `src/types/index.ts` | TypeScript 接口/类型 |
| 常量 | `src/constants/index.ts` | 枚举/常量 |
| 选择器 | `src/constants/selector.ts` | CSS 选择器 |
| 国际化 | `src/i18n/locales/zh.json`, `en.json` | 中英文翻译 |
| 路由 | `src/router/index.ts` | 选项页面路由 |

---
description: 标准开发工作流。从编码到质量检查到提交的完整流程。
alwaysApply: true
---

# 开发工作流

## 编码原则

### DRY (Don't Repeat Yourself)

避免重复字面量。跨函数/跨文件使用的字符串常量、URL 片段、配置值等应提取为共享常量或配置。

### 优先使用已有常量

生成代码时，先检查 `src/constants/index.ts` 和 `src/constants/selector.ts` 是否有可复用的常量、选择器、枚举值。没有则新增，不要硬编码字符串。

```typescript
// ❌ 错误 - 硬编码
const isGzkFrame = origins[0] === 'https://www.guozaoke.com';

// ✅ 正确 - 使用已有常量
import { GZK_URL } from '@/constants';
```

### 控制流简化

优先使用 early return 减少嵌套层级。但 ES 模块顶层不能用 `return`（报 TS1108），此时用条件反转替代。

**跨域 iframe 检测：** 读取父窗口 origin 应使用 `window.location.ancestorOrigins`，它在跨域场景下始终可读。不要使用 `window.top.location`，那在跨域时会抛出 `DOMException`。

### 表达式可读性

复杂表达式应提取为命名变量，避免内联过长的链式调用或多条件拼接。

## 标准流程

```
编码 → 质量检查 → Git 提交
```

### 1. 编码阶段

- 遵守所有 `.claude/rules/` 中定义的规则
- 生成代码后执行 `pnpm lint:fix` 自动修复导入排序等 ESLint 可处理的问题

### 2. 质量检查（强制）

**每次代码改动后必须执行质量检查，不允许跳过。** 最小检查流程：

```bash
pnpm format && pnpm lint:fix && pnpm styl-lint:fix
```

然后使用 `read_lints` 检查所有变更文件，确保零诊断。

### 3. Git 提交

使用 `git-commit-message` skill 生成规范的提交信息。提交时 husky + lint-staged 会自动执行 Prettier / Stylelint / ESLint / vue-tsc 检查。

## 质量工具边界

| 工具            | 负责内容                                                                   |
| --------------- | -------------------------------------------------------------------------- |
| **Prettier**    | 代码格式化（缩进、引号、分号、行宽等）                                     |
| **ESLint**      | 代码质量（导入排序、禁止 any、未使用变量等）                               |
| **Stylelint**   | 样式检查（CSS/SCSS 规范）                                                  |
| **vue-tsc**     | TypeScript 类型检查                                                        |
| **AI 手工遵守** | 函数至少三行、花括号展开、语句块空行、模板标签对齐、`const enum`、箭头函数 |

## 新增文件清单

| 类型           | 位置                                  | 说明                 |
| -------------- | ------------------------------------- | -------------------- |
| Vue 组件       | `src/components/`                     | 可复用组件           |
| View 页面      | `src/views/{feature}/`                | 选项页面的功能视图   |
| Content Script | `src/scripts/`                        | 注入到论坛页面的脚本 |
| Composable     | `src/composables/`                    | 组合式函数           |
| API 函数       | `src/api/index.ts`                    | 论坛 API 调用        |
| 类型定义       | `src/types/index.ts`                  | TypeScript 接口/类型 |
| 常量           | `src/constants/index.ts`              | 枚举/常量            |
| 选择器         | `src/constants/selector.ts`           | CSS 选择器           |
| 国际化         | `src/i18n/locales/zh.json`, `en.json` | 中英文翻译           |
| 路由           | `src/router/index.ts`                 | 选项页面路由         |

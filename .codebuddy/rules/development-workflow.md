---
description: 标准开发工作流。从编码到质量检查到提交的完整流程。
---

# 开发工作流

## 标准流程

```
编码 → 质量检查 → Git 提交
```

### 1. 编码阶段

- 遵守所有 `.codebuddy/rules/` 中定义的规则
- 确保 TypeScript 类型正确
- 函数至少三行，if/for/try 必须花括号展开
- 语句块前后留空行

### 2. 质量检查

生成代码后，AI 可以执行以下检查命令：

```bash
# 代码格式化
pnpm format

# ESLint 检查并自动修复
pnpm lint:fix

# 样式检查
pnpm styl-lint

# TypeScript 类型检查
pnpm type-check
```

**注意：** `pnpm type-check` 和 `pnpm styl-lint` 可能由于项目环境差异运行失败，这不影响代码质量，可以由用户在本地手动检查。

### 3. Git 提交

使用 `git-commit-message` skill 生成规范的提交信息：

```
<emoji> <type>(<scope>): <subject>

<body>
```

### 4. Git 推送

```bash
pnpm git:push
```

## Lint-staged 自动检查

提交时 `lint-staged` 会自动执行（通过 husky 钩子）：

```javascript
// .lintstagedrc.cjs
module.exports = {
  '*': 'prettier --cache --ignore-unknown --write',
  '*.{scss,vue}': 'stylelint --cache --fix',
  '*.{js,jsx,ts,tsx,vue}': 'eslint --cache --max-warnings 0 --fix',
  '!(package|settings|manifest|extensions|weibo-emojis|tsconfig).json': 'eslint --cache --max-warnings 0 --fix',
  '*.{ts,tsx,vue}': () => 'vue-tsc --noEmit --skipLibCheck',
};
```

## 质量工具边界

| 工具 | 负责内容 |
|------|---------|
| **Prettier** | 代码格式化（缩进、引号、分号、行宽等） |
| **ESLint** | 代码质量（导入排序、未使用变量、最佳实践等） |
| **Stylelint** | 样式检查（CSS/SCSS 规范） |
| **vue-tsc** | TypeScript 类型检查 |
| **AI 手工遵守** | 函数至少三行、花括号展开、语句块前后空行 |

## 新增文件清单

当添加新功能时，可能涉及的文件：

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

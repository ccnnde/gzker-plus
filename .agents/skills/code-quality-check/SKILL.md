---
name: code-quality-check
description: '使用针对性格式化、ESLint、Stylelint、vue-tsc 和适用的浏览器构建验证 gzker-plus 代码改动。实现完成后或排查质量检查失败时使用。'
---

# 检查代码质量

先运行 `git status --short` 并检查当前 diff，确认本任务负责的文件，保护无关改动。

## 只格式化和修复任务文件

根据文件类型，将明确的变更文件路径传给对应工具：

```bash
pnpm exec prettier --write <changed-files>
pnpm exec eslint --fix <changed-js-ts-vue-json-files>
pnpm exec stylelint --fix <changed-scss-vue-files>
```

没有匹配文件时跳过对应命令。工作树非干净时，不要运行全仓的 `pnpm format`、`pnpm lint:fix` 或 `pnpm styl-lint:fix`；只有用户要求全仓清理，或已确认不会产生无关改动时才可使用。

## 运行只读检查

源码发生变化时，运行适用的全量检查：

```bash
pnpm lint
pnpm styl-lint
pnpm type-check
```

- ESLint 适用于 JavaScript、TypeScript、Vue 和部分 JSON。
- Stylelint 适用于 SCSS 和 Vue 样式。
- TypeScript 或 Vue 行为改动必须运行 `pnpm type-check`。
- Manifest、入口、Vite、平台或打包变化时，如果两个目标都受影响，则运行 `pnpm build` 和 `pnpm build:ff`。
- 仅修改文档时无需构建源码，但要验证链接、路径、frontmatter 和格式。

修复由当前任务引入的失败，并重新运行失败的检查。如果失败只存在于任务外的既有代码，应保留证据并报告，不要擅自扩大修改范围。

最后检查 `git diff --check`、`git diff --stat` 和最终 diff。准确报告已运行和未运行的检查。仓库没有测试运行器，不要把 lint 或类型检查描述为单元测试。

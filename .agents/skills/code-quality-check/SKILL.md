---
name: code-quality-check
description: '在 gzker-plus 代码修改完成后，依次执行针对性格式化、自动修复、全仓 ESLint、Stylelint、vue-tsc 检查及必要的浏览器构建；排查质量检查失败时也使用。'
---

# 检查代码质量

先运行 `git status --short` 并检查当前 diff，确认本任务负责的文件，保护无关改动。

代码修改后无需另行确认，按以下顺序执行。仅修改文档、注释或其他不参与编译的文件时，跳过源码检查并验证其格式、路径、链接和 frontmatter。

## 1. 格式化与自动修复

仅处理本任务修改且工具支持的文件；没有匹配文件时跳过对应命令：

```bash
pnpm exec prettier --write <changed-supported-files>
pnpm exec eslint --fix <changed-js-ts-vue-json-files>
pnpm exec stylelint --fix <changed-scss-vue-files>
```

不得运行会改写整个仓库的 `pnpm format`、`pnpm lint:fix` 或 `pnpm styl-lint:fix`。

## 2. 全仓检查与构建

始终依次运行：

```bash
pnpm lint
pnpm styl-lint
```

不涉及打包相关改动时，再运行：

```bash
pnpm type-check
```

Manifest、入口、Vite、依赖或浏览器平台相关改动改为运行对应的生产构建：

```bash
pnpm build     # Chrome
pnpm build:ff  # Firefox
```

构建脚本已包含 `vue-tsc`，运行生产构建时不要再单独运行 `pnpm type-check`。只影响单个平台时运行对应目标；共享配置或跨浏览器行为变化时运行两个目标。

修复当前任务引入的问题后，只重跑失败项。任务外的既有失败应保留证据并报告，不要扩大修改范围。

## 3. 交付

运行 `git diff --check` 和 `git diff --stat`，检查最终 diff，并准确报告已运行、失败或未运行的检查。仓库没有测试运行器，不要把 lint 或类型检查描述为单元测试。

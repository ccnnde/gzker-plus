---
name: code-quality-check
description: '在 gzker-plus 代码修改完成后，执行格式化、lint 自动修复，并按改动范围完成类型检查、构建和最终 diff 校验。'
---

# 检查代码质量

先运行 `git status --short` 并检查当前 diff，确认本任务负责的文件。仅修改文档、注释或其他不参与编译的文件时，跳过源码检查，改为验证格式、路径、链接和 frontmatter。

## 1. 格式化与自动修复

Prettier 仅处理本任务修改且工具支持的文件，没有匹配文件时跳过。Lint 自动修复直接使用仓库脚本，由脚本按默认范围处理：

```bash
pnpm exec prettier --write <changed-supported-files>
pnpm lint:fix
pnpm styl-lint:fix
```

不要用 `pnpm format` 代替按改动文件执行的 Prettier。Lint 脚本可能修改其他文件；执行后重新检查 diff，并报告这些自动修复。

## 2. 类型检查与构建

不涉及打包相关改动时，运行：

```bash
pnpm type-check
```

Manifest、入口、Vite、依赖或浏览器平台相关改动改为运行对应的生产构建：

```bash
pnpm build     # Chrome
pnpm build:ff  # Firefox
```

构建脚本已包含 `vue-tsc`，运行生产构建时不要再运行 `pnpm type-check`。只影响单个平台时运行对应目标；共享配置或跨浏览器行为变化时运行两个目标。

修复当前任务引入的问题后，只重跑失败项。任务外的既有失败应保留证据并报告，不要扩大修改范围。

## 3. 交付

运行 `git diff --check` 和 `git diff --stat`，检查最终 diff，并报告已运行、失败或跳过的检查。

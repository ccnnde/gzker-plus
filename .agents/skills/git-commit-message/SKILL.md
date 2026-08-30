---
name: git-commit-message
description: '生成符合仓库 emoji Conventional Commit 配置的 gzker-plus Git 提交信息。仅在用户要求提交信息或已授权提交时使用。'
---

# 生成提交信息

检查准备提交的 staged diff；如果用户只需要建议且没有 staged 改动，则检查相关的 unstaged diff。除非用户明确要求，否则不要暂存或提交文件。

先查看近期提交标题；当 type 或 scope 有歧义时，再检查与本次改动最接近的历史提交及其文件范围。选择顺序为：

1. 用户明确指定的格式
2. 仓库近期同类提交的惯例
3. 通用 Conventional Commit 语义

不要仅根据文件所在目录判断 type 或 scope。

## Header

Header 使用以下格式，最长 72 个字符：

```text
<emoji> <type>(<可选的小写 scope>): <祈使句 subject>
```

Subject 应简洁、无结尾句号，并突出最主要的行为变化。仓库常用“支持”描述新增能力、“优化”描述已有能力改进、“修复”描述缺陷；这些词是判断线索，不代替 diff 和历史证据。

## 类型

| Emoji | Type       | 本仓库用途                                         |
| ----- | ---------- | -------------------------------------------------- |
| 🎉    | `init`     | 初始化                                             |
| ✨    | `feat`     | 新增用户能力、设置项或独立功能                     |
| 🐞    | `fix`      | 修复非预期行为、错误或兼容性问题                   |
| 📃    | `docs`     | 文档与 AI 指令                                     |
| 🌈    | `style`    | 仅格式调整，不改变展示或行为                       |
| 🦄    | `refactor` | 不改变外部行为的内部重构                           |
| 🎈    | `perf`     | 优化已有功能，包括性能、逻辑、交互、文案或视觉展示 |
| 🧪    | `test`     | 测试                                               |
| 🔧    | `build`    | 构建系统或依赖                                     |
| 🐎    | `ci`       | CI                                                 |
| 🐳    | `chore`    | 源码和测试之外的维护，或历史已有的专项维护类别     |
| ↩️    | `revert`   | 回退                                               |

区分 `feat` 与 `perf` 时，以是否增加新的独立能力为准。首次支持倒序浏览属于 `feat`；调整既有倒序按钮的图标、文案或状态高亮属于 `perf`。不要把 `perf` 限定为运行速度优化。

## Scope

Scope 按主要用户影响或功能域选择，而不是按改动文件数量选择：

- `views`：页面级用户功能、论坛注入 UI 及其业务组件。即使主要文件位于 `src/components/`，或同时修改 composables 和 locale，只要结果属于页面交互或展示，仍优先使用 `views`
- `components`：独立、通用、可复用组件自身的逻辑或样式调整，不隶属于某个页面业务能力
- `scripts`、`api`、`stores`、`composables`、`utils`、`styles`、`types`、`constants`、`router`、`background`、`i18n`、`assets`、`deps`、`release`：主要变化确实落在对应功能域时使用

Locale 或辅助文件只是配套改动时，不要覆盖主要业务 scope。没有单一 scope 能准确描述主要变化时可以省略。

## 正文格式

简单、单一的 UI 或逻辑调整只输出 Header。只有需要说明非显而易见的意图、权衡，或有多个同等重要且 Header 无法概括的行为变化时才添加 body；不要仅因为修改多个文件或同步 i18n 就添加。

需要 body 时使用编号列表。Header 后空一行，正文从 `1.` 开始连续编号，每项只描述一个具体变化且不加结尾句号。即使 body 只有一项，也保留 `1.`；不要使用无序列表或散文段落。

```text
🎈 perf(views): 优化回复内容链接渲染

1. 识别用户提及和 HTTP(S) 链接
2. 将图片 URL 渲染为懒加载图片
3. 统一嵌套回复和会话识别逻辑
```

只有任务有明确依据时才添加 issue 或 breaking-change footer。

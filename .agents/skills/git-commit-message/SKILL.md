---
name: git-commit-message
description: '生成符合仓库 emoji Conventional Commit 配置的 gzker-plus Git 提交信息。仅在用户要求提交信息或已授权提交时使用。'
---

# 生成提交信息

检查准备提交的 staged diff；如果用户只需要建议，则检查相关的 unstaged diff。除非用户明确要求，否则不要暂存或提交文件。

Header 使用以下格式，最长 72 个字符：

```text
<emoji> <type>(<可选的小写 scope>): <祈使句 subject>
```

Subject 应简洁、无结尾句号，并突出最主要的行为变化。只有需要说明非显而易见的意图、权衡或多个重要改动时才添加 body。只有任务有明确依据时才添加 issue 或 breaking-change footer。

## 正文格式

仓库历史中的 body 使用编号列表。Header 后空一行，正文从 `1.` 开始连续编号，每项只描述一个具体变化且不加结尾句号。即使 body 只有一项，也保留 `1.`；不要使用无序列表或散文段落。

```text
🎈 perf(views): 优化回复内容链接渲染

1. 识别用户提及和 HTTP(S) 链接
2. 将图片 URL 渲染为懒加载图片
3. 统一嵌套回复和会话识别逻辑
```

## 类型

| Emoji | Type       | 用途                 |
| ----- | ---------- | -------------------- |
| 🎉    | `init`     | 初始化               |
| ✨    | `feat`     | 新功能               |
| 🐞    | `fix`      | 修复缺陷             |
| 📃    | `docs`     | 文档                 |
| 🌈    | `style`    | 仅格式调整           |
| 🦄    | `refactor` | 不改变行为的重构     |
| 🎈    | `perf`     | 性能优化             |
| 🧪    | `test`     | 测试                 |
| 🔧    | `build`    | 构建系统或依赖       |
| 🐎    | `ci`       | CI                   |
| 🐳    | `chore`    | 源码和测试之外的维护 |
| ↩️    | `revert`   | 回退                 |

优先选择聚焦的 scope，例如 `views`、`scripts`、`components`、`api`、`stores`、`composables`、`utils`、`styles`、`types`、`constants`、`router`、`background`、`i18n`、`assets`、`deps` 或 `release`。没有单一 scope 能准确描述改动时可以省略。

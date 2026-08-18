---
name: add-feature-end-to-end
description: '为 gzker-plus 实现跨越至少两个层面的完整功能，例如 Content Script、Vue UI、存储与选项、后台消息、路由或国际化。单层改动优先使用更具体的仓库 skill。'
---

# 端到端添加功能

先阅读 `.codebuddy/knowledge/architecture.md`。功能涉及论坛页面或请求时，还需阅读 `.codebuddy/knowledge/forum-domain.md`。

## 确定改动范围

编辑前明确：

- 功能运行于 Background、Content Script、选项页、Popup，还是多个上下文；
- 哪些现有选项、Store、组件、解析器、选择器、消息或路由可以复用；
- 是否需要持久化、跨上下文通信、权限或平台特定的 Manifest 行为；
- 空状态、加载态、错误态、未登录状态和销毁行为。

优先实现最小而完整的纵向切片。只有需求确实需要时，才新增选项、消息类型、路由或存储字段。

## 保持跨层一致

- 先在 `src/constants/` 添加共享枚举或常量，在 `src/types/` 添加数据契约，再修改消费者。
- 同步设置使用 `browser.storage.sync`，较大的本地数据使用 `localforage`。
- 特权或跨域操作放在后台上下文，跨边界发送类型化消息变量。
- 论坛 UI 遵循现有 Content Script 模式并通过 `createScriptApp()` 注入。
- 只有用户确实需要配置或管理功能时才增加选项 UI。
- 用户可见文本同时更新 `zh.json` 和 `en.json`。
- 入口、权限、匹配规则、命令或 Web 可访问资源变化时检查 `src/manifest.json`。

各层涉及专用约束时使用对应的仓库 skill，但不要重复加载说明或重复执行工作。

完成后使用 `$code-quality-check`。所有 TypeScript/Vue 改动都要执行类型检查；入口、Manifest 或打包变化要构建所有受影响目标。

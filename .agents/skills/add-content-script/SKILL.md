---
name: add-content-script
description: '为 gzker-plus 新增或修改面向 guozaoke.com 的 Content Script 或注入式 Vue 应用。适用于 DOM 注入、Content/Background 消息通信、Manifest 注册或新的脚本层功能；不适用于只修改选项页的任务。'
---

# 添加 Content Script

先检查当前的 `src/manifest.json`、`src/scripts/index.ts`、`src/constants/selector.ts` 及相邻脚本；涉及论坛请求时同时检查 `src/api/index.ts`。以当前源码中的入口、路由和选择器为准。

## 实现要求

1. 判断功能应加入 `src/scripts/index.ts` 的共享 bundle、作为独立的 Manifest Content Script 并配置 `run_at`，还是两者都需要。只有必须在页面渲染前生效的行为才使用 `document_start`。
2. 在 `src/scripts/` 下创建 kebab-case 文件；重复使用的 DOM 选择器应提取到 `src/constants/selector.ts`。
3. 注入 UI 时，新增或复用 Vue 组件，通过 `createScriptApp()` 挂载，并使用唯一的 `gzk-{name}-app` 容器 ID 和共享 Pinia 实例。
4. 需要用户配置时，将 `OptionsKey`、选项类型、默认值、选项 UI 和双语翻译作为一个完整改动更新。
5. 需要特权或跨上下文操作时，新增类型化消息结构和判别值。发送前先构造类型化消息变量，并显式处理失败与上下文销毁。
6. 确认功能只在预期论坛路由生效，并处理父 DOM 节点不存在或结构变化的情况。

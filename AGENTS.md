# Codex 仓库指南

本文件适用于整个仓库，是 Codex 的项目入口。已跟踪的 `.codebuddy/` 文档继续作为详细知识源；当本文件针对 Codex 调整或修正了 `.codebuddy` 中的说明时，以本文件为准。

## 项目概览

过早客 Plus 是一款面向 `guozaoke.com` 的 Chrome/Firefox 浏览器扩展，技术栈包括 Vue 3、Vite、TypeScript、Element Plus、UnoCSS、Pinia 和 `webextension-polyfill`。

运行时包含三个相互隔离的上下文：

- `src/background/index.ts`：执行右键菜单、标签页操作、图片上传代理等后台或 Service Worker 特权任务，不能访问页面 DOM。
- `src/scripts/`：检查论坛 DOM 并注入独立 Vue 应用的 Content Scripts。各应用共享 Pinia 实例，但不能直接访问页面主世界中的 JavaScript 状态。
- `src/options.ts` 和 `src/popup.ts`：扩展页面。选项页是使用 hash 路由的 Vue Router SPA。

同步扩展设置使用 `browser.storage.sync`，较大的本地数据使用 `localforage`。不要使用宿主站点的 `localStorage` 保存扩展自有状态。浏览器权限或 CORS 要求特权上下文时，将跨域或特权操作放在后台脚本中。

## 常用命令

统一使用 pnpm，不要更换包管理器，也不要无故重新生成锁文件。

```bash
pnpm dev             # Chrome 开发环境
pnpm dev:ff          # Firefox 开发环境
pnpm build           # Chrome 类型检查与生产构建，仅在打包相关改动时使用
pnpm build:ff        # Firefox 类型检查与生产构建，仅在打包相关改动时使用
pnpm lint            # ESLint，只读检查
pnpm styl-lint       # Stylelint，只读检查
pnpm type-check      # vue-tsc，只读检查
```

仓库目前没有测试运行器。应使用适用的 lint、类型检查和构建验证改动，不要声称“测试已通过”。

`format`、`lint:fix` 和 `styl-lint:fix` 脚本可能改写整个仓库。优先只处理当前任务变更的文件。执行全仓修复前，必须检查工作树并保护用户的无关改动。

## 知识读取路由

只读取当前任务需要的参考资料：

- `.codebuddy/knowledge/architecture.md`：运行时架构、数据流和模块关系。
- `.codebuddy/knowledge/design-decisions.md`：存储、解析器、应用注入和外观方案的设计原因。
- `.codebuddy/knowledge/external-integrations.md`：图床及重要 UI、运行时依赖。
- `.codebuddy/knowledge/forum-domain.md`：论坛路由、HTML 结构、XSRF 处理和响应行为。

知识文件中的示例和清单只用于辅助理解，不能替代对当前代码的检查。修改前必须在源码中确认选择器、脚本入口、路由、枚举和主题名称。

## 仓库规范

新增字面量、选择器、选项、消息类型、路由或共享类型前，先搜索现有实现。优先复用 `src/constants/index.ts`、`src/constants/selector.ts` 和 `src/types/index.ts`，避免局部重复。

### TypeScript 与代码排版

- 除 Generator 或必须使用动态 `this` 的场景外，函数使用 `const` 箭头函数。
- 项目枚举优先使用 `const enum`；只有运行时遍历或索引确实需要时才使用普通 `enum`。
- 函数参数和公开返回值显式标注类型；文件内局部函数的返回值能明确推导时省略，尤其不要为无返回值的局部箭头函数添加冗余的 `: void` 或 `Promise<void>`；纯类型导入使用 `import type`。
- 已知消息载荷时使用 `MessageEvent<SearchResultMessage>` 等泛型事件类型。
- 所有函数和控制流块都必须使用花括号，并至少展开为三行。禁止单行函数以及单行 `if`、循环或 `try`。
- 不同语义段落之间留空行，但不要把短小的单一职责函数切成零散的单行段落。
- 函数内部优先 early return；ES 模块顶层不能使用 `return`，此时应反转条件。
- 复杂表达式应提取为有意义的命名变量，避免重复的属性访问链。

修改 JavaScript、TypeScript 或 Vue 脚本块时，按需阅读 `.codebuddy/rules/code-layout.md` 和 `.codebuddy/rules/typescript-conventions.md` 中的详细示例。

### Vue 与样式

- Vue SFC 顺序统一为 `<script setup lang="ts">`、`<template>`、`<style lang="scss" scoped>`。
- Props 和 Emits 使用类型参数定义；只有需要默认值时才使用 `withDefaults`。
- 全局事件监听在 `onMounted` 中注册，并在 `onUnmounted` 中移除。
- Vue、Element Plus 和 Vue 内置组件使用 PascalCase；HTML 元素使用小写；模板属性和事件使用 kebab-case。
- 模板中的国际化统一使用 `$t()`，脚本中使用 `t()`；普通占位符通过参数对象传入，不使用 `I18nT` 或 `<i18n-t>`。Locale JSON 中的用户可见文案直接写可读字符，不使用 `\uXXXX` Unicode 转义。
- 多行标签每行一个属性，顺序为：`ref`、Vue 指令、class/style、其他 props、事件。`>` 与最后一个属性同行，闭合标签与开始标签对齐。
- 组件样式保持 scoped。覆盖子组件时使用 `:deep()`，不要额外添加非 scoped 的 SFC 样式块。
- Scoped CSS 类必须带由组件名转换而来的 kebab-case 前缀。跨组件公共类应定义在全局非 scoped 样式中。

修改 `.vue` 或 SCSS 文件时，按需阅读 `.codebuddy/rules/vue-component-conventions.md` 和 `.codebuddy/rules/naming-conventions.md`。

### 浏览器扩展模式

- DOM 选择器定义在 `src/constants/selector.ts` 并统一复用。
- 独立 Vue 应用通过 `createScriptApp()` 注入，容器 ID 使用 `gzk-{name}-app` 格式。
- 跨上下文消息的判别值定义在 `ExtensionMessageType` 或对应的类型化消息枚举中。
- 调用 `runtime.sendMessage`、`tabs.sendMessage` 或 `postMessage` 前，先构造类型化消息变量；不要内联构造非简单消息对象。
- 检查跨域 iframe 的父来源时使用 `window.location.ancestorOrigins`；读取 `window.top.location` 可能抛出异常。
- 新增脚本前检查 `src/manifest.json` 和 `src/scripts/index.ts`，判断应注册到 Manifest、主入口或两者。

详细通信和存储模式见 `.codebuddy/rules/browser-extension-patterns.md`。

## 项目 Skills

任务匹配时使用 `.agents/skills/` 下的仓库级 skills：

- `add-content-script`：新增论坛 Content Script 或注入式 Vue 应用。
- `add-feature-end-to-end`：实现跨越多个项目层的完整功能。
- `add-html-parser`：新增基于正则的论坛 HTML 解析器及 API 集成。
- `add-i18n`：新增或修改中英文 locale key。
- `add-options-subpage`：新增选项页路由和视图。
- `add-theme`：新增深色或浅色主题。
- `code-quality-check`：验证代码改动。
- `git-commit-message`：生成符合仓库规范的 emoji Conventional Commit 信息。

任务范围较窄时，优先使用对应的专用 skill，不要默认使用 `add-feature-end-to-end`。

## 验证与交付

代码改动完成并趋于稳定后使用 `code-quality-check` skill，根据改动范围选择最小充分检查集。该 skill 是检查选择指南，不表示每次编辑后都要执行所有命令。检查应集中在交付前运行一次；修复检查结果后，只重跑失败项或受修复影响的项目。

- 仅修改 Markdown、注释或其他不参与编译的文档时，不运行 lint、类型检查或构建。
- 修改 TypeScript 或 Vue 行为时运行 `pnpm type-check`，并对变更文件执行适用的 ESLint 检查。
- 修改 Vue 样式、SCSS 或 CSS 时，对变更文件执行适用的 Stylelint 检查。
- 只有改动 `src/manifest.json`、Vite 或构建配置、脚本入口与注册、浏览器平台差异、依赖或其他可能改变产物的内容时，才运行受影响目标的生产构建。
- 普通组件逻辑、解析器、文案或局部样式改动，不以生产构建代替类型检查和针对性 lint，也不默认运行生产构建。
- 仅影响 Chrome 或 Firefox 一端时只构建对应目标；共享打包配置或跨浏览器行为发生变化时才构建两端。

不要为了“更保险”重复运行已经通过且未受后续修改影响的检查。若检查无法运行或失败原因与当前改动无关，交付时如实说明，不要声称“测试已通过”。

交付前检查最终 diff，并说明所有未能运行的检查。除非用户明确要求，否则不要提交、打 tag、推送、发布、更新依赖或暂存更新日志。

需要提交信息时遵循 `.commitlintrc.cjs`：emoji 加小写 type，可选小写 scope，祈使句 subject，header 最长 72 个字符。

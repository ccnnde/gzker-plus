# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

过早客 Plus — 一款增强 [guozaoke.com](https://www.guozaoke.com) 论坛体验的浏览器扩展（支持 Chrome/Firefox）。技术栈：Vue 3 + Vite + TypeScript + Element Plus + UnoCSS。

## 常用命令

```bash
# 开发（默认 Chrome）
pnpm dev              # 构建并监听，Chrome
pnpm dev:ff           # 构建并监听，Firefox

# 生产构建
pnpm build            # vue-tsc + vite build，Chrome
pnpm build:ff         # TARGET=firefox

# 质量检查（代码改动后必须执行）
pnpm format           # Prettier 格式化
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm styl-lint        # Stylelint 检查
pnpm styl-lint:fix    # Stylelint 自动修复
pnpm type-check       # vue-tsc 类型检查（仅检查不生成）

# 每次改动后最小质量流水线
pnpm format && pnpm lint:fix && pnpm styl-lint:fix

# 更新日志 & 发布
pnpm log:auto         # 生成 + 格式化 + git stage changelog
pnpm git:release      # 基于 changelog 创建 GitHub Release
pnpm zip-ext          # 打包扩展为 zip，用于分发
```

项目目前没有配置测试运行器。

## 扩展架构

浏览器扩展的三进程模型：

| 进程                            | 入口文件                         | 职责                                           |
| ------------------------------- | -------------------------------- | ---------------------------------------------- |
| **Background** (Service Worker) | `src/background/index.ts`        | 右键菜单、图片上传代理、选项页路由、键盘快捷键 |
| **Content Scripts**             | `src/scripts/index.ts`（主入口） | 向论坛页面注入 Vue 应用，提供 UI 增强          |
| **Extension Pages**             | `src/options.ts`, `src/popup.ts` | 设置页 SPA（Vue Router hash 模式）、简易弹窗   |

### Content Script 注入模式

每个功能都是**独立的 Vue 应用**，共享同一个 Pinia 实例。`src/scripts/` 下的功能脚本通过 `createScriptApp()` 将 Vue 组件挂载到论坛 DOM 中：

- `src/scripts/topic.ts` → `Topic.vue`（核心：浏览/创建/编辑主题、回复、图片查看器）
- `src/scripts/header.ts` → `GzkHeader.vue`（增强导航栏）
- `src/scripts/float-user-info.ts` → `FloatUserInfo.vue`（用户信息悬浮窗）
- `src/scripts/search.ts` → `GzkSearch.vue`（内联搜索面板）
- `src/scripts/set-appearance.ts` — 以 `document_start` 运行，防止深色模式切换时白屏闪烁

功能开关：`src/scripts/index.ts` 通过检查 `options[OptionsKey.xxx].checked` 按条件注册各功能。

### 数据流

```
选项页 ──setStorage()──▶ browser.storage.sync
                              │
            storage.sync.onChanged (300ms 防抖)
                              │
              Content Scripts（所有打开的论坛标签页）
                              │
                  useStorageStore (Pinia)
                              │
                  Vue 组件响应式更新
```

- 选项页写入 `browser.storage.sync`；Content Scripts 通过 `storage.sync.onChanged` 监听变化 → 防抖同步到 Pinia store
- Content Scripts **不能**直接请求第三方 API（受 CORS 限制）—— 图片上传需通过 `runtime.sendMessage` 经 Background 代理
- `localforage`（IndexedDB）用于大量本地数据（编辑器历史、Bilibili 图片历史）—— **不能**使用 `storage.sync`

### 论坛 API 模式

所有论坛数据通过 **fetch HTML 页面 + 正则解析**获取（不用 DOM 解析器——论坛 HTML 结构极为稳定）。API 函数位于 `src/api/index.ts`（`parseUserInfo`、`parseTopicDetail`、`parseUserTopic` 等）。所有 POST 请求需携带 cookie 中的 `_xsrf` token。

### 关键目录

| 目录               | 用途                                                |
| ------------------ | --------------------------------------------------- |
| `src/api/`         | 论坛 HTML 解析 + 图床 API 调用                      |
| `src/scripts/`     | 注入论坛页面的 Content Scripts                      |
| `src/components/`  | 可复用 Vue 组件                                     |
| `src/views/`       | 选项页各功能视图（带路由）                          |
| `src/composables/` | Vue 组合式函数（`useDarkMode`、`useScrollLoad` 等） |
| `src/stores/`      | Pinia stores（`useStorageStore`）                   |
| `src/constants/`   | 枚举、选择器、默认选项、错误消息                    |
| `src/utils/`       | 核心工具集（存储、请求、应用挂载、深色模式）        |
| `src/i18n/`        | vue-i18n 配置、语言 JSON 文件                       |
| `src/styles/`      | 全局 SCSS、深色/浅色主题、Element Plus 变量覆盖     |
| `src/assets/`      | 图标、表情数据、静态资源                            |

### 平台条件编译

Manifest 使用 `{{chrome}}.xxx` / `{{firefox}}.xxx` 模板语法区分平台。通过 `TARGET` 环境变量指定构建目标。使用 `webextension-polyfill` 统一浏览器 API 访问。

## 项目规范

编码规范详见 `.claude/rules/`（自动加载），架构与设计决策详见 `.codebuddy/knowledge/`。

## 项目技能

以下自定义技能位于 `.claude/skills/`，在执行特定类型任务时应优先加载使用：

| 技能                     | 用途                                         | 触发场景                     |
| ------------------------ | -------------------------------------------- | ---------------------------- |
| `code-quality-check`     | 代码生成后质量检查（格式化、lint、IDE 诊断） | 每次代码改动后               |
| `git-commit-message`     | 生成含 emoji、type、scope 的规范提交信息     | 需要提交代码时               |
| `add-i18n`               | 添加中英文国际化翻译                         | 新增文案/页面时              |
| `add-content-script`     | 新增注入论坛页面的 Content Script            | 需要注入 Vue 应用到论坛 DOM  |
| `add-html-parser`        | 新增论坛 HTML 正则解析函数                   | 需要从论坛 HTML 中提取新数据 |
| `add-options-subpage`    | 新增选项页面的子页面                         | 需要新设置页                 |
| `add-feature-end-to-end` | 端到端添加完整新功能                         | 从零开发新功能               |
| `add-theme`              | 添加新的深色/浅色主题                        | 新增主题配色                 |
| `grill-me`               | 深度审查设计方案/计划                        | 用户说"拷问我"/"审查方案"    |

`.codebuddy/knowledge/` 中还有架构全景、设计决策、外部集成、论坛领域知识等背景资料，在需要深入理解项目时可查阅。

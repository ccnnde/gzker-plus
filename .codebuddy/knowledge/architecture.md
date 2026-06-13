---
description: 项目架构全景图。解释浏览器扩展的完整运行时架构、数据流和模块关系。
---

# 项目架构全景

## 运行时架构

```
┌──────────────────────────────────────────────────────────┐
│                    Browser Extension                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Options Page │  │   Popup      │  │  Background   │  │
│  │ (Vue SPA)    │  │ (HTML)       │  │ (Service      │  │
│  │              │  │              │  │  Worker/Script)│  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         │    storage.sync │    runtime.sendMessage        │
│         ▼                 ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Content Scripts (guozaoke.com)         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │    │
│  │  │ set-     │ │ 主入口    │ │ 各功能脚本        │  │    │
│  │  │ appear-  │ │ index.ts │ │ topic/header/     │  │    │
│  │  │ ance.ts  │ │          │ │ float-user-info   │  │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │    │
│  │                                                     │    │
│  │  每个功能脚本 createScriptApp() 注入独立 Vue App     │    │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────────┐    │    │
│  │  │ Header  │ │ Topic   │ │ FloatUserInfo      │    │    │
│  │  │ App     │ │ App     │ │ App                │    │    │
│  │  └─────────┘ └─────────┘ └────────────────────┘    │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 三进程隔离

| 进程 | 文件 | 能力 | 限制 |
|------|------|------|------|
| **Background** (Service Worker) | `src/background/index.ts` | 无页面生命周期限制、可创建 tab、全局上下文菜单 | 不能访问 DOM |
| **Content Script** | `src/scripts/` | 可访问论坛页面 DOM、注入 Vue 组件 | 隔离的 JS 环境、不能直接访问页面 window |
| **Extension Page** | `src/options.html`, `src/popup.html` | 完整 Web 环境、独立页面 | 无法直接访问论坛页面 DOM |

## 数据流

### 1. 存储同步流

```
Options Page ──setStorage()──▶ browser.storage.sync
                                    │
                  storage.sync.onChanged
                                    │
                                    ▼
                          Content Script (所有打开的论坛标签页)
                                    │
                          debouncedSyncStorage (300ms 防抖)
                                    │
                                    ▼
                          useStorageStore (Pinia Store)
                                    │
                                    ▼
                          Vue 组件响应式更新
```

**关键文件：**
- `src/utils/index.ts` - `setStorage()`, `getStorage()`, `createDebouncedStorageSync()`
- `src/stores/storage.ts` - `useStorageStore` Pinia Store
- `src/scripts/index.ts` - `storage.sync.onChanged` 监听注册

### 2. 图片上传流

```
Content Script (编辑器)
    │
    │ runtime.sendMessage({ imgFile: Base64File })
    │
    ▼
Background Script
    │
    ├──▶ SM.MS 直传 (ExtensionMessageType.UploadImg)
    │       └── sm-img.ts → fetch s.ee/api/v1
    │
    └──▶ Bilibili 代理上传 (ExtensionMessageType.UploadBiliImg)
            ├── 创建隐藏 Tab: bilibili.com/gzk-img-upload
            ├── tabs.sendMessage → upload-bili-img.ts
            ├── 页面内调用 Bilibili API (cookie 认证)
            └── 返回图片 URL
```

**为什么走 Background？** Content Script 受 CORS 限制，无法直接请求第三方 API。

### 3. 右键菜单流

```
用户选中文本 → 右键 → "屏蔽包含'xxx'的主题"
    │
    │ contextMenus.onClicked
    ▼
Background Script
    │
    │ tabs.sendMessage({ msgType: BlockKeyword, keyword: 'xxx' })
    ▼
Content Script (handleBlockKeyword)
    │
    │ setStorage({ topicKeywordBlock: { keywords: '新关键字' } })
    ▼
storage.sync.onChanged → 所有标签页同步更新
```

## 模块依赖关系

```
src/scripts/index.ts  (主入口，按条件注册各功能)
    │
    ├── src/stores/storage.ts       (Pinia Store - 全局状态)
    ├── src/i18n/index.ts           (vue-i18n 实例)
    ├── src/utils/index.ts          (核心工具集)
    │       ├── createScriptApp()   (注入 Vue App 到页面)
    │       ├── setStorage/getStorage (浏览器存储)
    │       ├── request()           (论坛 API 请求)
    │       ├── blockTopics()       (DOM 级话题屏蔽)
    │       └── ...
    ├── src/constants/index.ts      (枚举、常量、默认值)
    ├── src/constants/selector.ts   (DOM 选择器常量)
    ├── src/api/index.ts            (论坛 HTML 解析 + API 调用)
    │       └── 正则解析函数 (parseUserInfo, parseTopicDetail...)
    └── src/components/             (Vue 组件库)
            ├── Topic.vue           (核心 - 主题浏览/编辑)
            ├── FloatUserInfo.vue   (用户悬浮窗)
            ├── ContentEditor.vue   (Markdown 编辑器)
            └── ...
```

## 条件编译

通过 `process.env.TARGET` 和 `vite-plugin-web-extension` 的模板语法实现：

```json
// manifest.json
"{{chrome}}.manifest_version": 3,
"{{firefox}}.manifest_version": 2,
"{{firefox}}.browser_specific_settings": { "gecko": { "id": "..." } }
```

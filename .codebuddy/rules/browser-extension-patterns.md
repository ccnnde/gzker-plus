---
description: 浏览器扩展开发模式和约束。Content Script、Background Script 通信和 Manifest 条件编译。
globs: "*.ts,*.tsx,*.vue,*.json"
---

# 浏览器扩展开发模式

## 项目架构

本项目是基于 `vite-plugin-web-extension` 的浏览器扩展，同时支持 Chrome (Manifest V3) 和 Firefox (Manifest V2)。

```
src/
├── background/index.ts    # Service Worker (MV3) / Background Script (MV2)
├── scripts/index.ts       # Content Script 主入口
├── popup.html/ts          # 弹窗页面
└── options.html/ts        # 选项页面（Vue SPA）
```

### 构建命令

```bash
pnpm dev              # Chrome 开发模式
pnpm dev:ff           # Firefox 开发模式
pnpm build            # Chrome 生产构建
pnpm build:ff         # Firefox 生产构建
```

## Content Script 模式

### 注入流程

Content Script (`src/scripts/index.ts`) 负责将 Vue 应用注入到过早客论坛页面：

```typescript
import { createPinia } from 'pinia';
import { createScriptApp, getStorage, setStorage } from '@/utils';

const pinia = createPinia();

const setupApp = async () => {
  const { options, blockedTopicList } = await getStorage();

  await setStorage({
    loginUserId: getLoginUserId(),
  });

  createHeaderApp(pinia);

  if (options[OptionsKey.FloatUserInfo].checked) {
    createUserInfoApp(pinia);
  }

  if (options[OptionsKey.EnhancedTopic].checked) {
    createTopicApp(pinia);
  }
};

setupApp();
```

### `createScriptApp` 工具函数

所有注入到页面的 Vue 应用使用 `createScriptApp` 创建：

```typescript
import { createScriptApp } from '@/utils';

export const createHeaderApp = (pinia: Pinia) => {
  createScriptApp({
    root: GzkHeader,
    pinia,
    containerId: 'gzk-header-app',
    containerParentNode: document.querySelector(SELECTOR_TOP_NAVBAR),
  });
};
```

### Content Script 限制
- **不能直接访问 `window` 对象**：Content Script 运行在隔离环境中
- **DOM 操作通过选择器**：使用 `src/constants/selector.ts` 中定义的 CSS 选择器
- **只能通过 Background 通信实现跨页面功能**

## Background Script 模式

`src/background/index.ts` 是扩展的后台脚本，负责：

1. **消息路由**：接收 Content Script 和 Popup 的消息
2. **上下文菜单**：右键菜单创建和点击处理
3. **图片上传代理**：通过 Bilibili 页面代理上传图片（绕过跨域限制）
4. **扩展生命周期**：安装/更新时的初始化逻辑

### 消息通信模式

```typescript
// Content Script → Background
runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  switch (message.msgType) {
    case ExtensionMessageType.UploadBiliImg: {
      // 创建 Bilibili 标签页代理上传
      biliImgTab = await tabs.create({
        url: BILI_IMG_TAB_URL,
        active: false,
      });

      // 向标签页发送消息并等待响应
      const imgData = await sendMessageToTab(biliImgTab?.id, message);
      return imgData.location;
    }
  }
});

// Background → Content Script
contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id) {
    tabs.sendMessage(tab.id, {
      msgType: ExtensionMessageType.BlockKeyword,
      keyword: info.selectionText?.trim(),
    });
  }
});
```

### 消息类型定义

所有消息类型通过 `ExtensionMessageType` 枚举定义在 `src/constants/index.ts`：

```typescript
export const enum ExtensionMessageType {
  OpenOptionsPage,
  UploadImg,        // 上传到 SM.MS
  UploadBiliImg,    // 上传到 Bilibili
  CloseBiliImgTab,
  BlockKeyword,     // 屏蔽关键字
  Base64Decode,     // Base64 解码
}
```

## 存储模式

使用 `browser.storage.sync` 实现设置跨设备同步：

```typescript
// 读取
const { options, blockedTopicList } = await getStorage();

// 写入
await setStorage({
  options: newOptions,
});

// 监听跨标签页变化
storage.sync.onChanged.addListener(() => {
  debouncedSyncStorage();
});
```

## Manifest 条件编译

`vite.config.ts` 通过 `TARGET` 环境变量实现条件编译：

```typescript
const target = process.env.TARGET || 'chrome';

WebExtension({
  browser: target,
  manifest: generateManifest,
});
```

- Chrome 构建使用 Manifest V3 格式
- Firefox 构建使用 Manifest V2 格式
- Content Script 通过 `manifest.json` 的 `content_scripts` 注册

## 跨页面通信模式

```
选项页面 (Options Page) --storage.sync--> 所有打开的论坛标签页
Popup --runtime.sendMessage--> Background --tabs.sendMessage--> Content Script
Content Script --runtime.sendMessage--> Background
```

## 新 Content Script 添加步骤

1. 在 `src/scripts/` 创建新脚本文件
2. 在 `src/scripts/index.ts` 中导入并注册
3. 如需新的消息类型，在 `ExtensionMessageType` 枚举中添加
4. 如需新的选项控制，在 `OptionsKey` 枚举和 `Options` 类型中添加

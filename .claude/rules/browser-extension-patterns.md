---
description: 浏览器扩展开发的约束和模式。架构全景参见 .codebuddy/knowledge/architecture.md。
globs: '*.ts,*.tsx,*.vue,*.json'
---

# 浏览器扩展开发约束

## Content Script 限制

- **不能直接访问页面 `window` 对象**：Content Script 运行在隔离环境中
- **DOM 操作通过选择器**：使用 `src/constants/selector.ts` 中定义的 CSS 选择器常量
- **跨域请求必须走 Background**：Content Script 受 CORS 限制，第三方 API 只能由 Background 代理
- **独立 Vue App 注入**：每个功能通过 `createScriptApp()` 注入独立 Vue 应用，共享同一个 Pinia 实例

### 注入模式

```typescript
export const createMyFeatureApp = (pinia: Pinia) => {
  createScriptApp({
    root: MyFeatureComponent,
    pinia,
    containerId: 'gzk-my-feature-app',
    containerParentNode: document.querySelector(SELECTOR_SOME_ELEMENT),
  });
};
```

## 消息通信约束

所有跨进程消息类型必须通过 `ExtensionMessageType` 枚举定义：

```typescript
// src/constants/index.ts
export const enum ExtensionMessageType {
  OpenOptionsPage,
  UploadImg,
  BlockKeyword,
  // 新增消息类型追加到末尾
}
```

| 方向                          | 方式                     | 场景                               |
| ----------------------------- | ------------------------ | ---------------------------------- |
| Content Script → Background   | `runtime.sendMessage`    | 请求需要特权的操作（图片上传等）   |
| Background → Content Script   | `tabs.sendMessage`       | 推送事件到特定标签页（右键菜单等） |
| Options Page → Content Script | `storage.sync.onChanged` | 设置变更同步到所有标签页           |

### 消息发送格式

发送消息时，**先将消息对象提取为类型化变量，再传递**，禁止内联构造。

```typescript
// ✅ 正确 - 提取消息对象为变量，一行一个属性
const msg: ExtensionMessage = {
  msgType: ExtensionMessageType.OpenOptionsPage,
};

runtime.sendMessage(msg);

// ❌ 错误 - 内联构造，可读性差
runtime.sendMessage({ msgType: ExtensionMessageType.OpenOptionsPage });
```

适用场景：`runtime.sendMessage`、`tabs.sendMessage`、`window.postMessage`、`iframe.contentWindow.postMessage`。

## 存储约束

- **使用 `browser.storage.sync`**：跨设备同步，容量 ~100KB，写入频率 ~2 次/秒
- Content Script 不能使用 `localStorage`（隔离环境）
- 监听跨标签页变化使用 `createDebouncedStorageSync()`（300ms 防抖）
- 大数据（如编辑器历史）使用 `localforage`（IndexedDB）

## Manifest 条件编译

```json
// manifest.json - 通过 {{ }} 模板语法区分平台
"{{chrome}}.manifest_version": 3,
"{{firefox}}.manifest_version": 2,
```

构建时通过 `TARGET` 环境变量选择目标平台：

```bash
pnpm dev          # Chrome (默认)
pnpm dev:ff       # Firefox
```

---
description: 项目命名规范。涵盖文件、组件、变量、函数等命名约定。
---

# 命名规范

## 文件和目录命名

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件文件 | PascalCase | `FloatUserInfo.vue`, `TopicEditor.vue` |
| TypeScript 文件 | kebab-case 或小写 | `scroll-load.ts`, `event-bus.ts`, `index.ts` |
| 目录 | kebab-case | `basic-setting/`, `bili-images/` |
| 类型定义文件 | kebab-case | `el-components.d.ts` |
| 样式文件 | kebab-case | `script-dark.scss`, `github-markdown.scss` |
| 静态资源 | kebab-case | `qq-group-qrcode.png` |

## Vue 组件命名

```typescript
// ✅ 正确 - PascalCase 文件名
// src/components/FloatUserInfo.vue

// 模板中使用 kebab-case
<UserInfoPopover :uid="uid" :show-after="200" />
```

## 函数命名

| 类型 | 规范 | 示例 |
|------|------|------|
| Composable | `use` 前缀 | `useDarkMode()`, `useScrollLoad()` |
| Store | `use` 前缀 + `Store` 后缀 | `useStorageStore()` |
| 工具函数 | camelCase 动词开头 | `getStorage()`, `setStorage()`, `createScriptApp()` |
| 解析函数 | `parse` 前缀 | `parseUserInfo()`, `parseTopicDetail()` |
| 事件处理 | `handle` 或 `on` 前缀 | `handleAvatarMouseEnter()`, `onMounted()` |
| 返回值函数 | `get` 前缀 | `getXsrfToken()`, `getLoginUserId()` |
| 布尔判断 | `is` / `should` / `can` 前缀 | `isSystemDarkMode()`, `shouldBeDarkMode()` |

## 变量命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 常量 | SCREAMING_SNAKE_CASE | `GZK_URL`, `DARK_MODE_CLASS` |
| ref 响应式变量 | camelCase | `avatarWrapperStyle`, `dataList` |
| 枚举 | PascalCase | `DarkMode`, `OptionsKey` |
| 接口/类型 | PascalCase | `UserInfo`, `StorageSettings` |
| 事件名称 | kebab-case | `update:modelValue` |

## 枚举值命名

```typescript
// ✅ 正确 - 字符串枚举值使用 camelCase
export const enum ReplyType {
  Topic = 'topic',
  Mention = 'mention',
}

export const enum BellStyle {
  None = 'none',
  Normal = 'normal',
  BadgeDot = 'badgeDot',
  BadgeNum = 'badgeNum',
}

// ✅ 正确 - 数字枚举值省略赋值
export const enum ExtensionMessageType {
  OpenOptionsPage,
  UploadImg,
  BlockKeyword,
}
```

## 注入容器的 ID

Content Script 注入的 Vue 应用容器 ID 使用 `gzk-{name}-app` 格式：

```typescript
// 示例
containerId: 'gzk-header-app'
containerId: 'gzk-topic-app'
containerId: 'gzk-user-info-app'
```

## Store 命名

```typescript
// 使用 defineStore 时，第一个参数（store id）使用有意义的名字
export const useStorageStore = defineStore('storage', () => {
  // ...
});
```

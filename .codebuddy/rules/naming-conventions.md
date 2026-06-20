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

// 模板中使用 PascalCase
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

## Composable 规范

- 文件放在 `src/composables/` 目录
- 命名以 `use` 开头
- 返回对象（非数组），便于按需解构

```typescript
// ✅ 正确
export const useDarkMode = () => {
  const isDark = computed(() => {
    /* ... */
  });

  return {
    isDark,
  };
};
```

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

## CSS 类名命名

**所有 scoped 样式中的类名必须带组件前缀，无一例外。** 前缀由组件 PascalCase 文件名转为 kebab-case 得到：

```
{组件名.kebab-case}-{元素名}
```

如 `GzkSearch.vue` → 前缀 `gzk-search-` → `gzk-search-wrapper`、 `gzk-search-history-item-remove`。

现有组件前缀速查：

| 组件 | 前缀 | 示例 |
|------|------|------|
| `CheckAll` | `check-all-` | `check-all-container` |
| `ContentEditor` | `content-editor-` | `content-editor-header`、`content-editor-form` |
| `GzkSearch` | `gzk-search-` | `gzk-search-wrapper`、`gzk-search-history-item` |
| `ReplyEditor` | `reply-editor-` | `reply-editor-container`、`reply-editor-header`、`reply-editor-body` |
| `ReplyItem` | `reply-` | `reply-container`、`reply-main`、`reply-header`、`reply-footer` |
| `Topic` | `topic-` | `topic-dialog`、`topic-container`、`topic-body-absolute` |
| `TopicDetail` | `detail-` | `detail-header-top`、`detail-title`、`detail-meta` |
| `TopicEditor` | `topic-editor-` | `topic-editor-header`、`topic-editor-form` |
| `TopicFooter` | `footer-` | `footer-container`、`share-icon` |

层级结构为 `{组件前缀}-{区块}-{子元素}`，如 `detail-header-top`（组件块 block 子元素）。

名称过长时可删减重复或冗余的中间区块，但必须确保含义清晰。例如 `gzk-search-history-item` 不应简化为 `gzk-search-item`（失去"历史记录条目"的含义），而 `gzk-search-result-item` 中的 `item` 在上下文清晰时可以接受。

**例外：** 跨组件复用的公共类不加前缀，定义在非 scoped 的 `<style lang="scss">` 中：
- `.user-id` — 用户 ID 链接
- `.user-meta` — 用户元信息行
- `.main-content` — 主内容区
- `.markdown-body` — Markdown 渲染内容
- `.number-info` — 数字信息

---
description: 项目集成的外部服务和关键依赖说明。
---

# 外部服务集成

## SM.MS (S.EE) 图床

**API 文档：** https://s.ee/docs/developers/

### 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `https://s.ee/api/v1` |
| 认证方式 | API Key（Header: `Authorization`） |
| 图片大小限制 | 5 MB |
| 同时上传限制 | 5 张 |
| 类型文件 | `src/api/sm-img.ts` |
| 类型定义 | `src/types/index.ts`（SMUserProfile, SMUsage, SMUploadedImg, SMApiResponse） |

### API 响应格式

```typescript
interface SMApiResponse<T> {
  success: boolean;
  code: number;      // 200 = 成功
  message: string;
  data: T;
}
```

### 用户需要配置

在选项页面 -> ImageHosting 中填写 SM.MS API Key。

### 实现文件

- `src/api/sm-img.ts` - API 调用
- `src/views/basic-setting/SmApiKey.vue` - API Key 配置 UI
- `src/views/basic-setting/ImageHosting.vue` - 图床选择

---

## Bilibili 图床

**API Base URL:** `https://api.bilibili.com/x`

### 基础信息

| 项目 | 值 |
|------|-----|
| 认证方式 | Cookie（Bilibili 登录态）+ CSRF Token |
| 上传方式 | 通过隐藏标签页代理上传 |
| 类型文件 | `src/api/bili-img .ts` |
| Content Script | `src/scripts/upload-bili-img.ts` |
| 类型定义 | `src/types/index.ts`（BiliApiResponse, BiliUploadedImg, BiliUserProfile） |

### 上传架构（关键）

```
Content Script (编辑器)
    │ 用户选择图片
    │ runtime.sendMessage({ msgType: UploadBiliImg, imgFile: Base64File })
    ▼
Background Script
    │ 创建隐藏 Tab: https://www.bilibili.com/gzk-img-upload
    │ tabs.sendMessage → upload-bili-img.ts
    ▼
upload-bili-img.ts (运行在 bilibili.com 页面)
    │ 读取 Bilibili Cookie (csrf)
    │ fetch https://api.bilibili.com/x/upload/web/image
    │ 返回 BiliUploadedImg
    ▼
Background Script
    │ 存储到 bili-img-store
    │ 关闭隐藏 Tab (延迟)
    ▼
Content Script → 编辑器插入图片链接
```

### API 响应格式

```typescript
interface BiliApiResponse<T> {
  code: number;      // 0 = 成功
  message: string;
  data: T;
}
```

### 历史记录

- `src/utils/bili-img-store.ts` - Bilibili 图片上传历史（localforage/IndexedDB）
- `src/views/bili-images/BiliImages.vue` - 历史管理页面

---

## Cherry Markdown 编辑器

**包名：** `cherry-markdown` v0.8.39（有 patch）

### 使用位置

- `src/components/ContentEditor.vue` - 编辑器组件
- `src/utils/cherry-hook.ts` - Cherry 实例钩子配置
- `src/styles/cherry-markdown.scss` - 编辑器样式覆盖

### 自定义配置

```typescript
// cherry-hook.ts - 编辑器回调钩子
// 处理：图片上传、内容变化、快捷键等
```

### Patch 说明

`patches/cherry-markdown@0.8.39.patch` - 修复 Cherry Markdown 在 Vite 环境中的兼容性问题。

---

## Element Plus

**包名：** `element-plus` v2.4.2

### 使用方式

通过 `unplugin-vue-components` 和 `unplugin-auto-import` 实现按需导入：

```typescript
// vite.config.ts
AutoImport({ resolvers: [ElementPlusResolver()] }),
Components({ resolvers: [ElementPlusResolver()] }),
```

无需手动导入组件，在模板中使用 `<el-xxx>` 即可。

### 主要使用组件

| 组件 | 使用场景 |
|------|---------|
| `ElDialog` | 主题/回复编辑器弹窗 |
| `ElMessage` | 操作结果提示 |
| `ElLoading` | 全局加载遮罩 |
| `ElMessageBox` | 确认对话框 |
| `ElPopover` | 用户信息悬浮窗 |
| `ElSwitch` | 选项开关 |
| `ElRadio` | 选项单选 |
| `ElEmpty` | 空状态占位 |

### 样式自定义

通过 CSS 变量系统覆盖 Element Plus 变量（见 `src/styles/themes.scss`）：
- `--el-color-primary` 系列
- `--el-bg-color` 系列
- `--el-text-color` 系列
- `--el-border-color` 系列
- `--el-fill-color` 系列
- `--el-box-shadow` 系列
- `--el-mask-color` 系列

---

## UnoCSS

**包名：** `unocss` v0.57.3

零配置的原子化 CSS 引擎，替代 Tailwind。

### 使用方式

```vue
<template>
  <!-- 图标类 -->
  <span class="i-mdi-cog-outline" />
  
  <!-- 布局类 -->
  <div class="flex items-center gap-2" />
  
  <!-- 文本类 -->
  <span class="text-sm text-gray-500" />
</template>
```

### 图标来源

`@iconify-json/mdi` - Material Design Icons。

---

## VueUse

**包名：** `@vueuse/core` v10.11.1

### 使用位置

| 工具 | 文件 | 用途 |
|------|------|------|
| `usePreferredDark` | `src/composables/dark-mode.ts` | 检测系统深色模式 |
| 其他 | - | 按需使用 |

---

## 其他关键依赖

| 依赖 | 用途 |
|------|------|
| `webextension-polyfill` | 统一 Chrome/Firefox 浏览器 API |
| `vue-i18n` | 国际化（中文/英文） |
| `pinia` | 状态管理（仅 storage store） |
| `vue-router` | 选项页面路由（hash 模式） |
| `lodash-es` | 深度克隆、合并、防抖 |
| `html-entities` | 解码 HTML 实体（论坛内容） |
| `js-cookie` | 读取 XSRF Token |
| `viewerjs` | 图片查看器 |
| `v-viewer` | ViewerJS 的 Vue 集成 |
| `mitt` | 事件总线 |
| `nanoid` | 生成唯一 ID |
| `localforage` | 编辑器历史记录本地存储 |
| `markdown-it-*` | Markdown 渲染扩展 |
| `scroll-into-view-if-needed` | 滚动到元素 |

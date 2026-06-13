---
name: add-i18n
description: 为项目添加国际化翻译。使用 vue-i18n 管理中文和英文翻译，包含翻译 key 设计、文件更新和使用方式。
---

# 添加国际化

## 概述

项目使用 `vue-i18n` 实现国际化，支持中文（`zh`）和英文（`en`）两种语言。翻译文件位于 `src/i18n/locales/`。

## 文件结构

```
src/i18n/
├── index.ts                  # i18n 实例创建
└── locales/
    ├── zh.json               # 中文翻译
    └── en.json               # 英文翻译
```

## 翻译文件结构

```json
{
  "common": {
    "plzLogin": "请先登录",
    "emptyData": "数据为空",
    "networkError": "网络错误"
  },
  "settings": {
    "basicSetting": "基本设置"
  },
  "resMessage": {
    "alreadyLiked": "已经感谢过啦",
    "canNotLikeYourTopic": "不能感谢自己的主题"
  },
  "navigation": {
    "tech": "技术",
    "create": "创造"
  }
}
```

## i18n 使用方式

### 在 TypeScript 中使用

```typescript
import { t } from '@/i18n';

// 简单翻译
ElMessage.success(t('common.plzLogin'));

// 带参数的翻译
ElMessage.success(t('base64Decode.copySuccess', { text: 'hello' }));
```

### 在 Vue 模板中使用

```vue
<template>
  <span>{{ $t('settings.basicSetting') }}</span>
</template>
```

## 添加新翻译的流程

### 步骤 1: 确定翻译 key 结构

遵循已有的分组结构：

| 分组           | 用途                           |
| -------------- | ------------------------------ |
| `common`       | 通用文本（提示、错误信息等）   |
| `settings`     | 选项页面的设置项名称和描述     |
| `resMessage`   | API 返回的错误消息映射         |
| `base64Decode` | Base64 解码相关                |
| `navigation`   | 论坛节点名称翻译               |
| 新建分组       | 如果新功能翻译较多，创建新分组 |

### 步骤 2: 更新 zh.json

```json
{
  "newFeature": {
    "name": "新功能",
    "description": "这是一个新功能的描述",
    "success": "操作成功",
    "failed": "操作失败：{reason}"
  }
}
```

### 步骤 3: 更新 en.json

```json
{
  "newFeature": {
    "name": "New Feature",
    "description": "Description of the new feature",
    "success": "Operation successful",
    "failed": "Operation failed: {reason}"
  }
}
```

### 步骤 4: 在代码中使用

```typescript
import { t } from '@/i18n';

// 无参数
t('newFeature.name');

// 有参数（使用 {variableName} 占位）
t('newFeature.failed', { reason: '网络超时' });
```

## 选项页面的路由标题翻译

路由标题通过 `meta.title` 自动映射翻译 key：

```typescript
// 路由定义
{
  name: OptionsRouteNames.MyFeature,
  meta: {
    title: OptionsRouteNames.MyFeature,  // 'myFeature'
  },
}

// zh.json
{
  "options": {
    "myFeature": "我的功能"
  }
}
```

翻译 key 规则：`options.{routeName}` (小写，camelCase)

## 常用翻译模式

### API 响应消息映射

```typescript
// src/constants/res-msg.ts - 定义原始消息常量
export const USER_NOT_LOGIN = '用户未登录';

// src/utils/index.ts - 消息映射
import { t } from '@/i18n';

const getResMessage = (msg: string): string => {
  switch (msg) {
    case USER_NOT_LOGIN:
      return t('common.plzLogin');
    default:
      return msg; // 没有对应翻译时返回原文
  }
};
```

### 带计数的翻译

```json
{
  "message": {
    "unread": "你有 {count} 条未读消息"
  }
}
```

```typescript
t('message.unread', { count: 5 });
// 中文: "你有 5 条未读消息"
// 英文: "You have 5 unread messages"
```

## 翻译 key 插入顺序

新增翻译 key 必须按**字母升序**插入到合适位置，不要直接追加到末尾。

```json
// ✅ 正确 - 按字母序插入
{
  "common": {
    "cancel": "取消",
    "emptyData": "数据为空",       // ← e 在 c 之后
    "networkError": "网络错误",
    "plzLogin": "请先登录",
    "post": "发布"                 // ← p 在 n 之后
  }
}

// ❌ 错误 - 直接追加到末尾
{
  "common": {
    "cancel": "取消",
    "plzLogin": "请先登录",
    "emptyData": "数据为空"        // ← 乱序
  }
}
```

新分组也按字母升序插入到顶级 key 中。

## 代码规范提醒

- 翻译 key 使用 camelCase
- JSON 文件最后一条不加逗号
- 中英文翻译 key 结构完全一致
- 带参数的占位符使用 `{variableName}` 格式

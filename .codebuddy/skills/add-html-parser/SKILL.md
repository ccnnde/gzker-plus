---
name: add-html-parser
description: 为过早客论坛页面添加新的 HTML 解析函数，从论坛 HTML 中提取结构化数据。遵循项目现有的正则解析模式。
---

# 添加 HTML 解析器

## 前提阅读

在执行本 Skill 前，先阅读以下知识库文件以获取必要的背景知识：

- `.codebuddy/knowledge/forum-domain.md` - 🔴必读 - 论坛 HTML 标记结构、URL 模式、XSRF 认证、服务端响应格式
- `.codebuddy/knowledge/design-decisions.md` - 了解为什么使用正则解析 HTML、checkAlertInfo 错误处理模式

## 概述

项目使用**正则表达式直接解析 HTML 字符串**来获取论坛数据，而非使用 DOM 解析器。所有解析函数集中在 `src/api/index.ts` 中，命名遵循 `parse*` 前缀。

## 解析模式参考

```typescript
// src/api/index.ts

// 简单解析：单个正则提取字段
const parseUserInfo = (htmlStr: string): UserInfo => {
  return {
    uid: htmlStr.match(/<div class="username">([^<]+)<\/div>/)?.[1],
    avatarUrl: htmlStr.match(/<a href="\/u\/[^"]+">\n\s+<img src="([^"]+)" alt="" class="avatar" \/>/)?.[1],
    memberNo: htmlStr.match(/过早客第(\d+)号成员/)?.[1],
  };
};

// 列表解析：split 拆分 + map 处理
const parseUserMsgList = (htmlStr: string): UserMessage[] => {
  const msgList = htmlStr.split('<div class="notification-item">');

  if (msgList.length < 2) {
    return [];
  }

  const lastMsgIndex = msgList.length - 1;
  msgList[lastMsgIndex] = msgList[lastMsgIndex].split('<div class="ui-footer">')[0];
  msgList.shift();

  return msgList.map((item): UserMessage => {
    return {
      uid: item.match(/<a href="\/u\/([^"]+)">/)?.[1],
      topicTitle: item.match(/<a href="\/t\/[^"]+">(.+)<\/a>/)?.[1],
    };
  });
};

// 嵌套解析：外层 HTML 拆分为子块，各自独立解析
const parseUserTopic = (htmlStr: string): UserTopic => {
  let detail: UserTopicDetail = {};
  let list: UserReplyItem[] = [];
  let total = htmlStr.match(/<div class="ui-header">.+?<span>共收到(\d+)条回复<\/span>/s)?.[1];

  if (total === undefined) {
    detail = parseTopicDetail(htmlStr);
    total = '0';
  } else {
    const [detailHtmlStr, replyHtmlStr] = htmlStr.split('class="topic-reply');
    detail = parseTopicDetail(detailHtmlStr);
    list = parseTopicReplyList(replyHtmlStr);
  }

  return {
    detail,
    status: parseTopicStatus(htmlStr),
    reply: { total, list },
  };
};
```

## 实现流程

### 步骤 1: 定义返回类型

在 `src/types/index.ts` 中定义解析结果的数据结构：

```typescript
export interface NewData {
  id?: string;
  title?: string;
  // ... 其他字段
}
```

### 步骤 2: 编写解析函数

在 `src/api/index.ts` 中添加解析函数：

```typescript
const parseNewData = (htmlStr: string): NewData => {
  return {
    id: htmlStr.match(/data-id="(\d+)"/)?.[1],
    title: htmlStr.match(/<h3 class="title">([^<]+)<\/h3>/)?.[1],
  };
};
```

### 步骤 3: 处理 HTML 实体

论坛内容可能包含 HTML 实体（如 `&lt;`, `&gt;`, `&amp;`），使用 `html-entities` 解码：

```typescript
import { decode } from 'html-entities';

const parseEditedTopic = (htmlStr: string): UserTopicDetail => {
  const title = htmlStr.match(
    /<input class="form-control" id="prependedInput" type="text" placeholder="主题" name="title" value="(.+?)">/,
  )?.[1];

  return {
    title: decode(title),  // 解码 HTML 实体
    content: htmlStr.match(/<textarea [^>]*>(.+?)<\/textarea>/s)?.[1],
  };
};
```

### 步骤 4: 编写 API 调用函数

```typescript
export const getNewData = async (id: string): Promise<NewData> => {
  const data = await request(`/api/some-path/${id}`);
  return parseNewData(data);
};
```

### 步骤 5: 错误处理

```typescript
// 使用 checkAlertInfo 检查服务端错误提示
const checkAlertInfo = (htmlStr: string) => {
  const alertHtmlStr = htmlStr.match(/<form [^>]*>.+?<ul class="alert alert-danger">(.+?)<\/ul>.+?<textarea/s)?.[1];

  if (alertHtmlStr) {
    const alertInfo = [...alertHtmlStr.matchAll(/<li>(.+?)<\/li>/g)].map((item) => item[1]).join('，');
    throw new Error(alertInfo);
  }
};
```

## 正则表达式常用模式

### 匹配单行内容
```typescript
/<tag>(.+?)<\/tag>/         # 非贪婪匹配单行
/<tag>([^<]+)<\/tag>/       # 匹配不含 < 的内容
```

### 匹配多行内容
```typescript
/<tag>(.+?)<\/tag>/s        # 使用 s 标志匹配换行
/<div class="class">(.+)<\/div>\s+?<div class="footer">/s  # 匹配到下一个标记
```

### 匹配属性值
```typescript
/<a href="([^"]+)">/         # 匹配 href 属性
/<img src="([^"]+)" alt="" class="avatar"( \/)?>/  # 匹配 img 属性
```

### 使用 `matchAll` 全局匹配
```typescript
const timeMatches = [...item.matchAll(/<span class="time">([^<|楼主]+)<\/span>/g)];
const [timeMatch, ipMatch] = timeMatches;  // 第一个和第二个匹配

const nodeList = [...item.matchAll(/<a href="\/node\/(\w+?)">(.+?)<\/a>/g)].map(
  (node): TreeNode => ({
    value: node[1],  // 捕获组 1
    label: node[2],  // 捕获组 2
  }),
);
```

### split 拆分列表
```typescript
const items = htmlStr.split('<div class="item">');
items.shift();  // 移除第一个空元素
return items.map(parseItem);
```

## 代码规范提醒

- 函数至少三行
- if/for/try 必须使用花括号并展开
- 语句块前后留空行
- 使用可选链 `?.` 处理匹配结果
- 命名遵循 `parse*` 前缀
- 解析结果字段使用可选类型（`?:`）提高健壮性

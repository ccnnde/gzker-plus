---
name: add-html-parser
description: 为论坛 HTML 页面添加正则解析函数，从 HTML 中提取结构化数据。
---

# 添加 HTML 解析器

## 前提

先阅读：

- `.codebuddy/knowledge/forum-domain.md` — 论坛 HTML 结构、URL 模式、XSRF 认证
- `.codebuddy/knowledge/design-decisions.md` — 为什么用正则解析 HTML

## 解析模式

### 简单解析 — 单次正则提取

```typescript
const parseUserInfo = (htmlStr: string): UserInfo => {
  return {
    uid: htmlStr.match(/<div class="username">([^<]+)<\/div>/)?.[1],
    memberNo: htmlStr.match(/过早客第(\d+)号成员/)?.[1],
  };
};
```

### 列表解析 — split + map

```typescript
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
```

### 嵌套解析 — 拆分后各自独立解析

先用 `split` 把外层 HTML 拆为子块，再调已有的子解析函数。

## 实现流程

1. **定义返回类型** — 在 `src/types/index.ts` 中添加接口（字段用可选 `?:`）
2. **编写解析函数** — 在 `src/api/index.ts` 中添加 `parse*` 前缀函数
3. **处理 HTML 实体** — 使用 `import { decode } from 'html-entities'`
4. **编写 API 调用函数** — `export const getXxx = async (...) => { const data = await request(...); return parseXxx(data); }`
5. **错误处理** — 对 POST 操作结果使用 `checkAlertInfo()` 检查服务端错误提示

## 常用正则模式

```typescript
/<tag>([^<]+)<\/tag>/              // 单行不含 < 的内容
/<tag>(.+?)<\/tag>/s               // 多行（s 标志匹配换行）
/<a href="([^"]+)">/               // 属性值
/[...item.matchAll(/pattern/g)]    // 全局匹配生成数组
htmlStr.split('<div class="x">')   // 拆分列表
```

## 规范

- 命名遵循 `parse*` 前缀
- 结果字段用可选类型提高健壮性
- 使用可选链 `?.` 处理匹配结果
- 函数至少三行

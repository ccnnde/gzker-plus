---
description: 过早客论坛 (guozaoke.com) 的页面结构、URL 模式和身份认证机制。API 调用和 HTML 解析所需的领域知识。
---

# 过早客论坛领域知识

## 论坛概述

过早客 (`www.guozaoke.com`) 是一个仿 V2EX 风格的社区论坛，基于 Python 的 [Project Babel](https://github.com/livid/v2ex) 二次开发。

## 页面路由结构

| 路径模式 | 页面 | Content Script 注入 |
|----------|------|-------------------|
| `/` 或 `/?p=N` | 主题列表首页 | 全部功能脚本 |
| `/t/{topicId}` 或 `/t/{topicId}?p=N` | 主题详情 + 回复 | 主题增强、编辑器 |
| `/u/{userId}` | 用户主页 | 悬浮窗 |
| `/u/{userId}/topics` | 用户主题列表 | 悬浮窗 |
| `/u/{userId}/replies` | 用户回复列表 | 悬浮窗 |
| `/notifications` | 消息通知 | 消息增强 |
| `/nodes` | 节点导航（创建主题时选择） | - |
| `/go/{node}` 或 `/node/{node}` | 节点下的主题列表 | 全部功能 |
| `/t/create/{node}` | 创建主题页面 | 编辑器增强 |
| `/t/edit/{topicId}` | 编辑主题页面 | 编辑器增强 |
| `/reply/edit/{replyId}` | 编辑回复页面 | 编辑器增强 |
| `/login` | 登录页面 | - |
| `/setting/blockedUser` | 屏蔽用户列表 | - |

## HTML 页面结构（关键）

### 主题列表页 (`/`)

```html
<div class="topic-item">           <!-- 每个主题 -->
  <a href="/t/123456">标题</a>      <!-- SELECTOR_TOPIC_LINK -->
  <span class="node">技术</span>    <!-- 节点名称 -->
</div>

<div class="hot-topics">           <!-- 热门主题区 -->
  <div class="cell">...</div>
</div>

<!-- 导航栏 -->
<div class="navbar top-navbar">    <!-- SELECTOR_TOP_NAVBAR -->
  <div class="navbar-right">       <!-- SELECTOR_NAVBAR_RIGHT -->
    <a href="/u/xxx">             <!-- SELECTOR_LOGIN_USER_LINK -->
      <img class="avatar" />
    </a>
    <a class="notification-indicator contextually-unread">
      <!-- SELECTOR_MSG_UNREAD_INDICATOR -->
    </a>
  </div>
</div>
```

### 主题详情页 (`/t/{id}`)

```html
<div class="topic-detail">
  <h3 class="title">主题标题</h3>
  <span class="node">技术</span>
  <span class="username">作者名</span>
  <span class="created-time">发布时间</span>
  <span class="last-reply-username">最后回复人</span>
  <span class="last-reply-time">最后回复时间</span>
  <div class="ui-content">内容（HTML）</div>
  <div class="ui-footer">
    <span class="up_vote fr mr10">N 人赞</span>
    <span class="favorited fr mr10">N 人收藏</span>
    <span class="hits fr mr10">N 次点击</span>
  </div>
</div>

<div class="topic-reply">          <!-- 回复区 -->
  <div class="reply-item">        <!-- 每条回复 -->
    <a href="/u/xxx">
      <img class="avatar" />
    </a>
    <span class="time">楼主 / 时间</span>
    <span class="fr floor">#N</span>
    <span class="content">回复内容</span>
  </div>
</div>

<div class="topic-reply-create">   <!-- 回复表单 -->
  <!-- 可能包含 "本帖已锁" 或 "请绑定手机号后，再发言" -->
</div>
```

### 用户主页 (`/u/{id}`)

```html
<div class="username">用户名</div>
<img class="avatar" />
过早客第{No}号成员
入住于{YYYY-MM-DD}
<a href="/u/{id}/topics">{N}</a>    <!-- 主题数 -->
<a href="/u/{id}/replies">{N}</a>   <!-- 回复数 -->
<strong>{N}</strong> 信用
```

## XSRF Token 认证

论坛使用 cookie 中的 `_xsrf` 作为 POST 请求的 CSRF 保护：

```typescript
// src/utils/index.ts
export const getXsrfToken = () => {
  return Cookies.get('_xsrf') || '';
};

// 使用示例 - 创建回复
await request(`/t/${topicId}`, {
  method: 'POST',
  body: new URLSearchParams({
    tid: topicId,
    content,
    _xsrf: getXsrfToken(),  // 必须带上
  }),
});
```

**关键点：**
- `_xsrf` 从 Cookie 中读取（`js-cookie` 库）
- 所有 POST 请求（创建/编辑主题、回复、点赞、收藏、关注）都需要
- Cookie 随 `fetch` 自动携带（同源请求）

## 服务端响应特征

### 成功/失败判断

论坛 API 没有标准的 JSON API，通过以下方式判断：

| 场景 | 检测方式 |
|------|---------|
| 未登录 | `res.redirected && res.url.includes('/login')` |
| 操作失败 | HTML 中包含 `alert alert-danger` 的 `<ul>` |
| JSON 响应 | 尝试 `JSON.parse(data)` 成功，`{ success: 0/1, message: '...' }` |
| HTML 响应 | `JSON.parse` 抛异常，直接返回 HTML 字符串 |

### 服务端错误消息

```typescript
// src/constants/res-msg.ts
export const USER_NOT_LOGIN = 'user_not_login';
export const SUCCESS_LIKE = 'thanks_for_your_vote';
export const ALREADY_LIKE = 'already_voted';
export const CAN_NOT_LIKE_YOUR_TOPIC = 'can_not_vote_your_topic';
export const CAN_NOT_LIKE_YOUR_REPLY = 'can_not_vote_your_reply';
export const CAN_NOT_FAVORITE_YOUR_TOPIC = 'can_not_favorite_your_topic';
```

这些消息在 JSON 响应中返回，通过 `getResMessage()` 映射到国际化文本。

## 特殊元素处理

### 微博 Emoji

论坛支持插入新浪微博表情，`src/assets/weibo-emojis.json` 包含表情映射数据。图片 URL 模式：
- `https://face.t.sinajs.cn/...`
- `https://img.whzxc.cn/bd/...`
- `/static/emoji/...`

**选择器例外：** `SELECTOR_NOT_EMOJI_IMG` 排除了这些表情图片，用于图片查看器。

### 用户 @ 提及

```html
<a href="/u/{uid}" class="user-mention">@用户名</a>
<!-- SELECTOR_USER_MENTION_LINK -->
```

## 论坛行为特性

1. **未登录重定向**：访问需要登录的页面时，自动重定向到 `/login`
2. **分页**：URL 参数 `?p=N`，无参数时为第 1 页
3. **回复数**：主题头部显示"共收到 N 条回复"
4. **点赞/收藏**：操作后返回 JSON，需要解析 `message` 判断结果
5. **内容编辑**：编辑页面使用 `<textarea>`，内容可能包含 HTML 实体（需 `html-entities` 解码）

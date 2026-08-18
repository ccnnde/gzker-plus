---
name: git-commit-message
description: 生成符合项目规范的 Git 提交信息。包含 emoji、type、scope 和 subject。
---

# Git 提交信息生成规范

## 书写格式

```
<emoji> <type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

| 部分    | 必填 | 说明                          |
| ------- | ---- | ----------------------------- |
| emoji   | 是   | 表示提交类型的表情符号        |
| type    | 是   | 提交类型                      |
| scope   | 否   | 影响范围                      |
| subject | 是   | 提交主题                      |
| body    | 否   | 详细描述                      |
| footer  | 否   | 关闭 issue 或 breaking change |

## Emoji 和类型对照表

| Emoji | Type     | 说明                   |
| ----- | -------- | ---------------------- |
| 🎉    | init     | 初始化项目             |
| ✨    | feat     | 新功能                 |
| 🐞    | fix      | 修复 bug               |
| 📃    | docs     | 文档更新               |
| 🌈    | style    | 代码格式调整           |
| 🦄    | refactor | 重构代码               |
| 🎈    | perf     | 性能优化               |
| 🧪    | test     | 测试相关               |
| 🔧    | build    | 构建系统或外部依赖更改 |
| 🐎    | ci       | CI 配置更改            |
| 🐳    | chore    | 其他杂项更改           |
| ↩️    | revert   | 回退提交               |

## Scope 范围（按优先级）

高优先：`views` `scripts` `components`
中优先：`api` `stores` `composables` `utils` `styles`
低优先：`types` `constants` `layout` `pages` `router` `directives` `transitions` `background` `markdown` `i18n` `assets` `deps` `eslint` `ignore` `release`

当一次提交涉及多个 scope 时，选最重要或最高优先级的 scope。

## 校验规则

- type 必须小写且在允许列表中
- subject 不能为空、不能以句号结尾
- header 最大 72 字符
- body 前必须有空行

## 示例

```
✨ feat(auth): 添加用户登录功能

实现基于 JWT 的用户认证系统，包括：
- 登录接口
- token 验证中间件
- 登出功能

Closes #123
```

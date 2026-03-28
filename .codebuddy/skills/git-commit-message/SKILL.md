---
name: git-commit-message
description: 此技能用于生成简洁、规范的 Git 提交信息。当需要编写 Git 提交信息、生成 commit message、或规范化提交历史时使用此技能。
---

# Git 提交信息生成规范

## 提交信息规则

生成 Git 提交信息时，应遵循以下规则：

1. 提交信息应简洁明了，概括主要更改内容
2. 使用祈使句形式，例如"修复错误"而不是"修复了错误"
3. 避免使用第一人称，如"我"或"我们"
4. 如果更改涉及多个方面，优先突出最重要的更改
5. header 建议简洁，不超过 72 字符，详细描述放在 body 部分
6. 确保语法正确，避免拼写错误
7. 遵循规定的书写格式，包含 emoji、type、scope 和 subject
8. 根据更改类型选择合适的 emoji 和 type

## 书写格式

```
<emoji> <type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**组成部分：**

| 部分    | 必填 | 说明                                    |
| ------- | ---- | --------------------------------------- |
| emoji   | 是   | 表示提交类型的表情符号                  |
| type    | 是   | 提交类型，如 feat, fix, docs 等         |
| scope   | 否   | 影响范围，标识涉及的模块                |
| subject | 是   | 提交主题，简洁描述本次提交              |
| body    | 否   | 提交正文，详细描述更改内容              |
| footer  | 否   | 页脚，用于关闭 issue 或 breaking change |

## 校验规则

| 规则                     | 条件                          | 说明                          |
| ------------------------ | ----------------------------- | ----------------------------- |
| type-enum                | type 必须在允许列表中         | 见下方类型对照表              |
| type-case                | type 必须小写                 | `feat` ✅ `FEAT` ❌           |
| type-empty               | type 不能为空                 |                               |
| scope-case               | scope 必须小写                | `views` ✅ `VIEWS` ❌         |
| subject-empty            | subject 不能为空              |                               |
| subject-full-stop        | subject 不能以句号结尾        | `修复问题` ✅ `修复问题。` ❌ |
| subject-exclamation-mark | subject 不能在 `:` 前使用 `!` |                               |
| header-max-length        | header 最大 72 字符           |                               |
| body-leading-blank       | body 前必须有空行             |                               |
| footer-leading-blank     | footer 前必须有空行           |                               |

## Emoji 和类型对照表

| Emoji | Type     | 说明                            |
| ----- | -------- | ------------------------------- |
| 🎉    | init     | 初始化项目                      |
| ✨    | feat     | 新功能                          |
| 🐞    | fix      | 修复 bug                        |
| 📃    | docs     | 文档更新                        |
| 🌈    | style    | 代码格式调整（不影响代码运行）  |
| 🦄    | refactor | 重构代码                        |
| 🎈    | perf     | 性能优化                        |
| 🧪    | test     | 测试相关                        |
| 🔧    | build    | 构建系统或外部依赖更改          |
| 🐎    | ci       | CI 配置文件和脚本更改           |
| 🐳    | chore    | 其他不修改 src 或测试文件的更改 |
| ↩️    | revert   | 回退提交                        |

## Scope 范围说明

| Scope       | 说明                      | 优先级 |
| ----------- | ------------------------- | ------ |
| views       | 视图/界面相关更改         | 高     |
| scripts     | 脚本/业务逻辑相关更改     | 高     |
| components  | 组件相关更改              | 高     |
| api         | API 接口相关更改          | 中     |
| stores      | 状态存储相关更改          | 中     |
| composables | 组合式函数/Hooks 相关更改 | 中     |
| utils       | 工具函数相关更改          | 中     |
| styles      | 样式文件相关更改          | 中     |
| types       | 类型定义相关更改          | 低     |
| constants   | 常量定义相关更改          | 低     |
| layout      | 布局组件相关更改          | 低     |
| pages       | 页面组件相关更改          | 低     |
| router      | 路由配置相关更改          | 低     |
| directives  | Vue 指令相关更改          | 低     |
| transitions | 过渡动画相关更改          | 低     |
| background  | 后台脚本/服务相关更改     | 低     |
| markdown    | Markdown 文档相关更改     | 低     |
| i18n        | 国际化/多语言相关更改     | 低     |
| assets      | 静态资源相关更改          | 低     |
| deps        | 依赖版本相关更改          | 低     |
| eslint      | ESLint 配置相关更改       | 低     |
| ignore      | 忽略文件配置相关更改      | 低     |
| release     | 版本发布相关更改          | 低     |

**优先级说明**：当一次提交涉及多个 scope 时，优先选择最重要的更改或者高优先级的 scope。

## Body 格式

当 body 内容较多时，建议使用列表形式：

```
1. 第一个更改点
2. 第二个更改点
3. 第三个更改点
```

## 使用示例

```
✨ feat(auth): 添加用户登录功能

实现基于 JWT 的用户认证系统，包括：
- 登录接口
- token 验证中间件
- 登出功能

Closes #123
```

```
🐞 fix(api): 修复用户数据查询错误

修复了用户列表查询时的分页计算错误

Fixes #456
```

```
🎈 perf(views): 优化论坛深色模式样式

1. 修复代码块语法高亮在深色模式下的显示问题
2. 优化 popover 组件的 loading 背景色
3. 调整主题对话框的边框样式
```

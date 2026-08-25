---
name: add-i18n
description: '在中英文 locale JSON 及其调用位置中新增、重命名或更新 gzker-plus 的 vue-i18n 消息。新增用户可见文本或选项页标题时使用。'
---

# 添加国际化

编辑前检查 `src/i18n/locales/zh.json`、`src/i18n/locales/en.json` 和调用组件。

## 规则

- 语义完全相同时复用现有 key；不要为了少加 key 而复用含义相近但不准确的文本。
- 通用消息放入现有公共分组，功能专属消息放入对应功能分组。
- key 使用 camelCase，占位符使用 `{variableName}`。
- 同一改动中同步新增、删除或重命名两个 locale 的 key，保持对象结构和占位符名称完全一致。
- 在修改的对象层级维持仓库现有的字母顺序。
- Locale JSON 中的用户可见文案直接写可读字符，不使用 `\uXXXX` Unicode 转义。
- TypeScript 中使用 `t()`，模板中使用 `$t()`；普通占位符通过参数对象传入，不使用 `I18nT` 或 `<i18n-t>`。路由标题使用 `options.{routeName}`。
- 不要翻译 API token、存储 key、选择器或其他机器可读值。

编辑后解析两个 JSON 文件，对比修改过的 key 路径，并通过 `$code-quality-check` 运行适用的格式化和 lint 检查。

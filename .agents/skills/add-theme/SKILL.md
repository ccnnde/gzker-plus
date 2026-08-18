---
name: add-theme
description: '根据用户提供的配色或参考资料，为 gzker-plus 添加完整可选的深色或浅色主题，包括主题枚举、CSS 变量、设置 UI 和双语标签。不适用于局部组件样式修复。'
---

# 添加可选主题

检查 `src/styles/themes.scss`、`src/constants/index.ts` 中的 `DarkTheme` 和 `LightTheme`、对应的基础设置组件及两个 locale。只有需要深色主题基线时才读取 [`references/element-dark-vars.css`](references/element-dark-vars.css)。

不要假设 default 主题没有选择器。当前源码包含 `html.dark[data-theme='dark-default']` 等选择器，一律以源码为准。

## 实现流程

1. 确定主题属于深色还是浅色，并生成稳定的 kebab-case 存储值。
2. 添加枚举成员，不要改变已有存储值。修改类型前先确认所选主题类型是否已由枚举推导。
3. 在 `src/styles/themes.scss` 中添加具体选择器：
   - 深色：`html.dark[data-theme='dark-{name}']`
   - 浅色：`html[data-theme='light-{name}']`
4. 只定义配色真正需要的变量和覆盖项，并保持现有顺序：功能色、阴影、背景、文字、边框、填充、遮罩、GZK 变量、组件覆盖、Markdown 覆盖。
5. 保证文字对比度以及 hover、active、disabled、overlay 和边框状态协调。色阶应从参考配色推导，不要引入无关色相。
6. 按现有 PascalCase Element Plus 组件风格增加单选项，并添加匹配的中英文标签。
7. 验证 default、已有主题和新主题之间的切换与持久化。检查代表性的对话框、输入框、按钮、Popper、空状态、主题/回复区域和 Markdown 内容。

没有主题特定原因时，不要重复定义 `--el-fill-color-blank` 等全局继承变量。完成后使用 `$code-quality-check`；具备交互式浏览器时必须进行视觉验证。

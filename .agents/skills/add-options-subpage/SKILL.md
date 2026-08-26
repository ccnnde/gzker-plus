---
name: add-options-subpage
description: '在 gzker-plus 扩展选项 SPA 中新增或修改路由子页面，包括路由元数据、Vue 或 Markdown 视图、导航显示和双语标题。不适用于只嵌入现有页面的设置项。'
---

# 添加选项子页面

先检查当前 `src/router/index.ts`、`src/constants/index.ts`、`src/layout/OptionsAside.vue` 及相邻视图。选择 Element Plus 或 UnoCSS 模式时，以现有组件、依赖和配置中的用法为准。

## 实现要求

1. 在 `OptionsRouteNames` 中添加 camelCase 值，并在 `OptionsRoutePaths` 中添加对应的 kebab-case 路径。
2. 在 `src/router/index.ts` 中添加懒加载路由，包含 `name`、`component` 和 `meta.title`。侧边栏需要图标时添加 `meta.icon`，并保留动态图标类所需的 `// @unocss-include` 标记。
3. 在 kebab-case 的 `src/views/{feature}/` 目录下创建 PascalCase Vue 视图；静态说明页可以直接路由到 Markdown 文件。
4. 遵循现有选项页布局和 Storage Store 模式。如果 `OptionsAside.vue` 仍自动遍历路由表，不要重复添加手工侧边栏配置。
5. 在两个 locale 中添加 `options.{routeName}`。
6. 确认默认重定向和现有路由顺序仍然合理。

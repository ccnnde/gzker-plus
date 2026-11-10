# Codex 仓库指南

## 仓库规范

包管理器始终使用 pnpm 11.20.0。在 Windows Codex 环境中，不依赖 PowerShell Profile 的 fnm 自动切换：

- Node 命令使用 `fnm exec --using .nvmrc node ...`。
- pnpm 命令使用 `fnm exec --using .nvmrc cmd.exe /d /c pnpm ...`，禁止直接执行 `pnpm`。

新增字面量、选择器、选项、消息类型、路由或共享类型前，先搜索现有实现。优先复用 `src/constants/index.ts`、`src/constants/selector.ts` 和 `src/types/index.ts`，避免局部重复。

### TypeScript 与代码排版

- 类型定义优先放在 `src/types/index.ts`。
- 新增函数默认使用 `const` 箭头函数；Generator 或需要动态 `this` 时使用 `function`，不要仅为统一风格改写既有声明。
- 枚举默认使用 `const enum`；需要枚举运行时对象时使用普通 `enum`。
- 函数参数和公开返回值显式标注类型；文件内局部函数的返回值能明确推导时省略，尤其不要为无返回值的局部箭头函数添加冗余的 `: void` 或 `Promise<void>`；纯类型导入使用 `import type`。
- 类型可由上下文或初始值明确推导时省略显式类型参数或类型注解，例如使用 `ref(false)`，不要写成 `ref<boolean>(false)`。
- 所有函数和控制流块都必须使用花括号，并至少展开为三行。禁止单行函数以及单行 `if`、循环或 `try`。
- 同一职责的语句连续书写，语义阶段之间必须留一行空行。即使一个阶段只有一条语句，也应分开。例如首次挂载、创建观察器、开始监听各成一段。独立的控制流块与相邻语句之间留一行空行。
- 函数调用中的多属性配置对象必须展开，每行一个属性。长参数列表按参数换行，即使格式化工具允许写在一行。
- 命名优先表达动作和核心对象，利用文件名、模块、类型及调用处已有的上下文，避免重复堆叠限定词；例如权限模块使用 `getUploadCapability`，不写 `getImageUploadPermissionCapability`。
- 缩短名称时同时检查定义处和调用处是否清楚，不使用含糊缩写；跨模块 API、消息字段及容易与其他业务流程混淆的名称应保留必要限定。
- 多层三元表达式、复杂条件、嵌套调用或连续转换应按职责拆开，使用有语义的中间变量、清晰的分支或独立函数。简单逻辑保持连贯。
- 格式化和 lint 修复后，逐段通读新增和改动代码，按本节检查空行分段、配置对象和参数换行、复杂表达式。工具通过后仍须按这些规则修正不合规的改动。

### Vue 与样式

- Vue SFC 按 `<script setup lang="ts">`、`<template>`、`<style lang="scss">` 的顺序组织，组件样式默认使用 scoped。
- Props 先定义组件内 `interface Props`，再传给 `defineProps<Props>()`；Emits 直接以内联类型参数传给 `defineEmits<{ ... }>()`，不单独定义 interface；只有 Props 需要默认值时才使用 `withDefaults`。
- Vue、Element Plus 和 Vue 内置组件使用 PascalCase；HTML 元素使用小写；模板属性和事件使用 kebab-case。
- 多行标签每行一个属性，依次放置 `ref`、Vue 指令、class/style、其他 props 和事件，`v-html` 按 ESLint 规则放在最后。`>` 或 `/>` 单独成行并与开始标签对齐，闭合标签也与开始标签对齐。没有子内容的组件使用自闭合标签。
- Vue 模板中相邻标签之间不保留无意义空行，不使用空行分隔连续的模板结构。
- 覆盖未 Teleport 的子组件时使用 `:deep()`。跨组件公共样式放在 `src/styles/`；Teleport 到组件根外的元素可使用必要的全局样式，并用组件专属类名限制作用范围。
- Scoped CSS 类必须带由组件名转换而来的 kebab-case 前缀。

## 验证与交付

代码实现任务在改动完成并趋于稳定后，必须使用 `code-quality-check` skill，执行其中规定的格式化、自动修复和最终 diff 检查。类型检查和构建默认不执行；必要时说明建议及原因，经用户确认后再运行。验收、审查或测试任务，不执行该 skill。

使用浏览器工具（如 `@Chrome`）验收时，先确认当前界面和交互目标，按实际用户路径操作并等待结果，再截图确认可见结果，若结果未出现，先核对交互命中、状态变化和等待条件，必要时用最小对照复测并检查 DOM、样式、网络和控制台。

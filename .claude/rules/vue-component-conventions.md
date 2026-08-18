---
description: Vue 3 组件编码约定。项目使用 Composition API + `<script setup>` 语法。
globs: '*.vue'
---

# Vue 组件编码约定

## 必须使用 `<script setup lang="ts">`

所有 `.vue` 文件必须使用 `<script setup lang="ts">`。

## Props 定义

使用 `defineProps` + 纯类型参数，需要默认值时结合 `withDefaults`。

```vue
<script setup lang="ts">
interface Props {
  uid: string;
  showAfter?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showAfter: 0,
});
</script>
```

## Emits 定义

使用 `defineEmits` + 类型参数。

```vue
<script setup lang="ts">
const emit = defineEmits<{
  hide: [];
  change: [value: string];
}>();
</script>
```

## 样式必须 scoped

所有组件样式使用 `<style lang="scss" scoped>`。

**例外：** 全局样式文件（如 `src/styles/` 下的 `.scss`）不需要 scoped。

**子组件样式穿透：** 始终使用 scoped，需要覆盖子组件内部样式时用 `:deep()` 穿透，不允许额外的非 scoped 块。

## 全局事件监听

`window.addEventListener` / `document.addEventListener` 必须在 `onMounted` 中注册、`onUnmounted` 中移除，避免内存泄漏。

## 组件结构顺序

Vue 单文件组件按以下顺序组织：

1. `<script setup lang="ts">` - 脚本
2. `<template>` - 模板
3. `<style lang="scss" scoped>` - 样式

`<script>` 内部顺序：导入 → Props/Emits → Store/Composables → 响应式状态 → 计算属性 → Watcher/生命周期 → 方法。

## 模板规范

| 类型              | 命名方式       | 示例                                    |
| ----------------- | -------------- | --------------------------------------- |
| Vue 组件          | **PascalCase** | `<TopicDetail>`, `<ReplyEditor>`        |
| Element Plus 组件 | **PascalCase** | `<ElDialog>`, `<ElScrollbar>`           |
| Vue 内置组件      | **PascalCase** | `<Transition>`, `<KeepAlive>`           |
| HTML 元素         | **lowercase**  | `<div>`, `<span>`                       |
| 属性/Props        | **kebab-case** | `:close-on-click-modal`                 |
| 事件监听          | **kebab-case** | `@import-history`, `@toggle-fullscreen` |
| UnoCSS 图标       | **kebab-case** | `<un-i-mdi-close>`                      |

### 属性书写顺序

多行属性时严格按以下顺序排列，每个属性独占一行：

1. `ref` — 引用
2. `v-xxx` — Vue 指令
3. `class` / `:class` / `:style` — 样式绑定
4. 其他 props — 动态 props (`:xxx`) 在前，静态 props 在后
5. `@xxx` — 事件监听

布尔 props 为 `true` 时省略值，只写属性名（如 `align-center`，不是 `:align-center="true"`）。

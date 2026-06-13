---
description: Vue 3 组件编码约定。项目使用 Composition API + `<script setup>` 语法。
globs: '*.vue'
---

# Vue 组件编码约定

## 必须使用 `<script setup lang="ts">`

所有 `.vue` 文件必须使用 `<script setup lang="ts">`。

```vue
<script setup lang="ts">
// 组件逻辑
</script>

<template>
  <!-- 模板 -->
</template>

<style lang="scss" scoped>
/* 样式 */
</style>
```

## Props 定义

使用 `defineProps` + 纯类型参数，需要默认值时结合 `withDefaults`。

```vue
<script setup lang="ts">
// ✅ 正确 - 纯类型 + withDefaults
interface Props {
  uid: string;
  showAfter?: number;
  hideAfter?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showAfter: 0,
  hideAfter: 0,
});
</script>
```

## Emits 定义

使用 `defineEmits` + 类型参数。

```vue
<script setup lang="ts">
// ✅ 正确
const emit = defineEmits<{
  hide: [];
  change: [value: string];
}>();
</script>
```

## 样式必须 scoped

所有组件样式使用 `<style lang="scss" scoped>`。

```vue
<style lang="scss" scoped>
.avatar-wrapper {
  position: absolute;
  cursor: pointer;
}
</style>
```

**例外：** 全局样式文件（如 `src/styles/` 下的 `.scss`）不需要 scoped。

## 组件结构顺序

Vue 单文件组件按以下顺序组织：

1. `<script setup lang="ts">` - 脚本
2. `<template>` - 模板
3. `<style lang="scss" scoped>` - 样式

```vue
<script setup lang="ts">
// 1. 导入
import { computed, ref } from 'vue';
import { useStorageStore } from '@/stores/storage';

// 2. Props / Emits
const props = defineProps<{ uid: string }>();
const emit = defineEmits<{ hide: [] }>();

// 3. Store / Composables
const storage = useStorageStore();

// 4. 响应式状态
const isVisible = ref(false);

// 5. 计算属性
const fullName = computed(() => {
  return `${props.firstName} ${props.lastName}`;
});

// 6. 方法
const handleClick = () => {
  isVisible.value = !isVisible.value;
};
</script>

<template>
  <div class="component" @click="handleClick">
    {{ fullName }}
  </div>
</template>

<style lang="scss" scoped>
.component {
  cursor: pointer;
}
</style>
```

## 模板规范

| 类型              | 命名方式       | 示例                                                       |
| ----------------- | -------------- | ---------------------------------------------------------- |
| Vue 组件          | **PascalCase** | `<ElementConfig>`, `<TopicDetail>`, `<ReplyEditor>`        |
| Element Plus 组件 | **PascalCase** | `<ElDialog>`, `<ElScrollbar>`, `<ElEmpty>`                 |
| Vue 内置组件      | **PascalCase** | `<Transition>`, `<KeepAlive>`                              |
| HTML 元素         | **lowercase**  | `<div>`, `<span>`, `<template>`                            |
| 属性/Props        | **kebab-case** | `:close-on-click-modal`, `:infinite-scroll-disabled`       |
| 事件监听          | **kebab-case** | `@import-history`, `@toggle-fullscreen`                    |
| UnoCSS 图标       | **kebab-case** | `<un-i-mdi-close>`, `<un-i-mdi-arrow-up-bold-box-outline>` |

```vue
<!-- ✅ 正确 - Vue 组件 PascalCase，属性 kebab-case -->
<ElementConfig>
  <ElDialog
    v-model="dialogVisible"
    :class="['topic-dialog', { 'topic-page-dialog': isTopicPage }]"
    :z-index="isTopicPage ? 1000 : 2000"
    :show-close="false"
    :before-close="handleTopicDialogBeforeClosed"
    :close-on-click-modal="!isTopicPage && closeOnClickModal"
    align-center
    @opened="handleTopicDialogOpened"
    @closed="handleTopicDialogClosed"
  >
    <template #header="{ close }">
      <div class="topic-dialog-absolute">
        <un-i-mdi-close class="topic-operate-icon" @click="close" />
      </div>
    </template>

    <TopicDetail v-if="topicDetail" v-bind="topicDetail" />
    <TopicReply v-if="showReply" :total="replyTotal" :list="replyList" />
    <ElEmpty v-if="isFirstPageEmpty" :description="$t('enhancedTopic.noReply')" />

    <LoadError
      :show-icon="isFirstPage"
      :error-text="$t('common.loadFailedAndRetry')"
      @retry="reloadPageData"
    />
  </ElDialog>
</ElementConfig>

<!-- ✅ 正确 - 少量属性可一行 -->
<ElRadio value="soft">柔和</ElRadio>
```

## Composables 使用规范

- Composable 放在 `src/composables/` 目录
- 命名以 `use` 开头
- 返回对象而非数组（便于按需解构）

```typescript
// ✅ 正确
export const useDarkMode = () => {
  const isDark = computed(() => {
    /* ... */
  });

  return {
    isDark,
  };
};
```

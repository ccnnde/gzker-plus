---
description: 🔴最高优先级 - 核心代码排版规则。AI 生成代码时必须手工遵守，Prettier/ESLint 无法自动处理。
globs: "*.ts,*.tsx,*.vue,*.js,*.jsx"
alwaysApply: true
---

# 代码排版规则

> 这些规则无法被 Prettier/ESLint 自动处理，生成代码时必须严格遵守。

## 规则 1: 函数至少三行

任何函数（包括箭头函数）不能压缩为一行或两行，即使函数体极短。

**格式要求：**
- 第一行：函数签名
- 最后一行：闭合括号
- 中间至少一行：函数体

```typescript
// ✅ 正确 - 三行
const getXsrfToken = () => {
  return Cookies.get('_xsrf') || '';
};

// ✅ 正确 - 三行（无返回值时）
const blurActiveElement = () => {
  (document.activeElement as HTMLElement | null)?.blur();
};

// ❌ 错误 - 一行
const getXsrfToken = () => Cookies.get('_xsrf') || '';

// ❌ 错误 - 两行
const getXsrfToken = () =>
  Cookies.get('_xsrf') || '';
```

## 规则 2: 控制流语句块至少三行

`if`、`for`、`while`、`try/catch` 等语句块必须使用花括号，且至少三行（即使只有一条语句）。

**格式要求：**
- 第一行：条件/控制语句
- 最后一行：闭合花括号
- 中间至少一行：语句体

```typescript
// ✅ 正确 - if
if (topicId === undefined) {
  throw new Error('Topic id is undefined');
}

// ✅ 正确 - if/else
if (isKeywordHit || topicIds.includes(topicId as string)) {
  element.style.display = 'none';
} else {
  element.style.display = '';
}

// ✅ 正确 - for 循环
for (let i = 0; i < byteCharacters.length; i++) {
  byteNumbers[i] = byteCharacters.charCodeAt(i);
}

// ✅ 正确 - try/catch
try {
  await storage.sync.set(settings);
} catch (err) {
  console.error(err);
}

// ❌ 错误 - 无花括号单行
if (topicId === undefined) throw new Error('Topic id is undefined');

// ❌ 错误 - 有花括号但两行
if (topicId === undefined) { throw new Error('Topic id is undefined'); }
```

## 规则 3: 语句块前后空行

不同逻辑的语句块之间需要空行分隔。

**需要添加空行的位置：**
- `}` 闭合花括号后，如果不是紧跟 `else`、`catch`、`finally` 或另一个 `}`，则添加空行
- `try` 和 `catch` 之间不需要空行（它们是紧密关联的）
- `if`/`else if`/`else` 之间不需要空行
- 不同职责的函数/方法之间添加空行
- 变量声明与后续逻辑之间添加空行
- `return` 语句前添加空行

**例外（不需要空行）：**
- `if` → `else if` → `else` 之间
- `try` → `catch` → `finally` 之间
- 连续的 `}` 闭合（如嵌套结构末尾）

```typescript
// ✅ 正确
const isFirstPage = computed(() => {
  return currentPage.value === 1;
});

const isFirstPageLoading = computed(() => {
  return isFirstPage.value && isLoading.value;
});

// ✅ 正确 - if/else if/else 之间不需要空行
if (mode === DarkMode.On) {
  return true;
} else if (mode === DarkMode.Off) {
  return false;
} else {
  return isSystemDark;
}

// ✅ 正确 - try/catch 之间不需要空行
try {
  const res = await fetch(GZK_URL + url, init);
} catch (err) {
  console.error(err);
}

// ✅ 正确 - 变量声明后空行
const settings = ref<StorageSettings>();

const options = computed(() => settings.value?.options);

// ✅ 正确 - return 前空行
const unreadNum = msgIndicatorEle.title.match(/你有(\d+)条未读提醒/)?.[1];

return unreadNum ? Number(unreadNum) : 0;

// ❌ 错误 - 缺少空行
const getXsrfToken = () => {
  return Cookies.get('_xsrf') || '';
};
const getTopicUrl = (topicId?: string) => {
  return `${GZK_URL}${API_TOPIC}${topicId}`;
};
```

## 规则 4: Vue 模板标签始终对齐

Vue 模板中，HTML 元素和 Vue 组件的开始标签与闭合标签必须保持在同一缩进层级。

**格式要求：**
- 单行元素：开始和闭合在同一行
- 多行元素：开始标签独占一行，子内容缩进一级，闭合标签与开始标签对齐
- 严禁将标签的 `>` 和 `</tag>` 折行到不同层级

```html
<!-- ✅ 正确 - 单行 -->
<div>{{ content }}</div>
<ElButton @click="fn">{{ $t('text') }}</ElButton>

<!-- ✅ 正确 - 多行：开始标签独占一行，闭合标签对齐 -->
<div>
  <span>{{ content }}</span>
</div>

<!-- ✅ 正确 - 属性换行：开始标签的 > 在本行末尾 -->
<ElDialog
  v-model="dialogVisible"
  title="Title"
  :before-close="handleClose"
>
  <template #header>
    <span>Header</span>
  </template>
</ElDialog>

<!-- ✅ 正确 - 自闭合组件对齐 -->
<EditorHistory
  ref="editorHistory"
  :editor-history-type="editorHistoryType"
  :markdown-theme="editorTheme"
  @import-history="$emit('importHistory', $event)"
/>

<!-- ❌ 错误 - 标签 > 换行到下一行 -->
<div
  >{{
    内容
   }}</div
>

<!-- ❌ 错误 - 闭合标签与开始标签不对齐 -->
<div>
    <span>内容</span>
  </div>

<!-- ❌ 错误 - 属性换行但 > 单独一行 -->
<ElDialog
  v-model="visible"
  title="Title"
>
</ElDialog>
```

## 规则适用范围

- `.ts` / `.tsx` 文件
- `.vue` 文件的 `<script>` 和 `<template>` 部分
- `.js` / `.jsx` 文件
- 所有需要手工编写的代码

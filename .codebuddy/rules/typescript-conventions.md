---
description: TypeScript 编码约定。ESLint 已覆盖的部分（no-explicit-any、simple-import-sort、prefer-optional-chain）不再赘述。
globs: "*.ts,*.tsx,*.vue"
---

# TypeScript 编码约定

> ESLint 已自动处理的规则不在本文档中（导入排序 → `pnpm lint:fix`、禁止 any → `no-explicit-any` 规则、可选链 → `prefer-optional-chain` 规则）。

## 枚举使用 `const enum`

项目偏好使用 `const enum` 定义枚举，编译时会被内联，减少运行时代码体积。

```typescript
// ✅ 正确
export const enum DarkMode {
  Off = 'off',
  On = 'on',
  System = 'system',
}

// ❌ 错误 - 不要使用普通 enum
export enum DarkMode {
  Off = 'off',
  On = 'on',
  System = 'system',
}
```

**例外：** 当枚举值需要作为 Record key 时，`const enum` 内联后不可索引，此时可用普通枚举。

## 函数声明风格

函数使用 `const` + 箭头函数风格，而非传统的 `function` 声明。

```typescript
// ✅ 正确
export const request = async (url: string, init?: RequestInit): Promise<string> => {
  const res = await fetch(GZK_URL + url, init);
  return data;
};

// ❌ 错误
export async function request(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(GZK_URL + url, init);
  return data;
}
```

**例外：** Generator 函数和需要 `this` 上下文的场景可使用 `function` 声明。

## 类型注解

- 函数参数和返回值必须显式标注类型
- 变量类型能推导时可以不标注
- `ref` / `computed` 需要显式泛型参数

```typescript
// ✅ 正确
const dataList = ref<T[]>([]) as Ref<T[]>;
const avatarWrapperStyle = ref(initialElementPositionAndSize);
const isDark = computed(() => { /* ... */ });
```

### 事件类型使用泛型

`MessageEvent`、`CustomEvent` 等应使用泛型指定消息结构，而非裸类型。裸类型需要手动断言，泛型自动推导，避免重复类型声明。

```typescript
// ❌ 错误 - 裸 MessageEvent
const handleMessage = (event: MessageEvent) => {
  const data = event.data as SearchResultMessage; // 需要断言
};

// ✅ 正确 - MessageEvent 泛型
const handleMessage = (event: MessageEvent<SearchResultMessage>) => {
  const data = event.data; // 类型自动推导
};
```

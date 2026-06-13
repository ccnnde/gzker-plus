---
description: TypeScript 编码约定。项目使用 TypeScript 5.0，严格模式下开发。
globs: "*.ts,*.tsx,*.vue"
---

# TypeScript 编码约定

## 禁止使用 `any` 类型

项目中禁止使用 `any` 类型。如果确实需要绕过类型检查，使用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 显式注释。

```typescript
// ✅ 正确 - 使用具体类型
const handleReplyLike = (replyItem: UserReplyItem, msg: string) => {
  replyItem.liked = true;
};

// ✅ 正确 - 使用泛型约束
export const useScrollLoad = <T>(pageSize: number, requestCallback: (page: number) => Promise<T[]>) => {
  const dataList = ref<T[]>([]) as Ref<T[]>;
};

// ❌ 错误
const handleReplyLike = (replyItem: any, msg: any) => {
  replyItem.liked = true;
};
```

## 枚举使用 `const enum`

项目偏好使用 `const enum` 定义枚举，编译时会被内联，减少运行时代码体积。

```typescript
// ✅ 正确
export const enum DarkMode {
  Off = 'off',
  On = 'on',
  System = 'system',
}

export const enum OptionsKey {
  BlankLink = 'blankLink',
  DarkMode = 'darkMode',
}

// ❌ 错误 - 不要使用普通 enum
export enum DarkMode {
  Off = 'off',
  On = 'on',
  System = 'system',
}
```

**例外：** 当枚举值需要作为 Record key 时，使用字符串字面量联合类型：

```typescript
// ✅ 正确 - Record key 场景
export const OptionsRoutePaths: Record<OptionsRouteNames, string> = {
  [OptionsRouteNames.BasicSetting]: '/basic-setting',
  [OptionsRouteNames.BlockedTopics]: '/blocked-topics',
};
```

## 函数声明风格

函数使用 `const` + 箭头函数风格，而非传统的 `function` 声明。

```typescript
// ✅ 正确
export const request = async (url: string, init?: RequestInit): Promise<string> => {
  const res = await fetch(GZK_URL + url, init);
  return data;
};

// ✅ 正确 - 单表达式
export const addUnit = (val: number, unit: string = 'px'): string => {
  return val + unit;
};

// ❌ 错误
export async function request(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(GZK_URL + url, init);
  return data;
}
```

**例外：** Generator 函数和需要 `this` 上下文的场景可使用 `function` 声明。

## 类型导入使用 `import type`

```typescript
// ✅ 正确
import type { Ref } from 'vue';
import type { Options, StorageSettings, UserReplyItem } from '@/types';
import type { Tabs } from 'webextension-polyfill';

// ✅ 正确 - 混合使用
import { computed, ref } from 'vue';
import type { LoadingOptions } from 'element-plus';
```

## 可选链和空值合并

优先使用可选链 `?.` 和空值合并 `??`。

```typescript
// ✅ 正确
const uid = htmlStr.match(/<div class="username">([^<]+)<\/div>/)?.[1];
const unreadNum = msgIndicatorEle.title.match(/你有(\d+)条未读提醒/)?.[1];
return unreadNum ? Number(unreadNum) : 0;
```

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

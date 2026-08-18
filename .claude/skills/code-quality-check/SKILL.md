---
name: code-quality-check
description: 代码生成后执行自动化质量检查。运行 Prettier 格式化、ESLint 检查和 IDE 诊断。
---

# 代码质量检查

## 检查流程

### 步骤 1: Prettier 格式化

```bash
pnpm format
```

### 步骤 2: ESLint 检查并修复

```bash
pnpm lint:fix
```

### 步骤 3: 样式检查并修复

```bash
pnpm styl-lint:fix
```

### 步骤 4: IDE 诊断检查

使用 `read_lints` 检查所有变更文件。如果发现残留错误，必须修复后再次检查，直到零诊断。

> `pnpm type-check` 仅在步骤 4 无法复现用户报告的跨文件类型问题时才需要。

## 自动修复无法处理的错误

| 工具      | 错误码                              | 说明                             | 修复方式                          |
| --------- | ----------------------------------- | -------------------------------- | --------------------------------- |
| Stylelint | `no-descending-specificity`         | 低优先级选择器放在了高优先级后面 | 重排选择器顺序                    |
| ESLint    | `no-explicit-any`                   | 使用了 `any` 类型                | 替换为具体类型或加 eslint-disable |
| ESLint    | `@typescript-eslint/no-unused-vars` | 未使用的变量                     | 移除或重命名为 `_xxx`             |
| ESLint    | `vue/no-duplicate-attributes`       | 模板中重复属性                   | 合并为 `:class` 数组              |
| TS        | `2322`                              | 类型不匹配                       | 参数类型放宽，内部 `as` 断言      |

## AI 手工检查清单

- [ ] 函数至少三行
- [ ] if/for/try 语句块使用花括号展开，至少三行
- [ ] 语句块之间有适当空行
- [ ] 使用 `const enum` 而非普通 `enum`
- [ ] 类型导入使用 `import type`
- [ ] `.vue` 文件使用 `<script setup lang="ts">`
- [ ] 样式使用 `<style lang="scss" scoped>`
- [ ] 组件 PascalCase 文件名
- [ ] 文件 kebab-case 命名
- [ ] Composable 以 `use` 开头

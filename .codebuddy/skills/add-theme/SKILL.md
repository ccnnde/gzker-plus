---
name: add-theme
description: 当用户想要添加新主题（深色或浅色）时使用此技能。提供完整的主题实现流程，包括 CSS 变量设计、类型定义和 UI 集成。
---

# 添加主题

## 概述

本技能指导如何为项目实现新主题。项目通过 CSS 变量支持多个深色和浅色主题，使用 `data-theme` 属性进行切换。default 主题无需选择器，保持向后兼容。

## 使用方式

用户会提供参考的主题样式文件（如 GitHub 主题、其他设计系统的主题 CSS），基于此生成新主题的 CSS 变量。

**参考文件**:

- `references/element-dark-vars.css` - Element Plus 暗色主题原始变量
- `src/styles/themes.scss` - 现有主题实现参考

## 主题数据结构

### 深色主题

- 存储: `OptionsKey.DarkTheme`
- 枚举: `DarkTheme` 定义于 `src/constants/index.ts`
- 选择器: `html.dark[data-theme='dark-{theme}']`

### 浅色主题

- 存储: `OptionsKey.LightTheme`
- 枚举: `LightTheme` 定义于 `src/constants/index.ts`
- 选择器: `html[data-theme='light-{theme}']`（不需要 `.light` 类）

**注意**: `default` 主题不使用选择器，继承原始样式。

## 实现流程

### 步骤 1: 定义主题枚举

在 `src/constants/index.ts` 中添加:

```typescript
// 深色主题
export const enum DarkTheme {
  Default = 'default',
  Soft = 'soft',
  // 新增: NewTheme = 'new-theme',
}

// 浅色主题
export const enum LightTheme {
  Default = 'default',
  Solarized = 'solarized',
  // 新增: Warm = 'warm',
}
```

### 步骤 2: 定义类型

在 `src/types/index.ts` 中更新类型定义。

### 步骤 3: 编写主题样式

在 `src/styles/themes.scss` 中添加主题样式。参考文件结构：

```scss
/* stylelint-disable no-descending-specificity */

// 1. 全局变量定义（所有主题共享）
html {
  --gzk-qq-group-qrcode: url('@/assets/img/qq-group-qrcode.png');
}

// 2. 通用主题属性（所有非默认主题共享）
html[data-theme] {
  --el-fill-color-blank: transparent;
}

// 3. 深色主题通用变量
html[data-theme^='dark'] {
  --gzk-node-bg-color: rgb(255 255 255 / 10%);
  --gzk-topic-hover-bg-color: rgb(255 255 255 / 5%);
  --gzk-qq-group-qrcode: url('@/assets/img/qq-group-qrcode-dark.png');
}

// 4. 浅色主题通用变量
html[data-theme^='light'] {
  --gzk-node-bg-color: rgb(0 0 0 / 10%);
  --gzk-topic-hover-bg-color: rgb(0 0 0 / 5%);
  --gzk-qq-group-qrcode: url('@/assets/img/qq-group-qrcode-light.png');
}

// 5. 特定深色主题 - 示例
tml.dark[data-theme='dark-soft'] {
  // 功能色（如需要调整）
  --el-color-info: #7d8590;
  --el-color-info-light-3: #6e7681;
  // ... 其他 info 色阶

  // 阴影
  --el-box-shadow: 0px 12px 32px 4px rgb(1 4 9 / 36%), ...;
  --el-box-shadow-light: ...;
  --el-box-shadow-lighter: ...;
  --el-box-shadow-dark: ...;

  // 背景色
  --el-bg-color-page: #0d1117;
  --el-bg-color: #212830;
  --el-bg-color-overlay: #262c36;

  // 文字色
  --el-text-color-primary: #d1d7e0;
  --el-text-color-regular: #b7bcc4;
  --el-text-color-secondary: #9198a1;
  --el-text-color-placeholder: #656c76;
  --el-text-color-disabled: #484f58;

  // 边框色
  --el-border-color-darker: #6e7681;
  --el-border-color-dark: #484f58;
  --el-border-color: #3d444d;
  --el-border-color-light: #394049;
  --el-border-color-lighter: #30363d;
  --el-border-color-extra-light: #161b22;

  // 填充色
  --el-fill-color-darker: #363b41;
  --el-fill-color-dark: #2d3238;
  --el-fill-color: #262c36;
  --el-fill-color-light: #1e2328;
  --el-fill-color-lighter: #161b22;
  --el-fill-color-extra-light: #0d1117;

  // 遮罩
  --el-mask-color: rgb(1 4 9 / 80%);
  --el-mask-color-extra-light: rgb(1 4 9 / 30%);

  // 自定义 GZK 变量
  --gzk-reply-count-bg-color: #4c5359;
  --gzk-reply-count-visited-bg-color: #757b83;

  // 组件级样式覆盖
  .el-empty {
    --el-empty-fill-color-0: var(--el-color-black);
    --el-empty-fill-color-1: #3d434d;
    // ...
  }

  // Markdown 样式覆盖
  .markdown-body,
  .cherry-markdown.theme__github,
  .topic-detail .ui-content,
  .topic-reply .ui-content {
    --color-canvas-subtle: #161b22;
  }
}

// 6. 特定浅色主题 - 示例
html[data-theme='light-solarized'] {
  // 主题色
  --el-color-primary: #b58900;
  --el-color-primary-light-3: #c9a01a;
  // ... 其他 primary 色阶
  --el-color-primary-dark-2: #8f6c00;

  // 功能色（如需要调整）
  --el-color-success: #859900;
  // ...
  --el-color-info: #839496;
  // ...

  // 阴影、背景色、文字色、边框色、填充色、遮罩（同上结构）
  // ...

  // 自定义 GZK 变量
  --gzk-reply-count-bg-color: #bcc7c9;
  --gzk-reply-count-visited-bg-color: #e2e3eb;

  // 组件级样式覆盖
  .el-empty {
    --el-empty-fill-color-0: var(--el-color-white);
    --el-empty-fill-color-1: #f4efdf;
    // ...
  }

  .el-popper {
    color: var(--el-text-color-primary);
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-light);
  }

  // Markdown 样式覆盖
  .markdown-body,
  .cherry-markdown.theme__github,
  .topic-detail .ui-content,
  .topic-reply .ui-content {
    --color-canvas-subtle: #eee8d5;
  }
}
```

### 步骤 4: 添加 UI 选项

在 `src/views/basic-setting/DarkTheme.vue` 或 `LightTheme.vue` 中添加:

```vue
<el-radio value="new-theme">{{ t('settings.darkTheme.newTheme') }}</el-radio>
```

### 步骤 5: 添加国际化

在 `src/i18n/locales/zh.json` 和 `en.json` 中添加翻译。

## CSS 变量设计流程

### 1. 获取参考样式

用户提供参考的主题样式文件（CSS/SCSS/JSON），从中提取颜色变量。

**对比基准**:

- 深色主题参考 `references/element-dark-vars.css`
- 浅色主题参考 Element Plus 默认浅色变量

### 2. 变量分类

| 类别   | Element Plus 前缀    | 说明                                  |
| ------ | -------------------- | ------------------------------------- |
| 主题色 | `--el-color-primary` | 品牌主色                              |
| 功能色 | `--el-color-{type}`  | success, warning, danger, error, info |
| 阴影   | `--el-box-shadow`    | 阴影效果                              |
| 背景色 | `--el-bg-color`      | 页面背景、组件背景、浮层背景          |
| 文字色 | `--el-text-color`    | 主要、次要、占位符、禁用状态          |
| 边框色 | `--el-border-color`  | 边框各层级                            |
| 填充色 | `--el-fill-color`    | 填充背景                              |
| 遮罩   | `--el-mask-color`    | 遮罩层                                |
| 自定义 | `--gzk-*`            | 项目特定变量                          |

### 3. 颜色映射原则

**需要根据参考主题调整的变量:**

| 变量类别     | 是否必须调整 | 说明                           |
| ------------ | ------------ | ------------------------------ |
| Primary      | 视情况       | 如参考主题有明确品牌色则调整   |
| Success      | 视情况       | 如参考主题有对应的成功色则调整 |
| Warning      | 视情况       | 如参考主题有对应的警告色则调整 |
| Danger/Error | 视情况       | 如参考主题有对应的错误色则调整 |
| Info         | 通常需要     | 通常需适配主题的次要信息色     |
| 阴影         | 通常需要     | 调整 RGBA 值适配主题基调       |
| 背景色       | 必须         | 核心变量，决定主题基调         |
| 文字色       | 必须         | 核心变量，影响可读性           |
| 边框色       | 必须         | 核心变量，影响层次感           |
| 填充色       | 必须         | 核心变量，影响交互反馈         |
| 遮罩         | 通常需要     | 调整透明度适配主题             |
| GZK 自定义   | 必须         | 根据主题调整配色               |

**无需重复定义的变量:**

- `--el-fill-color-blank: transparent` - 已在全局定义
- `--el-button-disabled-text-color` - 使用默认继承
- `--el-card-bg-color` - 引用变量会自动继承

### 4. 通用前缀选择器

使用属性选择器前缀匹配，定义通用变量：

```scss
// 匹配所有 dark 主题
html[data-theme^='dark'] {
  --gzk-node-bg-color: rgb(255 255 255 / 10%);
}

// 匹配所有 light 主题
html[data-theme^='light'] {
  --gzk-node-bg-color: rgb(0 0 0 / 10%);
}
```

### 5. 功能色映射参考

常见设计系统的功能色对应:

| Element Plus | GitHub Primer      | Solarized | 说明     |
| ------------ | ------------------ | --------- | -------- |
| Primary      | accent / blue      | yellow    | 品牌主色 |
| Success      | success / green    | green     | 成功状态 |
| Warning      | attention / yellow | yellow    | 警告状态 |
| Danger       | danger / red       | red       | 错误状态 |
| Info         | muted / gray       | base00    | 次要信息 |

### 6. 色阶生成

每个 Element Plus 颜色有 7 个变体:

```
{color}           - 基础色
{color}-light-3   - 变亮 3 级 (hover)
{color}-light-5   - 变亮 5 级
{color}-light-7   - 变亮 7 级
{color}-light-8   - 变亮 8 级
{color}-light-9   - 变亮 9 级 (背景)
{color}-dark-2    - 变暗 2 级 (active)
```

**生成方法:**

1. 从参考主题提取基础色
2. 使用颜色工具（如 VS Code Color Picker）调整明度生成色阶
3. 保持色相一致，仅调整明度和饱和度
4. 确保相邻色阶过渡平滑

### 7. 边框色层级

```
darker      → 最深（强调边框）
dark        → 深
(默认)      → 标准
light       → 浅
lighter     → 更浅
extra-light → 最浅（分割线）
```

### 8. 填充色层级

```
darker      → 最深
dark        → 深
(默认)      → 标准（hover 状态）
light       → 浅
lighter     → 更浅
extra-light → 最浅（背景）
```

### 9. 自定义 GZK 变量

项目特定的自定义变量，需要根据主题调整：

```scss
// 回复数背景色
--gzk-reply-count-bg-color: #xxx;
--gzk-reply-count-visited-bg-color: #xxx;

// 节点背景色（已在通用选择器定义）
--gzk-node-bg-color: rgb(...);

// 话题悬停背景色（已在通用选择器定义）
--gzk-topic-hover-bg-color: rgb(...);

// QQ群二维码图片（已在通用选择器定义）
--gzk-qq-group-qrcode: url('...');
```

### 10. 组件级样式覆盖

某些组件需要特定样式覆盖：

```scss
// Empty 组件 - 调整插画颜色
.el-empty {
  --el-empty-fill-color-0: var(--el-color-black); // 深色主题
  --el-empty-fill-color-0: var(--el-color-white); // 浅色主题
  --el-empty-fill-color-1: #xxx;
  // ...
}

// Popper 组件 - 统一弹窗样式
.el-popper {
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
}
```

### 11. Markdown 样式覆盖

```scss
.markdown-body,
.cherry-markdown.theme__github,
.topic-detail .ui-content,
.topic-reply .ui-content {
  --color-canvas-subtle: #xxx; // 代码块背景等
}
```

## 最佳实践

1. **保持层级清晰**: 按功能色、阴影、背景色、文字色、边框色、填充色、遮罩、自定义变量排序
2. **使用通用前缀选择器**: 对于所有主题共享的变量，使用 `[data-theme^='dark']` 或 `[data-theme^='light']`
3. **组件级覆盖**: 对于需要特殊处理的组件，在主题选择器内使用嵌套选择器
4. **注释分组**: 使用注释明确分组，便于维护
5. **参考现有实现**: 优先参考 `dark-soft` 和 `light-solarized` 的实现方式

## Resources

### references/

- `element-dark-vars.css` - Element Plus 暗色主题原始 CSS 变量

## 测试清单

- [ ] 主题切换是否生效
- [ ] 所有 Element Plus 组件样式是否正常
- [ ] 按钮状态（hover, active, disabled）
- [ ] 输入框状态（focus, disabled）
- [ ] 表格、卡片、弹窗背景
- [ ] 自定义 GZK 组件（回复数、节点标签等）
- [ ] Markdown 渲染样式
- [ ] 图片资源（如 QQ 群二维码）是否正确切换
- [ ] 主题持久化（刷新后保持）

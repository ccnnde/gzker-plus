---
name: add-theme
description: 为项目添加新的深色或浅色主题。包含 CSS 变量设计、枚举定义、UI 集成。
---

# 添加主题

## 主题数据结构

| 类型     | 存储 Key                | 枚举         | 选择器                                 |
| -------- | ----------------------- | ------------ | -------------------------------------- |
| 深色主题 | `OptionsKey.DarkTheme`  | `DarkTheme`  | `html.dark[data-theme='dark-{theme}']` |
| 浅色主题 | `OptionsKey.LightTheme` | `LightTheme` | `html[data-theme='light-{theme}']`     |

`default` 主题不使用选择器，继承原始样式。

## 实现流程

### 步骤 1: 定义主题枚举

在 `src/constants/index.ts` 的 `DarkTheme` 或 `LightTheme` 枚举中添加新值。

### 步骤 2: 更新类型

在 `src/types/index.ts` 中更新对应类型。

### 步骤 3: 编写主题样式

在 `src/styles/themes.scss` 中添加。样式结构参考：

```scss
// 1. 所有 dark/light 主题共享的通用变量
html[data-theme^='dark'] {
  --gzk-node-bg-color: rgb(255 255 255 / 10%);
}

// 2. 特定主题变量
html.dark[data-theme='dark-my-theme'] {
  // Element Plus 变量覆盖
  --el-color-primary: #xxx;
  --el-bg-color: #xxx;
  --el-text-color-primary: #xxx;
  --el-border-color: #xxx;
  --el-fill-color: #xxx;
  --el-mask-color: rgb(0 0 0 / 80%);

  // 自定义 GZK 变量
  --gzk-reply-count-bg-color: #xxx;

  // 组件级覆盖
  .el-empty {
    --el-empty-fill-color-0: #xxx;
  }
  .markdown-body {
    --color-canvas-subtle: #xxx;
  }
}
```

### 步骤 4: 添加 UI 选项

在 `DarkTheme.vue` 或 `LightTheme.vue` 中添加 `<el-radio>` 选项。

### 步骤 5: 添加国际化

同步更新 `zh.json` 和 `en.json`。

## CSS 变量体系

| 类别       | 前缀                                         | 是否必须 |
| ---------- | -------------------------------------------- | -------- |
| 背景色     | `--el-bg-color-*`                            | 必须     |
| 文字色     | `--el-text-color-*`                          | 必须     |
| 边框色     | `--el-border-color-*`                        | 必须     |
| 填充色     | `--el-fill-color-*`                          | 必须     |
| 阴影       | `--el-box-shadow-*`                          | 通常需要 |
| 主题色     | `--el-color-primary-*`                       | 视情况   |
| 功能色     | `--el-color-{success/warning/danger/info}-*` | 视情况   |
| 遮罩       | `--el-mask-color*`                           | 通常需要 |
| GZK 自定义 | `--gzk-*`                                    | 必须     |

每个颜色有 7 个色阶变体：基础色、`-light-3/5/7/8/9`、`-dark-2`。

## 测试清单

- [ ] 主题切换生效
- [ ] Element Plus 组件样式正常
- [ ] 按钮/输入框各状态
- [ ] 表格、卡片、弹窗背景
- [ ] 自定义 GZK 组件
- [ ] Markdown 渲染样式
- [ ] 主题持久化

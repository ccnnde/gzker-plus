---
name: add-i18n
description: 为项目添加国际化翻译。遵循 vue-i18n 规范，同步更新中英文 JSON 文件。
---

# 添加国际化

## 文件结构

```
src/i18n/
├── index.ts
└── locales/
    ├── zh.json
    └── en.json
```

## 翻译 key 分组

| 分组           | 用途                                             |
| -------------- | ------------------------------------------------ |
| `common`       | 通用文本（提示、错误信息）                       |
| `settings`     | 选项页设置项名称和描述                           |
| `resMessage`   | API 返回的错误消息映射                           |
| `base64Decode` | Base64 解码相关                                  |
| `navigation`   | 论坛节点名称翻译                                 |
| `options`      | 选项页路由标题（key 格式 `options.{routeName}`） |

## 使用方式

```typescript
// TypeScript 中
import { t } from '@/i18n';
t('common.plzLogin');
t('message.unread', { count: 5 });

// Vue 模板中
{
  {
    $t('settings.basicSetting');
  }
}
```

## 添加流程

1. 确定 key 所属分组（复用已有或新建）
2. 更新 `zh.json` — 按字母升序插入
3. 更新 `en.json` — 结构完全一致
4. 在代码中使用

## 规则

- key 使用 camelCase
- JSON 最后一条不加逗号
- 中英文 key 结构完全一致
- 参数占位符使用 `{variableName}` 格式
- 新增 key 按字母升序插入，不要追加末尾
- 新分组也按字母升序插入顶级 key 中

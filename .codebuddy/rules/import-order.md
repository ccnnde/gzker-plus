---
description: 导入语句排序规则。ESLint 插件可自动修复，但 AI 生成代码应遵循此顺序。
globs: "*.ts,*.tsx,*.vue,*.js,*.jsx"
---

# 导入语句排序

## 分级排序规则

导入语句按以下 6 级顺序排列，每级之间用空行分隔：

```
1. Vue 核心库
2. 第三方库（npm 包）
3. @/ 别名导入（项目内部模块）
4. 相对路径导入（./ ../）
5. import type 类型导入
6. 样式文件导入
```

## 完整示例

```typescript
// 1. Vue 核心
import { computed, onMounted, ref } from 'vue';

// 2. 第三方库
import { decode } from 'html-entities';
import Cookies from 'js-cookie';
import { usePreferredDark } from '@vueuse/core';

// 3. @/ 别名导入
import { t } from '@/i18n';
import { useStorageStore } from '@/stores/storage';
import { API_USER, OptionsKey } from '@/constants';
import { createScriptApp, getStorage, setStorage } from '@/utils';
import { getUserInfo } from '@/api';

// 4. 相对路径导入
import { getKeywordList, handleBlockKeyword } from './block-keyword';
import { createHeaderApp } from './header';
import { createTopicApp } from './topic';

// 5. 类型导入
import type { Ref } from 'vue';
import type { StorageSettings, UserReplyItem } from '@/types';
import type { Tabs } from 'webextension-polyfill';

// 6. 样式文件
import 'virtual:uno.css';
import 'element-plus/es/components/message/style/css';
```

## 同级别内排序

同级别导入按以下规则排序：
- 按导入路径字母顺序排列
- 命名导入在前，默认导入在后
- 解构导入按成员名字母顺序排列

```typescript
// ✅ 正确 - 字母顺序
import { createApp } from 'vue';
import { ElLoading, ElMessage } from 'element-plus';
import { cloneDeep, debounce, merge } from 'lodash-es';
import { commands, contextMenus, runtime, tabs } from 'webextension-polyfill';

// ✅ 正确 - 命名导入在前，默认导入在后
import { computed, ref, watch } from 'vue';
import { ElLoading } from 'element-plus';
import Cookies from 'js-cookie';
import { cloneDeep, merge } from 'lodash-es';
```

## 自动修复

```bash
# ESLint 可以自动修复导入排序，生成代码后执行：
pnpm lint:fix
```

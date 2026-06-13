---
description: 项目关键设计决策记录。解释为什么会选择某些技术方案。
---

# 设计决策记录

## 1. 为什么用正则解析 HTML，而不是 DOM 解析器？

**决策：** 使用正则表达式直接解析 `fetch` 返回的 HTML 字符串。

**原因：**
- 论坛返回的 HTML 结构极为稳定（基于 Project Babel，多年未变）
- 正则解析比 DOM 解析更轻量，不需要 `DOMParser`
- 页面中已有完整 DOM，再创建 DOM 解析器会产生额外开销
- API 返回的数据不需要完整的 DOM 树，只需要提取关键字段

**权衡：**
- ✅ 性能好，代码简洁
- ❌ HTML 结构一旦变化需要更新正则
- ❌ 不适合解析深层嵌套结构

## 2. 为什么每个功能都注入独立的 Vue App？

**决策：** 不同功能使用 `createScriptApp()` 创建独立的 Vue 应用，而非单一 App 挂载。

**原因：**
- 独立 App 拥有独立的运行时上下文，不会相互影响
- 功能可以按条件启用（检查 `options[OptionsKey.xxx].checked`）
- 某个功能出错不会导致整个扩展崩溃
- 更容易按需加载，减少冷启动时间

**形式：** 
```typescript
createScriptApp({
  root: HeaderComponent,       // 不同的根组件
  pinia,                        // 共享同一个 Pinia 实例
  containerId: 'gzk-xxx-app',  // 独立的挂载点
  containerParentNode: document.querySelector('.xxx'),
});
```

所有 App 共享同一个 **Pinia 实例** 和 **i18n 实例**，通过 `createPinia()` 在入口统一创建。

## 3. 为什么使用 `browser.storage.sync`？

**决策：** 使用 `browser.storage.sync` 而非 `localStorage` 或 IndexedDB。

**原因：**
- **跨设备同步**：用户设置可以跨 Chrome 实例同步（Chrome sync 内置能力）
- **Content Script 兼容**：Content Script 无法访问页面的 `localStorage`（隔离环境），但可以访问 `browser.storage`
- **跨标签页同步**：`storage.sync.onChanged` 可以在用户修改选项页面后实时同步到所有论坛标签页

**权衡：**
- ✅ 跨设备、跨标签页数据一致性
- ❌ 存储空间有限（约 100KB）
- ❌ 写入频率受限（每秒约 2 次）

**当前存储数据：** 选项配置、屏蔽主题列表、国际化语言 - 均在限制内。

## 4. 为什么通过 Bilibili 代理上传图片？

**决策：** 图片上传经过 Background Script 代理，而非直接在 Content Script 中调用 API。

**原因：**
- **CORS 限制**：Content Script 无法跨域请求 SM.MS 或 Bilibili API
- **Cookie 认证**：Bilibili 上传需要用户登录态（Cookie），只能在浏览器原生页面中使用
- **标准做法**：浏览器扩展的 API 请求应在 Background Script 中进行

**实现方式：**
- SM.MS：Background 直接 `fetch` 调用（仅需 API Key header）
- Bilibili：Background 创建隐藏标签页 `bilibili.com/gzk-img-upload`，在该页面中执行 `upload-bili-img.ts` 脚本（利用 Bilibili 的 Cookie），再通过 `tabs.sendMessage` 回传结果

## 5. 为什么使用防抖（debounce）的 storage 同步？

**决策：** `storage.sync.onChanged` 的回调使用 `debounce(300ms, maxWait: 1000ms)`。

**原因：**
- 用户在选项页面快速修改多个设置时，避免频繁的 storage 写入
- 300ms 延迟对用户体验几乎无感知
- `maxWait: 1000ms` 确保最终一定会同步

## 6. 为什么编辑器历史记录用 `localforage` 而不是 `browser.storage`？

**决策：** 编辑器历史记录（`src/utils/edit-history.ts`）使用 `localforage`（IndexedDB）。

**原因：**
- 历史记录数据量可能较大（多篇长文），超出 `storage.sync` 限制
- 历史记录不需要跨设备同步（本地行为）
- `localforage` 是 Content Script 可以使用的异步存储方案

## 7. 为什么使用 `const enum` 而非普通 `enum`？

**决策：** 所有枚举使用 `const enum`。

**原因：**
- `const enum` 编译时内联为字面量，不产生运行时代码
- 减小打包体积（浏览器扩展对体积敏感）
- 与 TypeScript 严格的 `isolatedModules` 兼容（Vite 环境）

## 8. 为什么 `set-appearance.ts` 单独拆分且 `run_at: document_start`？

**决策：** 深色模式的外观设置脚本独立拆分，且在页面渲染前运行。

**原因：**
- 避免深色模式切换时的白屏闪烁（FOUC）
- `document_start` 确保在页面 CSS 加载前就设置 `data-theme` 属性
- 其他功能脚本不需要提前运行，使用默认的 `document_idle`

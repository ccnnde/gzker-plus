---
name: add-html-parser
description: '为 gzker-plus 新增或修改从 guozaoke.com HTML 提取结构化数据的解析器，包括结果类型和 API 调用。适用于现有正则与 split 解析架构，不适用于 Content Script 中的一般 DOM 操作。'
---

# 添加论坛 HTML 解析器

先检查当前 `src/api/index.ts`、`src/types/index.ts` 及相邻解析器，以现有请求、错误处理和解析方式为基线。

## 实现流程

1. 为目标数据确定最小且稳定的 HTML 边界，优先使用相邻解析器已经采用的语义锚点。
2. 在 `src/types/index.ts` 中新增或复用结果类型。只有源 HTML 确实可能缺失字段时才将其设为可选，不要默认把所有字段都标记为可选。
3. 遵循本地解析方式：标量使用聚焦的正则，重复块使用 `split` 加 `map`，嵌套结构使用小型辅助函数。
4. 论坛对属性或 textarea 内容编码时使用 HTML entity 解码；只有消费者明确需要渲染 HTML 时才保留原始标记。
5. 所有修改状态的论坛请求都必须携带当前 `_xsrf` token。
6. 新增或更新导出的 API 函数，并追踪所有消费者，确保数据契约一致。

除非用户明确要求更改设计，或当前 HTML 无法通过现有模式可靠解析，否则不要把仓库的解析架构替换为 `DOMParser` 或新增解析依赖。

存在 fixture 或可复现样本时，用具有代表性的当前 HTML 验证。否则应明确说明没有实际验证线上标记兼容性。

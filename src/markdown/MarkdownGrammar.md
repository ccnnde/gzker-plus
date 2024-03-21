Markdown 语法

> Markdown是一种轻量级标记语言，使用易读易写的纯文本格式，用来简化写作和格式化文档的过程。其语法很简单，就是普通文字加上一些符号即可，比如使用 `#` 表示标题，使用 `*` 表示强调等

### 标题

#### 示例

```markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

#### 效果

# 一级标题

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题

### 文本样式

#### 示例

```markdown
**加粗** *斜体* ~~删除线~~
```

#### 效果

**加粗** *斜体* ~~删除线~~

### 引用

#### 示例

```markdown
> 引用内容
```

#### 效果

> 引用内容

### 有序列表

#### 示例

```markdown
1. Item 1
   1. Item 1.1
2. Item 2
3. Item 3
```

#### 效果

1. Item 1
   1. Item 1.1
2. Item 2
3. Item 3

### 无序列表

#### 示例

```markdown
- Item 1
  - Item 1.1
- Item 2
- Item 3
```

#### 效果

- Item 1
  - Item 1.1
- Item 2
- Item 3

### 任务列表

#### 示例

```markdown
- [x] Item 1
  - [x] Item 1.1
- [x] Item 2
- [ ] Item 3
```

#### 效果

- [x] Item 1
  - [x] Item 1.1
- [x] Item 2
- [ ] Item 3

> [!TIP]
> 在预览区域，点击复选框可以勾选或取消勾选，点击内容可以编辑（有序和无序列表也支持编辑）

### 表格

#### 示例

```markdown
| 姓名 | 年龄 | 性别 |
| ---- | ---- | ---- |
| 小明 | 25   | 男   |
| 小红 | 23   | 女   |
```

#### 效果

| 姓名 | 年龄 | 性别 |
| ---- | ---- | ---- |
| 小明 | 25   | 男   |
| 小红 | 23   | 女   |

> [!TIP]
> 在预览区域，点击表格的 + 号可以增加行或列，点击单元格可以编辑内容

### 分隔线

#### 示例

```markdown
---
```

#### 效果

---

### 图片

#### 示例

```markdown
![图片描述](图片链接)
![doge](https://face.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_doge02_org.png)
```

#### 效果

![doge](https://face.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_doge02_org.png)

> [!TIP]
> 也可以直接插入图片链接，编辑器会自动渲染为图片

### 链接

#### 示例

```markdown
[链接文字](链接地址)
[百度](https://wwww.baidu.com)
```

#### 效果

[链接文字](链接地址)

[百度](https://wwww.baidu.com)

> [!TIP]
> 也可以直接插入链接地址，编辑器会自动渲染为链接

### 行内代码

#### 示例

```markdown
这是 `inline code`
```

#### 效果

这是 `inline code`

### 代码块

#### 示例

<pre><code class="language-markdown">```javascript
const greeting = 'Hello, world!';
console.log(greeting);
```</code></pre>

#### 效果

```javascript
const greeting = 'Hello, world!';
console.log(greeting);
```

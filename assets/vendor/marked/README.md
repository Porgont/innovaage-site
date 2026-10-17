# marked（Markdown → HTML）

公告正文用 Markdown 写，这里把 Markdown 转成 HTML。

- 包名：`marked`
- 版本：18.1.1
- 来源：https://www.npmjs.com/package/marked （GitHub: https://github.com/markedjs/marked ）
- 作者：Christopher Jeffrey 及贡献者
- 许可证：MIT，全文见同目录 LICENSE.txt
- 文件：`marked.umd.js`，取自包内 `lib/marked.umd.js`，**未做任何修改**

## 用法

以普通 `<script>` 引入，全局变量名 `marked`：

```js
marked.parse('## 标题\n\n正文')
```

输出的是 HTML 字符串，**必须再交给 DOMPurify 过滤**才不会被执行注入的脚本。

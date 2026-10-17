# docx（生成 .docx）

「格式转换」里 PDF 转 Word 用它把提取出来的文字写成 Word 文档。

- 包名：`docx`
- 版本：9.5.1
- 来源：https://www.npmjs.com/package/docx （GitHub: https://github.com/dolanmiu/docx ）
- 作者：Dolan 及贡献者
- 许可证：MIT，全文见同目录 LICENSE.txt
- 文件：`docx.iife.js`，取自包内 `dist/index.iife.js`，**未做任何修改**

## 加载方式

以普通 `<script>` 形式按需注入，全局变量名是 `docx`：

```js
const { Document, Packer, Paragraph, TextRun } = docx;
```

MIT 许可证要求保留版权声明，`LICENSE.txt` 就是这个用途，别删。

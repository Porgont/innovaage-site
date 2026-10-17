# pdf.js（PDF 文字提取）

「格式转换」里的 PDF 转 Word 靠它读出 PDF 里的文字。

- 包名：`pdfjs-dist`
- 版本：6.4.299
- 来源：https://www.npmjs.com/package/pdfjs-dist （GitHub: https://github.com/mozilla/pdf.js ）
- 作者：Mozilla 及贡献者
- 许可证：Apache-2.0，全文见同目录 LICENSE.txt
- 文件：`pdf.min.mjs`、`pdf.worker.min.mjs`，取自包内 `build/`，**未做任何修改**

## 加载方式

只在用户真的选了 PDF 文件时，才用动态 `import()` 拉这两个文件（约 1.7 MB），
不影响其它页面的加载速度。worker 路径在 `assets/js/pdf-tool.js` 里设置。

## 注意

提取的是 PDF 里的**文字**。扫描件、图片里的字提不出来 —— 这类需要 OCR。

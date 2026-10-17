# DOMPurify（HTML 消毒）

把 marked 转出来的 HTML 洗一遍，去掉 `<script>`、`onclick=` 这类危险内容。
站长自己能写公告，但只要有人往正文里粘了奇怪的东西，没有这层过滤就会被执行。

- 包名：`dompurify`
- 版本：3.4.17
- 来源：https://www.npmjs.com/package/dompurify （GitHub: https://github.com/cure53/DOMPurify ）
- 作者：Cure53
- 许可证：双许可 Apache-2.0 或 MPL-2.0，两份全文见同目录 LICENSE.txt 与 LICENSE-MPL.txt
- 文件：`purify.min.js`，取自包内 `dist/purify.min.js`，**未做任何修改**

## 用法

```js
DOMPurify.sanitize(html)
```

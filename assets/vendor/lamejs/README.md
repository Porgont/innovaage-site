# lamejs（MP3 编码器）

浏览器只内置 MP3 **解码器**，没有编码器。格式转换工具的「输出 MP3」靠这个库完成。

- 包名：`@breezystack/lamejs`
- 版本：1.2.7
- 来源：https://www.npmjs.com/package/@breezystack/lamejs （上游 https://github.com/zhuker/lamejs ，基于 LAME）
- 作者：Alex Zhukov 等，基于 LAME（http://lame.sourceforge.net/）
- 许可证：LGPL-3.0，全文见同目录 LICENSE.txt
- 文件：`lamejs.iife.js`，取自包的 `dist/lamejs.iife.js`，**未做任何修改**

## 为什么自托管

网站不使用任何外部 CDN，所有脚本都放在仓库里（`tools/verify-structure.mjs` 有断言守着）。

## LGPL 的注意点

LGPL 要求使用者能把库替换成自己的版本。这里按原样、独立文件、未压缩合并地提供，
页面通过 `<script src="assets/vendor/lamejs/lamejs.iife.js">` 单独加载，
任何人可以自行替换这个文件 —— 满足要求。

修改这个文件的话，需要把改动以 LGPL 发布回上游。

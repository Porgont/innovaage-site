# 站内字体：HarmonyOS Sans SC

页面正文和标题都用这一个字体。

| 项 | 内容 |
|---|---|
| 字体名 | HarmonyOS Sans SC（鸿蒙字体） |
| 版本 | 2.040 |
| 版权方 | Copyright 2021-2024 Huawei Device Co., Ltd. All Rights Reserved. |
| 厂商 | Hanyi Fonts（汉仪） |
| 文件 | `harmonyos-sans-sc.woff2` |
| 形态 | **可变字体**，`wght` 轴 40–900，一个文件覆盖全站所有字重 |

## 这个文件和原版有什么不同

原版是 19.7 MB 的完整中文字库（近 3 万个字形）。网站用不到那么多字，所以做了**子集化**：
只保留站内页面真正出现的字符（约 1100 个，其中汉字约 990 个），压成 woff2。

- 字符表由 `tools/subset-font.mjs` 自动从全部 HTML 和 JS 里扫出来
- 输出体积约 372 KB
- `name` 表完整保留，版权声明和字体名都还在，没有改名

## 什么时候要重新生成

页面文案里出现**以前没出现过的字**时，那几个字会回退成系统字体，肉眼能看出来粗细和字形不一致。

发了新公告、加了作品、改了固定文案之后，跑一次：

```bash
node tools/subset-font.mjs
```

依赖：本机装有 `python`（含 `fonttools`、`brotli`），并且系统里安装了 HarmonyOS Sans SC。

## 许可

字体的使用条款以华为官方公布的《HarmonyOS Sans 字体许可协议》为准，官方字体页：
<https://developer.harmonyos.com/cn/docs/design/des-guides/font-0000001157868583>

字体文件本身没有内嵌许可说明（`name` 表的 ID 13 / 14 是空的），仓库里也没有附带协议原文。
如果之后的条款要求以特定方式声明或限制分发，以官方原文为准，本文件不能替代它。

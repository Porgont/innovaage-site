# 创想时代开发组 · 官网

这是 **Innova Age Development Team** 的官方网站源码。纯静态站点：HTML + CSS + 原生 JavaScript，
**没有框架、没有构建步骤**。改完文件直接推送到 GitHub，网站就会自动更新。

- 线上地址：**http://innovaage.cn/** （注意：目前是 `http://`，证书还没签下来，见[第八节](#八已完成的配置备查)）
- 代码仓库：https://github.com/Porgont/innovaage-site
- 备用地址：https://porgont.github.io/innovaage-site/

> 这份文档是写给**所有参与维护的人**看的，不只是给某一个人。
> 如果你是第一次接手，从[第二节](#二30-秒上手)开始就行。

---

## 一、这个站有什么

| 页面 | 文件 | 内容 |
|---|---|---|
| 首页 | `index.html` | 团队简介、作品展示、开放代投、最新公告、加入入口 |
| 关于我们 | `about.html` | 团队沿革、核心管理局名单、平台与官方账号、我们做什么、怎么做 |
| 作品 | `works.html` | 作品列表，一个作品一条 |
| 作品详情 | `work.html?id=xxx` | 单个作品的介绍、截图、信息栏（数据驱动，见 4.2） |
| 工具箱 | `tools.html` | 工具入口页，三张卡片 |
| ├ 图片处理 | `tools-image.html` | 把图片压到指定分辨率以内；也可选「无限制」只转换格式 |
| ├ 视频处理 | `tools-video.html` | 视频诊断 + 转投稿规格 / 自定义规格 |
| └ matoga | `tools-matoga.html` | 组员作品：材质贴图对比工具（桌面应用） |
| 公告 | `news.html` | 全部公告 + 分类筛选 |
| 加入我们 | `join.html` | 四个标签页：报名加入 / 代投与投稿 / 联系我们 / 审核条例 |
| 404 | `404.html` | 自定义错误页 |

设计风格是「终末地」那一套：白底、细灰线、近乎直角的 2px 圆角、黑色实心按钮、亮黄 `#f5c518` 作标记色。

---

## 二、30 秒上手

### 1. 看本地效果

```bash
node tools/serve.mjs 8099
```

浏览器打开 http://localhost:8099 。
这个本地服务器会像 GitHub Pages 一样处理 404，所以能真实反映线上行为。

### 2. 改内容

95% 的日常改动只涉及两个文件：

- **`assets/js/site.js`** —— 群号、联系方式、公告、作品数据、问卷链接
- **对应的 `.html`** —— 正文文案和结构

具体怎么改，看[第四节](#四常见任务)的对应条目。

### 3. 自检（养成习惯，别跳过）

```bash
node tools/check.mjs          # 结构与链接检查，几秒出结果
node tools/browser-test.mjs   # 真浏览器跑行为测试（需先起 serve.mjs）
```

两个都显示「全部通过 / 0 项失败」再提交。

### 4. 发布

```bash
git add .
git commit -m "一句话说明改了什么"
git push
```

推完等 1～2 分钟自动生效。

---

## 三、文件地图

```
innovaage-site/
├── *.html                    8 个页面（见第一节的表）
├── CNAME                     自定义域名，内容必须是 innovaage.cn（别删！）
├── .nojekyll                 让 Pages 跳过 Jekyll 处理
├── robots.txt / sitemap.xml   搜索引擎相关；加了新页面记得往 sitemap 里补一条
├── assets/
│   ├── css/theme.css         ★ 所有颜色变量（浅色 / 深色两套）
│   ├── css/style.css         所有组件样式
│   ├── img/                  图片（命名规范见该目录的 README.md）
│   ├── js/site.js            ★ 站点配置、公告、作品数据
│   ├── js/toolbox.js         图片处理工具逻辑
│   ├── js/video-tool.js      视频处理工具逻辑
│   └── vendor/               第三方库（mp4box.js，用于读视频编码，已自托管）
└── tools/                    本地脚本，不会发布到网站
    ├── serve.mjs             本地预览服务器
    ├── check.mjs             结构自检
    ├── browser-test.mjs      浏览器行为自检（页面）
    ├── verify-structure.mjs  页面结构守卫（页眉/侧栏/分区完整性）
    ├── test-video.mjs        视频工具自检（单独跑，原因见文件里注释）
    ├── test-video-repeat.mjs 视频连续转换自检（再单独跑一个浏览器）
    ├── add-mobile-drawer.mjs 给所有页面注入手机端侧栏
    └── fixtures/             自检用的测试视频
```

> 工具箱那四个页面是一次性生成后**手工维护**的，没有生成脚本。
> 要改文案或结构直接改 `.html`；只有「手机侧栏」这类跨页一致的部分才用 `add-mobile-drawer.mjs` 统一注入。

---

## 四、常见任务

### 4.1 发一条公告

编辑 `assets/js/site.js` 里的 `ANNOUNCEMENTS` 数组，在最前面加一段：

```js
{
  date: '2026-03-01',
  title: '公告标题',
  color: 'green',            // green / gold / diamond / redstone，只影响左边色条
  pin: true,                 // 可选，置顶
  tags: ['版本发布'],         // 影响公告页的筛选按钮
  body: '<p>正文可以写 HTML：<b>加粗</b>、<a href="...">链接</a>、列表都行。</p>'
}
```

### 4.2 加一个作品详情页

作品详情是**数据驱动**的。加一件新作品分两步：

**第一步**，在 `assets/js/site.js` 的 `WORKS` 里加一项（复制现有的改内容）：

```js
'你的编号': {                    // 英文小写 + 短横线，会出现在网址里
  name: '作品名',
  author: '作者',
  type: '光影 / Shader',
  tagline: '一句话定位',
  cover: 'assets/img/xxx.jpg',   // 详情页头图
  coverAlt: '头图的文字说明',     // 给屏幕阅读器和搜索引擎看
  facts: [                       // 信息栏，条数随意
    { k: '作品名', v: '...' }
  ],
  intro: [                       // 正文，一段一个字符串
    '第一段…'
  ],
  shots: [                       // 截图，想放几张放几张
    { img: 'assets/img/xxx-1.jpg', caption: '这张展示了什么' }
  ],
  notice: '使用须知，可选',
  thanks: [                      // 可选，鸣谢
    { k: '开发作者', v: '...' }
  ]
}
```

**第二步**，在 `SHOWCASE` 里把对应那条的 `id` 填成同一个编号，作品页那张卡片才会出现「查看详情 →」。

> ⚠️ **一个作品只能占 `SHOWCASE` 的一条。**
> 同一作品的多张截图请放进 `WORKS` 里那一项的 `shots`，不要在 `SHOWCASE` 里重复列出 ——
> 否则列表页会把同一个作品显示成好几个。自检里有断言盯着这一点。

> ⚠️ `work.html` 里有 `id="work-detail"` 这个「门闩」。JS 找不到它会**整个跳过渲染**，
> 页面只剩静态兜底、截图放大也会失效。改结构时别删它，自检里有断言守着。

### 4.3 改联系方式 / 群号

只改 `assets/js/site.js` 顶部的 `SITE_CONFIG`，全站（页脚、联系页、关于我们）一起生效。

```js
var SITE_CONFIG = {
  surveyUrl: 'https://www.wjx.cn/vm/xxxx.aspx',  // 报名问卷（问卷星）
  qqAudit:   '1045216325',   // 对外审核群
  qqPublic:  '788233856',    // 对外交流群
  qqCouncil: '1018260006',   // 开发理事会（对外代投）

  neteaseMc:    '创想时代开发组',   // 网易我的世界
  neteaseHd:    '创想时代工作室',   // 网易大神
  douyin:       '创想时代开发组',   // 抖音
  bilibiliName: '创想时代开发组',   // B 站显示名
  bilibili:     'https://space.bilibili.com/488348167',  // B 站主页

  email: '',      // 留空 = 自动隐藏这一行
  discord: '',    // 留空 = 自动隐藏这一行
  ...
};
```

**留空的联系方式会自动隐藏整行**，不会留下空行或「待填写」占位。

页面上用的是 `data-fill` / `data-fill-href` 两个属性做占位：

- `data-fill="键名"` → 这个元素的**显示文字**取 `SITE_CONFIG[键名]`
- `data-fill-href="键名"` → 这个元素的**跳转链接**取 `SITE_CONFIG[键名]`

两者可以指向不同的键。例如 B 站那行：文字用 `bilibiliName`（账号名），链接用 `bilibili`（主页地址）。

### 4.4 加图片

图片放 `assets/img/`，然后按 4.2 或 4.3 引用。

**图片规范**（请不要破坏，直接影响加载速度）：

- 文件名英文小写 + 短横线，例如 `shader-rain.jpg`
- **单张压到 500KB 以内**
- 横构图建议 16:9 或 3:2
- 详细要求见 `assets/img/README.md`

MC 截图常常有 2–5MB，需要先压缩。压图可以：用站内的[图片处理工具](http://innovaage.cn/tools-image.html)，
或 `node tools/process-shader-images.mjs`。

> 图片工具的预设里有个 **「无限制」**：选了它就不动像素尺寸，只按「输出格式」重新编码
> （比如 PNG → JPG 压体积）。要单纯转格式、不改分辨率时用这一档。

### 4.5 换首页大图

改 `SITE_CONFIG` 里这两行：

```js
heroImage: 'assets/img/你的图.jpg',
heroImageAlt: '图片内容描述'
```

**留空 `heroImage` 则首页大图整块自动隐藏**，布局自动变成单列，不会留下空框。

### 4.6 加一个新工具

工具箱现在是「入口页 + 每工具一页」的结构：

1. 复制 `tools-image.html` 另存为 `tools-new.html`
2. 改标题、描述、`<main>` 里的工具本体
3. 新工具的逻辑单独放 `assets/js/your-tool.js`，在页面底部引入
4. 在 `tools.html` 的 `.module-grid` 里加一张卡片指过去

### 4.7 改配色

全部颜色在 `assets/css/theme.css`，分四段，优先级从低到高：

```css
:root { }                                 /* 1. 默认：浅色 */
@media (prefers-color-scheme: dark) { }   /* 2. 系统偏好深色时 */
html[data-theme="light"] { }              /* 3. 访客手动选浅色 */
html[data-theme="dark"]  { }              /* 4. 访客手动选深色 */
```

改强调色只动第 1 段的 `--gold`，另外三段同步一下。

> ⚠️ **新增主题变量时四段都要加**，否则某种模式下会是空值。
> `node tools/check.mjs` 会自动比对并报错，不用自己数。

---

## 五、内容规矩

这几条是踩过坑总结出来的，请一起守着：

1. **不要编内容。** 不确定的作者名、版本号、下载链接、授权条款，宁可不写或标「待补充」，
   也不要写一个看起来合理但实际是错的。之前确实发生过写错授权口径的事。
2. **作品图必须真能加载。** 曾经用 `loading="lazy"` 导致首屏外的图全是空白块，
   现在已去掉，并且自检里有断言检查每张图的 `naturalWidth > 0`。
3. **一个作品只占一条**（见 4.2）。
4. **投稿要求写死的地方不要随手改。** 视频工具里「符合投稿规范」这一档是
   1280×720 / 16:9 / H.264 / ≤90 秒，这是投稿方的要求，代码里是锁定状态。
5. **第三方作品要署名。** 例如 matoga 的作者是芝世，页面和 README 里都写了来源。
6. **站内不要放本站源码的链接。** 不要把仓库地址写进任何页面、页脚或 `SITE_CONFIG`，
  这属于内容规矩而不是个人偏好。`tools/verify-structure.mjs` 里有守卫会拦下来。
  注意：matoga 页里指向芝世那个项目的 GitHub 链接是**别人的开源库**，要保留（MIT 要求署名与来源）。

---

## 六、自检与发布

### 自检脚本

```bash
node tools/check.mjs             # 文件、链接、id、语法、CSS 括号、主题变量完整性
node tools/verify-structure.mjs  # 页眉、手机侧栏、各分区是否完整
node tools/browser-test.mjs      # 浏览器行为（需先起 serve.mjs）
node tools/test-video.mjs        # 视频工具主流程（需先起 serve.mjs）
node tools/test-video-repeat.mjs # 视频工具连续转换（各起一个独立浏览器）
```

这几个脚本**不需要 npm 依赖**，装了 Node 就能跑。

> 如果改了群号、问卷链接或作品数量，记得同步改测试里的断言，
> 否则会出现「测试失败但页面其实是对的」。

> **为什么要拆成三个浏览器测试**：视频录制会占用浏览器的媒体管线，
> 而且额度是按**浏览器进程**算的 —— 一个进程里大约连续录 3 次之后，
> `MediaRecorder` 会启动但产不出任何数据（无头 + 纯软件编码下尤其明显）。
> 所以要拆开：`browser-test.mjs` 只查页面不录像，
> `test-video.mjs` 在一个新浏览器里只录 1 次，
> `test-video-repeat.mjs` 在另一个新浏览器里录 2 次验证连续转换。
> 混在一起跑会把「环境还剩多少额度」误判成工具故障。

页面上如果真的遇到这个额度用尽，工具会明确提示**按 F5 刷新页面**，
不是死路。

### 发布

```bash
git add .
git commit -m "说明改了什么"
git push
```

---

## 七、多人协作约定

这个仓库会有多位高管一起改，为了避免互相踩：

1. **改之前先 `git pull`。** 直接改本地旧版本再推，会覆盖别人的改动。
2. **一次提交只做一件事。** 「加了一条公告」和「顺手改了样式」分开提交，
   出问题时好回滚。
3. **改完先跑自检再推。** 推上去之后线上是坏的，所有人都看得见。
4. **别动 `CNAME` 和 `.nojekyll`。** 删了自定义域名会掉、Pages 处理也会变。
5. **改了别人的内容先说一声。** 尤其是公告、领导名单、联系方式这类对外信息。
6. **拿不准就问。** 这个站没有构建步骤，改错了回滚也很容易：
   `git log` 找到上一次好的提交，`git revert` 或 `git checkout -- 文件名` 即可。

### 冲突了怎么办

```bash
git pull            # 拉最新
# 如果有冲突，Git 会在文件里标出 <<<<<<< 和 >>>>>>>
# 手工改成你想要的样子，删掉这些标记
git add .
git commit -m "解决冲突"
git push
```

不改代码、只是看看线上效果：直接开 http://innovaage.cn/ 。

---

## 八、已完成的配置（备查）

这些是一次性配好的，平时不用动。写在这里是因为万一出问题要知道去哪查。

### GitHub Pages

仓库 → Settings → Pages：

- Source: `Deploy from a branch`
- Branch: `main`，目录 `/ (root)`
- Custom domain: `innovaage.cn`（靠仓库里的 `CNAME` 文件）
- Enforce HTTPS：**尚未勾选** —— 证书一直没签发，见下面

### DNS（阿里云）

| 记录类型 | 主机记录 | 记录值 | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `porgont.github.io` | 600 |

根域名必须用 A 记录（DNS 规范不允许根域名用 CNAME），四条都要加，缺一条会有部分访客打不开。

> ⚠️ **不要动 MX 和 SPF 记录**，如果这个域名在教育邮箱，动了邮件就废了。

### HTTPS 证书还没签下来

目前只能走 `http://`。触发重新签发的办法：

GitHub 仓库 → Settings → Pages → 把 Custom domain 里的 `innovaage.cn` **删掉再填一遍** → Save，
等证书签发后再回来勾上 Enforce HTTPS。

### 国内访问速度

GitHub Pages 服务器在海外，国内访问时快时慢，这是线路问题不是配置问题。
域名解析到海外服务器不需要 ICP 备案；但**以后如果换到国内服务器，就必须先备案**。

---

## 九、技术说明

- **零构建**：写完直接推，GitHub Pages 直接托管源文件。没有打包、没有编译。
- **主题记忆**：访客手动切换过深浅色后记在 `localStorage` 的 `ia-theme`；
  没手动选过就跟随系统。每个页面 `<head>` 里有一小段内联脚本防止刷新时闪屏。
- **手机端侧栏**：纯 CSS 实现（隐藏 checkbox + label），零 JS。
  这段标记**必须放在 `</header>` 之后** —— 页眉带 `backdrop-filter`，
  会成为 `position: fixed` 子元素的包含块，放进去侧栏就铺不满屏幕了。
- **视频工具**：浏览器里没有直接转码的 API，所以是「一边播一边录」——
  画面画到 canvas 上，用 `MediaRecorder` 录成 MP4。代价是耗时约等于视频时长。
  编码检测用自托管的 `mp4box.js`（`assets/vendor/`），不依赖外网 CDN。
- **第三方库**：目前只有 `mp4box.js`（读 MP4 编码信息用）。

---

## 十、待办

- [ ] 签发 HTTPS 证书（见第八节）
- [ ] 报名问卷以外的素材如果需要可继续补
- [ ] 视频工具的 H.265 输出：取决于浏览器与显卡支持，
      当前环境实测不支持，代码里会自动置灰并给出说明

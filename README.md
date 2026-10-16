# 创想时代开发组 · 官网

Innova Age Development Team 的官方网站。纯静态站点（HTML + CSS + 原生 JS，无框架、无构建步骤），
托管在 GitHub Pages，通过自定义域名 **innovaage.cn** 访问。

> 仓库地址：https://github.com/porgont/innovaage-site
> Pages 默认地址（域名生效前可先用）：https://porgont.github.io/innovaage-site/

## 目录结构

```
innovaage-site/
├── index.html            首页：工作室介绍摘要、制作方向、最新公告、加入入口
├── about.html            关于我们：团队沿革、平台与账号、制作方向、工作方式、合作
├── news.html             公告页：全部公告 + 分类筛选
├── join.html             加入 / 联系页：报名问卷入口 + 三个 QQ 群（两个标签页）
├── 404.html              GitHub Pages 自定义 404 页
├── CNAME                 自定义域名（内容必须是 innovaage.cn）
├── .nojekyll             让 GitHub Pages 跳过 Jekyll 处理
├── robots.txt            搜索引擎抓取规则
├── sitemap.xml           站点地图
├── tools/                本地自检脚本（不需要发布，但留着方便以后改完检查）
│   ├── serve.mjs         模拟 GitHub Pages 的本地服务器（含 404 处理）
│   ├── check.mjs         结构与链接检查
│   └── browser-test.mjs  浏览器行为自检（41 项）
└── assets/
    ├── css/style.css     全部样式（含深色主题、响应式、打印样式）
    └── js/site.js        ★ 唯一需要改的文件：群号 + 公告 + 问卷链接
```

---

## 一、站点信息速查

| 项目 | 内容 |
|---|---|
| 中文名 | 创想时代开发组 |
| 英文名 | Innova Age Development Team |
| 定位 | 致力于 MCBE（基岩版）的资源创作团队 |
| 成立 | 2016 年 3 月 10 日（初次构想于 2015 年末） |
| 创始人 | 威廉 |
| 主打类型 | 地图、皮肤 |
| 其他方向 | 材质、光影、Addon、美术 / 视频 |
| 平台 | 已入驻网易我的世界；网易大神注册有官方账号 |
| 中国版总下载量 | 超过五千万 |
| 宗旨 | 探索、突破、创意、想象，有想则创 |
| 对外交流群 | 788233856 |
| 开发理事会（对外代投） | 1018260006 |
| 对外审核群（加入我们） | 1045216325 |
| 域名 | innovaage.cn（阿里云 DNS） |

---

## 二、唯一需要改的文件

所有可配置内容都在 **`assets/js/site.js`** 顶部的 `SITE_CONFIG`：

```js
var SITE_CONFIG = {
  // ★ 报名问卷：把问卷星链接粘进来，页面上就会出现可点的「填写报名问卷」按钮
  //   留空时按钮自动变灰，并提示先加对外审核群（不会出现死链）
  surveyUrl: '',

  qqAudit: '1045216325',      // 对外审核群（加入我们）
  qqPublic: '788233856',      // 对外交流群（交流探讨）
  qqCouncil: '1018260006',    // 开发理事会（对外代投）

  email: '',                  // 邮箱，留空则「联系我们」页自动隐藏这一行
  bilibili: '',               // B 站主页，留空则自动隐藏
  douyin: '',                 // 抖音主页，留空则自动隐藏
  discord: '',                // Discord，留空则自动隐藏

  github: 'https://github.com/porgont',
  site: 'https://innovaage.cn',
  siteRepo: 'https://github.com/porgont/innovaage-site'
};
```

**留空的联系方式会自动隐藏整行**，不会在页面上留下空行或「待填写」占位。
所以 B 站、抖音、邮箱这些还没有的，先留空就行，以后有了填进去就自动出现。

### 问卷星链接怎么填

1. 在问卷星做好问卷 → 发布 → 复制链接（形如 `https://www.wjx.cn/vm/xxxxxxxx.aspx`）
2. 粘到 `surveyUrl:` 后面
3. `git add . && git commit -m "接上报名问卷" && git push`

填好后，「加入我们」页第一步的按钮就会变成可点的外链，在新窗口打开。

---

## 三、发布到 GitHub Pages

仓库已经建好并推送过了。日常更新只要三条命令：

```powershell
cd "G:\Artificial Idiot\innovaage-site"
git add .
git commit -m "更新公告"
git push
```

推完等 1～2 分钟，GitHub Pages 会自动重新发布。

### 首次配置（只需做一次）

1. 仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main`，目录选 `/ (root)` → Save
4. **Custom domain** 填 `innovaage.cn` → Save
5. 等 DNS 检查通过后，勾选 **Enforce HTTPS**（证书自动签发，不用自己传）

`CNAME` 文件已经放进仓库，第 4 步就是靠它。

---

## 四、DNS 怎么配（阿里云 / 万网）

`innovaage.cn` 的 DNS 由阿里云解析（`dns11.hichina.com` / `dns12.hichina.com`）。

> ⚠️ **`www.innovaage.cn` 原来有一条 CNAME 指向 `innovaage.mysxl.cn`（上线了建站平台）。**
> 要让 www 也指向 GitHub Pages，**必须先把这条旧记录删掉或改掉**，否则 www 会一直打开旧页面。
> 想保留旧站就只配根域名 `@`，跳过下面第 2 条。

进入 **阿里云控制台 → 域名 → 解析设置 → 添加记录**：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `porgont.github.io` | 600 |

说明：
- 根域名必须用 **A 记录**（DNS 规范不允许根域名用 CNAME），四条都要加，缺一条会有部分用户打不开。
- `www` 那条用 CNAME 指向 `porgont.github.io`，**结尾不要加斜杠**，也不要带仓库名。
- **不要动 MX 和 SPF 记录**，如果这个域名在用企业邮箱，动了邮件就废了。

改完等 10 分钟到几小时生效。自查命令：

```powershell
Resolve-DnsName innovaage.cn -Type A
Resolve-DnsName www.innovaage.cn
```

看到 `185.199.108.153` 这类地址就说明解析对了。

---

## 五、日常维护

### 发一条新公告

打开 `assets/js/site.js`，找到 `ANNOUNCEMENTS` 数组，在最前面加一段：

```js
{
  date: '2026-03-01',
  title: '公告标题',
  color: 'green',            // green / gold / diamond / redstone，只影响左边色条
  pin: true,                 // 可选，置顶
  tags: ['版本发布'],         // 影响公告页的分类筛选按钮
  body: '<p>正文可以写 HTML：<b>加粗</b>、<a href="...">链接</a>、列表都行。</p>'
}
```

保存 → `git push` → 一分钟左右自动更新。

### 改联系方式

只改 `SITE_CONFIG` 里的字段，全站（首页页脚、关于我们页脚、联系我们页）一起生效。

### 改文案

直接编辑对应的 `.html` 文件。样式全在 `assets/css/style.css`，
主题色在文件最上面的 `:root` 变量里，改一个值全站换色。

---

## 六、本地预览与自检

### 本地预览

```powershell
cd "G:\Artificial Idiot\innovaage-site"
node tools/serve.mjs 8099
```

然后浏览器打开 http://localhost:8099 。
这个服务器和 GitHub Pages 一样：找不到文件时返回 `404.html`，状态码 404。

### 改完代码后自检

```powershell
node tools/check.mjs          # 文件、链接、id、语法、CSS 括号（16 项）
node tools/browser-test.mjs   # 真浏览器跑 41 项行为测试（需先起 serve.mjs）
```

`browser-test.mjs` 会真开一个无头 Edge，检查：公告渲染与筛选、标签页切换、
三个 QQ 群渲染与一键复制、未填项自动隐藏、问卷星入口的降级逻辑、
关于我们页的关键信息、移动端无横向溢出、控制台无报错。

> 这两个脚本用不到 npm 依赖，Node 直接跑。
> 如果改了群号或问卷链接，记得同步改 `browser-test.mjs` 里的断言，
> 否则会「测试失败但其实页面是对的」。

---

## 七、已知注意事项

1. **国内访问速度**：GitHub Pages 的服务器在海外，国内访问有时快有时慢，
   这是线路问题不是配置问题。如果访客普遍反馈打不开，备选方案是把域名 NS 转到
   Cloudflare 再回源 GitHub Pages，或改用国内的静态托管。
2. **ICP 备案**：域名解析到海外服务器（GitHub Pages 就是）时不备案也能访问。
   以后换到国内服务器，就必须先备案。
3. **不要删 `CNAME` 文件**，删了自定义域名会掉。
4. **问卷星链接留空**时页面不会出现死链，而是提示先加审核群 —— 这是有意设计，
   方便问卷做好之前先上线官网。

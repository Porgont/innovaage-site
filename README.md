# 创想时代开发组 · 官网

InnovaAge Studio 的官方网站。纯静态站点（HTML + CSS + 原生 JS，无框架、无构建步骤），
托管在 GitHub Pages，通过自定义域名 **innovaage.cn** 访问。

## 目录结构

```
innovaage-site/
├── index.html            首页：工作室介绍、方向、分工、流程、最新公告
├── news.html             公告页：全部公告 + 分类筛选
├── join.html             加入 / 联系页：报名问卷 + 联系方式（两个标签页）
├── 404.html              GitHub Pages 自定义 404 页
├── CNAME                 自定义域名（内容必须是 innovaage.cn）
├── .nojekyll             让 GitHub Pages 跳过 Jekyll 处理
├── robots.txt            搜索引擎抓取规则
├── sitemap.xml           站点地图
├── tools/                本地自检脚本（不需要发布，但留着方便以后改完检查）
│   ├── serve.mjs         模拟 GitHub Pages 的本地服务器（含 404 处理）
│   ├── check.mjs         结构与链接检查
│   └── browser-test.mjs  浏览器行为自检（38 项）
└── assets/
    ├── css/style.css     全部样式（含深色主题、响应式、打印样式）
    └── js/site.js        ★ 唯一需要改的文件：联系方式 + 公告数据 + 表单地址
```

---

## 一、上线前必改的三处

全部集中在 **`assets/js/site.js`** 文件顶部的 `SITE_CONFIG`：

```js
var SITE_CONFIG = {
  formEndpoint: '',                     // ② 表单接收地址（见下文第三节）
  email: 'contact@innovaage.cn',        // 改成你们的真实邮箱
  qqGroup: '000000000',                 // 改成 QQ 群号
  qqGroupLink: '',
  discord: '',                          // 没有就留空，页面会自动隐藏这一行
  bilibili: '',                         // 没有就留空
  github: 'https://github.com/',        // 改成你们的 GitHub 主页
  site: 'https://innovaage.cn'
};
```

留空的联系方式（`discord` / `bilibili` / `qqGroup`）在「联系我们」页会自动隐藏整行，
不会在页面上留下空占位。

**再检查一处**：`index.html` 里搜 `备案`，如果域名做了 ICP 备案，把备案号填进页脚；
没备案就不用管。

---

## 二、发布到 GitHub Pages

### 1. 在 GitHub 建仓库

1. 打开 https://github.com/new
2. Repository name 填 `innovaage-site`（名字随意），**Public**（公开）
3. 不要勾选 Add a README / .gitignore / license
4. 点 Create repository

### 2. 把本地文件推上去

在 `innovaage-site` 文件夹里打开终端（PowerShell），逐条执行：

```powershell
git init -b main
git add .
git commit -m "网站首次上线"
git remote add origin https://github.com/你的用户名/innovaage-site.git
git push -u origin main
```

> 用户名替换成你自己的 GitHub 用户名。第一次 push 会弹出登录窗口，按提示授权即可。

以后每次改完内容，只要三条命令：

```powershell
git add .
git commit -m "更新公告"
git push
```

### 3. 打开 Pages

1. 仓库页 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main`，目录选 `/ (root)` → Save
4. 等 1～2 分钟，页面顶部会出现网址 `https://你的用户名.github.io/innovaage-site/`

### 4. 绑定自定义域名

1. 同一个 Pages 页面 → **Custom domain** 填 `innovaage.cn` → Save
2. 等 DNS 检查通过后，勾选 **Enforce HTTPS**
   （首次可能要等几分钟到 24 小时，证书签发是自动的，不用自己传证书）

`CNAME` 文件已经放进仓库了，它就是给这一步用的。

---

## 三、DNS 怎么配（阿里云 / 万网）

`innovaage.cn` 的 DNS 目前由阿里云解析（`dns11.hichina.com` / `dns12.hichina.com`）。

> ⚠️ **重要：`www.innovaage.cn` 现在有一条 CNAME 指向 `innovaage.mysxl.cn`（上线了建站平台）。**
> 要让 www 也指向 GitHub Pages，**必须先把这条旧记录改掉**，否则 www 会一直打开旧页面。
> 如果你还想保留那个旧站，就只配根域名 `@`，跳过下面第 2 条。

进入 **阿里云控制台 → 域名 → 解析设置 → 添加记录**，加入这几条：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `你的用户名.github.io` | 600 |

说明：
- 根域名 `innovaage.cn` 必须用 **A 记录**（DNS 规范不允许根域名用 CNAME），四条都要加，缺一条会导致部分用户打不开。
- `www` 那条用 CNAME 指向 GitHub，结尾**不要加斜杠**，也不要带仓库名。
- **不要动** MX 和 SPF 记录（如果你用这个域名收发邮件，动了邮件就废了）。

改完等 10 分钟到几小时生效（看 TTL）。可以用这个命令自查：

```powershell
Resolve-DnsName innovaage.cn -Type A
Resolve-DnsName www.innovaage.cn
```

看到 `185.199.108.153` 这类地址就说明解析对了。

---

## 四、报名问卷怎么收数据

表单是纯静态页面，需要一个「收表的服务」。两种做法：

### 做法 A：Formspree（推荐，免费额度够用）

1. 打开 https://formspree.io 注册（用邮箱即可，免费版每月 50 份提交）
2. 新建一个 Form，名字随意
3. 复制它给的地址，形如 `https://formspree.io/f/abcdwxyz`
4. 填进 `assets/js/site.js` 的 `formEndpoint`：

```js
formEndpoint: 'https://formspree.io/f/abcdwxyz',
```

5. `git add . && git commit -m "接上表单" && git push`

之后有人提交问卷，Formspree 会把内容发到你的邮箱，也能在它的后台看全部记录。
页面上的成功/失败提示、邮箱格式校验、必填校验都已经写好了。

### 做法 B：不接服务（默认状态）

`formEndpoint` 留空时，访客点「提交报名」不会发送数据，
而是弹出一段提示 + 一个「点这里生成邮件」的链接，
把填好的内容自动整理成邮件正文，用访客自己的邮件客户端发到 `email` 里填的地址。

好处是零成本、零依赖；坏处是要求访客电脑上配了邮件客户端。

---

## 五、日常维护

### 发一条新公告

打开 `assets/js/site.js`，找到 `ANNOUNCEMENTS` 数组，在最前面加一段：

```js
{
  date: '2025-06-01',
  title: '公告标题',
  color: 'green',            // green / gold / diamond / redstone，只影响左边色条
  pin: true,                 // 可选，置顶
  tags: ['版本发布'],         // 影响公告页的分类筛选按钮
  body: '<p>正文可以写 HTML：<b>加粗</b>、<a href="...">链接</a>、列表都行。</p>'
}
```

保存 → `git push` → 一分钟左右自动更新。

### 改联系方式

只改 `SITE_CONFIG` 里的字段，全站（导航、页脚、联系我们页）一起生效。

### 改文案

直接编辑对应的 `.html` 文件。样式全在 `assets/css/style.css`，
主题色在文件最上面的 `:root` 变量里，改一个值全站换色。

---

## 六、已知注意事项

1. **国内访问速度**：GitHub Pages 的服务器在海外，国内访问有时快有时慢，
   这是线路问题不是配置问题。如果访客普遍反馈打不开，备选方案是把域名 NS 转到
   Cloudflare 再回源 GitHub Pages，或改用国内的静态托管。
2. **ICP 备案**：域名如果解析到海外服务器（GitHub Pages 就是），不备案也能访问。
   如果以后换到国内服务器，就必须先备案。
3. **表单垃圾提交**：Formspree 免费版自带基础过滤；如果被刷，可以在它的后台加 reCAPTCHA。
4. **不要删 `CNAME` 文件**，删了自定义域名会掉。

---

## 七、本地预览与自检

### 本地预览

直接双击 `index.html` 就能看。但为了更接近线上环境（尤其是 `404.html` 的行为），
建议用自带的本地服务器：

```powershell
cd innovaage-site
node tools/serve.mjs 8099
```

然后浏览器打开 http://localhost:8099 。
这个服务器和 GitHub Pages 一样：找不到文件时返回 `404.html`，状态码 404。

### 改完代码后自检

```powershell
node tools/check.mjs          # 文件、链接、id、语法、CSS 括号
node tools/browser-test.mjs   # 真浏览器跑 38 项行为测试（需先起 serve.mjs）
```

`browser-test.mjs` 会真开一个无头 Edge，检查：公告渲染与筛选、标签页切换、
联系方式渲染与自动隐藏、表单三项校验收与邮件兜底、移动端无横向溢出、控制台无报错。

> 这两个脚本用不到 npm 依赖，Node 直接跑。改动 `site.js` 的 `SITE_CONFIG` 后，
> 记得把 `browser-test.mjs` 里 `000000000` / `contact@innovaage.cn` 的断言一起改掉，
> 否则会「测试失败但其实页面是对的」。

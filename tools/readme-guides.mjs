/*
 * 【已停用】README 的 3.2 / 3.3 现在直接手写，公告与代表作品已移到 content/*.json。
 * 这个脚本里的旧教程（改 site.js 加公告）会覆盖现在的新流程，不要再运行。
 *
 * 把 README 的「4.1 发公告」与「4.2 加作品」两节重写成零基础教程。
 * 用法：node tools/readme-guides.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const p = join(root, 'README.md');

let md = readFileSync(p, 'utf8');

const START = '### 4.1 发一条公告';
const END = '### 4.3 改联系方式 / 群号';

const NEW = `### 4.1 发一条公告（零基础照着做）

这条写给宣传部：**只改一个文件**，不用懂编程。

#### 第一步：打开对的文件

用 VS Code（或任何文本编辑器）打开：

\`\`\`
assets/js/site.js
\`\`\`

在文件里搜索 \`ANNOUNCEMENTS\`，会看到这样一段：

\`\`\`js
var ANNOUNCEMENTS = [
  {
    id: 'subdomain-open',
    date: '2026-10-17',
    ...
  },
  ...
];
\`\`\`

#### 第二步：复制一条当模板

把 \`[\` 后面**整条**（从 \`{\` 到 \`},\`）复制一份，粘在最前面，然后改里面的内容。

新公告**放最前面**，日期相同时它就会排在前面。

#### 第三步：逐项填

| 字段 | 填什么 | 例子 |
|---|---|---|
| \`id\` | 网址里用的英文编号，**只能小写字母、数字、短横线**，不能和别人重复 | \`'new-version-2027'\` |
| \`date\` | 日期，格式固定 \`年-月-日\`，**月、日不足两位要补 0** | \`'2027-03-05'\` |
| \`title\` | 标题，一句话，别太长 | \`'「丹青渡」版本更新说明'\` |
| \`color\` | 左边那根色条，四选一 | \`'green'\` / \`'gold'\` / \`'diamond'\` / \`'redstone'\` |
| \`pin\` | 要不要置顶，不置顶就**整行删掉** | \`true\` |
| \`tags\` | 标签，决定公告页的筛选按钮能不能筛到它。常用：\`'招募'\`、\`'版本发布'\`、\`'合作'\`、\`'站点'\`、\`'里程碑'\` | \`['版本发布']\` |
| \`body\` | 正文，写法见下一节 | \`'<p>……</p>'\` |

#### 第四步：写正文

正文是一段**带 HTML 标记的字符串**。别怕，只用下面这几样就够了：

\`\`\`js
body:
  '<p>第一段。这就是一段普通文字。</p>' +
  '<p>第二段。<b>这句要加粗</b>，用 <b> 和 </b> 包住。</p>' +
  '<p>要放链接就这样：<a href="https://docs.qq.com/doc/xxxx">点这里打开</a>。</p>' +
  '<ul>' +
  '<li>列表第一条</li>' +
  '<li>列表第二条</li>' +
  '</ul>'
\`\`\`

要点：

- 每段用 \`<p>\` 和 \`</p>\` 包住
- 每行结尾那个 \`+\` **不能删**，它是把多行连成一个字符串
- 字符串开头结尾的单引号 \`'\` **不能删**
- 正文里**不能出现英文单引号** \`'\`，要写「这个」就用中文引号，否则会报错
- 想留空行：用 \`<p>&nbsp;</p>\`

#### 第五步：放图片

1. 把图片放进 \`assets/img/\` 文件夹
2. 文件名用**英文小写 + 短横线**，不要中文、不要空格
   好：\`news-2027-banner.jpg\` ／ 不好：\`公告图 1.png\`
3. 图片宽 1200 像素左右就够了，**单张控制在 500KB 以内**
4. 在正文里这样引用：

\`\`\`js
'<img src="assets/img/news-2027-banner.jpg" alt="这张图画了什么">' +
\`\`\`

\`alt\` 里写一句这图画了什么，方便别人看不清图时也能懂。图片会占满正文宽度，不用自己调大小。

#### 第六步：看效果

在项目文件夹里开一个终端，运行：

\`\`\`
node tools/serve.mjs 8099
\`\`\`

然后浏览器打开 \`http://127.0.0.1:8099/news.html\`，就能看到你写的公告。

#### 第七步：发布

改完跑一下自检，绿了再提交：

\`\`\`
node tools/check.mjs
git add -A
git commit -m "新增公告：标题"
git push
\`\`\`

等 1 分钟左右，\`https://innovaage.cn/news.html\` 上就有了。

#### 公告列表上显示的那一小段是自动截的

公告列表**只显示标题 + 正文开头约 96 个字**，点进去才是全文。所以：

- 正文**第一句就要说清这件事**，它会成为列表上的摘要
- 别把「两件事一起说：」这种空话放在最开头，列表上会很难看

#### 常见错误

| 现象 | 原因 |
|---|---|
| 页面全白、公告不显示 | 少了一个 \`,\`、\`+\` 或单引号；按 F12 看 Console 的红色报错 |
| 日期显示成 03/5 而不是 03/05 | \`date\` 里月/日没补 0 |
| 公告页筛选筛不到 | \`tags\` 里没写对应标签 |
| 图片是破图 | 路径写错，或文件没放进 \`assets/img/\` |
| 网址打开是「没找到这篇公告」 | \`id\` 重复了，或者复制时漏了 |

`;

if (!md.includes(START) || !md.includes(END)) {
  console.error('找不到要替换的章节');
  process.exit(1);
}

const i = md.indexOf(START);
const j = md.indexOf(END);
md = md.slice(0, i) + NEW + md.slice(j);

writeFileSync(p, md, 'utf8');
console.log('  已重写 4.1 发公告教程');
console.log('  README 行数: ' + md.split('\n').length);

/*
 * 在 README 里补上「4.2 加一件代表作品（零基础照着做）」。
 * 用法：node tools/readme-works-guide.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const p = join(root, 'README.md');

let md = readFileSync(p, 'utf8');

const ANCHOR = '### 4.3 改联系方式 / 群号';

const NEW = `### 4.2 加一件代表作品（零基础照着做）

加作品也是**只改一个文件**：\`assets/js/site.js\`。有两处要加。

#### 第一步：准备图

1. 图片放 \`assets/img/\`，文件名英文小写 + 短横线，例如 \`wuming-1.jpg\`
2. 封面图**宽 1200 像素左右**就够，别直接丢 4000 像素的原图
3. **单张控制在 600KB 以内**（超过就拿系统自带的「画图」或在线工具压一下）
4. 同一件作品可以有多张截图，命名 \`作品名-1.jpg\`、\`作品名-2.jpg\`

#### 第二步：在 \`SHOWCASE\` 里加一条（列表卡片）

搜索 \`var SHOWCASE = [\`，在数组里加：

\`\`\`js
{
  id: 'wuming',                          // 英文小写，和下面 WORKS 里的编号一致
  img: 'assets/img/wuming-1.jpg',        // 列表里显示的封面
  title: '无名',                          // 作品名
  meta: '作者：某某',                     // 作者行，写真人
  category: 'shader',                    // 见下表
  desc: '一句话说明这件作品是什么。'
},
\`\`\`

\`category\` 只能填下面五个之一，它决定卡片上那个小标签显示什么：

| 填什么 | 显示 |
|---|---|
| \`shader\` | 光影 |
| \`map\` | 地图 |
| \`skin\` | 皮肤 |
| \`tex\` | 材质 |
| \`addon\` | Addon |

#### 第三步：在 \`WORKS\` 里加一条（详情页）

搜索 \`var WORKS = {\`，加一项。**键名必须和上面的 \`id\` 完全一样**：

\`\`\`js
'wuming': {
  name: '无名',
  author: '某某',
  type: '光影 / Shader',
  tagline: '一句话定位，显示在标题下面',
  cover: 'assets/img/wuming-1.jpg',
  coverAlt: '封面图里画了什么',
  facts: [                               // 右侧信息栏，想写几行写几行
    { k: '作品名', v: '无名' },
    { k: '作者', v: '某某' },
    { k: '类型', v: '光影 / Shader' },
    { k: '平台', v: 'Minecraft 基岩版' }
  ],
  intro: [                               // 正文，一个字符串一段
    '第一段介绍。',
    '第二段介绍。'
  ],
  shots: [                               // 详情页截图，想放几张放几张
    { img: 'assets/img/wuming-1.jpg', alt: '这张图展示了什么' },
    { img: 'assets/img/wuming-2.jpg', alt: '这张图展示了什么' }
  ]
},
\`\`\`

\`shots\` 里**只写 \`img\` 和 \`alt\`**，不写说明文字 —— 详情页不显示说明，说明只给屏幕阅读器和搜索引擎看。

#### 只想挂着展示、不做详情页？

那就**只在 \`SHOWCASE\` 里加一条，不要填 \`id\`**。这样卡片上不会出现「查看详情 →」。

#### 规则（自检会盯着）

- **一个作品只能占 \`SHOWCASE\` 的一条**。多张图放进 \`WORKS\` 的 \`shots\`，别在 \`SHOWCASE\` 里重复列
- **作者写真人，不要写「创想时代开发组」**。团队只能作为「移植与维护」之类的角色出现在 \`facts\` 里
- 不知道的信息就**不写**（比如不确定是基岩版还是 Java，就别填 \`平台\`），不要猜

#### 第四步：看效果、发布

\`\`\`
node tools/serve.mjs 8099
\`\`\`

打开 \`http://127.0.0.1:8099/works.html\` 看列表，点进详情页再看一遍。

确认没问题：

\`\`\`
node tools/check.mjs
git add -A
git commit -m "新增作品：无名"
git push
\`\`\`

#### 想放到「测试中作品」而不是代表作品？

在 \`SHOWCASE\` **下面**有个 \`var SHOWCASE_TEST = [];\`，把条目放进那个数组，字段完全一样。
它会出现在作品页的「尚未正式发布的测试组件」栏和首页的「测试中作品」栏，不占代表作品的位置。

#### 常见错误

| 现象 | 原因 |
|---|---|
| 卡片有了但点进去是别人的内容 | \`WORKS\` 里的键名和 \`SHOWCASE\` 的 \`id\` 对不上 |
| 卡片上没有「查看详情」 | \`SHOWCASE\` 那条忘了写 \`id\` |
| 图片破图 | 路径写错，或文件没放进 \`assets/img/\` |
| 同一件作品出现好几次 | 在 \`SHOWCASE\` 里重复列了，应该合并成一条 |
| 页面白屏 | 少逗号、少引号；按 F12 看 Console |

`;

if (!md.includes(ANCHOR)) {
  console.error('找不到 4.3 的锚点');
  process.exit(1);
}

md = md.replace(ANCHOR, () => NEW + ANCHOR);
writeFileSync(p, md, 'utf8');
console.log('  已插入 4.2 加代表作品教程');
console.log('  README 行数: ' + md.split('\n').length);

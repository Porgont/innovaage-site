/*
 * 结构自检：确认页眉、手机侧栏、以及各页新增区块都完好。
 * 这是「上一轮被正则改坏」之后加的守卫 —— 只读，不改任何文件。
 * 用法：node tools/verify-structure.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PAGES = [
  'index.html', 'about.html', 'works.html', 'work.html',
  'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html', 'tools-convert.html',
  'article.html', 'news.html', 'join.html'
];

const count = (s, sub) => s.split(sub).length - 1;

let fail = 0;
const bad = (msg) => { fail++; console.log('  ✗ ' + msg); };
const good = (msg) => console.log('  ✓ ' + msg);

console.log('=== 每个页面的基础结构 ===');
for (const p of PAGES) {
  const c = readFileSync(join(root, p), 'utf8');
  const ho = count(c, '<header'), hc = count(c, '</header>');
  const tg = count(c, 'id="mnav-toggle"');
  const lk = count(c, 'class="mnav-links"');
  const dw = count(c, 'class="mnav-drawer"');
  const ov = count(c, 'class="mnav-overlay"');

  const problems = [];
  if (ho !== 1) problems.push('header 开标签 ' + ho + ' 个');
  if (hc !== 1) problems.push('header 闭标签 ' + hc + ' 个');
  if (tg !== 1) problems.push('mnav-toggle ' + tg + ' 个');
  if (lk !== 1) problems.push('mnav-links ' + lk + ' 个');
  if (dw !== 1) problems.push('mnav-drawer ' + dw + ' 个');
  if (ov !== 1) problems.push('mnav-overlay ' + ov + ' 个');

  // 侧栏必须在 </header> 之后（页眉的 backdrop-filter 会劫持 fixed 定位）
  const hi = c.indexOf('</header>');
  const mi = c.indexOf('<div class="mnav">');
  if (mi < hi) problems.push('侧栏跑到页眉里面了');

  if (problems.length) bad(p + '：' + problems.join('，'));
  else good(p + ' 结构完好');
}

console.log('\n=== 各页新增区块 ===');
const about = readFileSync(join(root, 'about.html'), 'utf8');

/* 统计负责人卡片：class 以 "officer" 开头且后面紧跟空格或引号。
   不能简单用前缀匹配（会同时命中 officer-role / officer-note / officer-avatar），
   也不能写死修饰类，否则加一个 officer--avatar 就数不到了。 */
const OFFICER_RE = /class="officer(?=[\s"])/g;
const officerCount = (about.match(OFFICER_RE) || []).length;

// 核心管理局与「其他负责人」两个分区分别校验
const coreStart = about.indexOf('核心管理局</h2>');
const otherStart = about.indexOf('其他负责人</h2>');
const corePart = coreStart >= 0 && otherStart > coreStart
  ? about.slice(coreStart, otherStart)
  : '';
const otherPart = otherStart >= 0 ? about.slice(otherStart, otherStart + 1600) : '';

const coreCards = (corePart.match(OFFICER_RE) || []).length;
const otherCards = (otherPart.match(OFFICER_RE) || []).length;

if (coreCards === 5) good('核心管理局：5 人在册（主席 + 4 位副主席/名誉主席）');
else bad('核心管理局：' + coreCards + ' 人（应为 5）');

if (!corePart.includes('Log_坤') && !corePart.includes('老赵')) {
  good('核心管理局里没有 Log_坤 / 老赵');
} else {
  bad('核心管理局里仍包含 Log_坤 或 老赵');
}

const OTHER_NAMES = ['Log_坤', '老赵', '缒沐'];
if (otherCards === OTHER_NAMES.length && OTHER_NAMES.every((who) => otherPart.includes(who))) {
  good('其他负责人：' + OTHER_NAMES.join('、') + ' 都在');
} else {
  bad('其他负责人分区不对（' + otherCards + ' 人）');
}

/* 负责人头像：文件要在，html 也要引用。加人时只改这张表。 */
const AVATARS = [
  ['威廉', 'avatar-william.jpg'],
  ['柑柠', 'avatar-ganning.jpg'],
  ['苏打', 'avatar-suda.jpg'],
  ['樱花', 'avatar-yinghua.jpg'],
  ['阿潇', 'avatar-axiao.jpg'],
  ['Log_坤', 'avatar-logkun.jpg'],
  ['老赵', 'avatar-laozhao.jpg'],
  ['缒沐', 'avatar-zhuimu.jpg']
];
let avatarProblems = [];
for (const [who, file] of AVATARS) {
  const rel = 'assets/img/' + file;
  if (!about.includes(rel)) avatarProblems.push(who + ' 未引用图');
  else if (!statSync(join(root, 'assets', 'img', file), { throwIfNoEntry: false })) {
    avatarProblems.push(who + ' 图片文件不存在');
  }
}
if (avatarProblems.length === 0) good('负责人头像：' + AVATARS.length + ' 位全部接上');
else bad('头像问题：' + avatarProblems.join('，'));

// 有头像的卡片必须带 officer--avatar，否则布局会错位
const avatarCards = (about.match(/class="officer(?=[\s"])[^"]*officer--avatar[^"]*"/g) || []).length;
if (avatarCards === AVATARS.length) good('负责人卡片：' + avatarCards + ' 张都用了头像布局');
else bad('负责人卡片：只有 ' + avatarCards + ' 张用了头像布局（应为 ' + AVATARS.length + '）');

const joinHtml = readFileSync(join(root, 'join.html'), 'utf8');
/* 两处部门表：页面顶部（带 --wide 修饰类）与审核条例面板，各 5 个。
   用「class 值以 dept / dept-grid 开头且后面是空格或引号」来数，
   否则加个修饰类（dept-grid--wide）就数不到了。 */
const DEPT_RE = /class="dept(?=[\s"])/g;
const DEPT_GRID_RE = /class="dept-grid(?=[\s"])/g;
const deptCount = (joinHtml.match(DEPT_RE) || []).length;
const gridCount = (joinHtml.match(DEPT_GRID_RE) || []).length;
if (deptCount === 10 && gridCount === 2) {
  good('加入我们：部门表 2 处各 5 个（页面顶部 + 审核条例）');
} else {
  bad('加入我们：部门表 ' + gridCount + ' 处、部门 ' + deptCount + ' 个（应为 2 处 / 10 个）');
}

const work = readFileSync(join(root, 'work.html'), 'utf8');
if (work.includes('id="work-thanks"')) good('作品详情：鸣谢面板在');
else bad('作品详情：缺 work-thanks');

const hub = readFileSync(join(root, 'tools.html'), 'utf8');
const img = readFileSync(join(root, 'tools-image.html'), 'utf8');
const vid = readFileSync(join(root, 'tools-video.html'), 'utf8');
const mat = readFileSync(join(root, 'tools-matoga.html'), 'utf8');

// 入口页：三张模块卡片各自指向独立页面
for (const [name, target] of [
  ['图片处理', 'tools-image.html'],
  ['视频处理', 'tools-video.html'],
  ['matoga', 'tools-matoga.html']
]) {
  if (hub.includes('href="' + target + '"')) good('工具箱入口：' + name + ' 卡片指向 ' + target);
  else bad('工具箱入口：缺 ' + name + ' 卡片');
}

// 图片模块：功能原样保留
for (const [name, needle] of [
  ['选图区', 'id="dropzone"'],
  ['处理按钮', 'id="run-btn"'],
  ['toolbox.js', 'toolbox.js']
]) {
  if (img.includes(needle)) good('图片模块：' + name + ' 在');
  else bad('图片模块：缺 ' + name);
}

// 视频模块：新规格面板
for (const [name, needle] of [
  ['选视频区', 'id="v-dropzone"'],
  ['处理按钮', 'id="v-run-btn"'],
  ['mp4box 引用', 'mp4box.all.min.js'],
  ['video-tool 脚本', 'video-tool.js'],
  ['编码选择', 'id="v-codec"'],
  ['输出宽', 'id="v-out-w"'],
  ['输出高', 'id="v-out-h"'],
  ['画面处理', 'data-fit="pad"']
]) {
  if (vid.includes(needle)) good('视频模块：' + name + ' 在');
  else bad('视频模块：缺 ' + name);
}
for (const p of ['submit', 'p1080', 'p720', 'custom']) {
  if (vid.includes('data-preset="' + p + '"')) good('视频模块：预设 ' + p + ' 在');
  else bad('视频模块：缺预设 ' + p);
}
for (const r of ['source', '16:9', '9:16', '4:3', '1:1']) {
  if (vid.includes('data-ratio="' + r + '"')) good('视频模块：比例 ' + r + ' 在');
  else bad('视频模块：缺比例 ' + r);
}

// matoga 模块：署名与来源
if (mat.includes('芝世')) good('matoga 模块：作者署名在');
else bad('matoga 模块：缺作者署名');
if (mat.includes('github.com/xiongmiaozai/matoga')) good('matoga 模块：来源链接在');
else bad('matoga 模块：缺来源链接');
if (mat.includes('MIT')) good('matoga 模块：许可证说明在');
else bad('matoga 模块：缺许可证说明');

// 每个模块页都要能回到工具箱
for (const [name, html] of [['图片', img], ['视频', vid], ['matoga', mat]]) {
  if (html.includes('href="tools.html"')) good(name + '模块：有回工具箱的入口');
  else bad(name + '模块：没有回工具箱的入口');
}

/* ---------- 站内不许出现本站源码地址 ----------
   不希望有人顺着链接去扒官网源码。
   matoga 页里指向芝世那个第三方项目的 GitHub 链接是别人的开源库，
   MIT 要求署名与来源，不在此列。 */
const ALL_PAGES = [
  'index.html', 'about.html', 'works.html', 'work.html',
  'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html', 'tools-convert.html',
  'article.html', 'news.html', 'join.html'
];
const SITE_REPO_PATTERNS = [
  /github\.com\/porgont/i,
  /github\.com\/Porgont/i,
  /porgont\.github\.io/i,
  /siteRepo/,
  /本网站源码/,
  /本站由 GitHub Pages 托管/
];
const leaked = [];
for (const page of ALL_PAGES) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const re of SITE_REPO_PATTERNS) {
    if (re.test(html)) leaked.push(page + ' 命中 ' + re);
  }
}
if (leaked.length === 0) good('全站都找不到本站源码地址');
else bad('以下位置仍暴露本站源码：' + leaked.join('；'));

// site.js 里也不该再留着 siteRepo / github 配置项
const siteJs = readFileSync(join(root, 'assets', 'js', 'site.js'), 'utf8');
if (/siteRepo|github\.com\/porgont/i.test(siteJs)) bad('site.js 里仍有本站仓库地址');
else good('site.js 里没有本站仓库地址');

console.log(fail === 0 ? '\n结构自检全部通过' : `\n结构自检失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);

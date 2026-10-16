/*
 * 结构自检：确认页眉、手机侧栏、以及各页新增区块都完好。
 * 这是「上一轮被正则改坏」之后加的守卫 —— 只读，不改任何文件。
 * 用法：node tools/verify-structure.mjs
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PAGES = ['index.html', 'about.html', 'works.html', 'work.html', 'tools.html', 'news.html', 'join.html'];

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
// 精确匹配 class 值，别用前缀（"officer" 会同时命中 officer-role / officer-note）
const officerCount = (about.match(/class="officer(?: officer--lead)?"/g) || []).length;
if (officerCount === 7) good('关于我们：7 位高管都在');
else bad('关于我们：高管数 ' + officerCount + '（应为 7）');

const joinHtml = readFileSync(join(root, 'join.html'), 'utf8');
// 两个地方都有部门表：报名加入（新增）与审核条例（原有），各 5 个
const deptCount = (joinHtml.match(/class="dept"/g) || []).length;
const gridCount = (joinHtml.match(/class="dept-grid"/g) || []).length;
if (deptCount === 10 && gridCount === 2) {
  good('加入我们：部门表 2 处各 5 个（报名加入 + 审核条例）');
} else {
  bad('加入我们：部门表 ' + gridCount + ' 处、部门 ' + deptCount + ' 个（应为 2 处 / 10 个）');
}

const work = readFileSync(join(root, 'work.html'), 'utf8');
if (work.includes('id="work-thanks"')) good('作品详情：鸣谢面板在');
else bad('作品详情：缺 work-thanks');

const tools = readFileSync(join(root, 'tools.html'), 'utf8');
const toolChecks = [
  ['视频工具卡片', 'id="v-run-btn"'],
  ['mp4box 引用', 'mp4box.all.min.js'],
  ['video-tool 脚本', 'video-tool.js'],
  ['画面处理开关', 'data-fit="pad"']
];
for (const [name, needle] of toolChecks) {
  if (tools.includes(needle)) good('工具箱：' + name + ' 在');
  else bad('工具箱：缺 ' + name);
}

console.log(fail === 0 ? '\n结构自检全部通过' : `\n结构自检失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);

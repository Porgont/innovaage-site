/*
 * 两件事：
 *   1. 顶部导航每个按钮加一行小英文（中文下面），对应参考图右上角的双语导航
 *   2. 子页面页头换成参考图的结构：INDEX / 编号 / 英文 → 超大描边数字 → 实心中文标题
 *
 * 用法：node tools/archive-headers.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const ALL_PAGES = [
  'index.html', 'about.html', 'works.html', 'work.html',
  'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html',
  'news.html', 'join.html'
];

/* ---------- 1. 导航双语 ---------- */
const NAV_EN = { home: 'INDEX', works: 'WORKS', news: 'NEWS', tools: 'TOOLS', join: 'JOIN', about: 'ABOUT' };

let navTouched = 0;
for (const page of ALL_PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // 只处理桌面导航 .nav 里的链接，手机侧栏保持纯中文
  html = html.replace(
    /(<nav class="nav" aria-label="主导航">)([\s\S]*?)(<\/nav>)/,
    (m, head, inner, tail) => {
      const out = inner.replace(
        /<a href="([^"]+)" data-nav="(\w+)">([^<]+)<\/a>/g,
        (mm, href, key, label) =>
          `<a href="${href}" data-nav="${key}"><span>${label}</span><small>${NAV_EN[key] || ''}</small></a>`
      );
      return head + out + tail;
    }
  );

  if (html !== before) { writeFileSync(path, html, 'utf8'); navTouched++; }
}
console.log(`导航双语：${navTouched} / ${ALL_PAGES.length} 个页面`);

/* ---------- 2. 子页面页头 ---------- */
// 编号按导航顺序：首页 01 / 作品 02 / 公告 03 / 工具箱 04 / 加入我们 05 / 关于我们 06
const HEADS = {
  'works.html': { num: '02', en: 'WORKS' },
  'news.html': { num: '03', en: 'NEWS' },
  'tools.html': { num: '04', en: 'TOOLS' },
  'tools-image.html': { num: '04', en: 'TOOLS · IMAGE' },
  'tools-video.html': { num: '04', en: 'TOOLS · VIDEO' },
  'tools-matoga.html': { num: '04', en: 'TOOLS · MATOGA' },
  'join.html': { num: '05', en: 'JOIN' },
  'about.html': { num: '06', en: 'ABOUT' }
};

let headTouched = 0;
for (const [page, conf] of Object.entries(HEADS)) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // 去掉内联 padding，交给 .hero--page 控制
  html = html.replace(/<section class="hero" style="padding:[^"]*">/, '<section class="hero hero--page">');

  // 在 <h1 之前插入：编号行 + 超大描边数字
  const inject =
    `      <p class="page-head__code">INDEX <span>/</span> ${conf.num} <span>/</span> <b>${conf.en}</b></p>\n` +
    `      <p class="page-head__num" aria-hidden="true">${conf.num}</p>\n`;

  html = html.replace(/(\n[ \t]*)(<h1\b)/, (m, lead, h1open) => lead + inject + h1open);

  if (html !== before) { writeFileSync(path, html, 'utf8'); headTouched++; }
  else console.log(`  ⚠ ${page} 没有匹配到 h1，请人工检查`);
}

console.log(`页头改造：${headTouched} / ${Object.keys(HEADS).length} 个页面`);

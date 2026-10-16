/*
 * 给所有页面加手机端侧栏（可展开/收起）。实现：隐藏 checkbox + label，纯 CSS，零 JS。
 *
 * 踩过的两个坑，写在这里免得以后再犯：
 *   1) 先用 <details>/<summary> —— 部分浏览器对「<details> 内的 position:fixed
 *      子元素」处理不正常，抽屉被压成几十像素高。
 *   2) 改用 checkbox 后把标记放进 <header> 里 —— .site-header 带 backdrop-filter，
 *      它会成为 position:fixed 子元素的包含块，于是「铺满屏幕」变成
 *      「铺满页眉那条窄框」。所以必须放在 </header> 之后。
 *
 * 本脚本只做「精确字符串替换」，不用正则 —— 上一版用正则清理旧块，
 * 结果把 </header> 一起吃了，只能从 git 恢复。宁可报错也不猜。
 *
 * 用法：node tools/add-mobile-drawer.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const PAGES = ['index.html', 'about.html', 'works.html', 'work.html', 'tools.html', 'news.html', 'join.html'];

const LINKS = [
  ['index.html', 'home', '首页'],
  ['about.html', 'about', '关于我们'],
  ['works.html', 'works', '作品'],
  ['tools.html', 'tools', '工具箱'],
  ['news.html', 'news', '公告'],
  ['join.html', 'join', '加入我们'],
  ['join.html#panel-contact', 'contact', '联系我们']
];

const MARK = '<!-- mobile-drawer:start -->';
const END = '<!-- mobile-drawer:end -->';

function drawerMarkup() {
  const links = LINKS
    .map(([href, key, label]) => `      <a href="${href}" data-nav="${key}">${label}</a>`)
    .join('\n');

  return `${MARK}
<!-- 手机端：汉堡按钮 + 可收起侧栏。纯 CSS（隐藏 checkbox + label），零 JS。
     位置很关键：必须放在页眉元素之后。
     页眉带 backdrop-filter，它会成为 position:fixed 子元素的包含块，
     放进去抽屉就铺不满屏幕了。 -->
<div class="mnav">
  <input type="checkbox" id="mnav-toggle" class="mnav-toggle" aria-label="展开或收起导航菜单">

  <label class="mnav-btn" for="mnav-toggle" aria-label="打开导航菜单">
    <span class="mnav-bars" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="mnav-label">菜单</span>
  </label>

  <label class="mnav-overlay" for="mnav-toggle" aria-label="关闭导航菜单"></label>

  <div class="mnav-drawer">
    <div class="mnav-head">
      <span class="mnav-title">站内导航</span>
      <label class="mnav-close" for="mnav-toggle" aria-label="关闭导航菜单">×</label>
    </div>
    <nav class="mnav-links" aria-label="手机端导航">
${links}
    </nav>
    <a class="btn btn--sm mnav-cta" href="join.html#panel-form">加入我们</a>
  </div>
</div>
${END}`;
}

function countOf(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

let ok = 0;
for (const page of PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');

  // 1) 先精确移除带标记的整块（可重复运行）
  const s = html.indexOf(MARK);
  const e = html.indexOf(END);
  if (s >= 0 && e > s) {
    html = html.slice(0, s) + html.slice(e + END.length);
    // 顺带清掉留下的一串空行
    html = html.replace(/\n{4,}/g, '\n\n\n');
  }

  // 2) 安全检查：</header> 必须恰好一个，且没有 mnav 残留
  const hc = countOf(html, '</header>');
  const ho = countOf(html, '<header');
  const residual = countOf(html, 'class="mnav');
  if (hc !== 1 || ho !== 1) {
    console.log(`  ${page}  ✗ </header> 数量异常（开 ${ho} / 闭 ${hc}），跳过`);
    continue;
  }
  if (residual > 0) {
    console.log(`  ${page}  ✗ 仍有 ${residual} 处 mnav 残留，跳过（不猜，请人工看）`);
    continue;
  }

  // 3) 插在 </header> 之后
  html = html.replace('</header>', '</header>\n\n' + drawerMarkup());
  writeFileSync(path, html, 'utf8');

  const after = {
    toggle: countOf(html, 'id="mnav-toggle"'),
    links: countOf(html, 'class="mnav-links"'),
    drawer: countOf(html, 'class="mnav-drawer"'),
    headerClose: countOf(html, '</header>')
  };
  const good = after.toggle === 1 && after.links === 1 && after.drawer === 1 && after.headerClose === 1;
  if (good) ok++;
  console.log(`  ${page}  ${good ? '✓ 侧栏已写入' : '✗ ' + JSON.stringify(after)}`);
}

console.log(`\n成功 ${ok} / ${PAGES.length} 个页面`);

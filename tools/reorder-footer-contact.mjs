/*
 * 重排页脚「联系方式」清单，并新增「创想时代 · 反馈建议」群。
 *
 * 新顺序：反馈建议 → 对外审核 → 开发理事会 → 对外交流 →
 *         我的世界中国版资源中心搜索 → 网易大神 → 哔哩哔哩 → 抖音
 *
 * 注意：站内不再放「本站源码」的 GitHub 链接，别加到这份清单里。
 *
 * 十个页面的页脚是各自写死的，这里按同一份清单重写，保证全站一致。
 * 用法：node tools/reorder-footer-contact.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const PAGES = [
  'index.html', 'about.html', 'works.html', 'work.html',
  'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html',
  'news.html', 'join.html'
];

const ITEMS = [
  '<li>创想时代 · 反馈建议：<span data-fill="qqFeedback">—</span></li>',
  '<li>对外审核群：<span data-fill="qqAudit">—</span></li>',
  '<li>开发理事会：<span data-fill="qqCouncil">—</span></li>',
  '<li>对外交流群：<span data-fill="qqPublic">—</span></li>',
  '<li>我的世界中国版资源中心搜索：<span data-fill="neteaseMc">—</span></li>',
  '<li>网易大神：<span data-fill="neteaseHd">—</span></li>',
  '<li>哔哩哔哩：<a href="#" data-fill-href="bilibili" target="_blank" rel="noopener" data-fill="bilibiliName">—</a></li>',
  '<li>抖音：<span data-fill="douyin">—</span></li>'
  // 不要在这里加回 GitHub：站内不再暴露本站源码地址
];

let touched = 0;
for (const page of PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;
  const eol = html.includes('\r\n') ? '\r\n' : '\n';

  // 只替换 <h4>联系方式</h4> 之后紧跟的那个 <ul>…</ul>
  const re = /(<h4>联系方式<\/h4>\s*<ul>)([\s\S]*?)(<\/ul>)/;
  if (!re.test(html)) {
    console.log(`  ${page.padEnd(18)} ✗ 找不到页脚联系方式块`);
    continue;
  }

  const body = ITEMS.map((it) => '          ' + it).join(eol);
  html = html.replace(re, (m, head, _inner, tail) => head + eol + body + eol + '        ' + tail);

  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    touched++;
    const n = (html.match(/data-fill="/g) || []).length;
    console.log(`  ${page.padEnd(18)} 已重写（${eol === '\r\n' ? 'CRLF' : 'LF'}）`);
  } else {
    console.log(`  ${page.padEnd(18)} 无变化`);
  }
}

console.log(`\n共处理 ${touched} / ${PAGES.length} 个页面`);

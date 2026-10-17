/*
 * 统一重排全站导航顺序，并移除「联系我们」这个独立入口。
 *
 * 新顺序：首页 / 作品 / 公告 / 工具箱 / 加入我们 / 关于我们
 * 「联系我们」不再单独占导航项，改为放进「加入我们」和「关于我们」两页里。
 *
 * 桌面导航（.nav）与手机侧栏（.mnav-links）都按同一份清单重写，
 * 避免两边顺序不一致。
 *
 * 用法：node tools/reorder-nav.mjs
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

// href, data-nav, 显示文字
const LINKS = [
  ['index.html', 'home', '首页'],
  ['works.html', 'works', '作品'],
  ['news.html', 'news', '公告'],
  ['tools.html', 'tools', '工具箱'],
  ['join.html', 'join', '加入我们'],
  ['about.html', 'about', '关于我们']
];

function renderLinks(indent) {
  return LINKS
    .map(([href, key, label]) => `${indent}<a href="${href}" data-nav="${key}">${label}</a>`)
    .join('\n');
}

let touched = 0;
for (const page of PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // 文件里可能是 LF 也可能是 CRLF（git 的 autocrlf），按实际用的来
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const links = LINKS
    .map(([href, key, label]) => `      <a href="${href}" data-nav="${key}">${label}</a>`)
    .join(eol);

  // 桌面导航
  html = html.replace(
    /(<nav class="nav" aria-label="主导航">)(\r?\n)([\s\S]*?)([ \t]*<\/nav>)/,
    (m, head, nl, _inner, tail) => head + nl + links + nl + '    ' + tail
  );

  // 手机侧栏导航
  html = html.replace(
    /(<nav class="mnav-links" aria-label="手机端导航">)(\r?\n)([\s\S]*?)([ \t]*<\/nav>)/,
    (m, head, nl, _inner, tail) => head + nl + links + nl + '    ' + tail
  );

  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    touched++;
    const desk = (html.match(/data-nav="\w+"/g) || []).length;
    const hasContact = /data-nav="contact"/.test(html);
    console.log(`  ${page.padEnd(18)} 已重排（${eol === '\r\n' ? 'CRLF' : 'LF'}，data-nav ${desk} 处）${hasContact ? '  ⚠ 仍有 contact' : ''}`);
  } else {
    console.log(`  ${page.padEnd(18)} 未匹配，请人工检查`);
  }
}

console.log(`\n共处理 ${touched} / ${PAGES.length} 个页面`);

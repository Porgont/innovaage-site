/*
 * 页头收尾：
 *   1. 把 .lead 段落包成参考图里那种「细框描述块」(.page-note)
 *   2. 在 hero 末尾放 INDEX 索引占位（内容由 initPageIndex 动态生成）
 *   3. 修正上一步插入时的缩进
 *
 * 用法：node tools/archive-headers-tidy.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const PAGES = [
  'about.html', 'works.html', 'news.html', 'join.html',
  'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html'
];

let touched = 0;
const log = [];

for (const page of PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;
  const notes = [];

  // 1) 修缩进：编号行与数字行统一到 6 空格，h1 也回到 6 空格
  html = html.replace(/[ \t]*<p class="page-head__code">/g, '      <p class="page-head__code">');
  html = html.replace(/[ \t]*<p class="page-head__num"/g, '      <p class="page-head__num"');
  html = html.replace(/\n<h1 /g, '\n      <h1 ');
  html = html.replace(/\n      <h1 style="font-size:clamp\(26px,4vw,40px\)">一家/g,
    '\n      <h1 style="font-size:clamp(26px,4vw,40px)">一家');

  // 2) <p class="lead">…</p> → 细框描述块
  html = html.replace(/([ \t]*)<p class="lead">([\s\S]*?)<\/p>/g, (m, indent, inner) => {
    notes.push(1);
    // 去掉内层原来的缩进，重新排一次
    const text = inner.trim().split(/\r?\n/).map((l) => '          ' + l.trim()).join('\n');
    return `${indent}<div class="page-note">\n${indent}  <p>\n${text}\n${indent}  </p>\n${indent}</div>`;
  });

  // 3) hero 里插 INDEX 占位（在 wrap 闭合之前），只插一次
  if (!/id="page-index"/.test(html)) {
    html = html.replace(
      /(<section class="hero hero--page">[\s\S]*?)(\n[ \t]*<\/div>[ \t]*\r?\n[ \t]*<\/section>)/,
      (m, body, tail) => body + '\n\n      <div class="page-index" id="page-index" hidden></div>' + tail
    );
  }

  if (html !== before) { writeFileSync(path, html, 'utf8'); touched++; }
  log.push(`  ${page.padEnd(20)} 细框 ${notes.length} 处${/id="page-index"/.test(html) ? '，INDEX 已放' : '，⚠ 未放 INDEX'}`);
}

console.log(log.join('\n'));
console.log(`\n共处理 ${touched} / ${PAGES.length} 个页面`);

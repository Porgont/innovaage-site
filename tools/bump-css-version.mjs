/* 给所有页面的 CSS 链接换一个版本号，强制浏览器重新下载样式表。
   GitHub Pages 给 style.css 设了 max-age=600，不改链接的话
   改动可能十分钟内看不到。改了版本号就是新 URL，缓存直接失效。

   用法：
     node tools/bump-css-version.mjs           用今天的日期（20261018）
     node tools/bump-css-version.mjs 20261102  指定版本号
*/
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = process.argv[2] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
let touched = 0;
let links = 0;

for (const page of pages) {
  const file = join(root, page);
  const raw = readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let text = raw.split('\r\n').join('\n');

  const next = text.replace(
    /((?:\/)?assets\/css\/(?:fonts|theme|style)\.css)(?:\?v=[\w.-]+)?/g,
    (_, href) => {
      links += 1;
      return `${href}?v=${VERSION}`;
    }
  );

  if (next !== text) {
    writeFileSync(file, next.split('\n').join(eol), 'utf8');
    touched += 1;
  }
}

console.log(`版本号 ${VERSION}：${touched} 个页面、${links} 处 CSS 链接已更新`);

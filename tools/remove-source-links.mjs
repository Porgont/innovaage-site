/*
 * 去掉站内所有指向「本站源码」的链接。
 *
 * 删除范围：
 *   1. 十个页面页脚「联系方式」里的 GitHub 一行
 *   2. 加入我们「联系我们」面板里的 GitHub 一行
 *   3. 关于我们「平台与官方账号」里的 GitHub 卡片
 *   4. 页脚底部的「本站由 GitHub Pages 托管」字样（不暴露托管平台）
 *   5. site.js 里 siteRepo / github 两个配置项
 *
 * 不动的：matoga 页里指向「芝世」那个第三方项目的 GitHub 链接 ——
 * 那是别人的开源库，MIT 要求署名与来源，和本站源码无关。
 *
 * 用法：node tools/remove-source-links.mjs
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

let total = 0;
const log = [];

for (const page of PAGES) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // 1) 页脚里的 GitHub 一行（含缩进与换行）
  html = html.replace(/[ \t]*<li>GitHub：<a href="#" data-fill-href="siteRepo"[\s\S]*?<\/li>\r?\n/g, '');

  // 4) 页脚底部：去掉托管平台字样，只留域名
  html = html.replace(
    /<span>本站由 GitHub Pages 托管 · <a href="https:\/\/innovaage\.cn">innovaage\.cn<\/a><\/span>/g,
    '<span><a href="https://innovaage.cn">innovaage.cn</a></span>'
  );

  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    total++;
    log.push(`  ${page.padEnd(18)} 已清理`);
  } else {
    log.push(`  ${page.padEnd(18)} 没有需要清理的内容`);
  }
}

/* 关于我们：「平台与官方账号」里的 GitHub 卡片整块删掉 */
{
  const path = join(root, 'about.html');
  let html = readFileSync(path, 'utf8');
  const before = html;
  html = html.replace(
    /[ \t]*<div class="feature">\r?\n[ \t]*<span class="icon" aria-hidden="true">🐙<\/span>\r?\n[ \t]*<div><h3>GitHub<\/h3><p><a href="#" data-fill-href="siteRepo"[\s\S]*?<\/p><\/div>\r?\n[ \t]*<\/div>\r?\n/,
    ''
  );
  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    log.push('  about.html         GitHub 卡片已删除');
  } else {
    log.push('  about.html         GitHub 卡片未匹配，请人工检查');
  }
}

/* 加入我们：「联系我们」面板里的 GitHub 一行 */
{
  const path = join(root, 'join.html');
  let html = readFileSync(path, 'utf8');
  const before = html;
  html = html.replace(
    /[ \t]*<div class="contact-item" data-row>\r?\n[ \t]*<span class="icon" aria-hidden="true">🐙<\/span>\r?\n[ \t]*<div class="info">\r?\n[ \t]*<span>GitHub（本网站源码）<\/span>\r?\n[ \t]*<b data-fill="siteRepo">—<\/b>\r?\n[ \t]*<\/div>\r?\n[ \t]*<button class="copy-btn" type="button" data-copy-target="siteRepo">复制<\/button>\r?\n[ \t]*<\/div>\r?\n/,
    ''
  );
  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    log.push('  join.html          GitHub 联系行已删除');
  } else {
    log.push('  join.html          GitHub 联系行未匹配，请人工检查');
  }
}

/* site.js：清掉 siteRepo / github 两个配置项 */
{
  const path = join(root, 'assets', 'js', 'site.js');
  let js = readFileSync(path, 'utf8');
  const before = js;
  js = js.replace(/[ \t]*github: 'https:\/\/github\.com\/porgont',\r?\n/, '');
  js = js.replace(/[ \t]*siteRepo: 'https:\/\/github\.com\/porgont\/innovaage-site',\r?\n/, '');
  js = js.replace(/[ \t]*github: 'github',\r?\n/, '');
  js = js.replace(/[ \t]*siteRepo: 'siteRepo',\r?\n/, '');
  if (js !== before) {
    writeFileSync(path, js, 'utf8');
    log.push('  site.js            配置项已清理');
  } else {
    log.push('  site.js            配置项未匹配，请人工检查');
  }
}

console.log(log.join('\n'));
console.log(`\n共处理 ${total} / ${PAGES.length} 个页面的页脚`);

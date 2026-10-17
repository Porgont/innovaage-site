/* 简易站点自检：文件存在性、id 引用、链接、标签闭合、JS 语法 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import http from 'node:http';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const errors = [];
const warns = [];
const ok = [];

const pages = ['index.html', 'about.html', 'works.html', 'work.html', 'article.html', 'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html', 'tools-convert.html', 'news.html', 'join.html', '404.html'];

/* ---------- 1. 关键文件存在 ---------- */
const required = [
  'index.html', 'about.html', 'works.html', 'work.html', 'tools.html', 'news.html', 'join.html', '404.html',
  'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', 'README.md', '.gitignore',
  'assets/css/theme.css', 'assets/css/style.css', 'assets/js/site.js',
  'assets/img/shader-1.jpg', 'assets/img/shader-2.jpg', 'assets/img/shader-3.jpg',
  'assets/img/logo-mark.png', 'assets/img/logo-full.jpg', 'assets/img/og-image.jpg',
  'assets/img/favicon-32.png', 'assets/img/apple-touch-icon.png'
];
for (const f of required) {
  if (!existsSync(join(root, f))) errors.push(`缺少文件: ${f}`);
  else ok.push(`存在 ${f}`);
}

/* ---------- 2. CNAME 内容 ---------- */
if (existsSync(join(root, 'CNAME'))) {
  const c = readFileSync(join(root, 'CNAME'), 'utf8').trim();
  if (c !== 'innovaage.cn') errors.push(`CNAME 内容应为 innovaage.cn，实际为 "${c}"`);
  else ok.push('CNAME 内容正确');
}

/* ---------- 3. JS 语法（Node 解析） ---------- */
try {
  new vm.Script(readFileSync(join(root, 'assets/js/site.js'), 'utf8'), { filename: 'site.js' });
  ok.push('site.js 语法通过');
} catch (e) {
  errors.push(`site.js 语法错误: ${e.message}`);
}

/* ---------- 4. 样式括号平衡 ---------- */
for (const cssFile of ['assets/css/style.css', 'assets/css/theme.css']) {
  const css = readFileSync(join(root, cssFile), 'utf8');
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open !== close) errors.push(`${cssFile} 花括号不平衡: { ${open} 个, } ${close} 个`);
  else ok.push(`${cssFile} 花括号平衡 (${open} 对)`);
}

/* ---------- 4.5 主题：三套取值是否齐全 ---------- */
{
  const theme = readFileSync(join(root, 'assets/css/theme.css'), 'utf8');

  // 变量名清单（取默认那套的变量名作为基准）
  // 注意两点：用 [ \t]* 而不是 \s*（否则吃掉换行）；用行首锚定的 search 而不是 indexOf
  // （否则会命中文件头注释里写的 "@media ..." 字样，切出一段空注释）
  const varRe = /^[ \t]*(--[a-z0-9-]+)[ \t]*:/gim;
  const mediaAt = theme.search(/^@media \(prefers-color-scheme: dark\)/m);
  const lightAt = theme.search(/^html\[data-theme="light"\]/m);
  const darkExplicitAt = theme.search(/^html\[data-theme="dark"\]/m);

  const baseVars = new Set([...theme.slice(0, mediaAt).matchAll(varRe)].map(m => m[1]));

  if (baseVars.size < 10 || mediaAt < 0 || lightAt < 0 || darkExplicitAt < 0) {
    errors.push(`theme.css：变量解析异常（基准 ${baseVars.size} 个，段落位置 ${mediaAt}/${lightAt}/${darkExplicitAt}）`);
  }

  const darkVars = new Set([...theme.slice(mediaAt, lightAt).matchAll(varRe)].map(m => m[1]));
  const explicitDarkVars = new Set([...theme.slice(darkExplicitAt).matchAll(varRe)].map(m => m[1]));

  // 这几个是尺寸 / 字体，与深浅无关，不需要在深色分支里重复定义
  const themeNeutral = new Set([
    '--radius', '--pad', '--maxw', '--font', '--mono',
    // 展示字体与切角尺寸同样与主题无关
    '--display', '--cut'
  ]);

  const missingInMedia = [...baseVars].filter(v => !themeNeutral.has(v) && !darkVars.has(v));
  const missingInExplicit = [...baseVars].filter(v => !themeNeutral.has(v) && !explicitDarkVars.has(v));

  if (missingInMedia.length) {
    errors.push(`theme.css：系统深色分支缺少变量 -> ${missingInMedia.join(', ')}`);
  }
  if (missingInExplicit.length) {
    errors.push(`theme.css：data-theme="dark" 缺少变量 -> ${missingInExplicit.join(', ')}`);
  }

  if (!missingInMedia.length && !missingInExplicit.length) {
    ok.push(`theme.css 三套主题变量齐全（各 ${baseVars.size} 个）`);
  }

  // 页面里不许再出现写死的深浅主题色
  const hardcoded = ['#0f1319', '#1a212b', '#212936', '#2c3644', '#0e1a09'];
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    const hit = hardcoded.filter(h => html.toLowerCase().includes(h));
    if (hit.length) warns.push(`${page}: 出现旧深色主题的写死色值 ${hit.join(', ')}`);
  }
}

/* ---------- 5. 逐页检查 ---------- */
const allIds = new Map();  // page -> Set(ids)

for (const page of pages) {
  const p = join(root, page);
  if (!existsSync(p)) continue;
  const html = readFileSync(p, 'utf8');

  // 5.1 html 标签闭合粗查
  for (const tag of ['html', 'head', 'body', 'main', 'header', 'footer']) {
    const o = (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
    const c = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (o !== c) errors.push(`${page}: <${tag}> 开合不匹配 (${o} 开 / ${c} 闭)`);
  }

  // 5.2 id 唯一性
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) errors.push(`${page}: 重复 id -> ${[...new Set(dup)].join(', ')}`);
  allIds.set(page, new Set(ids));

  // 5.3 aria-controls / labelledby 目标存在
  for (const m of html.matchAll(/(aria-controls|aria-labelledby|for)="([^"]+)"/g)) {
    if (m[1] === 'for' && !/^f-|^intro|^roles/.test(m[2])) continue;
    if (!ids.includes(m[2])) errors.push(`${page}: ${m[1]}="${m[2]}" 指向不存在的 id`);
  }

  // 5.4 本地链接检查
  for (const m of html.matchAll(/(?<![\w-])(?:href|src)="([^"]*)"/g)) {
    const href = m[1];
    if (href === '' || href === '#') continue;   // 占位链接，由 JS 填充
    if (/^(https?:|mailto:|data:|tel:)/.test(href)) continue;
    if (href.startsWith('#')) {
      if (!ids.includes(href.slice(1))) errors.push(`${page}: 页内锚点 ${href} 不存在`);
      continue;
    }
    const [filePart] = href.split('#');
    const target = href.startsWith('/')
      ? join(root, filePart.slice(1))
      : join(root, dirname(page), filePart);
    if (!existsSync(target)) errors.push(`${page}: 链接指向不存在的文件 -> ${href}`);
  }

  // 5.5 中文编码检查
  if (!/charset="?UTF-8/i.test(html)) errors.push(`${page}: 缺少 UTF-8 声明`);
  if (!/lang="zh-CN"/.test(html)) warns.push(`${page}: 未声明 lang="zh-CN"`);

  // 5.5b 主题三件套：样式表 + 防闪烁脚本 + （有导航的页面）切换按钮
  if (!/assets\/css\/theme\.css/.test(html)) errors.push(`${page}: 没引入 theme.css`);
  if (!/ia-theme/.test(html)) errors.push(`${page}: 缺少防闪烁的主题内联脚本`);
  for (const p of ['index.html', 'about.html', 'works.html', 'work.html', 'tools.html', 'news.html', 'join.html']) {
    if (page === p && !/id="theme-toggle"/.test(html)) errors.push(`${page}: 缺少主题切换按钮`);
  }

  // 5.5c 品牌资源：分享图、favicon、导航栏 logo
  if (!/property="og:image"/.test(html)) errors.push(`${page}: 缺少 og:image 分享图`);
  if (!/favicon-32\.png/.test(html)) errors.push(`${page}: 缺少 favicon`);
  if (page !== '404.html' && !/logo-mark\.png/.test(html)) errors.push(`${page}: 导航栏没有用真 logo`);

  // 5.6 SEO 基础
  if (!/<meta name="description"/.test(html)) warns.push(`${page}: 缺少 meta description`);
  if (!/<title>/.test(html)) errors.push(`${page}: 缺少 <title>`);

  // 5.7 表单控件有 label
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = m[2];
    const type = (attrs.match(/type="([^"]+)"/) || [, 'text'])[1];
    if (['hidden', 'submit', 'button', 'reset', 'checkbox'].includes(type)) continue;
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    if (!id) { warns.push(`${page}: ${m[1]} 没有 id，无法关联 label`); continue; }
    if (!new RegExp(`for="${id}"`).test(html)) warns.push(`${page}: ${m[1]}#${id} 没有对应 label`);
  }
}

/* ---------- 6. 首页公告容器 ---------- */
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
if (!/id="notice-list"/.test(indexHtml)) errors.push('index.html 缺少 #notice-list');
const newsHtml = readFileSync(join(root, 'news.html'), 'utf8');
if (!/id="notice-filter"/.test(newsHtml)) errors.push('news.html 缺少 #notice-filter');

/* ---------- 7. join.html 两个面板 + 问卷入口 ---------- */
const joinHtml = readFileSync(join(root, 'join.html'), 'utf8');
for (const pid of ['panel-form', 'panel-invest', 'panel-contact', 'panel-rules']) {
  if (!joinHtml.includes(`id="${pid}"`)) errors.push(`join.html 缺少 #${pid}`);
}
if (!/id="survey-link"/.test(joinHtml)) errors.push('join.html 缺少问卷入口 #survey-link');
if (/<form\b/i.test(joinHtml)) errors.push('join.html 不应再有 <form>（问卷已改为问卷星外链）');

/* ---------- 7.5 三个 QQ 群号在四个页面都齐 ---------- */
const allPages = ['index.html', 'about.html', 'works.html', 'work.html', 'article.html', 'tools.html', 'tools-image.html', 'tools-video.html', 'tools-matoga.html', 'tools-convert.html', 'news.html', 'join.html'];
for (const page of allPages) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const key of ['qqPublic', 'qqAudit', 'qqCouncil']) {
    if (!html.includes(`data-fill="${key}"`) && !html.includes(`data-copy-target="${key}"`)) {
      warns.push(`${page}: 没有出现 ${key}（页脚/正文可能漏了）`);
    }
  }
}

/* ---------- 7.6 配置里的三个群号与文案一致 ---------- */
const jsText = readFileSync(join(root, 'assets/js/site.js'), 'utf8');
for (const [key, num] of [['qqAudit', '1045216325'], ['qqPublic', '788233856'], ['qqCouncil', '1018260006']]) {
  if (!new RegExp(`${key}:\\s*'${num}'`).test(jsText)) {
    errors.push(`site.js 里 ${key} 不是 ${num}`);
  }
}

/* ---------- 8. 起本地服务 + HTTP 请求 4 个页面 ---------- */
const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const f = join(root, url);
  if (!existsSync(f) || !statSync(f).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(join(root, '404.html')));
    return;
  }
  const ext = extname(f);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain' };
  res.writeHead(200, { 'Content-Type': (types[ext] || 'application/octet-stream') + '; charset=utf-8' });
  res.end(readFileSync(f));
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const fetched = [];
for (const path of ['/', '/about.html', '/works.html', '/work.html', '/tools.html', '/news.html', '/join.html', '/assets/css/theme.css', '/assets/css/style.css', '/assets/js/site.js', '/assets/img/logo-mark.png', '/assets/img/og-image.jpg', '/sitemap.xml', '/robots.txt']) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await res.text();
  fetched.push(`${path} -> ${res.status} (${body.length} 字节)`);
  if (res.status !== 200) errors.push(`HTTP ${path} 返回 ${res.status}`);
  if (path === '/' && !body.includes('创想时代开发组')) errors.push('首页内容异常：找不到站名');
  if (path === '/assets/js/site.js' && !body.includes('SITE_CONFIG')) errors.push('site.js 内容异常');
}
const notFound = await fetch(`http://127.0.0.1:${port}/no-such-page`);
if (notFound.status !== 404) errors.push(`404 处理异常：返回 ${notFound.status}`);
else ok.push('404 页面正常返回');

server.close();

/* ---------- 8.5 递归列出文件 ---------- */
function walk(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}
const files = walk(root).sort();

/* ---------- 输出 ---------- */
console.log('\n=== 站点文件 ===');
files.forEach(f => console.log('  ' + f));

console.log('\n=== HTTP 自检 ===');
fetched.forEach(f => console.log('  ' + f));

console.log('\n=== 通过 ===');
ok.forEach(o => console.log('  ✓ ' + o));

if (warns.length) {
  console.log('\n=== 提醒（不阻断） ===');
  warns.forEach(w => console.log('  ! ' + w));
}

if (errors.length) {
  console.log('\n=== 错误 ===');
  errors.forEach(e => console.log('  ✗ ' + e));
  console.log(`\n合计 ${errors.length} 个错误`);
  process.exit(1);
} else {
  console.log('\n全部检查通过，无错误。');
}

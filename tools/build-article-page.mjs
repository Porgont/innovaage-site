/*
 * 生成公告详情页 article.html。
 *
 * 直接拿 news.html 当模板：head / 页眉 / 页脚 / 侧栏全部沿用，
 * 只替换 <main> 里的内容和 title/description/canonical。
 * 这样以后改页眉页脚只需要改 news.html 再重跑这个脚本。
 *
 * 用法：node tools/build-article-page.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

let html = readFileSync(join(root, 'news.html'), 'utf8');

const MAIN = `<main id="main">

  <!-- ============ 公告详情 ============ -->
  <section class="hero hero--page">
    <div class="wrap">
      <p class="crumb"><a href="news.html">公告</a> / 正文</p>
      <p class="page-head__code">INDEX <span>/</span> 03 <span>/</span> <b>NEWS</b></p>
      <p class="page-head__num" aria-hidden="true">03</p>
      <h1 id="article-name">公告</h1>
      <div class="article-meta" id="article-meta"></div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div id="article-detail">
        <div class="panel">
          <p style="margin:0;color:var(--text-dim)">正在读取公告…</p>
        </div>
      </div>

      <div class="btn-row" style="margin-top:30px">
        <a class="btn btn--ghost btn--sm" href="news.html">← 回公告列表</a>
      </div>
    </div>
  </section>

</main>`;

const start = html.indexOf('<main id="main">');
const end = html.indexOf('</main>');
if (start < 0 || end < 0) {
  console.error('在 news.html 里找不到 <main> 区块');
  process.exit(1);
}

html = html.slice(0, start) + MAIN + html.slice(end + '</main>'.length);

// 标题与描述
html = html.replace(/<title>[^<]*<\/title>/, '<title>公告正文 | 创想时代开发组</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="创想时代开发组的公告正文。版本发布、招募通知、合作与联动等信息。">'
);
html = html.replace(
  /<link rel="canonical" href="[^"]*">/,
  '<link rel="canonical" href="https://innovaage.cn/article.html">'
);
html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://innovaage.cn/article.html">');

writeFileSync(join(root, 'article.html'), html, 'utf8');
console.log('  已生成 article.html');
console.log('  页面里的 id 检查：' + ['article-detail', 'article-name', 'article-meta'].map((id) => (html.includes(`id="${id}"`) ? id + '✓' : id + '✗')).join(' '));

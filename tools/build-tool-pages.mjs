/*
 * 把工具箱拆成「入口页 + 三个独立模块页」的一次性脚手架。
 *
 * 拆分原因：视频模块要支持自选导出规格，功能块变大；
 * 再加上 matoga 这个第三方工具，全塞一页会太长。
 * 拆开后每个模块一页，以后加工具只要再生成一页。
 *
 * 采用的是「生成一次、产物直接提交」的做法：
 * 线上没有构建步骤，这个脚本只是帮我保证四个页面的
 * 页眉、手机侧栏、页脚完全一致（这些以前手工同步过好几轮）。
 *
 * 用法：node tools/build-tool-pages.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = readFileSync(join(root, 'tools.html'), 'utf8');
const lines = src.split(/\r?\n/);

/** 取闭区间行号（1 基，含首尾） */
function slice(from, to) {
  return lines.slice(from - 1, to).join('\n');
}

// 从现有 tools.html 里切出公共部分与图片工具本体
const HEAD_END = lines.findIndex(l => l.includes('</head>')) + 1;
const DRAWER_END = lines.findIndex(l => l.includes('<!-- mobile-drawer:end -->')) + 1;
const FOOTER_START = lines.findIndex(l => l.includes('<footer class="site-footer">')) + 1;

const HEADER_BLOCK = slice(lines.findIndex(l => l.includes('<header class="site-header">')) + 1, DRAWER_END);
const FOOTER_BLOCK = slice(FOOTER_START, lines.length);

// 图片工具：从 Tool 01 的 section-head 到 .tool 收尾
const IMG_START = lines.findIndex(l => l.includes('<span class="kicker">Tool 01</span>')) - 1;
const IMG_END = lines.findIndex((l, i) => i > IMG_START && l.trim() === '<!-- ============================================================' &&
  lines[i + 1] && lines[i + 1].includes('Tool 02')) - 1;
const IMG_BLOCK = slice(IMG_START + 1, IMG_END);

if (!IMG_BLOCK.includes('id="dropzone"') || !IMG_BLOCK.includes('id="run-btn"')) {
  console.error('✗ 没能正确切出图片工具块，请检查 tools.html 结构');
  process.exit(1);
}

/* ---------- 页面外壳 ---------- */
function shell({ title, desc, keywords, canonical, extraHead = '', content, scripts }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${keywords}">
<link rel="canonical" href="https://innovaage.cn/${canonical}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1013" media="(prefers-color-scheme: dark)">

<meta property="og:type" content="website">
<meta property="og:site_name" content="创想时代开发组">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="https://innovaage.cn/${canonical}">
<meta property="og:image" content="https://innovaage.cn/assets/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://innovaage.cn/assets/img/og-image.jpg">
${extraHead}
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<!-- 主题：在页面渲染前决定用哪套，避免刷新时闪一下 -->
<script>
(function () {
  try {
    var t = localStorage.getItem('ia-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
</script>
<link rel="stylesheet" href="assets/css/theme.css">
<link rel="stylesheet" href="assets/css/style.css">
</head>

<body data-page="tools">
<a class="skip-link" href="#main">跳到主要内容</a>

${HEADER_BLOCK}

<main id="main">

${content}

</main>

${FOOTER_BLOCK.replace(/\s*<script[\s\S]*$/, '')}
${scripts}
</body>
</html>
`;
}

const SCRIPTS_BASE = `<script src="assets/js/site.js"></script>`;

/* ---------- 1. 入口页 ---------- */
const hubContent = `  <section class="hero" style="padding:52px 0 34px">
    <div class="wrap">
      <p class="hero-badge"><span class="dot" aria-hidden="true"></span> 工具箱</p>
      <h1 style="font-size:clamp(26px,4vw,38px)">投稿用的工具箱</h1>
      <p class="lead">
        三个模块，各管一件事。图片和视频都在你的浏览器里处理，
        <b>文件不上传任何服务器</b>，关掉页面就什么都不剩。
      </p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="module-grid">

        <a class="module-card module-card--img" href="tools-image.html">
          <span class="module-tag">Tool 01</span>
          <b class="module-name">图片处理</b>
          <span class="module-desc">把图片压到指定分辨率以内，等比缩放不变形。投稿长图默认压到 1000×4000 以内。</span>
          <span class="module-go">打开工具 →</span>
        </a>

        <a class="module-card module-card--video" href="tools-video.html">
          <span class="module-tag">Tool 02</span>
          <b class="module-name">视频处理</b>
          <span class="module-desc">诊断时长／分辨率／编码，按投稿规范一键转换，也能自定义比例、分辨率与编码（H.264）。</span>
          <span class="module-go">打开工具 →</span>
        </a>

        <a class="module-card module-card--ext" href="tools-matoga.html">
          <span class="module-tag">Tool 03 · 组员作品</span>
          <b class="module-name">matoga 材质贴图对比</b>
          <span class="module-desc">芝世 开发的桌面应用：两个文件夹的材质贴图差异对比 + 3D PBR 实时预览。Windows / macOS / Linux。</span>
          <span class="module-go">了解与下载 →</span>
        </a>

      </div>

      <div class="callout" style="margin-top:32px">
        <span class="icon" aria-hidden="true">🛈</span>
        <div>
          前两个是网页工具，打开就能用；第三个是开发组成员做的桌面软件，需要下载安装。
          有想加的工具可以到 <a href="join.html#panel-contact">联系我们</a> 提。
        </div>
      </div>
    </div>
  </section>`;

/* ---------- 2. 图片处理 ---------- */
const imageContent = `  <section class="hero" style="padding:52px 0 30px">
    <div class="wrap">
      <p class="crumb"><a href="tools.html">工具箱</a> / 图片处理</p>
      <h1 style="font-size:clamp(24px,3.6vw,34px)">图片压到指定分辨率以内</h1>
      <p class="lead">
        默认上限 <b>宽 1000 × 高 4000</b>（竖长画布，不是 4000×1000）。等比缩放，不会变形。
        <b>图片不会上传到任何服务器</b>。
      </p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
${IMG_BLOCK}

      <div class="btn-row" style="margin-top:36px">
        <a class="btn btn--ghost btn--sm" href="tools.html">← 回工具箱</a>
        <a class="btn btn--ghost btn--sm" href="tools-video.html">视频处理 →</a>
      </div>
    </div>
  </section>`;

/* ---------- 3. 视频处理 ---------- */
const videoContent = `  <section class="hero" style="padding:52px 0 30px">
    <div class="wrap">
      <p class="crumb"><a href="tools.html">工具箱</a> / 视频处理</p>
      <h1 style="font-size:clamp(24px,3.6vw,34px)">视频诊断与转换</h1>
      <p class="lead">
        投稿要求：<b>时长 1 分 30 秒以内、编码 H.264、MP4 格式、画面 16:9</b>。
        选「符合投稿规范」一键转成合格版本；也可以自定义比例、分辨率与编码，当通用转换器用。
      </p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="tool">

        <!-- ---------- 左：选文件与设置 ---------- -->
        <div class="tool-col">
          <div class="panel">
            <h3 style="margin-top:0">1. 选择视频</h3>

            <label class="dropzone" id="v-dropzone" for="v-file-input" tabindex="0">
              <span class="dropzone-icon" aria-hidden="true">🎬</span>
              <b>点这里选视频，或把视频拖进来</b>
              <span>建议先自己压到 200MB 以内，太大的文件浏览器处理会很慢</span>
              <input type="file" id="v-file-input" accept="video/*" hidden>
            </label>

            <div class="file-list" id="v-file-list" hidden></div>
          </div>

          <div class="panel" style="margin-top:18px">
            <h3 style="margin-top:0">2. 导出规格</h3>

            <div class="field">
              <label>预设</label>
              <div class="preset-row">
                <button class="chip is-active" type="button" data-preset="submit">符合投稿规范</button>
                <button class="chip" type="button" data-preset="p1080">1080P</button>
                <button class="chip" type="button" data-preset="p720">720P</button>
                <button class="chip" type="button" data-preset="custom">自定义</button>
              </div>
            </div>

            <p class="note" id="v-lock-note">
              「符合投稿规范」= 1280×720 · 16:9 · H.264 · MP4 · 最长 90 秒。
              这一档的数值是投稿要求，已锁定；需要别的规格请换预设或选「自定义」。
            </p>

            <div class="field" style="margin-top:18px">
              <label>画面比例</label>
              <div class="preset-row">
                <button class="chip" type="button" data-ratio="source">原样</button>
                <button class="chip is-active" type="button" data-ratio="16:9">16:9</button>
                <button class="chip" type="button" data-ratio="9:16">9:16</button>
                <button class="chip" type="button" data-ratio="4:3">4:3</button>
                <button class="chip" type="button" data-ratio="1:1">1:1</button>
              </div>
            </div>

            <div class="size-row" style="margin-top:16px">
              <div class="field">
                <label for="v-out-w">宽（像素）</label>
                <input type="number" id="v-out-w" value="1280" min="16" max="3840" step="16">
              </div>
              <span style="text-align:center;color:var(--text-mute);font-size:13px">×</span>
              <div class="field">
                <label for="v-out-h">高（像素）</label>
                <input type="number" id="v-out-h" value="720" min="16" max="3840" step="16">
              </div>
            </div>

            <div class="field" style="margin-top:16px">
              <label>画面不是目标比例时 <span class="hint">源视频和输出比例不一样怎么处理</span></label>
              <div class="preset-row">
                <button class="chip is-active" type="button" data-fit="pad">加黑边（画面完整）</button>
                <button class="chip" type="button" data-fit="crop">裁切填满（无黑边）</button>
              </div>
            </div>

            <div class="size-row" style="margin-top:16px">
              <div class="field">
                <label for="v-codec">编码</label>
                <select id="v-codec">
                  <option value="h264">H.264 (AVC)</option>
                  <option value="h265">H.265 (HEVC)</option>
                </select>
              </div>
              <span style="text-align:center;color:var(--text-mute);font-size:13px">/</span>
              <div class="field">
                <label for="v-max-dur">最长时长（秒）</label>
                <input type="number" id="v-max-dur" value="90" min="1" max="600" step="1">
              </div>
            </div>

            <div class="field" style="margin-top:16px">
              <label for="v-max-mb">最大体积（MB）<span class="hint">0 = 不限，仅用于检查</span></label>
              <input type="number" id="v-max-mb" value="0" min="0" max="2000" step="1">
            </div>

            <p class="note" id="v-h265-note" hidden>
              ⚠ 你的浏览器不支持 H.265 编码，这一项已置灰。想看 H.265 效果可用系统自带的
              视频工具或 ffmpeg 再转一次（投稿只要求 H.264，通常不需要 H.265）。
            </p>

            <p class="note" id="v-spec-summary" style="font-family:var(--mono)"></p>

            <div class="btn-row" style="margin-top:20px">
              <button class="btn" type="button" id="v-run-btn" disabled>开始转换</button>
              <button class="btn btn--ghost" type="button" id="v-clear-btn" disabled>清空</button>
            </div>

            <div class="progress" id="v-progress" hidden>
              <div class="progress-bar"><i id="v-progress-fill" style="width:0%"></i></div>
              <span id="v-progress-text">准备中…</span>
            </div>
          </div>
        </div>

        <!-- ---------- 右：诊断与结果 ---------- -->
        <div class="tool-col">
          <div class="panel">
            <h3 style="margin-top:0">3. 诊断</h3>
            <dl class="stat-list" id="v-diag">
              <div><dt>状态</dt><dd>等待选择文件…</dd></div>
            </dl>
            <p class="note" id="v-plan">选好文件后会告诉你具体要改什么。</p>
          </div>

          <div class="panel" style="margin-top:18px;display:flex;flex-direction:column;min-height:280px">
            <h3 style="margin-top:0">4. 结果</h3>

            <div class="preview-empty" id="v-preview-empty">
              <span aria-hidden="true">🎞️</span>
              <p>转换完成后这里会显示结果视频，并自动复检一遍是否符合目标规格。</p>
            </div>

            <div class="preview-wrap" id="v-preview-wrap" hidden>
              <div class="preview-box">
                <video id="v-preview" controls playsinline style="max-width:100%;max-height:340px"></video>
              </div>
              <dl class="stat-list" id="v-result-stats"></dl>
              <div class="btn-row">
                <a class="btn" id="v-download" download>下载结果</a>
              </div>
            </div>

            <div class="form-status" id="v-status" hidden role="status" aria-live="polite"></div>
          </div>

          <div class="callout" style="margin-top:18px">
            <span class="icon" aria-hidden="true">⏱️</span>
            <div>
              <b>关于耗时：</b>转换是边播放边录制，耗时大致等于视频时长
              （90 秒的视频约需 90 秒）。转换期间请保持页面在前台，不要切走。
            </div>
          </div>

          <div class="callout" style="margin-top:14px">
            <span class="icon" aria-hidden="true">ℹ️</span>
            <div>
              <b>已知限制：</b>编码检测基于 MP4 容器，只对 MP4 / MOV 类文件有效；
              WebM、MKV 等会提示「不是 MP4 容器」，转换时重新编码。重编码会有画质损失。
              H.265 能否输出取决于浏览器与显卡，不支持时会自动置灰。
            </div>
          </div>
        </div>

      </div>

      <div class="btn-row" style="margin-top:36px">
        <a class="btn btn--ghost btn--sm" href="tools.html">← 回工具箱</a>
        <a class="btn btn--ghost btn--sm" href="tools-image.html">← 图片处理</a>
      </div>
    </div>
  </section>`;

/* ---------- 4. matoga ---------- */
const matogaContent = `  <section class="hero" style="padding:52px 0 30px">
    <div class="wrap">
      <p class="crumb"><a href="tools.html">工具箱</a> / matoga</p>
      <p class="hero-badge"><span class="dot" aria-hidden="true"></span> 开发组成员作品</p>
      <h1 style="font-size:clamp(24px,3.6vw,34px)">matoga · 材质贴图对比工具</h1>
      <p class="lead">
        一个基于 Electron + Three.js 的桌面应用，用于对比两个文件夹中的材质贴图内容，
        并提供 3D 实时预览。<b>作者：芝世</b>。
      </p>
      <div class="btn-row">
        <a class="btn" href="https://github.com/xiongmiaozai/matoga" target="_blank" rel="noopener">GitHub 仓库</a>
        <a class="btn btn--ghost" href="https://xiongmiaozai.github.io/matoga" target="_blank" rel="noopener">项目主页</a>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">What it does</span>
        <h2>它能做什么</h2>
        <p>做材质包、光影、皮肤时，最麻烦的是「两边到底哪里不一样」。这个工具就是为了这个。</p>
      </div>

      <div class="feature-grid">
        <div class="feature">
          <b>文件夹对比</b>
          <p>选左右两个文件夹，按名称对比内容，支持递归子目录与 MD5 哈希校验。</p>
          <ul>
            <li>五种状态分类：一致 / 内容不同 / 部分缺失 / 右侧缺失 / 右侧多余</li>
            <li>忽略规则（系统文件 + 自定义通配符）</li>
            <li>搜索、状态过滤、多字段排序</li>
          </ul>
        </div>

        <div class="feature">
          <b>材质贴图识别</b>
          <p>按后缀自动分组，认得出主贴图与配套通道图。</p>
          <ul>
            <li><code>_n</code> → 法线贴图</li>
            <li><code>_s</code> → 高光贴图（LabPBR：R 粗糙度 / G 金属度 / B 自发光 / A 掩膜）</li>
          </ul>
        </div>

        <div class="feature">
          <b>3D 材质预览</b>
          <p>用 Three.js 实时渲染，改参数立刻看到效果。</p>
          <ul>
            <li>几何体：球体、立方体、平面、圆环、圆柱、胶囊</li>
            <li>PBR 参数：金属度、粗糙度、法线强度、自发光</li>
            <li>视差遮挡映射（POM），可从法线 alpha 通道取高度图</li>
            <li>五种光照预设 + HDR 环境贴图（.hdr / .exr）</li>
            <li>透明度模式：cutout / blend / glass</li>
          </ul>
        </div>

        <div class="feature">
          <b>顺手处理文件</b>
          <p>发现差异后直接在工具里处理，不用来回切窗口。</p>
          <ul>
            <li>复制 / 备份 / 删除、批量同步到左或右侧</li>
            <li>撤销操作、在系统文件管理器中打开</li>
            <li>对比结果导出为 HTML</li>
            <li>深色 / 浅色主题，窗口配置持久化</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Get it</span>
        <h2>下载与安装</h2>
        <p>需要先装 Node.js，然后在项目目录里跑两条命令。</p>
      </div>

      <div class="tool">
        <div class="tool-col">
          <div class="panel">
            <h3 style="margin-top:0">方式一：从源码运行</h3>
            <pre class="code-block"><code>git clone https://github.com/xiongmiaozai/matoga.git
cd matoga
npm install
npm start</code></pre>
            <p class="note">开发模式（自动打开 DevTools）：<code>npm run dev</code></p>
          </div>
        </div>

        <div class="tool-col">
          <div class="panel">
            <h3 style="margin-top:0">方式二：直接用打包版</h3>
            <p style="color:var(--text-dim);font-size:14.5px">
              项目仓库的 <code>releases</code> 目录里放了三个平台的压缩包（约 13 MB）：
            </p>
            <ul style="color:var(--text-dim);font-size:14px">
              <li><a href="https://github.com/xiongmiaozai/matoga/tree/main/releases" target="_blank" rel="noopener">打开 releases 目录</a></li>
              <li>Windows / macOS / Linux 各一个 zip</li>
            </ul>
            <p class="note">
              zip 里是源码而不是安装包，解开后同样需要 <code>npm install</code>。
              想省事就用方式一。
            </p>
          </div>
        </div>
      </div>

      <div class="callout" style="margin-top:24px">
        <span class="icon" aria-hidden="true">📄</span>
        <div>
          <b>项目信息：</b>技术栈 Electron 31 + Three.js 0.186 + 原生 JavaScript（无构建工具）。
          采用 MIT License。按作者要求，使用本项目时需保留并标明
          <b>作者：芝世（xiongmiaozai）</b> 与
          <a href="https://github.com/xiongmiaozai/matoga" target="_blank" rel="noopener">来源地址</a>。
        </div>
      </div>

      <div class="btn-row" style="margin-top:32px">
        <a class="btn btn--ghost btn--sm" href="tools.html">← 回工具箱</a>
        <a class="btn btn--ghost btn--sm" href="join.html#panel-contact">反馈问题</a>
      </div>
    </div>
  </section>`;

/* ---------- 写出 ---------- */
const pages = [
  {
    file: 'tools.html',
    html: shell({
      title: '工具箱 | 创想时代开发组',
      desc: '创想时代开发组工具箱：图片压缩、视频转投稿规格，以及组员开发的材质贴图对比工具 matoga。',
      keywords: '工具箱,图片压缩,视频转换,H.264,投稿规范,matoga,材质贴图对比',
      canonical: 'tools.html',
      content: hubContent,
      scripts: SCRIPTS_BASE
    })
  },
  {
    file: 'tools-image.html',
    html: shell({
      title: '图片处理 | 工具箱 | 创想时代开发组',
      desc: '把图片压到 1000×4000 分辨率以内，等比缩放不变形。纯浏览器本地处理，图片不上传服务器。',
      keywords: '图片压缩,1000x4000,分辨率,投稿图片处理,在线工具',
      canonical: 'tools-image.html',
      content: imageContent,
      scripts: SCRIPTS_BASE + '\n<script src="assets/js/toolbox.js"></script>'
    })
  },
  {
    file: 'tools-video.html',
    html: shell({
      title: '视频处理 | 工具箱 | 创想时代开发组',
      desc: '诊断视频时长、分辨率、比例与编码，按投稿规范一键转成 H.264 / MP4 / 16:9，也可自定义比例与分辨率。',
      keywords: '视频转换,H.264,MP4,16比9,投稿视频规格,改分辨率,改比例',
      canonical: 'tools-video.html',
      content: videoContent,
      scripts: SCRIPTS_BASE + '\n<script src="assets/vendor/mp4box.all.min.js"></script>\n<script src="assets/js/video-tool.js"></script>'
    })
  },
  {
    file: 'tools-matoga.html',
    html: shell({
      title: 'matoga 材质贴图对比 | 工具箱 | 创想时代开发组',
      desc: 'matoga：基于 Electron + Three.js 的材质贴图对比工具，支持双文件夹差异比对与 3D PBR 实时预览。作者芝世。',
      keywords: 'matoga,材质贴图对比,法线贴图,PBR,Three.js,Electron',
      canonical: 'tools-matoga.html',
      content: matogaContent,
      scripts: SCRIPTS_BASE
    })
  }
];

for (const p of pages) {
  writeFileSync(join(root, p.file), p.html, 'utf8');
  console.log(`  写出 ${p.file}  (${p.html.split('\n').length} 行)`);
}

console.log('\n完成。');

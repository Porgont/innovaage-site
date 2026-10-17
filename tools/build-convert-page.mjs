/*
 * 生成「格式转换」工具页 tools-convert.html。
 *
 * 拿 tools-image.html 当模板：head / 页眉 / 侧栏 / 页脚全部沿用，
 * 只替换 <main> 内容与 title/description/canonical，并在末尾挂上转换脚本。
 * 以后改页眉页脚，改 tools-image.html 再重跑这个脚本即可。
 *
 * 用法：node tools/build-convert-page.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

let html = readFileSync(join(root, 'tools-image.html'), 'utf8');

const MAIN = `<main id="main">

  <section class="hero hero--page">
    <div class="wrap">
      <p class="crumb"><a href="tools.html">工具箱</a> / 格式转换</p>
      <p class="page-head__code">INDEX <span>/</span> 04 <span>/</span> <b>TOOLS · CONVERT</b></p>
      <p class="page-head__num" aria-hidden="true">04</p>
      <h1 style="font-size:clamp(24px,3.6vw,34px)">格式转换</h1>
      <div class="page-note">
        <p>
          全部在浏览器本地完成，文件不上传服务器。
        </p>
      </div>

      <div class="page-index" id="page-index" hidden></div>
    </div>
  </section>

  <!-- ============ 一、音频提取 ============ -->
  <section class="section section--tight" id="audio">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Audio</span>
        <h2>音频提取</h2>
        <p>从视频或音频文件里抽出音轨，输出无损 WAV。</p>
      </div>

      <div class="panel">
        <label class="dropzone" id="audio-dropzone" for="audio-input" tabindex="0">
          <span class="dropzone-icon" aria-hidden="true">🎵</span>
          <b>点这里选文件，或把文件拖进来</b>
          <span>MP4 / MOV / M4A / MP3 / FLAC / OGG / WebM / WAV —— 浏览器能解码的都行</span>
          <input type="file" id="audio-input" accept="audio/*,video/*" hidden>
        </label>

        <div class="file-list" id="audio-file" hidden></div>

        <div class="grid grid--2" style="margin-top:18px">
          <div class="field">
            <label>采样率</label>
            <div class="preset-row">
              <button class="chip is-active" type="button" data-rate="0">原始</button>
              <button class="chip" type="button" data-rate="44100">44100</button>
              <button class="chip" type="button" data-rate="48000">48000</button>
            </div>
          </div>

          <div class="field">
            <label>声道</label>
            <div class="preset-row">
              <button class="chip is-active" type="button" data-channels="0">原始</button>
              <button class="chip" type="button" data-channels="1">单声道</button>
              <button class="chip" type="button" data-channels="2">立体声</button>
            </div>
          </div>
        </div>

        <div class="grid grid--2" style="margin-top:18px">
          <div class="field">
            <label>输出格式</label>
            <div class="preset-row">
              <button class="chip" type="button" data-format="wav">WAV（无损）</button>
              <button class="chip is-active" type="button" data-format="mp3">MP3（有损压缩）</button>
            </div>
          </div>

          <div class="field" id="bitrate-field">
            <label>MP3 码率</label>
            <div class="preset-row">
              <button class="chip" type="button" data-bitrate="128">128 kbps</button>
              <button class="chip is-active" type="button" data-bitrate="192">192 kbps</button>
              <button class="chip" type="button" data-bitrate="320">320 kbps</button>
            </div>
          </div>
        </div>

        <div class="btn-row" style="margin-top:20px">
          <button class="btn" type="button" id="audio-run" disabled>提取音频</button>
          <button class="btn btn--ghost btn--sm" type="button" id="audio-clear" hidden>清空</button>
        </div>

        <p class="note" id="audio-note" style="margin-top:14px">
          选 MP3 会按码率做有损压缩，体积比 WAV 小一个数量级；码率越高音质越好、体积越大。
        </p>

        <p class="note" style="margin-top:10px">
          MP3 编码由自托管的 lamejs 完成（LGPL-3.0，<code>assets/vendor/lamejs/</code>），解码用的是浏览器自带能力。
        </p>
      </div>
    </div>
  </section>

  <!-- ============ 二、JSON 与 CSV ============ -->
  <section class="section section--tight" id="data">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Data</span>
        <h2>JSON 与 CSV 互转</h2>
        <p>对象数组转表格，表格转回对象数组。</p>
      </div>

      <div class="panel">
        <div class="grid grid--2">
          <div class="field">
            <label for="data-in">输入</label>
            <textarea id="data-in" rows="12" spellcheck="false"
              placeholder='[{"名称":"橡木","数量":12},{"名称":"桦木","数量":3}]'></textarea>
          </div>
          <div class="field">
            <label for="data-out">输出</label>
            <textarea id="data-out" rows="12" spellcheck="false" readonly></textarea>
          </div>
        </div>

        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn--sm" type="button" id="data-json2csv">JSON → CSV</button>
          <button class="btn btn--sm" type="button" id="data-csv2json">CSV → JSON</button>
          <button class="btn btn--ghost btn--sm" type="button" id="data-copy">复制输出</button>
        </div>

        <p class="note" id="data-note" style="margin-top:12px">
          转 CSV 时按所有对象出现过的键合并表头；单元格里有逗号、引号或换行会自动加引号。
        </p>
      </div>
    </div>
  </section>

  <!-- ============ 三、文本 Base64 ============ -->
  <section class="section section--tight" id="b64">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Text</span>
        <h2>文本 Base64</h2>
        <p>中文按 UTF-8 处理，不会乱码。</p>
      </div>

      <div class="panel">
        <div class="grid grid--2">
          <div class="field">
            <label for="b64-in">原文</label>
            <textarea id="b64-in" rows="8" spellcheck="false" placeholder="要编码的文字"></textarea>
          </div>
          <div class="field">
            <label for="b64-out">Base64</label>
            <textarea id="b64-out" rows="8" spellcheck="false" placeholder="要解码的 Base64"></textarea>
          </div>
        </div>

        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn--sm" type="button" id="b64-encode">编码 →</button>
          <button class="btn btn--sm" type="button" id="b64-decode">← 解码</button>
          <button class="btn btn--ghost btn--sm" type="button" id="b64-copy">复制结果</button>
        </div>
      </div>
    </div>
  </section>

</main>`;

const start = html.indexOf('<main id="main">');
const end = html.indexOf('</main>');
if (start < 0 || end < 0) {
  console.error('在 tools-image.html 里找不到 <main> 区块');
  process.exit(1);
}

html = html.slice(0, start) + MAIN + html.slice(end + '</main>'.length);

html = html.replace(/<title>[^<]*<\/title>/, '<title>格式转换 | 工具箱 | 创想时代开发组</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="在浏览器里提取音视频音轨转 WAV，JSON 与 CSV 互转，文本 Base64 编码。文件不上传服务器。">'
);
html = html.replace(
  /<link rel="canonical" href="[^"]*">/,
  '<link rel="canonical" href="https://innovaage.cn/tools-convert.html">'
);
html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://innovaage.cn/tools-convert.html">');

// 页面专属脚本挂在 site.js 之后。lamejs 先加载（MP3 编码要用），再挂转换逻辑。
html = html.replace(
  '<script src="assets/js/toolbox.js"></script>',
  '<script src="assets/vendor/lamejs/lamejs.iife.js"></script>\n<script src="assets/js/convert-tool.js"></script>'
);

writeFileSync(join(root, 'tools-convert.html'), html, 'utf8');

const ids = ['audio-input', 'audio-run', 'audio-note', 'data-in', 'data-out',
  'b64-in', 'b64-out', 'audio-dropzone', 'audio-file', 'bitrate-field'];
console.log('  已生成 tools-convert.html');
console.log('  关键节点: ' + ids.map((id) => (html.includes(`id="${id}"`) ? id + '✓' : id + '✗')).join(' '));
console.log('  引用 convert-tool.js: ' + (html.includes('assets/js/convert-tool.js') ? '✓' : '✗'));
console.log('  引用 lamejs: ' + (html.includes('assets/vendor/lamejs/lamejs.iife.js') ? '✓' : '✗'));
console.log('  MP3 码率选项: ' + ((html.match(/data-bitrate=/g) || []).length) + ' 个');

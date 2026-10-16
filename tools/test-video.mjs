/*
 * 视频工具专用自检。
 *
 * 为什么单独一个文件：视频解码/录制会占用浏览器的媒体管线，
 * 在跑过上百次页面跳转的同一个浏览器实例里，后面再测视频
 * 会稳定读出 readyState=0（文件明明能播）。单独起一个干净的
 * 浏览器实例就正常 —— 这是测试环境的问题，不是工具的问题。
 * 放一起还会把 13 条断言一起染红，掩盖真实故障，所以拆开。
 *
 * 用法：node tools/test-video.mjs
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9366;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${name}${detail ? '   ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-vidtest-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 60; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find((t) => t.type === 'page');
    if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
if (!wsUrl) { console.error('连不上 Edge'); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const { resolve: r, reject: j } = pend.get(m.id); pend.delete(m.id);
    m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
  }
};
const send = (method, params = {}) => {
  const mid = ++id; ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res, rej) => pend.set(mid, { resolve: res, reject: rej }));
};
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/tools.html' });
await sleep(2200);

console.log('=== 工具存在性与依赖 ===');
check('视频工具的元素都在',
  await evalJs(`!!document.querySelector('#v-dropzone') && !!document.querySelector('#v-file-input') &&
                !!document.querySelector('#v-diag') && !!document.querySelector('#v-run-btn') &&
                !!document.querySelector('#v-preview')`));

check('mp4box.js 已自托管且加载成功',
  await evalJs("typeof MP4Box !== 'undefined'"),
  'typeof MP4Box = ' + await evalJs("typeof MP4Box"));

check('没有依赖外网 CDN',
  await evalJs(`[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))`));

const fn = JSON.parse(await evalJs(`JSON.stringify({
  r16x9: window.__videoTool.ratioLabel(1920, 1080),
  r4x3:  window.__videoTool.ratioLabel(640, 480),
  r9x16: window.__videoTool.ratioLabel(1080, 1920),
  h264a: window.__videoTool.isH264('avc1.640c20'),
  h264b: window.__videoTool.isH264('avc3.42E01E'),
  h264c: window.__videoTool.isH264('vp09.00.10.08'),
  mime:  window.__videoTool.pickMime()
})`));
check('比例化简：1920×1080 → 16:9', fn.r16x9 === '16:9', fn.r16x9);
check('比例化简：640×480 → 4:3', fn.r4x3 === '4:3', fn.r4x3);
check('比例化简：1080×1920 → 9:16', fn.r9x16 === '9:16', fn.r9x16);
check('H.264 识别：avc1 / avc3 算通过', fn.h264a && fn.h264b);
check('H.264 识别：VP9 不算通过', fn.h264c === false);
check('能找到可用的 MP4 录制格式', /^video\/mp4/.test(fn.mime), fn.mime);

console.log('\n=== 完整流程：诊断 → 转换 → 复检 ===');
const run = await evalJs(`(async () => {
  try {
    var resp = await fetch('tools/fixtures/test-4x3.mp4');
    if (!resp.ok) return JSON.stringify({ error: '取不到测试样本 HTTP ' + resp.status });
    var blob = new Blob([await resp.arrayBuffer()], { type: 'video/mp4' });
    var file = new File([blob], 'test-4x3.mp4', { type: 'video/mp4' });

    // 先单独确认样本能播，否则后面的结论不可信
    var sampleInfo = await new Promise(function (res) {
      var u = URL.createObjectURL(blob);
      var v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true;
      v.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(v);
      v.src = u;
      var done = false;
      function fin(t) { if (done) return; done = true; URL.revokeObjectURL(u); v.remove(); res(t); }
      v.onloadedmetadata = function () {
        fin(v.videoWidth > 0 && isFinite(v.duration) && v.duration > 0
          ? v.videoWidth + 'x' + v.videoHeight + ' ' + v.duration.toFixed(2) + 's' : '');
      };
      v.onerror = function () { fin(''); };
      setTimeout(function () { fin(''); }, 8000);
      v.load();
    });

    await window.__videoTool.loadFile(file);
    await new Promise(function (r) { setTimeout(r, 800); });
    var diag = document.querySelector('#v-diag').innerText;

    document.querySelector('.chip[data-fit="pad"]').click();
    await window.__videoTool.run();
    await new Promise(function (r) { setTimeout(r, 600); });

    var res = window.__videoTool.state.result;
    return JSON.stringify({
      sampleKB: Math.round(blob.size / 1024),
      sampleInfo: sampleInfo,
      diag: diag,
      hasResult: !!res,
      name: res ? res.name : '',
      outW: res ? res.verify.width : 0,
      outH: res ? res.verify.height : 0,
      outDur: res ? Math.round(res.verify.duration * 10) / 10 : 0,
      outCodec: res ? res.verify.codec : '',
      outMp4: res ? res.verify.isMp4 : false,
      outPlayable: res ? res.verify.playable : false,
      stats: document.querySelector('#v-result-stats').innerText,
      status: document.querySelector('#v-status').innerText
    });
  } catch (e) {
    return JSON.stringify({ error: e.name + ': ' + e.message });
  }
})()`);

const r = JSON.parse(run);
if (r.error) {
  check('完整流程', false, r.error);
} else {
  check('测试样本本身可播放', !!r.sampleInfo, '样本 ' + r.sampleKB + ' KB，' + (r.sampleInfo || '不可播放'));
  check('诊断识别出「不是 16:9」', r.diag.includes('4:3') && r.diag.includes('16:9'),
    r.diag.replace(/\n/g, ' | ').slice(0, 200));
  check('诊断标出了时长上限', r.diag.includes('时长') && r.diag.includes('上限'));
  check('诊断读出了 H.264 编码', /avc1/i.test(r.diag));
  check('转换产出了结果', r.hasResult === true);
  check('结果可播放', r.outPlayable === true);
  check('结果是 1280×720', r.outW === 1280 && r.outH === 720, r.outW + '×' + r.outH);
  check('结果时长在 90 秒以内', r.outDur > 0 && r.outDur <= 90.5, r.outDur + ' 秒');
  check('结果是 MP4 容器', r.outMp4 === true);
  check('结果编码是 H.264', /^avc[13]/i.test(r.outCodec || ''), '实际 ' + r.outCodec);
  check('结果文件名带 -投稿规格', /-投稿规格\.mp4$/.test(r.name || ''), r.name);
  check('结果表格列出复检项', r.stats.includes('1280') && r.stats.includes('720'));
  check('完成后有成功提示', r.status.includes('转换完成'), r.status.slice(0, 120));
}

console.log('\n=== 裁切模式 ===');
const crop = await evalJs(`(async () => {
  try {
    var resp = await fetch('tools/fixtures/test-4x3.mp4');
    var blob = new Blob([await resp.arrayBuffer()], { type: 'video/mp4' });
    var file = new File([blob], 'crop-test.mp4', { type: 'video/mp4' });
    document.querySelector('.chip[data-fit="crop"]').click();
    await window.__videoTool.loadFile(file);
    await new Promise(function (r) { setTimeout(r, 600); });
    var plan = document.querySelector('#v-plan').innerText;
    await window.__videoTool.run();
    await new Promise(function (r) { setTimeout(r, 500); });
    var res = window.__videoTool.state.result;
    return JSON.stringify({
      plan: plan,
      w: res ? res.verify.width : 0,
      h: res ? res.verify.height : 0,
      playable: res ? res.verify.playable : false
    });
  } catch (e) { return JSON.stringify({ error: e.message }); }
})()`);
const cr = JSON.parse(crop);
if (cr.error) {
  check('裁切模式', false, cr.error);
} else {
  check('切换到裁切后，说明里写的是「裁切填满」', cr.plan.includes('裁切'), cr.plan.slice(0, 120));
  check('裁切模式结果仍是 1280×720', cr.w === 1280 && cr.h === 720, cr.w + '×' + cr.h);
  check('裁切模式结果可播放', cr.playable === true);
}

ws.close(); edge.kill();

const pass = results.filter((x) => x.ok).length;
const failed = results.filter((x) => !x.ok);
console.log(`\n共 ${results.length} 项，通过 ${pass} 项，失败 ${failed.length} 项`);
if (failed.length) {
  console.log('\n失败明细:');
  for (const f of failed) console.log('  ✗ ' + f.name);
}
process.exit(failed.length ? 1 : 0);

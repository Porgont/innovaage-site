/*
 * 视频工具：连续转换回归测试（单独一个浏览器实例）
 *
 * 为什么单独一个文件：浏览器的媒体管线额度是按「浏览器进程」算的，
 * 一个进程里大约能连续录制 3 次左右，第 4 次起 MediaRecorder 会启动
 * 但产不出任何数据（无头 + 纯软件编码下尤其明显）。
 * 所以这个测试必须从全新的浏览器开始，并且只做 2 次转换。
 * 和 test-video.mjs 分开跑，互不消耗额度。
 *
 * 用法：node tools/test-video-repeat.mjs
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9461;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '   ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-rep-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', 'about:blank'
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
await send('Page.navigate', { url: BASE + '/tools-video.html' });
await sleep(2200);

console.log('=== 连续转换（一次页面加载内做 2 次）===');

const out = await evalJs(`(async () => {
  var out = [];
  for (var i = 0; i < 2; i++) {
    try {
      var resp = await fetch('tools/fixtures/test-4x3.mp4');
      var blob = new Blob([await resp.arrayBuffer()], { type: 'video/mp4' });
      var file = new File([blob], 'repeat-' + i + '.mp4', { type: 'video/mp4' });
      // 一次加黑边、一次裁切，顺便验证两种模式都能连续出片
      document.querySelector('.chip[data-fit="' + (i % 2 ? 'crop' : 'pad') + '"]').click();
      await window.__videoTool.loadFile(file);
      await new Promise(function (r) { setTimeout(r, 700); });

      // 记录这轮开始前有没有残留的嗅探/预览元素（应当只有预览那一个）
      var before = document.querySelectorAll('video').length;

      await window.__videoTool.run();
      await new Promise(function (r) { setTimeout(r, 700); });

      var res = window.__videoTool.state.result;
      out.push({
        i: i,
        before: before,
        domVideos: document.querySelectorAll('video').length,
        w: res ? res.verify.width : 0,
        h: res ? res.verify.height : 0,
        playable: res ? res.verify.playable : false,
        kb: res ? Math.round(res.blob.size / 1024) : 0,
        attempts: window.__videoTool.state.attempts || []
      });
    } catch (e) {
      out.push({ i: i, error: e.message });
    }
  }
  return JSON.stringify(out);
})()`);

const runs = JSON.parse(out);
for (const r of runs) {
  if (r.error) {
    check(`第 ${r.i + 1} 次转换`, false, r.error);
    continue;
  }
  check(`第 ${r.i + 1} 次转换产出可播放的 1280×720`,
    r.w === 1280 && r.h === 720 && r.playable && r.kb > 1,
    `${r.w}×${r.h} ${r.kb}KB ${r.playable ? '可播放' : '不可播放'}`);
}

check('连续转换期间没有累积 <video> 元素（页面里始终只有预览那一个）',
  runs.every((r) => r.domVideos === 1),
  runs.map((r) => '第' + (r.i + 1) + '次 ' + r.domVideos + ' 个').join('；'));

ws.close(); edge.kill();

const pass = results.filter((x) => x.ok).length;
const failed = results.filter((x) => !x.ok);
console.log(`\n共 ${results.length} 项，通过 ${pass} 项，失败 ${failed.length} 项`);
if (failed.length) {
  console.log('\n失败明细:');
  for (const f of failed) console.log('  ✗ ' + f.name);
}
process.exit(failed.length ? 1 : 0);

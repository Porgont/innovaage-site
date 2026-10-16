/*
 * 生成视频工具自检用的测试样本。
 * 造一个 4:3、约 1.3 秒的 MP4，存到 tools/fixtures/test-4x3.mp4。
 * 有了真实文件，自检就不必在页面里现录（现录出来的样本在无头浏览器里
 * 有时不可播放，会让整组断言假红）。
 * 用法：node tools/make-video-fixture.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, 'tools', 'fixtures');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const OUT = join(outDir, 'test-4x3.mp4');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9971;
const BASE = 'http://127.0.0.1:8099';

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-fix-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find(t => t.type === 'page');
    if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = e => {
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
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '/tools.html' });
await sleep(2000);

// 关掉页面里的 garbage collection 风险：canvas 挂到 window 上保活
const b64 = await ev(`(async () => {
  window.__c = document.createElement('canvas');
  window.__c.width = 640; window.__c.height = 480;
  document.body.appendChild(window.__c);
  var ctx = window.__c.getContext('2d');
  ctx.fillStyle = '#1a6b8a'; ctx.fillRect(0, 0, 640, 480);

  var mime = 'video/mp4;codecs=avc1.640028';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/mp4';
  var stream = window.__c.captureStream(30);
  var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
  var parts = [];
  rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
  var stopped = new Promise(function (r) { rec.onstop = r; });
  rec.start();
  await new Promise(function (r) {
    var i = 0;
    var t = setInterval(function () {
      ctx.fillStyle = 'hsl(' + (i * 12) + ',75%,45%)';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('T' + i, 40, 250);
      i++; if (i > 40) { clearInterval(t); r(); }
    }, 33);
  });
  rec.stop();
  await stopped;
  await new Promise(function (r) { setTimeout(r, 800); });

  var blob = new Blob(parts, { type: 'video/mp4' });

  // 立刻验证可播放，不可播放就别写文件
  var ok = await new Promise(function (res) {
    var u = URL.createObjectURL(blob);
    var v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true;
    document.body.appendChild(v);
    v.src = u;
    v.onloadedmetadata = function () { res(v.videoWidth + 'x' + v.videoHeight + ' ' + v.duration.toFixed(2) + 's'); };
    v.onerror = function () { res(''); };
    setTimeout(function () { res(''); }, 5000);
    v.load();
  });
  window.__probeResult = ok;
  if (!ok) return '';

  var buf = await blob.arrayBuffer();
  var bytes = new Uint8Array(buf);
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  window.__fixtureSize = blob.size;
  return btoa(bin);
})()`);

if (!b64) {
  console.error('样本录制失败或不可播放，未写出文件');
  ws.close(); edge.kill();
  process.exit(1);
}
const probe = await ev('window.__probeResult');
const buf = Buffer.from(b64, 'base64');
writeFileSync(OUT, buf);

console.log(`  已写出 ${OUT}`);
console.log(`  大小 ${(buf.length / 1024).toFixed(0)} KB，浏览器复核：${probe}`);

ws.close(); edge.kill();

/*
 * 子页面头图：把用户给的 5 张图压成页面背景图。
 * 统一 16:9、宽上限 1600、质量 88、单张 400KB 以内。
 * 「樱花」那张顶部有 FPS/渲染器调试文字，先裁掉顶部再缩放。
 *
 * 用法：node tools/make-page-heroes.mjs
 * 前提：本地 8099 端口有服务。
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
const BASE = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects';

const JOBS = [
  {
    who: '村庄橡木', out: 'hero-about.jpg', cropTop: 0,
    src: join(BASE, '78', '7875d7a0e72b8ba65deda547b69fb0174e3608dbc8dec6997a3186b1b14fc2c4')
  },
  {
    who: '雪山高原', out: 'hero-works.jpg', cropTop: 0,
    src: join(BASE, '5d', '5df3d8ea6e20b040d038f6b2be3ee5014e99ffcc6ff50b033c03a27b52f6cb80')
  },
  {
    who: '樱花林地', out: 'hero-news.jpg', cropTop: 80,
    src: join(BASE, 'de', 'debe8a9fe7b4b265e5c691cb5eac8a7da52393ae93ae726ee4b7b5dec2405cc5')
  },
  {
    who: '竹子水面', out: 'hero-join.jpg', cropTop: 0, quality: 0.74,
    src: join(BASE, 'e4', 'e4c9f0ad8b4c807dc306b3d98820395e54b94e221525512b604eda94c7f20471')
  },
  {
    who: '浮岛城市', out: 'hero-tools.jpg', cropTop: 0,
    src: join(BASE, '98', '980a86b04acf21f04eaf592ffadfd371b7d0a24edcaa3d3af902995bd4c450d5')
  }
];

const W = 1600;
const H = 900;

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9721;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-ph-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8099/tools-image.html' });
await sleep(1800);

for (const job of JOBS) {
  const b64 = readFileSync(job.src).toString('base64');
  const lower = job.src.toLowerCase();
  const mime = lower.endsWith('.webp') ? 'image/webp' : (lower.endsWith('.png') ? 'image/png' : 'image/jpeg');

  const result = await evalJs(`(async () => {
    const img = new Image();
    img.src = 'data:${mime};base64,${b64}';
    await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; if (img.complete && img.naturalWidth) res(); });

    const sw = img.naturalWidth, sh = img.naturalHeight;
    // 可用区域（裁掉顶部调试文字）
    const availTop = ${job.cropTop};
    const availH = sh - availTop;
    const availW = sw;

    // 按 16:9 居中裁切
    const targetRatio = ${W} / ${H};
    let cw, ch;
    if (availW / availH > targetRatio) { ch = availH; cw = Math.round(availH * targetRatio); }
    else { cw = availW; ch = Math.round(availW / targetRatio); }
    const cx = Math.round((availW - cw) / 2);
    const cy = availTop + Math.round((availH - ch) / 2);

    // 只缩小不放大
    const ow = Math.min(${W}, cw);
    const oh = Math.round(ow * ${H} / ${W});

    const c = document.createElement('canvas');
    c.width = ow; c.height = oh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, ow, oh);

    return JSON.stringify({ sw: sw, sh: sh, ow: ow, oh: oh, dataUrl: c.toDataURL('image/jpeg', ${job.quality || 0.88}) });
  })()`);

  const r = JSON.parse(result);
  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.who.padEnd(8)} ${job.out.padEnd(18)} 源 ${r.sw}×${r.sh} → ${r.ow}×${r.oh}  ${kb.toFixed(0)} KB  ${kb <= 400 ? '✓' : '✗ 超过 400KB'}`);
}

ws.close(); edge.kill();

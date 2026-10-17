/*
 * 处理青橘的两件作品图。
 * 两张都只有一张成品图，既当封面也当详情页截图。
 * 宽上限 1200、质量 88、单张 600KB 以内。
 *
 * 用法：node tools/make-qingju-images.mjs
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
    who: 'Bilibili PVP',
    out: 'qingju-bilibili-pvp.jpg',
    src: join(BASE, 'f4', 'f4de44a319f06374480484af1c1094f20d05d8236bca9a5a50c589f4c210c217')
  },
  {
    who: 'Deer PVP',
    out: 'qingju-deer-pvp.jpg',
    src: join(BASE, 'a6', 'a64ec7a569f3fda73956c4e22574025e0b2c43980e84f85efc8a4eeec41b4c0e')
  }
];

const MAXW = 1200;
const MAXKB = 600;

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9771;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-qj-' + Date.now()),
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

  const result = await evalJs(`(async () => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,${b64}';
    await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; if (img.complete && img.naturalWidth) res(); });

    const sw = img.naturalWidth, sh = img.naturalHeight;
    // 只缩小不放大
    const ow = Math.min(${MAXW}, sw);
    const oh = Math.round(sh * (ow / sw));

    const c = document.createElement('canvas');
    c.width = ow; c.height = oh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, ow, oh);
    return JSON.stringify({ sw: sw, sh: sh, ow: ow, oh: oh, dataUrl: c.toDataURL('image/jpeg', 0.88) });
  })()`);

  const r = JSON.parse(result);
  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.who.padEnd(13)} ${job.out.padEnd(28)} ${r.sw}×${r.sh} → ${r.ow}×${r.oh}  ${kb.toFixed(0)} KB  ${kb <= MAXKB ? '✓' : '✗ 超过 ' + MAXKB + 'KB'}`);
}

ws.close(); edge.kill();

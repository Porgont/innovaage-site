/*
 * 处理「总销量突破 5000 万」那条公告的配图。
 * 1660×1242 的 PNG → 宽 1400 的 jpg（质量 88），控制在 400KB 内。
 *
 * 用法：node tools/make-milestone-image.mjs
 * 前提：本地 8099 端口有服务。
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = join(root, 'assets', 'img', 'milestone-50m.jpg');

const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects\\' +
  'c3\\c33123080289e30c08c4d9f207f5d332a3d25cc6c31fdb3e38259563fc175b2a';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9681;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-ms-' + Date.now()),
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

const b64 = readFileSync(SRC).toString('base64');
const result = await evalJs(`(async () => {
  const img = new Image();
  img.src = 'data:image/png;base64,${b64}';
  await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; if (img.complete && img.naturalWidth) res(); });
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const ow = Math.min(1400, sw);
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
writeFileSync(outPath, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
const kb = statSync(outPath).size / 1024;
console.log(`  ${r.sw}×${r.sh} → ${r.ow}×${r.oh}  ${kb.toFixed(0)} KB  ${kb <= 400 ? '✓' : '✗ 超过 400KB'}`);

ws.close(); edge.kill();

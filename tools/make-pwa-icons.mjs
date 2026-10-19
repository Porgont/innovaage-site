#!/usr/bin/env node
/**
 * 生成 PWA 图标：assets/img/pwa-192.png、assets/img/pwa-512.png。
 *
 * 做法：借 headless Edge 里的 canvas，把现有的 logo-mark.png 按比例缩放后
 * 贴在正方形画布中间（白底），导出 PNG。只读原图，不改动它。
 *
 * 用法：node tools/make-pwa-icons.mjs   （要求 8099 端口有本地服务）
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9693;
const BASE = 'http://127.0.0.1:8099';

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-pwa-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 80; i++) {
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

let id = 0;
const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const p = pend.get(m.id); pend.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
const send = (method, params = {}) => {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res, rej) => pend.set(mid, { resolve: res, reject: rej }));
};
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(2500);

for (const size of [192, 512]) {
  const dataUrl = await ev(`(async () => {
    const img = new Image();
    img.src = 'assets/img/logo-mark.png';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = ${size}; c.height = ${size};
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, ${size}, ${size});
    // 留 14% 边距，图标不外顶
    const pad = ${size} * 0.14;
    const box = ${size} - pad * 2;
    const k = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (${size} - w) / 2, (${size} - h) / 2, w, h);
    return c.toDataURL('image/png');
  })()`);

  const b64 = String(dataUrl).split(',')[1];
  if (!b64) throw new Error('canvas 导出失败');
  writeFileSync(join(root, 'assets', 'img', `pwa-${size}.png`), Buffer.from(b64, 'base64'));
  console.log(`  assets/img/pwa-${size}.png  已生成`);
}

ws.close();
edge.kill();

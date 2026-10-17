/*
 * 处理「零零构想V5000-橡木7画质提升包」的图片。
 *
 * 海报是 1000×3790 的竖长 webp，直接当详情页介绍用；
 * 宽度压到 900、webp 质量 84，控制在 500KB 以内（手机也能接受）。
 * 三张效果图转成 992×558 的 jpg（与秋水三尺同规格）。
 *
 * 用法：node tools/make-lingling-images.mjs
 * 前提：本地 8099 端口有服务（node tools/serve.mjs 8099），借页面里的 canvas 转码。
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
    who: '海报',
    src: join(BASE, '7d', '7dc14c7d758fb467c4127a0950671482d391847e46033882490aa855ce11734e'),
    out: 'lingling-poster.webp',
    kind: 'poster',
    type: 'image/webp',
    quality: 0.84,
    maxW: 900,
    maxKB: 500
  },
  {
    who: '效果图 1',
    src: join(BASE, 'a5', 'a5bd9dcaa8be61d03e221dd72c209bfa58aab5d3234a5fa951bd902f1e1b79ad'),
    out: 'lingling-1.jpg', kind: 'shot', type: 'image/jpeg', quality: 0.88, maxW: 992, maxKB: 250
  },
  {
    who: '效果图 2',
    src: join(BASE, '80', '802c8ff1af869e8e4e2322c24e404e99cc4909dce1de5d5c213617b850a5baea'),
    out: 'lingling-2.jpg', kind: 'shot', type: 'image/jpeg', quality: 0.88, maxW: 992, maxKB: 250
  },
  {
    who: '效果图 3',
    src: join(BASE, '42', '42689a8257b9cc89796a5c11f1505d6f7a1a0955b6205d33d6dc00a9e5e32b10'),
    out: 'lingling-3.jpg', kind: 'shot', type: 'image/jpeg', quality: 0.88, maxW: 992, maxKB: 250
  }
];

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9541;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-ll-' + Date.now()),
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
  const srcMime = job.src.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png';
  const dataUrl = `data:${srcMime};base64,${b64}`;

  const result = await evalJs(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(dataUrl)};
    await new Promise(function (res, rej) {
      img.onload = res; img.onerror = rej;
      if (img.complete && img.naturalWidth) res();
    });

    const sw = img.naturalWidth, sh = img.naturalHeight;
    let ow = sw, oh = sh;
    if (sw > ${job.maxW}) {
      ow = ${job.maxW};
      oh = Math.round(sh * (${job.maxW} / sw));
    }

    const c = document.createElement('canvas');
    c.width = ow; c.height = oh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, ow, oh);

    return JSON.stringify({
      sw: sw, sh: sh, ow: ow, oh: oh,
      dataUrl: c.toDataURL(${JSON.stringify(job.type)}, ${job.quality})
    });
  })()`);

  const r = JSON.parse(result);
  const buf = Buffer.from(r.dataUrl.split(',')[1], 'base64');
  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, buf);
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.who.padEnd(8)} ${job.out.padEnd(22)} ${r.sw}×${r.sh} → ${r.ow}×${r.oh}  ${kb.toFixed(0)} KB  ${kb <= job.maxKB ? '✓' : '✗ 超过 ' + job.maxKB + 'KB'}`);
}

ws.close(); edge.kill();

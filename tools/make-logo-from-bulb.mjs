/*
 * 用用户提供的透明灯泡图重做站点 favicon / logo。
 *
 * 关键点：不能简单把「接近纯白」的像素一律抠掉 —— 灯泡图标内部的白色
 * （那个「0」和方块的高光）也会一起被挖空，暗色主题下就透出黑底。
 * 所以这里用「从四边做漫水填充」的方式：只把与画面边缘连通的白色区域清成透明，
 * 被蓝色包住的内部白色原样保留。
 *
 * 产物：
 *   assets/img/logo-mark.png        112×128（页眉左侧图标）
 *   assets/img/favicon-32.png        28×32
 *   assets/img/apple-touch-icon.png 150×180
 *
 * 用法：node tools/make-logo-from-bulb.mjs
 * 前提：本地 8099 端口有服务（借页面里的 canvas 处理像素）。
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');

const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects\\' +
  'e6\\e6d56cce2e55bea7ed01b3762e24407d0393276d9c6efed0b1a42d35c9c5a7fc';

const OUT = [
  { out: 'logo-mark.png', w: 112, h: 128 },
  { out: 'favicon-32.png', w: 28, h: 32 },
  { out: 'apple-touch-icon.png', w: 150, h: 180 }
];

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9691;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-logo-' + Date.now()),
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

// 1) 先把原图读进来，做边缘漫水填充得到一张「内部白保留」的透明图
const cleaned = await evalJs(`(async () => {
  const img = new Image();
  img.src = 'data:image/webp;base64,${b64}';
  await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; if (img.complete && img.naturalWidth) res(); });

  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;

  const WHITE = 244;
  function isWhite(i) {
    return px[i] >= WHITE && px[i + 1] >= WHITE && px[i + 2] >= WHITE;
  }

  // 从四条边开始漫水填充，只清掉「和边缘连通」的白
  const seen = new Uint8Array(W * H);
  const stack = [];
  function push(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    if (seen[k]) return;
    if (!isWhite(k * 4)) return;
    seen[k] = 1;
    stack.push(k);
  }
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

  while (stack.length) {
    const k = stack.pop();
    const x = k % W, y = (k - x) / W;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  let cleared = 0;
  for (let k = 0; k < W * H; k++) {
    if (seen[k]) { px[k * 4 + 3] = 0; cleared++; }
  }
  ctx.putImageData(data, 0, 0);

  return JSON.stringify({ W: W, H: H, cleared: cleared, dataUrl: c.toDataURL('image/png') });
})()`);

const info = JSON.parse(cleaned);
console.log(`  原图 ${info.W}×${info.H}，清掉边缘白像素 ${info.cleared} 个`);

// 2) 再按目标尺寸逐个导出（像素图用最近邻，保持硬边）
for (const job of OUT) {
  const png = await evalJs(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(info.dataUrl)};
    await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; if (img.complete && img.naturalWidth) res(); });
    const c = document.createElement('canvas');
    c.width = ${job.w}; c.height = ${job.h};
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ${job.w}, ${job.h});
    // 等比放进目标框，居中
    const scale = Math.min(${job.w} / img.naturalWidth, ${job.h} / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, Math.round((${job.w} - w) / 2), Math.round((${job.h} - h) / 2), w, h);
    return c.toDataURL('image/png');
  })()`);

  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, Buffer.from(png.split(',')[1], 'base64'));
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.out.padEnd(22)} ${job.w}×${job.h}  ${kb.toFixed(1)} KB`);
}

ws.close(); edge.kill();

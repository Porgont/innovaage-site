/*
 * 给「其他负责人」补头像：Log_坤、老赵。
 *
 * Log_坤 的源图是一张 16×16 的像素脸，放在 1080×1080 的纯黑画布中央。
 * 直接缩到 240 会变成黑底中间一个小点，所以要先扫出非黑区域的包围盒，
 * 裁出来再用「最近邻」放大，保持像素清晰；老赵是普通照片，居中裁方即可。
 *
 * 输出与核心管理局头像同规格：240×240、JPEG、质量 88。
 * 用法：node tools/make-more-officer-avatars.mjs
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
    who: 'Log_坤',
    src: join(BASE, '01', '011768010f7ea3e11ba3069669dfb6732f9668489ce7a9d1cfa9758f7d20788b'),
    out: 'avatar-logkun.jpg',
    mode: 'sprite'     // 先找内容包围盒，再最近邻放大
  },
  {
    who: '老赵',
    src: join(BASE, 'db', 'db6e43e6c9a6a04d8d79b3987d1cc36b2567f868e17ca05b46f6d0fa85b26048'),
    out: 'avatar-laozhao.jpg',
    mode: 'photo'      // 居中裁方后高质量缩放
  }
];

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9531;
const SIZE = 240;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-av2-' + Date.now()),
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
  const mime = job.src.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${b64}`;

  const result = await evalJs(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(dataUrl)};
    await new Promise(function (res, rej) {
      img.onload = res; img.onerror = rej;
      if (img.complete) res();
    });

    const sw = img.naturalWidth, sh = img.naturalHeight;
    const c0 = document.createElement('canvas');
    c0.width = sw; c0.height = sh;
    c0.getContext('2d').drawImage(img, 0, 0);
    const px = c0.getContext('2d').getImageData(0, 0, sw, sh).data;

    let box = null;
    if ('${job.mode}' === 'sprite') {
      // 找出非黑（且有一定亮度）的区域，作为真正的像素图范围
      let minX = sw, minY = sh, maxX = -1, maxY = -1;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 4;
          const lum = px[i] + px[i + 1] + px[i + 2];
          if (lum > 40) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) box = { x: 0, y: 0, w: sw, h: sh };
      else {
        // 留一点边距，避免贴边
        const pad = Math.max(1, Math.round(Math.max(maxX - minX, maxY - minY) * 0.06));
        const x = Math.max(0, minX - pad);
        const y = Math.max(0, minY - pad);
        const w = Math.min(sw - x, (maxX - minX + 1) + pad * 2);
        const h = Math.min(sh - y, (maxY - minY + 1) + pad * 2);
        // 取正方形（以较长边为准，居中）
        const side = Math.max(w, h);
        const cx = x + w / 2, cy = y + h / 2;
        box = {
          x: Math.max(0, Math.round(cx - side / 2)),
          y: Math.max(0, Math.round(cy - side / 2)),
          w: Math.min(sw, side),
          h: Math.min(sh, side)
        };
      }
    } else {
      // 照片：居中裁正方形
      const side = Math.min(sw, sh);
      box = { x: Math.round((sw - side) / 2), y: Math.round((sh - side) / 2), w: side, h: side };
    }

    const out = document.createElement('canvas');
    out.width = ${SIZE}; out.height = ${SIZE};
    const ctx = out.getContext('2d');
    if ('${job.mode}' === 'sprite') {
      /* 源图是个被放大过的低分辨率像素脸（边缘发虚）。
         先把裁切结果平均缩到 32×32 的小网格，抹掉插值产生的糊边，
         再用最近邻放大到 240 —— 出来是干净的像素块，而不是一团模糊。 */
      const GRID = 32;
      const tiny = document.createElement('canvas');
      tiny.width = GRID; tiny.height = GRID;
      const tctx = tiny.getContext('2d');
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, GRID, GRID);

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, ${SIZE}, ${SIZE});
      ctx.drawImage(tiny, 0, 0, GRID, GRID, 0, 0, ${SIZE}, ${SIZE});
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, ${SIZE}, ${SIZE});
    }

    return JSON.stringify({
      srcW: sw, srcH: sh, box: box,
      dataUrl: out.toDataURL('image/jpeg', 0.88)
    });
  })()`);

  const r = JSON.parse(result);
  const buf = Buffer.from(r.dataUrl.split(',')[1], 'base64');
  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, buf);
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.who.padEnd(6)} ${job.out.padEnd(20)} 源 ${r.srcW}×${r.srcH} → 裁切 ${r.box.w}×${r.box.h} → ${SIZE}×${SIZE}  ${kb.toFixed(0)} KB  ${kb < 60 ? '✓' : '✗ 超过 60KB'}`);
}

ws.close(); edge.kill();

/*
 * 处理「仿真工艺系列材质」的图片。
 *
 * 顺手做两件通用的事：
 *   1. 自动裁掉四周的纯黑/纯白边框（截图或录屏留边）
 *   2. cropTop 指定裁掉顶部若干像素 —— Java 版截图上常带 F3 调试文字
 *
 * 用法：node tools/make-fangzhen-images.mjs
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
  // 封面：带 REALCRAFT logo 的那张
  {
    who: '封面', out: 'fangzhen-cover.jpg', maxW: 1400, cropTop: 0, quality: 0.76,
    src: join(BASE, 'fc', 'fc4b270c16048d111330b745f83a889e30ff2ebc84a570a51d665eef48a4fa32')
  },
  // RVHD 效果图
  {
    who: 'RVHD 1', out: 'fangzhen-rvhd-1.jpg', maxW: 1400, cropTop: 0,
    src: join(BASE, '7c', '7ca0cad2c82a07729efc30881dc5a231d3112ea9c8441933242ac1d7b4bc654a')
  },
  {
    who: 'RVHD 2', out: 'fangzhen-rvhd-2.jpg', maxW: 1400, cropTop: 0,
    src: join(BASE, '3b', '3b3fe07de589e96a7292d22703b20db488b840ac76a86e79e25f77a2ab91674e')
  },
  {
    who: 'RVHD 3', out: 'fangzhen-rvhd-3.jpg', maxW: 1400, cropTop: 0,
    src: join(BASE, '2d', '2d83f846ea5def183651fa463755a237a1fe5f48e2c45d9b2905e5c6277b63f4')
  },
  // 效果图（无调试文字）
  {
    who: '效果 1', out: 'fangzhen-shot-1.jpg', maxW: 1400, cropTop: 0,
    src: join(BASE, 'c4', 'c499c89f2f2e718896dce9ba299fa61c6f468d6a64897329cc4e64a5cf5f4f08')
  },
  {
    who: '效果 2', out: 'fangzhen-shot-2.jpg', maxW: 1400, cropTop: 0,
    src: join(BASE, '5f', '5f544296fe51e016bea509a509b248b589a3c510513e0bfaf6148a54284a4a81')
  },
  {
    who: '效果 3', out: 'fangzhen-shot-3.jpg', maxW: 1400, cropTop: 0, quality: 0.78,
    src: join(BASE, '84', '84feeeb09a252ccc15fbf36edf568adc6be3ca3deaa9f335f7ec781d13b97354')
  },
  // 效果图（顶部带 F3 调试文字，裁掉一截）
  {
    who: '效果 4', out: 'fangzhen-shot-4.jpg', maxW: 1400, cropTop: 46,
    src: join(BASE, 'b4', 'b4008165d352ec860bd6a0c4be546ba0ebefb63b9c64a5e93305c7a99b1bde72')
  },
  {
    who: '效果 5', out: 'fangzhen-shot-5.jpg', maxW: 1400, cropTop: 46,
    src: join(BASE, '42', '4251b091d2bff481ac6ce95204063d11952f2c5aa7817d36cb94dd119124a4ef')
  },
  {
    who: '效果 6', out: 'fangzhen-shot-6.jpg', maxW: 1400, cropTop: 46,
    src: join(BASE, 'b7', 'b7f3abb59805ad4168fb38139d60e7fe675f2bc07337f0ce711ae2a59442858f')
  },
  {
    who: '效果 7', out: 'fangzhen-shot-7.jpg', maxW: 1400, cropTop: 46,
    src: join(BASE, 'da', 'dacb8b706108b8b6ce2e10d8f1907e7bbbc5b4e6c8643183161f8d54422363ea')
  }
];

const MAXKB = 300;

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9851;

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-fz-' + Date.now()),
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

    const W = img.naturalWidth, H = img.naturalHeight;
    const c0 = document.createElement('canvas');
    c0.width = W; c0.height = H;
    const x0 = c0.getContext('2d');
    x0.drawImage(img, 0, 0);
    const px = x0.getImageData(0, 0, W, H).data;

    function uniformRow(y) {
      var first = null;
      for (var x = 0; x < W; x += 3) {
        var i = (y * W + x) * 4;
        if (first === null) first = [px[i], px[i+1], px[i+2]];
        if (Math.abs(px[i] - first[0]) > 6 || Math.abs(px[i+1] - first[1]) > 6 || Math.abs(px[i+2] - first[2]) > 6) return false;
      }
      var dark = first[0] < 20 && first[1] < 20 && first[2] < 20;
      var light = first[0] > 245 && first[1] > 245 && first[2] > 245;
      return dark || light;
    }
    function uniformCol(x) {
      var first = null;
      for (var y = 0; y < H; y += 3) {
        var i = (y * W + x) * 4;
        if (first === null) first = [px[i], px[i+1], px[i+2]];
        if (Math.abs(px[i] - first[0]) > 6 || Math.abs(px[i+1] - first[1]) > 6 || Math.abs(px[i+2] - first[2]) > 6) return false;
      }
      var dark = first[0] < 20 && first[1] < 20 && first[2] < 20;
      var light = first[0] > 245 && first[1] > 245 && first[2] > 245;
      return dark || light;
    }

    var top = ${job.cropTop};
    var bottom = H - 1, left = 0, right = W - 1;

    // 先按要求裁掉顶部，再自动去掉四周纯色边
    while (top < bottom && uniformRow(top)) top++;
    while (bottom > top && uniformRow(bottom)) bottom--;
    while (left < right && uniformCol(left)) left++;
    while (right > left && uniformCol(right)) right--;

    var cw = right - left + 1;
    var chh = bottom - top + 1;
    var ow = Math.min(${job.maxW}, cw);
    var oh = Math.round(chh * (ow / cw));

    var c = document.createElement('canvas');
    c.width = ow; c.height = oh;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, left, top, cw, chh, 0, 0, ow, oh);

    return JSON.stringify({
      sw: W, sh: H, top: top, left: left, cw: cw, chh: chh, ow: ow, oh: oh,
      dataUrl: c.toDataURL('image/jpeg', ${job.quality || 0.86})
    });
  })()`);

  const r = JSON.parse(result);
  const outPath = join(imgDir, job.out);
  writeFileSync(outPath, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  const kb = statSync(outPath).size / 1024;
  const changed = (r.top > 0 || r.left > 0 || r.cw !== r.sw || r.chh !== r.sh);
  console.log(`  ${job.who.padEnd(7)} ${job.out.padEnd(22)} ${r.sw}×${r.sh}` +
    (changed ? ` → 裁到 ${r.cw}×${r.chh}（顶 ${r.top} 左 ${r.left}）` : '') +
    ` → ${r.ow}×${r.oh}  ${kb.toFixed(0)} KB  ${kb <= MAXKB ? '✓' : '✗ 超过 ' + MAXKB + 'KB'}`);
}

ws.close(); edge.kill();

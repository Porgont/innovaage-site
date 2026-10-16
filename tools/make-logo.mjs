/*
 * 从 logo 源图（WebP）生成网站用的几种尺寸。
 *
 * 为什么分两步：源图是 WebP，System.Drawing 解不了，只能用 WIC 解；
 * 而 WIC 的像素缓冲在 PowerShell 里逐像素遍历太慢（400 万像素级），
 * 所以：PowerShell 只负责「WIC 解码 → 存成 24 位 BMP」，其余分析、裁切、
 * 缩放、拼装全部在 Node 里用 Buffer 做，最后再让 PowerShell 把 PNG 落盘。
 *
 * 产物：
 *   logo-mark.png        128×128   导航栏小图标（页面里显示 34px）
 *   favicon-32.png        32×32    浏览器标签页
 *   apple-touch-icon.png 180×180   手机加到桌面
 *   logo-full.jpg        900 宽    完整 logo（关于我们页 + 社交分享卡）
 *
 * 用法：node tools/make-logo.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
const tmpDir = join(root, '.preview');
mkdirSync(imgDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects\\b0\\b0e021266237d5752e12214359f91809b61747b16a45d41ea7d8da44c692ad25';
const RAW_BMP = join(tmpDir, 'logo-src.bmp');

/* ---------- 第一步：PowerShell 把 WebP 解成 24 位 BMP ---------- */
execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', `
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName System.Drawing
$fs = [System.IO.File]::OpenRead('${SRC}')
$dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create($fs, 'None', 'OnLoad')
$frame = $dec.Frames[0]
$w = $frame.PixelWidth; $h = $frame.PixelHeight
$conv = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap($frame, [System.Windows.Media.PixelFormats]::Bgra32, $null, 0)
$stride = $w * 4
$buf = New-Object byte[] ($stride * $h)
$conv.CopyPixels($buf, $stride, 0)
$fs.Close()

$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$data = $bmp.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
                      [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
                      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $buf.Length)
$bmp.UnlockBits($data)
$bmp.Save('${RAW_BMP}', [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp.Dispose()
Write-Output ($w.ToString() + 'x' + $h.ToString())
`], { encoding: 'utf8' });

/* ---------- 第二步：Node 解析 BMP ---------- */
const bmp = readFileSync(RAW_BMP);
const dataOffset = bmp.readUInt32LE(10);
const width = bmp.readInt32LE(18);
const height = bmp.readInt32LE(22);
const bpp = bmp.readUInt16LE(28);
if (bpp !== 32) throw new Error(`期望 32 位 BMP，实际 ${bpp} 位`);
const rowSize = width * 4;
const bottomUp = height > 0;
const H = Math.abs(height);

/** 取 (x,y) 的像素，返回 [b,g,r]；坐标系左上为原点 */
function px(x, y) {
  const srcY = bottomUp ? H - 1 - y : y;
  const o = dataOffset + srcY * rowSize + x * 4;
  return [bmp[o], bmp[o + 1], bmp[o + 2]];
}
const isInk = (x, y) => { const [b, g, r] = px(x, y); return b < 246 || g < 246 || r < 246; };

console.log(`源图 ${width}×${height}`);

/* ---------- 内容紧致边界框 ---------- */
let minX = width, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < width; x++) {
    if (isInk(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log(`内容框 ${minX},${minY} → ${maxX},${maxY}  (${maxX - minX + 1}×${maxY - minY + 1})`);

/* ---------- 找图标与文字之间的竖直空白带 ---------- */
const runs = [];
let runStart = -1;
for (let x = minX; x <= maxX; x++) {
  let ink = false;
  for (let y = minY; y <= maxY; y++) { if (isInk(x, y)) { ink = true; break; } }
  if (!ink) { if (runStart < 0) runStart = x; }
  else { if (runStart >= 0) { runs.push([runStart, x - 1]); runStart = -1; } }
}
const gaps = runs.filter(([a, b]) => b - a + 1 >= 25).sort((a, b) => a[0] - b[0]);
const iconRight = gaps.length ? gaps[0][0] - 1 : minX + Math.round((maxX - minX) * 0.34);
console.log(`图标/文字分界 x=${iconRight}  (空白带 ${gaps.length ? gaps.map(g => g.join('-')).join(', ') : '未找到，按比例估算'})`);

/* ---------- 单独量出火炬图标自己的紧致框（只统计分界线左侧）---------- */
let iMinX = width, iMinY = H, iMaxX = -1, iMaxY = -1;
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= iconRight; x++) {
    if (isInk(x, y)) {
      if (x < iMinX) iMinX = x;
      if (x > iMaxX) iMaxX = x;
      if (y < iMinY) iMinY = y;
      if (y > iMaxY) iMaxY = y;
    }
  }
}
const iconBoxW = iMaxX - iMinX + 1;
const iconBoxH = iMaxY - iMinY + 1;
console.log(`火炬图标框 ${iMinX},${iMinY} → ${iMaxX},${iMaxY}  (${iconBoxW}×${iconBoxH})`);

/* ---------- 缩放（盒式平均，质量足够）----------
 * keepWhite=true  保留白底（给 JPEG 用）
 * keepWhite=false 把接近纯白的像素转成全透明，得到透明底 PNG。
 *                 logo 是像素图、颜色与白底反差大，按阈值转透明不会留白边，
 *                 因此导航栏图标在浅色和深色主题下都能直接用。
 */
const WHITE_CUT = 244;

function resample(srcRect, outW, outH, keepWhite = true) {
  const { x0, y0, w, h } = srcRect;
  const out = Buffer.alloc(outW * outH * 4, 255);
  for (let oy = 0; oy < outH; oy++) {
    const sy0 = y0 + Math.floor((oy * h) / outH);
    const sy1 = Math.max(sy0 + 1, y0 + Math.floor(((oy + 1) * h) / outH));
    for (let ox = 0; ox < outW; ox++) {
      const sx0 = x0 + Math.floor((ox * w) / outW);
      const sx1 = Math.max(sx0 + 1, x0 + Math.floor(((ox + 1) * w) / outW));
      let sb = 0, sg = 0, sr = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const cx = sx < 0 ? 0 : sx >= width ? width - 1 : sx;
          const cy = sy < 0 ? 0 : sy >= H ? H - 1 : sy;
          const [b, g, r] = px(cx, cy);
          sb += b; sg += g; sr += r; n++;
        }
      }
      const b = Math.round(sb / n), g = Math.round(sg / n), r = Math.round(sr / n);
      const o = (oy * outW + ox) * 4;
      out[o] = b;
      out[o + 1] = g;
      out[o + 2] = r;
      out[o + 3] = (!keepWhite && b >= WHITE_CUT && g >= WHITE_CUT && r >= WHITE_CUT) ? 0 : 255;
    }
  }
  return out;
}

/* ---------- 生成四种产物 ---------- */
// 图标框：火炬是「上宽下窄」的竖长形状（484×661）。若强行裁成正方形，
// 每边要多扩 88px，就会把右边的文字一起带进来。
// 所以宽度最多只取到「图标/文字分界」，高度按竖构图比例给，保住火焰主体与竖形轮廓。
function iconRect(sideRatio) {
  const x0 = iMinX;
  const w = iconRight - iMinX + 1;              // 不越过分界线
  const h = Math.min(iconBoxH, Math.round(w * sideRatio));
  const cy = iMinY + (iconBoxH - 1) / 2;         // 竖直居中于火炬
  return { x0, y0: Math.round(cy - h / 2), w, h };
}

const fullPad = 16;
const outputs = [
  // PNG 三张都转透明底：导航栏图标在深色主题下才不会出现白方块
  { name: 'logo-mark.png', rect: iconRect(1.20), w: 112, h: 128, transparent: true },
  { name: 'favicon-32.png', rect: iconRect(1.12), w: 28, h: 32, transparent: true },
  { name: 'apple-touch-icon.png', rect: iconRect(1.16), w: 150, h: 180, transparent: true },
  {
    name: 'logo-full.jpg',
    rect: {
      x0: minX - fullPad,
      y0: minY - fullPad,
      w: (maxX - minX + 1) + fullPad * 2,
      h: (maxY - minY + 1) + fullPad * 2
    },
    w: 900,
    h: Math.round(((maxY - minY + 1) + fullPad * 2) * 900 / ((maxX - minX + 1) + fullPad * 2)),
    transparent: false
  }
];

const PS_SAVE = `
Add-Type -AssemblyName System.Drawing
$w = __W__; $h = __H__
$bytes = [System.IO.File]::ReadAllBytes('__RAW__')
$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$data = $bmp.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
                      [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
                      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$bmp.UnlockBits($data)
if ('__OUT__'.EndsWith('.jpg')) {
  # logo 是白底，用 JPEG 体积远小于 PNG，且不影响观感
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92)
  $bmp.Save('__OUT__', $codec, $ep)
} else {
  $bmp.Save('__OUT__', [System.Drawing.Imaging.ImageFormat]::Png)
}
$bmp.Dispose()
`;

const written = [];
for (const o of outputs) {
  const right = o.rect.x0 + o.rect.w - 1;
  if (o.name !== 'logo-full.jpg' && right >= gaps[0][0]) {
    throw new Error(`${o.name} 的裁切区右边界 ${right} 越过了图标/文字分界 ${gaps[0][0]}，会把文字带进来`);
  }
  const pixels = resample(o.rect, o.w, o.h, !o.transparent);
  const rawPath = join(tmpDir, o.name + '.rgba');
  const outPath = join(imgDir, o.name);
  writeFileSync(rawPath, pixels);
  execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command',
    PS_SAVE.replace('__W__', o.w).replace('__H__', o.h).replace('__RAW__', rawPath).replace(/__OUT__/g, outPath)
  ], { encoding: 'utf8' });
  unlinkSync(rawPath);
  written.push({ name: o.name, w: o.w, h: o.h, bytes: statSync(outPath).size });
}

try { unlinkSync(RAW_BMP); } catch {}

console.log('\n=== 生成结果 ===');
for (const f of written) {
  console.log(`  ${f.name.padEnd(22)} ${String(f.w).padStart(4)}×${String(f.h).padEnd(5)} ${(f.bytes / 1024).toFixed(1)} KB`);
}

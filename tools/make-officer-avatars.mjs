/*
 * 把核心管理局五位负责人的头像处理成站点用的图片。
 * 源图约 1080×1080（其中一张 800×801），统一裁成正方形，
 * 缩到 240×240 并压到 60KB 以内（页面实际显示约 56px，2x 屏够用）。
 * 用法：node tools/make-officer-avatars.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
mkdirSync(imgDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const BASE = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects';

// 顺序与用户给的图一一对应
const JOBS = [
  { src: join(BASE, '40', '40dee195ed8c1da8b1f9addd2b62e153cc6d8f39bd42e8abb0785e1dbeb47935'), out: 'avatar-william.jpg', who: '威廉' },
  { src: join(BASE, 'f2', 'f230485354284c63348a5ba43caacbcc4a770a17e5f72484146fb49cf0d2cbbe'), out: 'avatar-ganning.jpg', who: '柑柠' },
  { src: join(BASE, '73', '7392c4b17eb73a05b97b724ac7f409737ca8380615d4066d1111a3a8fb47d102'), out: 'avatar-suda.jpg', who: '苏打' },
  { src: join(BASE, '7d', '7d6432283d6150dcc86a0c1ffcc50cf4ea12a6849e1b7de247b636b4f271f635'), out: 'avatar-yinghua.jpg', who: '樱花' },
  { src: join(BASE, 'c7', 'c75cbb1d218e716ae25a6f93cef43086afab53554bf7ca688acdc4b15529b974'), out: 'avatar-axiao.jpg', who: '阿潇' }
];

const SIZE = 240;

for (const job of JOBS) {
  const outPath = join(imgDir, job.out);
  const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${job.src}')
$sw = $src.Width; $sh = $src.Height

# 居中裁成正方形（避免非正方形的图被拉扁）
$side = [Math]::Min($sw, $sh)
$cx = [int](($sw - $side) / 2)
$cy = [int](($sh - $side) / 2)

$bmp = New-Object System.Drawing.Bitmap(${SIZE}, ${SIZE})
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, ${SIZE}, ${SIZE})),
             (New-Object System.Drawing.Rectangle($cx, $cy, $side, $side)),
             [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)
$bmp.Save('${outPath}', $codec, $ep)
$bmp.Dispose(); $src.Dispose()
Write-Output ($sw.ToString() + 'x' + $sh.ToString())
`;

  const srcSize = execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' }).trim();
  const s = statSync(outPath);
  const kb = s.size / 1024;
  const ok = kb < 60;
  console.log(`  ${job.who.padEnd(3)} ${job.out.padEnd(22)} 源 ${srcSize.padEnd(10)} → ${SIZE}×${SIZE}  ${kb.toFixed(0)} KB  ${ok ? '✓' : '✗ 超过 60KB'}`);
}

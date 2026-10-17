/*
 * 处理「秋水三尺」地图作品的三张截图。
 * 统一压到 1600×900（16:9）、质量 88、单张 600KB 以内。
 *
 * 用法：node tools/make-qiushui-images.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const BASE = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects';

const JOBS = [
  { src: join(BASE, 'e2', 'e201c1036679246a9e70b917eb1377f0596208c28b78e69767ad120b7dfab660'), out: 'qiushui-1.jpg', note: '夜景正面' },
  { src: join(BASE, '57', '57d6d0a3b9c3784a9ffec9597e636fd53ab77b9c37f4baf051df80c5414c60c2'), out: 'qiushui-2.jpg', note: '白天正面' },
  { src: join(BASE, '7c', '7cf47477ca1744c18db0eabf988bda6677873a1be375734b375444c9e04629e6'), out: 'qiushui-3.jpg', note: '侧景题字' }
];

const W = 1600;
const H = 900;

for (const job of JOBS) {
  const outPath = join(imgDir, job.out);
  // 源图比目标小时不放大：放上去不会多出细节，只会让文件变大
  const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${job.src}')
$sw = $src.Width; $sh = $src.Height

# 按 16:9 居中裁切，避免拉伸变形
$targetRatio = ${W} / ${H}
$srcRatio = $sw / $sh
if ($srcRatio -gt $targetRatio) {
  $ch = $sh
  $cw = [int]($sh * $targetRatio)
} else {
  $cw = $sw
  $ch = [int]($sw / $targetRatio)
}
$cx = [int](($sw - $cw) / 2)
$cy = [int](($sh - $ch) / 2)

# 输出尺寸取「裁切后」与目标上限中较小的那个（只缩小，不放大）
$ow = [Math]::Min(${W}, $cw)
$oh = [Math]::Min(${H}, $ch)

$bmp = New-Object System.Drawing.Bitmap($ow, $oh)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $ow, $oh)),
             (New-Object System.Drawing.Rectangle($cx, $cy, $cw, $ch)),
             [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)
$bmp.Save('${outPath}', $codec, $ep)
$bmp.Dispose(); $src.Dispose()
Write-Output ($sw.ToString() + 'x' + $sh.ToString() + '>' + $ow.ToString() + 'x' + $oh.ToString())
`;

  const info = execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' }).trim();
  const kb = statSync(outPath).size / 1024;
  console.log(`  ${job.note.padEnd(8)} ${job.out.padEnd(14)} ${info.padEnd(22)} ${kb.toFixed(0)} KB  ${kb < 600 ? '✓' : '✗ 超过 600KB'}`);
}

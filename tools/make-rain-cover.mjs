/*
 * 把海报里的雨景图裁成 16:9 并输出为作品详情页的封面。
 * 源图 900×580（比例 1.552），按 16:9 居中裁切后再放大到 1280×720。
 * 用法：node tools/make-rain-cover.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
mkdirSync(imgDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects\\44\\44cfe4a03f794ca201f263b58e15e1da85078e3c952e690956878385c046a191';
const OUT = join(imgDir, 'shader-rain.jpg');

const OUT_W = 1280;
const OUT_H = 720;

const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${SRC}')
$sw = $src.Width; $sh = $src.Height
$target = ${OUT_W} / ${OUT_H}

# 按 16:9 居中裁切（源图偏矮，所以裁掉左右）
if (($sw / $sh) -gt $target) {
  $ch = $sh
  $cw = [int][math]::Round($sh * $target)
  $cx = [int](($sw - $cw) / 2); $cy = 0
} else {
  $cw = $sw
  $ch = [int][math]::Round($sw / $target)
  $cx = 0; $cy = [int](($sh - $ch) / 2)
}
Write-Output ('裁切: ' + $cx + ',' + $cy + '  ' + $cw + 'x' + $ch)

$bmp = New-Object System.Drawing.Bitmap(${OUT_W}, ${OUT_H})
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, ${OUT_W}, ${OUT_H})),
             (New-Object System.Drawing.Rectangle($cx, $cy, $cw, $ch)),
             [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)
$bmp.Save('${OUT}', $codec, $ep)
$bmp.Dispose(); $src.Dispose()
Write-Output ('输出: ${OUT_W}x${OUT_H}')
`;

const out = execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' });
console.log(out.trim());
const s = statSync(OUT);
console.log(`\n  shader-rain.jpg  ${OUT_W}×${OUT_H}  ${(s.size / 1024).toFixed(0)} KB`);

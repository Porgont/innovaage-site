/*
 * 社交分享卡 og-image.jpg（1200×630）：
 *   左 56%：首页大图（裁切成 672×630）
 *   右 44%：白色卡片，居中放完整 logo + 一行群号
 * 用于 og:image / twitter:image，微信、QQ、B站等分享时会取这张。
 *
 * 用法：node tools/make-og-image.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
mkdirSync(imgDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const hero = join(imgDir, 'shader-2.jpg');
const logo = join(imgDir, 'logo-full.jpg');
const out = join(imgDir, 'og-image.jpg');

const script = `
Add-Type -AssemblyName System.Drawing
$W = 1200; $H = 630
$photoW = 672

$canvas = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 底色：浅灰
$g.Clear([System.Drawing.Color]::FromArgb(244, 245, 247))

# --- 左侧照片：等比覆盖 672x630 ---
$photo = [System.Drawing.Image]::FromFile('${hero}')
$scale = [math]::Max($photoW / $photo.Width, $H / $photo.Height)
$dw = [int][math]::Round($photo.Width * $scale)
$dh = [int][math]::Round($photo.Height * $scale)
$dx = [int](($photoW - $dw) / 2)
$dy = [int](($H - $dh) / 2)
$g.DrawImage($photo, (New-Object System.Drawing.Rectangle($dx, $dy, $dw, $dh)))
$photo.Dispose()

# --- 右侧白卡 ---
$cardX = $photoW + 34
$cardY = 34
$cardW = $W - $cardX - 34
$cardH = $H - 68
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillRectangle($white, $cardX, $cardY, $cardW, $cardH)

# 卡片顶部一抹黄
$gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 197, 24))
$g.FillRectangle($gold, $cardX, $cardY, 64, 6)

# --- logo ---
$lg = [System.Drawing.Image]::FromFile('${logo}')
$maxW = $cardW - 72
$ls = [math]::Min($maxW / $lg.Width, 150 / $lg.Height)
$lw = [int][math]::Round($lg.Width * $ls)
$lh = [int][math]::Round($lg.Height * $ls)
$lx = $cardX + [int](($cardW - $lw) / 2)
$ly = $cardY + 96
$g.DrawImage($lg, (New-Object System.Drawing.Rectangle($lx, $ly, $lw, $lh)))
$lg.Dispose()

# --- 文字 ---
$fontMono = New-Object System.Drawing.Font('Consolas', 15, [System.Drawing.FontStyle]::Bold)
$fontText = New-Object System.Drawing.Font('Microsoft YaHei', 14)
$ink  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 28, 32))
$dim  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110, 118, 128))

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

$ty = $ly + $lh + 46
$g.DrawString('对外交流群 788233856', $fontMono, $ink,
  (New-Object System.Drawing.RectangleF($cardX, $ty, $cardW, 30)), $sf)
$g.DrawString('innovaage.cn', $fontText, $dim,
  (New-Object System.Drawing.RectangleF($cardX, ($ty + 36), $cardW, 28)), $sf)

$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)
$canvas.Save('${out}', $codec, $ep)
$canvas.Dispose()
Write-Output 'ok'
`;

execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' });
const s = statSync(out);
console.log(`  og-image.jpg  1200×630  ${(s.size / 1024).toFixed(0)} KB`);

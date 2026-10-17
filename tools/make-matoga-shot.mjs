/*
 * 把芝世提供的 matoga 界面截图处理成站点用的图片。
 * 原图 2560×1440，缩到 1600×900 并压到 500KB 以内（站点图片规范）。
 * 用法：node tools/make-matoga-shot.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img');
mkdirSync(imgDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects\\a5\\a51e5b3bf0b4d1a6bafc44b9fcdf85b8516744cf9a2fe2466d8c7b220946ea13';
const OUT = join(imgDir, 'matoga-ui.jpg');
const OUT_W = 1600;

const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${SRC}')
Write-Output ('原图: ' + $src.Width + 'x' + $src.Height)

$w = ${OUT_W}
$h = [int][math]::Round($src.Height * $w / $src.Width)

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)))
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 86)
$bmp.Save('${OUT}', $codec, $ep)
$bmp.Dispose(); $src.Dispose()
Write-Output ('输出: ' + $w + 'x' + $h)
`;

const out = execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' });
console.log(out.trim());
const s = statSync(OUT);
const kb = s.size / 1024;
console.log(`\n  matoga-ui.jpg  ${(kb).toFixed(0)} KB  ${kb < 500 ? '✓ 在 500KB 以内' : '✗ 超过 500KB'}`);

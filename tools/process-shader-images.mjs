/*
 * 图片处理脚本：把光影渲染图裁掉游戏 UI 区域，并压到目标体积以内，输出到 assets/img/
 *
 * 做法：
 *   1) 裁掉顶部 175px（左上「SRC 设置 / FPS」信息块、顶部罗盘、聊天栏提示）
 *   2) 每个候选的 宽度×质量 组合都从原图重新出发（不在已压缩的产物上再压，避免失真累积），
 *      取第一个 ≤ 目标体积的结果
 *   3) 原图不动，只生成新文件
 *
 * 运行：node tools/process-shader-images.mjs
 */
import { mkdirSync, statSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, 'assets', 'img');
mkdirSync(outDir, { recursive: true });

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SRC = 'C:\\Users\\Ronsy\\.dsh-packs\\better-deepseek-harness-codex\\attachments\\v1\\objects';
const CROP_TOP = 175;
const TARGET = 450 * 1024;          // 单张目标上限 450KB

const jobs = [
  { src: join(SRC, '6e', '6e60c402493d294179b981efb875710445a280daa639cb39273e4f5b83213fbf'), out: 'shader-1.jpg', desc: '雪山与松林，强光天空' },
  { src: join(SRC, 'd9', 'd906755ed67d0328de01e46854e4a46d9592c37b4353ee9e9bfdd0eceae100e0'), out: 'shader-2.jpg', desc: '樱花林地，花簇与花瓣' },
  { src: join(SRC, '10', '1003eb2524700c9c81a7e0d31db156d4fd96d4e3534d11e2d3908cf79e05453d'), out: 'shader-3.jpg', desc: '峡谷水道，水面反射' }
];

// 候选：先保持原宽降质量，再逐步缩小宽度
const CANDIDATES = [
  { w: 2133, q: 82 }, { w: 2133, q: 72 },
  { w: 1800, q: 78 }, { w: 1600, q: 80 }, { w: 1600, q: 70 },
  { w: 1400, q: 80 }, { w: 1280, q: 78 }
];

function psFor(job, cand, tmpOut) {
  return `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${job.src}')
$srcRect = New-Object System.Drawing.Rectangle(0, ${CROP_TOP}, $img.Width, ($img.Height - ${CROP_TOP}))
$w = ${cand.w}
$h = [int][math]::Round($w * ($img.Height - ${CROP_TOP}) / $img.Width)
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$bmp.SetResolution(96, 96)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, ${cand.q})
$bmp.Save('${tmpOut}', $codec, $ep)
$bmp.Dispose(); $img.Dispose()
Write-Output "$w x $h"
`;
}

function render(job, cand, tmpOut) {
  const dims = execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', psFor(job, cand, tmpOut)],
    { encoding: 'utf8' }).trim();
  return { dims, bytes: statSync(tmpOut).size };
}

console.log('\n=== 处理结果 ===');
let total = 0;

for (const job of jobs) {
  const finalOut = join(outDir, job.out);
  const tmpOut = join(outDir, '.' + job.out + '.tmp');
  const tried = [];
  let chosen = null;

  for (const cand of CANDIDATES) {
    const r = render(job, cand, tmpOut);
    tried.push(`${cand.w}@q${cand.q}=${(r.bytes / 1024).toFixed(0)}K`);
    if (r.bytes <= TARGET) { chosen = { cand, ...r }; break; }
  }

  // 兜底：所有候选都超标时保留最后一个（最小）结果
  if (!chosen) {
    const cand = CANDIDATES[CANDIDATES.length - 1];
    chosen = { cand, ...render(job, cand, tmpOut) };
  }

  if (existsSync(finalOut)) unlinkSync(finalOut);
  renameSync(tmpOut, finalOut);

  const origKB = (statSync(job.src).size / 1024).toFixed(0);
  const outKB = (chosen.bytes / 1024).toFixed(0);
  total += chosen.bytes;

  console.log(`  ${job.out.padEnd(14)} ${chosen.dims.padEnd(12)} 质量 ${chosen.cand.q}   ${outKB.padStart(4)} KB   ← 原图 ${origKB} KB，裁掉顶部 ${CROP_TOP}px`);
  console.log(`      ${job.desc}`);
  console.log(`      候选轨迹 ${tried.join('  ')}`);
}

console.log(`\n合计 ${(total / 1024).toFixed(0)} KB / ${jobs.length} 张`);

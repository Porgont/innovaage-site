#!/usr/bin/env node
/**
 * 给静态页面里的 <img> 补上 width / height 属性。
 *
 * 为什么要这个：浏览器拿到尺寸后才能在图片下载完成前把位置留出来，
 * 否则图片一张张加载，正文会不停往下跳（就是常说的布局抖动）。
 *
 * 用法：
 *   node tools/fix-image-dims.mjs          # 只报告要补多少
 *   node tools/fix-image-dims.mjs --write  # 真的写回文件
 *
 * 只读本地图片文件头，不依赖任何第三方库；读不出尺寸的（比如外链图）跳过。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

/* ---------- 读图片尺寸 ---------- */

function sizeOfPng(buf) {
  if (buf.length < 24) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function sizeOfJpeg(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15，排除 DHT(C4)、JPG(C8)、DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function sizeOfWebp(buf) {
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fmt === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8X') {
    return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function imageSize(file) {
  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    return null;
  }
  if (buf.length < 16) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return sizeOfPng(buf);
  if (buf[0] === 0xff && buf[1] === 0xd8) return sizeOfJpeg(buf);
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return sizeOfWebp(buf);
  return null;
}

/* ---------- 处理页面 ---------- */

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let total = 0;
let filled = 0;
let skipped = 0;
const perPage = [];

for (const page of pages) {
  const file = join(ROOT, page);
  let html = readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(/<img\b([^>]*)>/g, (tag, attrs) => {
    // 已经有尺寸的、灯箱占位图（没 src 或没尺寸意义）都跳过
    if (/\bwidth=/.test(attrs) && /\bheight=/.test(attrs)) return tag;
    if (/\bid="lightbox-img"/.test(attrs)) { skipped++; return tag; }
    const m = /\bsrc="([^"]+)"/.exec(attrs);
    if (!m) { skipped++; return tag; }
    const src = m[1];
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) { skipped++; return tag; }

    const abs = join(ROOT, src.split('?')[0]);
    if (!existsSync(abs) || !statSync(abs).isFile()) { skipped++; return tag; }

    const dim = imageSize(abs);
    if (!dim || !dim.w || !dim.h) { skipped++; return tag; }

    total++;
    filled++;
    // 插在 src 后面，保持属性顺序可读
    const replaced = attrs.replace(/\bsrc="[^"]*"/, (s) => s + ` width="${dim.w}" height="${dim.h}"`);
    return `<img${replaced}>`;
  });

  if (html !== before) {
    perPage.push(`${page}：${(before.match(/<img\b/g) || []).length - (html.match(/<img\b[^>]*width=/g) || []).length >= 0 ? '' : ''}`);
    if (WRITE) writeFileSync(file, html, 'utf8');
  }
}

console.log(`扫描 ${pages.length} 个页面`);
console.log(`补尺寸的图片：${filled} 个${WRITE ? '（已写回）' : '（未写，加 --write 才写）'}`);
console.log(`跳过：${skipped} 个（灯箱占位、外链、读不出尺寸）`);
if (!WRITE && filled > 0) console.log('\n确认没问题后执行：node tools/fix-image-dims.mjs --write');

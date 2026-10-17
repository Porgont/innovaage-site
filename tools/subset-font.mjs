#!/usr/bin/env node
/* 把 HarmonyOS Sans SC 子集化成站内真正用到的字符，输出 assets/fonts/harmonyos-sans-sc.woff2
 *
 * 源字体是本机安装的那份可变字体（wght 40–900 一条轴），
 * 所以一个 woff2 就能覆盖全站的 400 / 500 / 700 / 800 各档字重。
 *
 * 用法：node tools/subset-font.mjs
 *
 * 什么时候要重跑：
 *   - 发了新公告、加了作品，正文里出现以前没出现过的字
 *   - 改了页面上的固定文案
 * 不重跑也不报错，只是那几个字会回退成系统字体，肉眼能看出来。
 *
 * 依赖：python + fonttools + brotli（三者本机都有）
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 本机安装的鸿蒙可变字体
const SRC = 'C:/Users/Ronsy/AppData/Local/Microsoft/Windows/Fonts/HarmonyOS_Sans_SC.ttf';
const OUT_DIR = join(root, 'assets', 'fonts');
const OUT = join(OUT_DIR, 'harmonyos-sans-sc.woff2');

const PY = process.env.PYTHON || 'python';

/* ---------- 1. 收集站内用到的字符 ---------- */
function collectText() {
  const parts = [];

  const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
  for (const f of pages) parts.push(readFileSync(join(root, f), 'utf8'));

  for (const rel of ['assets/js/site.js', 'assets/js/convert-tool.js', 'assets/js/pdf-tool.js']) {
    try { parts.push(readFileSync(join(root, rel), 'utf8')); } catch (e) { /* 有些页面没有这个文件 */ }
  }

  return parts.join('\n');
}

/* 只留下会显示出来的字符：可打印 ASCII、常用中文标点、CJK、全角符号等 */
function isWanted(ch) {
  const c = ch.codePointAt(0);
  if (c === 0x20 || (c >= 0x21 && c <= 0x7e)) return true;        // ASCII 可见字符
  if (c >= 0x4e00 && c <= 0x9fff) return true;                    // CJK 统一表意文字
  if (c >= 0x3000 && c <= 0x303f) return true;                    // 中文标点
  if (c >= 0xff00 && c <= 0xffef) return true;                    // 全角字符
  if (c >= 0x2000 && c <= 0x206f) return true;                    // 通用标点（破折号、省略号等）
  if (c >= 0x2190 && c <= 0x21ff) return true;                    // 箭头
  if (c >= 0x2460 && c <= 0x24ff) return true;                    // 带圈数字
  if (c >= 0x25a0 && c <= 0x25ff) return true;                    // 几何图形
  if (c === 0x00b7 || c === 0x00d7 || c === 0x2014 || c === 0x2018 ||
      c === 0x2019 || c === 0x201c || c === 0x201d || c === 0x2026) return true;
  return false;
}

const text = collectText();
const set = new Set();
for (const ch of text) {
  if (isWanted(ch)) set.add(ch);
}

// 兜底：数字、拉丁大小写、常用标点一定有
for (const ch of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') set.add(ch);
for (const ch of '，。、；：？！「」『』（）《》〈〉【】—…·～＋－×÷％＃＠＆') set.add(ch);

const chars = [...set].sort().join('');
const charsFile = join(tmpdir(), 'innovaage-font-chars.txt');
writeFileSync(charsFile, chars, 'utf8');

const cjk = [...set].filter((c) => c.codePointAt(0) >= 0x4e00 && c.codePointAt(0) <= 0x9fff).length;
console.log('收集到 ' + set.size + ' 个字符（其中汉字 ' + cjk + ' 个）');

/* ---------- 2. 调 python 切字体 ---------- */
if (!statSync(SRC, { throwIfNoEntry: false })) {
  console.error('找不到源字体：' + SRC);
  console.error('请先安装 HarmonyOS Sans SC，或改本脚本顶部的 SRC。');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

console.log('正在子集化…');
execFileSync(PY, [join(root, 'tools', 'subset_font.py'), SRC, charsFile, OUT], {
  stdio: 'inherit'
});

const kb = Math.round(statSync(OUT).size / 1024);
console.log('已生成 assets/fonts/harmonyos-sans-sc.woff2  ' + kb + ' KB');

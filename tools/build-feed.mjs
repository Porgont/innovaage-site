#!/usr/bin/env node
/* 生成公告 RSS：feed.xml
 *
 * 公告数据在 assets/js/site.js 的 ANNOUNCEMENTS 里，这里直接读那一块数组，
 * 不启动浏览器、不解析 HTML。
 *
 * 用法：node tools/build-feed.mjs
 * 发完公告跑一次，feed.xml 才会更新。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = {
  url: 'https://innovaage.cn/',
  title: '创想时代开发组 · 公告',
  desc: '创想时代开发组的公告：招募、版本发布、合作与站点动态。',
  lang: 'zh-CN'
};

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- 取公告数据 ---------- */
function loadAnnouncements() {
  // 公告已经不在 site.js 里了，改读 content/announcements.json
  const data = JSON.parse(readFileSync(resolve(ROOT, 'content/announcements.json'), 'utf8'));
  const list = Array.isArray(data) ? data : (data.announcements || []);
  return list.filter(function (a) { return a && a.id && a.title; });
}

/* ---------- 小工具 ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Markdown → 纯文本，拿来做 RSS 摘要
function plain(md) {
  return String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // 链接留文字
    .replace(/^#{1,6}\s+/gm, '')                   // 标题井号
    .replace(/^\s*>\s?/gm, '')                     // 引用
    .replace(/^\s*[-*]\s+/gm, '')                  // 列表符号
    .replace(/\*\*([^*]+)\*\*/g, '$1')             // 加粗
    .replace(/`([^`]+)`/g, '$1')                   // 行内代码
    .replace(/\s+/g, ' ')
    .trim();
}

function rfc822(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return new Date().toUTCString();
  // 星期按当地日历日期算，别掺时区偏移，否则会退到前一天
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY[d.getUTCDay()] + ', ' + String(m[3]).padStart(2, '0') + ' ' +
    MONTH[Number(m[2]) - 1] + ' ' + m[1] + ' 00:00:00 +0800';
}

/* ---------- 组装 ---------- */
const list = loadAnnouncements()
  .slice()
  .sort((a, b) => {
    if (!!b.pin !== !!a.pin) return b.pin ? 1 : -1;
    return String(b.date).localeCompare(String(a.date));
  });

const items = list.map((n) => {
  const link = SITE.url + 'article.html?id=' + encodeURIComponent(n.id);
  const text = plain(n.body);
  const desc = text.length > 140 ? text.slice(0, 140) + '…' : text;
  const cats = (n.tags || []).map((t) => '      <category>' + esc(t) + '</category>').join('\n');

  return [
    '    <item>',
    '      <title>' + esc(n.title) + '</title>',
    '      <link>' + esc(link) + '</link>',
    '      <guid isPermaLink="true">' + esc(link) + '</guid>',
    '      <pubDate>' + rfc822(n.date) + '</pubDate>',
    cats,
    '      <description>' + esc(desc) + '</description>',
    '    </item>'
  ].filter(Boolean).join('\n');
}).join('\n');

const now = new Date();
const stamp = DAY[now.getUTCDay()] + ', ' + String(now.getUTCDate()).padStart(2, '0') + ' ' +
  MONTH[now.getUTCMonth()] + ' ' + now.getUTCFullYear() + ' ' +
  now.toLocaleTimeString('en-GB', { hour12: false }) + ' +0000';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.title)}</title>
    <link>${esc(SITE.url)}news.html</link>
    <atom:link href="${esc(SITE.url)}feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE.desc)}</description>
    <language>${SITE.lang}</language>
    <lastBuildDate>${stamp}</lastBuildDate>
${items}
  </channel>
</rss>
`;

writeFileSync(resolve(ROOT, 'feed.xml'), xml, 'utf8');
console.log('feed.xml 已生成：' + list.length + ' 条公告');
list.forEach((n) => console.log('  ' + n.date + '  ' + n.title));

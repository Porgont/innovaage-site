/*
 * 视频工具专用自检。
 *
 * 为什么单独一个文件：视频解码/录制会占用浏览器的媒体管线，
 * 在跑过上百次页面跳转的同一个浏览器实例里，后面再测视频
 * 会稳定读出 readyState=0（文件明明能播）。单独起一个干净的
 * 浏览器实例就正常 —— 这是测试环境的问题，不是工具的问题。
 * 放一起还会把 13 条断言一起染红，掩盖真实故障，所以拆开。
 *
 * 用法：node tools/test-video.mjs
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9366;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${name}${detail ? '   ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-vidtest-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 60; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find((t) => t.type === 'page');
    if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
if (!wsUrl) { console.error('连不上 Edge'); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const { resolve: r, reject: j } = pend.get(m.id); pend.delete(m.id);
    m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
  }
};
const send = (method, params = {}) => {
  const mid = ++id; ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res, rej) => pend.set(mid, { resolve: res, reject: rej }));
};
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/tools-video.html' });
await sleep(2200);

console.log('=== 工具存在性与依赖 ===');
check('视频工具的元素都在',
  await evalJs(`!!document.querySelector('#v-dropzone') && !!document.querySelector('#v-file-input') &&
                !!document.querySelector('#v-diag') && !!document.querySelector('#v-run-btn') &&
                !!document.querySelector('#v-preview')`));

check('mp4box.js 已自托管且加载成功',
  await evalJs("typeof MP4Box !== 'undefined'"),
  'typeof MP4Box = ' + await evalJs("typeof MP4Box"));

check('没有依赖外网 CDN',
  await evalJs(`[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))`));

const fn = JSON.parse(await evalJs(`JSON.stringify({
  r16x9: window.__videoTool.ratioLabel(1920, 1080),
  r4x3:  window.__videoTool.ratioLabel(640, 480),
  r9x16: window.__videoTool.ratioLabel(1080, 1920),
  h264a: window.__videoTool.isH264('avc1.640c20'),
  h264b: window.__videoTool.isH264('avc3.42E01E'),
  h264c: window.__videoTool.isH264('vp09.00.10.08'),
  mime:  window.__videoTool.pickMime('h264'),
  has265: window.__videoTool.codecAvailable('h265'),
  align720: window.__videoTool.alignDim(721),
  alignSmall: window.__videoTool.alignDim(5)
})`));
check('比例化简：1920×1080 → 16:9', fn.r16x9 === '16:9', fn.r16x9);
check('比例化简：640×480 → 4:3', fn.r4x3 === '4:3', fn.r4x3);
check('比例化简：1080×1920 → 9:16', fn.r9x16 === '9:16', fn.r9x16);
check('H.264 识别：avc1 / avc3 算通过', fn.h264a && fn.h264b);
check('H.264 识别：VP9 不算通过', fn.h264c === false);
check('能找到可用的 H.264 录制格式', /^video\/mp4/.test(fn.mime), fn.mime);
check('宽高会抹平到 16 的倍数（721 → 720）', fn.align720 === 720, '实际 ' + fn.align720);
check('过小的尺寸有下限保护', fn.alignSmall >= 16, '实际 ' + fn.alignSmall);

/* ---------- 导出规格面板 ---------- */
console.log('\n=== 导出规格 ----------');
check('四个预设都在',
  await evalJs(`['submit','p1080','p720','custom'].every(function (k) {
    return !!document.querySelector('.chip[data-preset="' + k + '"]');
  })`));

const specSubmit = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('submit');
  var s = window.__videoTool.state.spec;
  return JSON.stringify({
    preset: s.preset, w: s.w, h: s.h, ratio: s.ratio,
    codec: s.codec, maxDur: s.maxDur, locked: s.locked,
    targetW: window.__videoTool.resolveTarget().w,
    targetH: window.__videoTool.resolveTarget().h
  });
})()`));
check('「符合投稿规范」= 1280×720 / 16:9 / H.264 / 90 秒',
  specSubmit.w === 1280 && specSubmit.h === 720 && specSubmit.ratio === '16:9' &&
  specSubmit.codec === 'h264' && specSubmit.maxDur === 90,
  JSON.stringify(specSubmit));
check('「符合投稿规范」是锁定的（防止误改投稿要求）', specSubmit.locked === true);

const spec1080 = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('p1080');
  var s = window.__videoTool.state.spec;
  return JSON.stringify({ w: s.w, h: s.h, locked: s.locked, codec: s.codec });
})()`));
check('1080P 预设 = 1920×1080 且可改', spec1080.w === 1920 && spec1080.h === 1080 && spec1080.locked === false,
  JSON.stringify(spec1080));

const spec720 = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('p720');
  var s = window.__videoTool.state.spec;
  return JSON.stringify({ w: s.w, h: s.h });
})()`));
check('720P 预设 = 1280×720', spec720.w === 1280 && spec720.h === 720, JSON.stringify(spec720));

// 改比例：点 9:16 后输出应变成竖屏
const specPortrait = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('p720');
  document.querySelector('.chip[data-ratio="9:16"]').click();
  var t = window.__videoTool.resolveTarget();
  return JSON.stringify({ w: t.w, h: t.h, ratio: window.__videoTool.state.spec.ratio });
})()`));
check('选 9:16 后输出变成竖屏（高 > 宽）',
  specPortrait.ratio === '9:16' && specPortrait.h > specPortrait.w,
  specPortrait.w + '×' + specPortrait.h);

const specSquare = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('p720');
  document.querySelector('.chip[data-ratio="1:1"]').click();
  var t = window.__videoTool.resolveTarget();
  return JSON.stringify({ w: t.w, h: t.h });
})()`));
check('选 1:1 后输出是正方形', specSquare.w === specSquare.h,
  specSquare.w + '×' + specSquare.h);

// 自定义分辨率
const specCustom = JSON.parse(await evalJs(`(function () {
  window.__videoTool.applyPreset('custom');
  var w = document.querySelector('#v-out-w');
  w.value = 640;
  w.dispatchEvent(new Event('change'));
  var h = document.querySelector('#v-out-h');
  h.value = 480;
  h.dispatchEvent(new Event('change'));
  var t = window.__videoTool.resolveTarget();
  return JSON.stringify({ w: t.w, h: t.h, preset: window.__videoTool.state.spec.preset });
})()`));
check('自定义模式下可以手改分辨率（640×480）',
  specCustom.w === 640 && specCustom.h === 480, specCustom.w + '×' + specCustom.h);

// H.265 选项：不支持时必须置灰
const h265 = JSON.parse(await evalJs(`(function () {
  var opt = document.querySelector('#v-codec option[value="h265"]');
  return JSON.stringify({
    exists: !!opt,
    disabled: opt ? opt.disabled : null,
    available: window.__videoTool.codecAvailable('h265')
  });
})()`));
if (h265.available) {
  check('H.265 可用时选项是启用的', h265.disabled === false);
} else {
  check('H.265 不支持时选项被置灰（不会让用户选中一个用不了的编码）',
    h265.exists && h265.disabled === true);
}

// 回到投稿规范，后面的完整流程用它
await evalJs("window.__videoTool.applyPreset('submit')");

console.log('\n=== 完整流程：诊断 → 转换 → 复检 ===');
const run = await evalJs(`(async () => {
  try {
    var resp = await fetch('tools/fixtures/test-4x3.mp4');
    if (!resp.ok) return JSON.stringify({ error: '取不到测试样本 HTTP ' + resp.status });
    var blob = new Blob([await resp.arrayBuffer()], { type: 'video/mp4' });
    var file = new File([blob], 'test-4x3.mp4', { type: 'video/mp4' });

    // 先单独确认样本能播，否则后面的结论不可信
    var sampleInfo = await new Promise(function (res) {
      var u = URL.createObjectURL(blob);
      var v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true;
      v.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(v);
      v.src = u;
      var done = false;
      function fin(t) { if (done) return; done = true; URL.revokeObjectURL(u); v.remove(); res(t); }
      v.onloadedmetadata = function () {
        fin(v.videoWidth > 0 && isFinite(v.duration) && v.duration > 0
          ? v.videoWidth + 'x' + v.videoHeight + ' ' + v.duration.toFixed(2) + 's' : '');
      };
      v.onerror = function () { fin(''); };
      setTimeout(function () { fin(''); }, 8000);
      v.load();
    });

    await window.__videoTool.loadFile(file);
    await new Promise(function (r) { setTimeout(r, 800); });
    var diag = document.querySelector('#v-diag').innerText;

    document.querySelector('.chip[data-fit="pad"]').click();
    await window.__videoTool.run();
    await new Promise(function (r) { setTimeout(r, 600); });

    var res = window.__videoTool.state.result;
    return JSON.stringify({
      sampleKB: Math.round(blob.size / 1024),
      sampleInfo: sampleInfo,
      diag: diag,
      hasResult: !!res,
      name: res ? res.name : '',
      outW: res ? res.verify.width : 0,
      outH: res ? res.verify.height : 0,
      outDur: res ? Math.round(res.verify.duration * 10) / 10 : 0,
      outCodec: res ? res.verify.codec : '',
      outMp4: res ? res.verify.isMp4 : false,
      outPlayable: res ? res.verify.playable : false,
      stats: document.querySelector('#v-result-stats').innerText,
      status: document.querySelector('#v-status').innerText
    });
  } catch (e) {
    return JSON.stringify({ error: e.name + ': ' + e.message });
  }
})()`);

const r = JSON.parse(run);
if (r.error) {
  check('完整流程', false, r.error);
} else {
  check('测试样本本身可播放', !!r.sampleInfo, '样本 ' + r.sampleKB + ' KB，' + (r.sampleInfo || '不可播放'));
  check('诊断识别出「不是 16:9」', r.diag.includes('4:3') && r.diag.includes('16:9'),
    r.diag.replace(/\n/g, ' | ').slice(0, 200));
  check('诊断标出了时长上限', r.diag.includes('时长') && r.diag.includes('上限'));
  check('诊断读出了源编码是 H.264', /H\.264/.test(r.diag), r.diag.replace(/\n/g,' | ').slice(0,160));
  check('转换产出了结果', r.hasResult === true);
  check('结果可播放', r.outPlayable === true);
  check('结果是 1280×720', r.outW === 1280 && r.outH === 720, r.outW + '×' + r.outH);
  check('结果时长在 90 秒以内', r.outDur > 0 && r.outDur <= 90.5, r.outDur + ' 秒');
  check('结果是 MP4 容器', r.outMp4 === true);
  check('结果编码是 H.264', /^avc[13]/i.test(r.outCodec || ''), '实际 ' + r.outCodec);
  check('结果文件名带上了尺寸与编码', /-\d+x\d+-H264\.mp4$/.test(r.name || ''), r.name);
  check('结果表格列出复检项', r.stats.includes('1280') && r.stats.includes('720'));
  check('完成后有成功提示', r.status.includes('转换完成'), r.status.slice(0, 120));
}

console.log('\n=== 裁切模式的计划文案 ===');
/* 这里只验证「切换到裁切后，计划与目标都跟着变」，不再真的录一次：
   本脚本已经录过一次，再录就变成测环境剩余额度了。
   裁切真正出片的验证在 tools/test-video-repeat.mjs（第 2 次转换就是裁切）。 */
await send('Page.navigate', { url: BASE + '/tools-video-page-fresh' }).catch(() => {});
await send('Page.navigate', { url: BASE + '/tools-video.html' });
await sleep(2000);

const cropPlan = await evalJs(`(async () => {
  try {
    var resp = await fetch('tools/fixtures/test-4x3.mp4');
    var blob = new Blob([await resp.arrayBuffer()], { type: 'video/mp4' });
    var file = new File([blob], 'crop-test.mp4', { type: 'video/mp4' });
    document.querySelector('.chip[data-fit="crop"]').click();
    await window.__videoTool.loadFile(file);
    await new Promise(function (r) { setTimeout(r, 800); });
    var t = window.__videoTool.resolveTarget();
    return JSON.stringify({
      fit: window.__videoTool.state.spec.fit,
      plan: document.querySelector('#v-plan').innerText,
      w: t.w,
      h: t.h
    });
  } catch (e) { return JSON.stringify({ error: e.message }); }
})()`);
const cp = JSON.parse(cropPlan);
if (cp.error) {
  check('裁切模式', false, cp.error);
} else {
  check('切换到裁切后，计划里写的是「裁切填满」',
    cp.fit === 'crop' && cp.plan.includes('裁切'), cp.plan.slice(0, 140));
  check('裁切模式目标仍是 1280×720', cp.w === 1280 && cp.h === 720, cp.w + '×' + cp.h);
}

/* 连续转换的回归测试放在 tools/test-video-repeat.mjs 里单独跑：
   浏览器的媒体管线额度是按浏览器进程算的，这个脚本前面已经用掉几次录制，
   再测「连续转换」会变成测环境还剩多少额度，而不是测工具本身。
   这里只断言兜底文案存在。 */

// 编码器被用尽时必须给出可执行的下一步，而不是干巴巴一句「转换失败」
const src = await evalJs("fetch('assets/js/video-tool.js').then(function(r){ return r.text(); })");
check('编码器用尽时提示用户按 F5 刷新（可恢复，不是死路）',
  typeof src === 'string' && src.includes('按 F5 刷新页面'), '检查 video-tool.js 的兜底文案');
check('连续转换多次后会提前给出提示',
  typeof src === 'string' && src.includes('连续转换较多次'));

ws.close(); edge.kill();

const pass = results.filter((x) => x.ok).length;
const failed = results.filter((x) => !x.ok);
console.log(`\n共 ${results.length} 项，通过 ${pass} 项，失败 ${failed.length} 项`);
if (failed.length) {
  console.log('\n失败明细:');
  for (const f of failed) console.log('  ✗ ' + f.name);
}
process.exit(failed.length ? 1 : 0);

/*
 * 格式转换工具（tools-convert.html）的专用自检。
 *
 * 覆盖三块：
 *   1. 音频提取：合成一段已知波形 → 编码 WAV → 解析文件头验证参数与内容
 *   2. JSON ⇄ CSV：含逗号、引号、换行的往返
 *   3. 文本 Base64：中文 UTF-8 往返
 *
 * 用法：node tools/test-convert.mjs
 * 前提：本地有服务，node tools/serve.mjs 8099
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9377;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '   ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-convtest-' + Date.now()),
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

const pageErrors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    pageErrors.push(d.exception?.description || d.text || '未知异常');
  }
});
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/tools-convert.html' });
await sleep(2000);

console.log('=== 页面与依赖 ===');
check('转换页的元素都在',
  await evalJs(`!!document.querySelector('#audio-input') && !!document.querySelector('#audio-run') &&
                !!document.querySelector('#data-in') && !!document.querySelector('#b64-in')`));

check('转换脚本已加载',
  await evalJs("typeof window.IA_CONVERT === 'object' && typeof window.IA_CONVERT.encodeWav === 'function'"),
  'typeof IA_CONVERT = ' + await evalJs("typeof window.IA_CONVERT"));

check('没有依赖外网 CDN',
  await evalJs(`[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))`));

check('工具箱入口页有「格式转换」的入口',
  await evalJs(`fetch('tools.html').then(r => r.text()).then(t => t.includes('tools-convert.html'))`) === true,
  '检查 tools.html 里的链接');

/* ---------- 一、WAV 编码 ---------- */
console.log('\n=== WAV 编码 ===');

const wav = JSON.parse(await evalJs(`(async () => {
  var sr = 44100, sec = 0.5;
  var n = Math.round(sr * sec);
  var off = new OfflineAudioContext(2, n, sr);
  var buf = off.createBuffer(2, n, sr);
  var left = buf.getChannelData(0), right = buf.getChannelData(1);
  for (var i = 0; i < n; i++) {
    left[i] = Math.sin(2 * Math.PI * 440 * i / sr) * 0.5;
    right[i] = -left[i];
  }

  var blob = window.IA_CONVERT.encodeWav(buf);
  var ab = await blob.arrayBuffer();
  var v = new DataView(ab);
  function str(o, len) {
    var s = '';
    for (var i = 0; i < len; i++) s += String.fromCharCode(v.getUint8(o + i));
    return s;
  }
  return JSON.stringify({
    type: blob.type,
    size: ab.byteLength,
    riff: str(0, 4),
    wave: str(8, 4),
    fmt: str(12, 4),
    data: str(36, 4),
    channels: v.getUint16(22, true),
    sampleRate: v.getUint32(24, true),
    bits: v.getUint16(34, true),
    dataSize: v.getUint32(40, true),
    // 交错存储：第 44 + 帧号×声道数×2 字节处是第 n 帧。
    // 第 0 帧取 0 是正常的（正弦起点），所以要取中间某一帧。
    midL: v.getInt16(44 + 100 * 2 * 2, true),
    midR: v.getInt16(44 + 100 * 2 * 2 + 2, true),
    endL: v.getInt16(44 + (n - 1) * 2 * 2, true)
  }, null, 1);
})()`));

check('WAV 头是 RIFF/WAVE', wav.riff === 'RIFF' && wav.wave === 'WAVE', wav.riff + '/' + wav.wave);
check('WAV 里有 fmt 与 data 块', wav.fmt === 'fmt ' && wav.data === 'data', wav.fmt + '/' + wav.data);
check('声道数写对了', wav.channels === 2, '声道 ' + wav.channels);
check('采样率写对了', wav.sampleRate === 44100, '采样率 ' + wav.sampleRate);
check('位深是 16', wav.bits === 16, '位深 ' + wav.bits);
check('文件长度 = 44 + 数据长度', wav.size === 44 + wav.dataSize, wav.size + ' = 44 + ' + wav.dataSize);
check('数据长度 = 采样帧数 × 声道 × 2', wav.dataSize === Math.round(44100 * 0.5) * 2 * 2,
  wav.dataSize + ' 字节');
check('写入的是真实波形（不是全零）', wav.midL !== 0 && wav.midR !== 0,
  '第 100 帧 ' + wav.midL + ', ' + wav.midR);
check('左右声道分开写入（第二个声道反相）',
  Math.abs(wav.midL + wav.midR) <= 1,
  wav.midL + ' + ' + wav.midR + ' = ' + (wav.midL + wav.midR));

/* ---------- 二、重采样与声道 ---------- */
console.log('\n=== 重采样与声道 ===');

const conf = JSON.parse(await evalJs(`(async () => {
  var src = new OfflineAudioContext(2, 44100, 44100).createBuffer(2, 44100, 44100);
  var l = src.getChannelData(0);
  for (var i = 0; i < 44100; i++) l[i] = Math.sin(2 * Math.PI * 220 * i / 44100) * 0.4;

  var toMono = await window.IA_CONVERT.conformBuffer(src, 22050, 1);
  var same = await window.IA_CONVERT.conformBuffer(src, 0, 0);

  return JSON.stringify({
    monoCh: toMono.numberOfChannels,
    monoRate: toMono.sampleRate,
    monoLen: toMono.length,
    sameCh: same.numberOfChannels,
    sameRate: same.sampleRate,
    sameIsOriginal: same === src
  }, null, 1);
})()`));

check('降到单声道', conf.monoCh === 1, '声道 ' + conf.monoCh);
check('降采样率到 22050', conf.monoRate === 22050, '采样率 ' + conf.monoRate);
check('采样帧数按新采样率重算', conf.monoLen === 22050, '帧数 ' + conf.monoLen);
check('选「原始」时不做多余拷贝', conf.sameIsOriginal === true && conf.sameRate === 44100 && conf.sameCh === 2,
  '同一对象=' + conf.sameIsOriginal + '，' + conf.sameRate + 'Hz ' + conf.sameCh + '声道');

/* ---------- 三、MP3 编码确实不可用（说明文案要站得住） ---------- */
console.log('\n=== 浏览器原生编码能力 ===');

const cap = JSON.parse(await evalJs(`(async () => {
  var out = { mediaRecorderMp3: false, wcMp3: false, wcAac: false };
  try { out.mediaRecorderMp3 = MediaRecorder.isTypeSupported('audio/mp3'); } catch (e) {}
  try {
    var r = await AudioEncoder.isConfigSupported({ codec: 'mp3', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 });
    out.wcMp3 = !!(r && r.supported);
  } catch (e) {}
  try {
    var r2 = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 });
    out.wcAac = !!(r2 && r2.supported);
  } catch (e) {}
  return JSON.stringify(out);
})()`));

check('浏览器原生确实没有 MP3 编码器（所以 MP3 必须靠自带编码库）',
  cap.mediaRecorderMp3 === false && cap.wcMp3 === false,
  'MediaRecorder=' + cap.mediaRecorderMp3 + '，WebCodecs=' + cap.wcMp3);

check('自托管的 lamejs 已加载',
  await evalJs("typeof lamejs !== 'undefined' && !!lamejs.Mp3Encoder"),
  'typeof lamejs = ' + await evalJs("typeof lamejs"));

check('没有从外网 CDN 加载编码库',
  await evalJs("[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))"));

check('页面上注明了 MP3 编码来自自托管库',
  await evalJs("document.body.innerText.includes('lamejs')"));

/* ---------- MP3 编码 ---------- */
console.log('\n=== MP3 编码 ===');

function mkSine(n, sr, ch, freq) {
  return `(function(){
    var off = new OfflineAudioContext(${ch}, ${n}, ${sr});
    var buf = off.createBuffer(${ch}, ${n}, ${sr});
    for (var c = 0; c < ${ch}; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * ${freq} * i / ${sr}) * 0.4 * (c ? -1 : 1);
    }
    return buf;
  })()`;
}

const mp3 = JSON.parse(await evalJs(`(async () => {
  var buf = ${mkSine(44100, 44100, 2, 440)};
  var blob = await window.IA_CONVERT.encodeMp3(buf, 192);
  var ab = await blob.arrayBuffer();
  var u8 = new Uint8Array(ab);

  var ac = new AudioContext();
  var dec = null, err = '';
  try { dec = await ac.decodeAudioData(ab.slice(0)); } catch (e) { err = e.name + ': ' + e.message; }
  await ac.close();

  return JSON.stringify({
    type: blob.type,
    bytes: ab.byteLength,
    head: Array.from(u8.slice(0, 4)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' '),
    // MPEG 帧同步：高 11 位全 1
    sync: u8[0] === 0xFF && (u8[1] & 0xE0) === 0xE0,
    dur: dec ? +dec.duration.toFixed(2) : null,
    ch: dec ? dec.numberOfChannels : null,
    err: err || null
  });
})()`));

check('编码结果是 MP3 的 MIME 类型', mp3.type === 'audio/mpeg', mp3.type);
check('开头是合法的 MPEG 帧同步字', mp3.sync === true, '前 4 字节 ' + mp3.head);
check('编出来的 MP3 能被浏览器解码回来（说明文件结构有效）',
  mp3.err === null && mp3.ch === 2, mp3.err || ('声道 ' + mp3.ch));
check('解码回来的时长对得上（1 秒，允许编码帧补齐）',
  mp3.dur !== null && Math.abs(mp3.dur - 1) < 0.12, mp3.dur + ' 秒');
check('体积远小于同长度的 WAV',
  mp3.bytes < 44100 * 2 * 2 * 0.5,
  mp3.bytes + ' 字节，WAV 约 ' + (44100 * 2 * 2) + ' 字节');

// 码率越高体积越大
const sizes = JSON.parse(await evalJs(`(async () => {
  var buf = ${mkSine(44100, 44100, 2, 440)};
  var out = {};
  for (var kb of [128, 192, 320]) {
    var b = await window.IA_CONVERT.encodeMp3(buf, kb);
    out[kb] = b.size;
  }
  return JSON.stringify(out);
})()`));
check('码率越高文件越大', sizes['128'] < sizes['192'] && sizes['192'] < sizes['320'],
  '128=' + sizes['128'] + ' / 192=' + sizes['192'] + ' / 320=' + sizes['320']);

// 非标准采样率要夹到 MP3 支持的范围
const rates = JSON.parse(await evalJs(`JSON.stringify({
  high: window.IA_CONVERT.nearestMp3Rate(96000),
  higher: window.IA_CONVERT.nearestMp3Rate(192000),
  keep: window.IA_CONVERT.nearestMp3Rate(22050),
  exact: window.IA_CONVERT.nearestMp3Rate(44100)
})`));
check('96k / 192k 的采样率会被夹到 48000',
  rates.high === 48000 && rates.higher === 48000, rates.high + ' / ' + rates.higher);
check('本来就是合法采样率的不动', rates.keep === 22050 && rates.exact === 44100,
  rates.keep + ' / ' + rates.exact);

// 输出格式切换要控制码率栏的显示
const fmtUi = JSON.parse(await evalJs(`(function(){
  var mp3Btn = document.querySelector('[data-format="mp3"]');
  var wavBtn = document.querySelector('[data-format="wav"]');
  var field = document.querySelector('#bitrate-field');
  wavBtn.click();
  var afterWav = { hidden: field.hidden, format: window.IA_CONVERT.state.format };
  mp3Btn.click();
  var afterMp3 = { hidden: field.hidden, format: window.IA_CONVERT.state.format };
  return JSON.stringify({ afterWav: afterWav, afterMp3: afterMp3 });
})()`));
check('切到 WAV 时收起码率选项', fmtUi.afterWav.hidden === true && fmtUi.afterWav.format === 'wav',
  JSON.stringify(fmtUi.afterWav));
check('切回 MP3 时再显示码率选项', fmtUi.afterMp3.hidden === false && fmtUi.afterMp3.format === 'mp3',
  JSON.stringify(fmtUi.afterMp3));

/* ---------- 四、JSON ⇄ CSV ---------- */
console.log('\n=== JSON ⇄ CSV ===');

const csv = await evalJs(`JSON.stringify({
  csv: window.IA_CONVERT.jsonToCsv(JSON.stringify([
    { '名称': '橡木', '数量': 12 },
    { '名称': '桦木', '数量': 3, '备注': '带,逗号' },
    { '名称': '云杉', '数量': 0, '备注': '带"引号"' }
  ]))
})`);

const csvText = JSON.parse(csv).csv;
check('JSON → CSV：表头合并了所有出现过的键',
  csvText.split('\n')[0] === '名称,数量,备注',
  JSON.stringify(csvText.split('\n')[0]));
check('JSON → CSV：普通值没有多余引号', /^橡木,12,$/m.test(csvText.split('\n')[1]),
  JSON.stringify(csvText.split('\n')[1]));
check('JSON → CSV：含逗号的单元格加了引号',
  csvText.split('\n')[2] === '桦木,3,"带,逗号"',
  JSON.stringify(csvText.split('\n')[2]));
check('JSON → CSV：含引号的单元格引号翻倍',
  csvText.split('\n')[3] === '云杉,0,"带""引号"""',
  JSON.stringify(csvText.split('\n')[3]));

const backText = await evalJs(`window.IA_CONVERT.csvToJson(${JSON.stringify(csvText)})`);
const back = JSON.parse(backText);
check('CSV → JSON：行数对', back.length === 3, back.length + ' 行');
check('CSV → JSON：逗号还原', back[1]['备注'] === '带,逗号', back[1]['备注']);
check('CSV → JSON：引号还原', back[2]['备注'] === '带"引号"', back[2]['备注']);
check('CSV → JSON：空单元格变成空串', back[0]['备注'] === '', JSON.stringify(back[0]['备注']));

const multiline = JSON.parse(await evalJs(`JSON.stringify({
  csv: window.IA_CONVERT.jsonToCsv(JSON.stringify([{ a: '第一行\\n第二行' }])),
  back: window.IA_CONVERT.csvToJson(window.IA_CONVERT.jsonToCsv(JSON.stringify([{ a: '第一行\\n第二行' }])))
})`));
check('换行在 CSV 里被引号包住', multiline.csv.indexOf('"第一行\n第二行"') >= 0, JSON.stringify(multiline.csv));
check('换行能原样往返回来', JSON.parse(multiline.back)[0].a === '第一行\n第二行',
  JSON.stringify(JSON.parse(multiline.back)[0].a));

const badJson = await evalJs(`(function(){
  try { window.IA_CONVERT.jsonToCsv('不是 json'); return 'NO-THROW'; }
  catch (e) { return e.message; }
})()`);
check('JSON 写错会给出可读报错，而不是崩掉',
  typeof badJson === 'string' && badJson !== 'NO-THROW', String(badJson).slice(0, 40));

/* ---------- 五、Base64 ---------- */
console.log('\n=== Base64 ===');

const b64 = JSON.parse(await evalJs(`(function(){
  var s = '创想时代开发组 Innova Age 5000万';
  var enc = window.IA_CONVERT.b64Encode(s);
  var dec = window.IA_CONVERT.b64Decode(enc);
  var pad = window.IA_CONVERT.b64Encode('a');
  return JSON.stringify({ enc: enc, dec: dec, same: dec === s, pad: pad });
})()`));

check('中文编码后是标准 Base64 字符集', /^[A-Za-z0-9+/]+={0,2}$/.test(b64.enc), b64.enc.slice(0, 30) + '…');
check('解码回到原文（UTF-8 不乱码）', b64.same === true, b64.dec);
check('1 个字符会补 = 号', b64.pad === 'YQ==', b64.pad);

const badB64 = await evalJs(`(function(){
  try { window.IA_CONVERT.b64Decode('这不是base64'); return 'NO-THROW'; }
  catch (e) { return e.message; }
})()`);
check('非法 Base64 会报错而不是给出乱码', typeof badB64 === 'string' && badB64 !== 'NO-THROW',
  String(badB64).slice(0, 40));

/* ---------- 六、界面联动 ---------- */
console.log('\n=== 界面联动 ===');

await evalJs(`(function(){
  var i = document.querySelector('#data-in');
  i.value = JSON.stringify([{ 名称: '橡木', 数量: 12 }]);
  document.querySelector('#data-json2csv').click();
})()`);
await sleep(200);
const dataOut = await evalJs("document.querySelector('#data-out').value");
check('点「JSON → CSV」真的把结果写进输出框',
  typeof dataOut === 'string' && dataOut.includes('名称,数量') && dataOut.includes('橡木'),
  String(dataOut).replace(/\n/g, ' / ').slice(0, 60));

const b64Ui = await evalJs(`(function(){
  document.querySelector('#b64-in').value = '测试文本';
  document.querySelector('#b64-encode').click();
  var enc = document.querySelector('#b64-out').value;
  document.querySelector('#b64-in').value = '';
  document.querySelector('#b64-decode').click();
  return JSON.stringify({ enc: enc, back: document.querySelector('#b64-in').value });
})()`);
const b64UiObj = JSON.parse(b64Ui);
check('编码结果符合 Base64', /^[A-Za-z0-9+/]+={0,2}$/.test(b64UiObj.enc), b64UiObj.enc);
check('点「← 解码」把原文填回左框', b64UiObj.back === '测试文本', b64UiObj.back);

check('整页没有未捕获的 JS 异常', pageErrors.length === 0, pageErrors.join(' | '));

ws.close();
edge.kill();

const pass = results.filter((x) => x.ok).length;
const failed = results.filter((x) => !x.ok);
console.log(`\n共 ${results.length} 项，通过 ${pass} 项，失败 ${failed.length} 项`);
if (failed.length) {
  console.log('\n失败明细:');
  for (const f of failed) console.log('  ✗ ' + f.name);
}
process.exit(failed.length ? 1 : 0);

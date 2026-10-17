/*
 * PDF 转 Word 的专用自检。
 *
 * 思路：现场拼一个最小但合法的 PDF（ASCII 文本，不依赖外部文件），
 * 交给 pdf.js 提取文字，再用 docx 生成 .docx，
 * 最后把 .docx 当 ZIP 解开，验证 word/document.xml 里真的有那些文字。
 *
 * 用法：node tools/test-pdf.mjs
 * 前提：本地有服务，node tools/serve.mjs 8099
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9391;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '   ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-pdftest-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
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
const pageErrors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    pageErrors.push(d.exception?.description || d.text || '未知异常');
  }
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
await send('Page.navigate', { url: BASE + '/tools-convert.html' });
await sleep(2000);

console.log('=== 页面与懒加载 ===');
check('PDF 区块的元素都在',
  await evalJs(`!!document.querySelector('#pdf-input') && !!document.querySelector('#pdf-run') &&
                !!document.querySelector('#pdf-dropzone') && !!document.querySelector('#pdf-note')`));

check('pdf-tool.js 已加载', await evalJs("typeof window.IA_PDF === 'object'"));

check('两个库在打开页面时都还没加载（懒加载）',
  await evalJs("typeof window.docx === 'undefined' && !document.querySelector('script[src*=\"docx.iife\"]')"),
  'docx=' + await evalJs("typeof window.docx"));

check('没有从外网 CDN 加载',
  await evalJs("[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))"));

/* ---------- 现场造一个 PDF ---------- */
console.log('\n=== 造一个测试 PDF 并提取文字 ===');

const extracted = await evalJs(`(async () => {
  // 最小但合法的 PDF：一页，两行 Helvetica 文字
  function buildPdf(lines) {
    var objs = [];
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
              '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    var cmds = '';
    var y = 720;
    lines.forEach(function (t, i) {
      cmds += 'BT /F1 ' + (i === 0 ? 20 : 12) + ' Tf 72 ' + y + ' Td (' + t + ') Tj ET\\n';
      y -= 30;
    });
    objs.push('<< /Length ' + cmds.length + ' >>\\nstream\\n' + cmds + 'endstream');

    var out = '%PDF-1.4\\n';
    var offsets = [];
    for (var i = 0; i < objs.length; i++) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\\n' + objs[i] + '\\nendobj\\n';
    }
    var xrefPos = out.length;
    out += 'xref\\n0 ' + (objs.length + 1) + '\\n0000000000 65535 f \\n';
    offsets.forEach(function (off) {
      out += String(off).padStart(10, '0') + ' 00000 n \\n';
    });
    out += 'trailer\\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\\n';
    out += 'startxref\\n' + xrefPos + '\\n%%EOF\\n';
    return out;
  }

  var pdfText = buildPdf(['Innova Age PDF Test', 'Second line of text']);
  var bytes = new TextEncoder().encode(pdfText);

  try {
    var lib = await window.IA_PDF.loadPdfLib();
    var pdf = await lib.getDocument({ data: bytes }).promise;
    var page = await pdf.getPage(1);
    var content = await page.getTextContent();
    var lines = window.IA_PDF.pageToLines(content);

    // 顺便走一遍生成 docx 的路径
    var built = await window.IA_PDF.buildDocx([lines], 'sample.pdf');
    var ab = await built.blob.arrayBuffer();
    var u8 = new Uint8Array(ab);

    // 当 ZIP 解开：找 word/document.xml，用 DecompressionStream 解压
    function readZip(bytes) {
      var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      var entries = {};
      var i = 0;
      while (i < bytes.length - 4) {
        if (bytes[i] !== 0x50 || bytes[i+1] !== 0x4b || bytes[i+2] !== 0x03 || bytes[i+3] !== 0x04) break;
        var method = dv.getUint16(i + 8, true);
        var compSize = dv.getUint32(i + 18, true);
        var nameLen = dv.getUint16(i + 26, true);
        var extraLen = dv.getUint16(i + 28, true);
        var name = '';
        for (var k = 0; k < nameLen; k++) name += String.fromCharCode(bytes[i + 30 + k]);
        var dataStart = i + 30 + nameLen + extraLen;
        entries[name] = { method: method, data: bytes.slice(dataStart, dataStart + compSize) };
        i = dataStart + compSize;
      }
      return entries;
    }

    var entries = readZip(u8);
    var names = Object.keys(entries);

    var docXml = null;
    var entry = entries['word/document.xml'];
    if (entry) {
      if (entry.method === 0) {
        docXml = new TextDecoder().decode(entry.data);
      } else {
        var ds = new DecompressionStream('deflate-raw');
        var stream = new Blob([entry.data]).stream().pipeThrough(ds);
        docXml = await new Response(stream).text();
      }
    }

    var pageCount = pdf.numPages || 1;

    // pdf.js v6 的 PDFDocumentProxy 不一定有 destroy，
    // 有 cleanup 就调，没有就算 —— 别让收尾动作把断言带崩
    try {
      if (typeof pdf.cleanup === 'function') await pdf.cleanup();
      else if (typeof pdf.destroy === 'function') await pdf.destroy();
    } catch (e) {}

    return JSON.stringify({
      pageCount: pageCount,
      lines: lines,
      blobSize: ab.byteLength,
      zipMagic: u8[0] === 0x50 && u8[1] === 0x4b,
      zipEntries: names.slice(0, 8),
      hasDocXml: !!docXml,
      docXmlHasText: docXml ? (docXml.indexOf('Innova Age PDF Test') >= 0 && docXml.indexOf('Second line of text') >= 0) : false,
      docXmlHead: docXml ? docXml.slice(0, 120) : null
    });
  } catch (e) {
    return JSON.stringify({ error: e.name + ': ' + e.message });
  }
})()`);

const r = JSON.parse(extracted);
if (r.error) {
  check('PDF 提取与生成', false, r.error);
} else {
  check('pdf.js 能读出 PDF 里的文字',
    Array.isArray(r.lines) && r.lines.length === 2 &&
    r.lines[0].indexOf('Innova Age PDF Test') >= 0,
    JSON.stringify(r.lines));
  check('第二行也读出来了', r.lines[1] && r.lines[1].indexOf('Second line of text') >= 0,
    r.lines[1] || '');

  check('生成的是合法 ZIP（docx 就是 zip）', r.zipMagic === true,
    '前两字节 PK：' + r.zipMagic);
  check('zip 里有 word/document.xml',
    r.zipEntries.indexOf('word/document.xml') >= 0,
    JSON.stringify(r.zipEntries));
  check('解压后 document.xml 里确实有提取到的文字', r.docXmlHasText === true,
    r.docXmlHasText ? '' : (r.docXmlHead || '没取到 document.xml'));
  check('docx 大小合理（不是空文件）', r.blobSize > 1000, r.blobSize + ' 字节');
}

/* ---------- 分行的判定 ---------- */
console.log('\n=== 文字分行 ===');
const lineCase = JSON.parse(await evalJs(`(function(){
  // 同一行的三段（y 相同、x 递增），再加下一行
  var items = [
    { str: 'Hello ', transform: [1,0,0,1, 72, 700] },
    { str: 'world', transform: [1,0,0,1, 110, 700] },
    { str: 'next line', transform: [1,0,0,1, 72, 670] }
  ];
  return JSON.stringify(window.IA_PDF.pageToLines({ items: items }));
})()`));
check('同一行的多段会拼成一行', lineCase[0] === 'Hello world', lineCase[0]);
check('纵向不同的分成两行', lineCase.length === 2 && lineCase[1] === 'next line', JSON.stringify(lineCase));

/* ---------- 错误处理 ---------- */
console.log('\n=== 错误处理 ===');
const bad = await evalJs(`(async () => {
  try {
    var lib = await window.IA_PDF.loadPdfLib();
    await lib.getDocument({ data: new TextEncoder().encode('这不是 PDF') }).promise;
    return 'NO-THROW';
  } catch (e) { return e.name + ': ' + (e.message || '').slice(0, 40); }
})()`);
check('喂进去不是 PDF 的文件会报错，而不是卡住', typeof bad === 'string' && bad !== 'NO-THROW', String(bad));

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

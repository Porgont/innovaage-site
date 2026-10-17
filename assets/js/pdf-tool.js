/* ============================================================
   PDF 转 Word
   pdf.js 抽文字 → docx 生成 .docx，全部在浏览器本地完成。

   两个库都很大（pdf.js 约 1.7 MB，docx 约 790 KB），
   所以只在用户真的选了 PDF 之后才按需加载，不拖慢页面。
   只能提 PDF 里的文字：扫描件、图片里的字提不出来。
   ============================================================ */
(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }

  var state = { file: null, pdf: null, pages: 0, busy: false };

  var pdfLib = null;
  var docxLib = null;

  function fmtBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function note(msg, warn) {
    var el = $('#pdf-note');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('note--warn', !!warn);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderFile(extra) {
    var box = $('#pdf-file');
    if (!box) return;
    if (!state.file) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML =
      '<div class="file-item"><b>' + escapeHtml(state.file.name) + '</b>' +
      '<span style="color:var(--text-mute)">' + escapeHtml(extra) + '</span></div>';
  }

  /* 这个文件是普通脚本，不能用 import.meta（那是模块语法，写了整份文件都解析失败）。
     动态 import 的路径按文档地址解析，所以从站点根写起。 */
  var PDF_LIB = 'assets/vendor/pdfjs/pdf.min.mjs';
  var PDF_WORKER = 'assets/vendor/pdfjs/pdf.worker.min.mjs';

  function absolute(rel) {
    try { return new URL(rel, document.baseURI).href; } catch (e) { return rel; }
  }

  async function loadPdfLib() {
    if (pdfLib) return pdfLib;
    note('正在加载 PDF 解析库（约 1.7 MB，只有第一次需要）…');
    var mod = await import(absolute(PDF_LIB));
    mod.GlobalWorkerOptions.workerSrc = absolute(PDF_WORKER);
    pdfLib = mod;
    return mod;
  }

  /* docx 是 UMD/IIFE，注入 <script> 后从全局取 */
  function loadDocxLib() {
    if (docxLib) return Promise.resolve(docxLib);
    if (window.docx) { docxLib = window.docx; return Promise.resolve(docxLib); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/docx/docx.iife.js';
      s.onload = function () {
        if (!window.docx) { reject(new Error('docx 加载完成但没挂上全局')); return; }
        docxLib = window.docx;
        resolve(docxLib);
      };
      s.onerror = function () { reject(new Error('docx 加载失败')); };
      document.head.appendChild(s);
    });
  }

  /* 把一页的文字项按纵向位置归成行，再把行合成段落 */
  function pageToLines(textContent) {
    var items = (textContent.items || []).filter(function (it) {
      return it && typeof it.str === 'string' && it.str.trim() !== '';
    });
    if (!items.length) return [];

    var rows = [];
    items.forEach(function (it) {
      var y = it.transform ? Math.round(it.transform[5]) : 0;
      var x = it.transform ? it.transform[4] : 0;
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (Math.abs(rows[i].y - y) <= 3) { row = rows[i]; break; }
      }
      if (!row) { row = { y: y, parts: [] }; rows.push(row); }
      row.parts.push({ x: x, str: it.str });
    });

    rows.sort(function (a, b) { return b.y - a.y; });
    return rows.map(function (r) {
      r.parts.sort(function (a, b) { return a.x - b.x; });
      return r.parts.map(function (p) { return p.str; }).join('').replace(/\s+$/, '');
    }).filter(function (s) { return s.trim() !== ''; });
  }

  async function extract(pdf) {
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      pages.push(pageToLines(content));
      page.cleanup();
      if (state.pdfTotal && i % 5 === 0) {
        note('正在读取文字：第 ' + i + ' / ' + pdf.numPages + ' 页…');
      }
    }
    return pages;
  }

  async function buildDocx(pages, fileName) {
    var lib = await loadDocxLib();
    var Document = lib.Document, Paragraph = lib.Paragraph, TextRun = lib.TextRun;

    var children = [];
    children.push(new Paragraph({
      children: [new TextRun({ text: fileName.replace(/\.pdf$/i, ''), bold: true, size: 32 })]
    }));

    var emptyPages = 0;
    pages.forEach(function (lines) {
      if (!lines.length) { emptyPages++; return; }
      lines.forEach(function (line) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line })],
          spacing: { after: 120 }
        }));
      });
    });

    if (children.length === 1) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '这个 PDF 里没有可提取的文字（可能是扫描件或图片）。', italics: true })]
      }));
    }

    var doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    var blob = await lib.Packer.toBlob(doc);
    return { blob: blob, emptyPages: emptyPages };
  }

  async function openPdf(file) {
    state.file = file;
    state.pdf = null;
    state.pages = 0;
    state.pdfTotal = 0;

    var runBtn = $('#pdf-run');
    if (runBtn) runBtn.disabled = true;

    renderFile(fmtBytes(file.size) + ' · 读取中…');

    try {
      var lib = await loadPdfLib();
      var buf = await file.arrayBuffer();
      var pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;

      state.pdf = pdf;
      state.pages = pdf.numPages;
      state.pdfTotal = pdf.numPages;

      renderFile(fmtBytes(file.size) + ' · ' + pdf.numPages + ' 页');
      if (runBtn) runBtn.disabled = false;
      note('可以转换了。点「转成 Word」会把文字按页面顺序写进 .docx。');
    } catch (e) {
      state.file = null;
      renderFile('');
      note('这个文件读不了：' + (e && e.message ? e.message : '未知原因') +
        '。确认它是正常的 PDF（没有加密、没有损坏）。', true);
    }
  }

  async function run() {
    if (!state.pdf || state.busy) return;
    state.busy = true;

    var btn = $('#pdf-run');
    var old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '转换中…'; }

    try {
      note('正在读取文字…');
      var pages = await extract(state.pdf);

      note('正在生成 Word 文档…');
      var out = await buildDocx(pages, state.file.name);

      var url = URL.createObjectURL(out.blob);
      var bar = $('#pdf-result');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pdf-result';
        bar.className = 'result-bar';
        $('#pdf-run').parentNode.insertAdjacentElement('afterend', bar);
      }
      bar.innerHTML = '';

      var a = document.createElement('a');
      a.className = 'btn btn--sm';
      a.href = url;
      a.download = state.file.name.replace(/\.pdf$/i, '') + '.docx';
      a.textContent = '下载 DOCX（' + fmtBytes(out.blob.size) + '）';
      bar.appendChild(a);

      var tip = document.createElement('span');
      tip.textContent = state.pages + ' 页 · 文字已按阅读顺序写入';
      bar.appendChild(tip);

      note('转换完成。扫描件、图片里的字不会被提取；表格和排版会变成普通段落。',
        out.emptyPages === state.pages);
    } catch (e) {
      note('转换失败：' + (e && e.message ? e.message : '未知原因'), true);
    } finally {
      state.busy = false;
      if (btn) { btn.disabled = false; btn.textContent = old || '转成 Word'; }
    }
  }

  function init() {
    var input = $('#pdf-input');
    var zone = $('#pdf-dropzone');
    if (!input || !zone) return;

    input.addEventListener('change', function () {
      if (input.files && input.files[0]) openPdf(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openPdf(f);
    });

    var runBtn = $('#pdf-run');
    if (runBtn) runBtn.addEventListener('click', run);

    var clear = $('#pdf-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        if (state.pdf) {
          try {
            if (typeof state.pdf.cleanup === 'function') state.pdf.cleanup();
            else if (typeof state.pdf.destroy === 'function') state.pdf.destroy();
          } catch (e) {}
        }
        state.file = null;
        state.pdf = null;
        state.pages = 0;
        if (input) input.value = '';
        renderFile('');
        note('已经清空了。');
        if (runBtn) runBtn.disabled = true;
        var bar = $('#pdf-result');
        if (bar) bar.innerHTML = '';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 给自检用的入口 */
  window.IA_PDF = {
    pageToLines: pageToLines,
    loadPdfLib: loadPdfLib,
    loadDocxLib: loadDocxLib,
    buildDocx: buildDocx,
    state: state
  };
})();

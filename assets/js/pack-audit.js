/* ============================================================
   投稿包检测与纠正
   当前投稿规范（三条）：
   1. 压缩包必须是 zip 格式
   2. 顶层有且仅有一个文件夹，不能把文件直接放在根目录
   3. 任何路径与文件名只能有拉丁字母、数字、下划线，
      文件名允许一个扩展名点号（A-Za-z0-9_ 与 .）

   全部在浏览器里做：读 zip 只解析目录，不做压缩/解压；
   重新打包时直接搬原始压缩数据，文件内容一个字节都不改。
   ============================================================ */
(function () {
  'use strict';

  var ALLOWED_SEG = /^[A-Za-z0-9_-]+$/;
  var ALLOWED_FILE = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/;
  var JUNK_NAMES = ['.ds_store', 'thumbs.db', 'desktop.ini'];
  var utf8 = new TextEncoder();

  var state = { file: null, buffer: null, audit: null, rows: [], top: '' };
  var el = {};
  var pendingBase = '';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bytesOf(str) { return utf8.encode(str); }

  /* ---------- 读 ZIP 目录 ---------- */
  function parseZip(buffer) {
    var dv = new DataView(buffer);
    var u8 = new Uint8Array(buffer);

    if (buffer.byteLength < 22) throw new Error('文件太小，不是有效的 ZIP');

    var magic = dv.getUint32(0, true);
    if (magic !== 0x04034b50 && magic !== 0x06054b50) {
      throw new Error('不是 ZIP 格式（文件头不是 PK），请先另存为 .zip');
    }

    var eocd = -1;
    var stop = Math.max(0, buffer.byteLength - 22 - 65535);
    for (var i = buffer.byteLength - 22; i >= stop; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('找不到 ZIP 目录结尾，文件可能不完整');

    var count = dv.getUint16(eocd + 10, true);
    var cdOff = dv.getUint32(eocd + 16, true);
    if (count === 0xffff || cdOff === 0xffffffff) {
      throw new Error('这是 ZIP64 格式，当前工具暂不支持，请用普通 ZIP 重新压缩');
    }

    var entries = [];
    var p = cdOff;
    for (var k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP 目录损坏（第 ' + (k + 1) + ' 项）');

      var flag = dv.getUint16(p + 8, true);
      var method = dv.getUint16(p + 10, true);
      var time = dv.getUint16(p + 12, true);
      var date = dv.getUint16(p + 14, true);
      var crc = dv.getUint32(p + 16, true);
      var csize = dv.getUint32(p + 20, true);
      var usize = dv.getUint32(p + 24, true);
      var nlen = dv.getUint16(p + 28, true);
      var elen = dv.getUint16(p + 30, true);
      var clen = dv.getUint16(p + 32, true);
      var extAttr = dv.getUint32(p + 38, true);
      var lho = dv.getUint32(p + 42, true);

      if (csize === 0xffffffff || usize === 0xffffffff) {
        throw new Error('包含 ZIP64 条目，当前工具暂不支持');
      }
      if (dv.getUint32(lho, true) !== 0x04034b50) throw new Error('ZIP 局部头损坏');

      var rawName = new TextDecoder('utf-8').decode(u8.subarray(p + 46, p + 46 + nlen));
      // Windows 资源管理器 / Compress-Archive 会写反斜杠，统一成 /
      var name = rawName.replace(/\\/g, '/');
      var lnlen = dv.getUint16(lho + 26, true);
      var lelen = dv.getUint16(lho + 28, true);
      var dataStart = lho + 30 + lnlen + lelen;

      entries.push({
        name: name,
        isDir: /\/$/.test(name),
        method: method,
        encrypted: !!(flag & 0x1),
        crc: crc,
        csize: csize,
        usize: usize,
        time: time,
        date: date,
        extAttr: extAttr,
        dataStart: dataStart,
        dataEnd: dataStart + csize
      });

      p += 46 + nlen + elen + clen;
    }
    return entries;
  }

  /* ---------- 打包（直接搬原压缩数据） ---------- */
  function buildZip(list, srcBuffer) {
    var u8 = new Uint8Array(srcBuffer);
    var parts = [];
    var central = [];
    var offset = 0;

    list.forEach(function (e) {
      var nameBytes = bytesOf(e.name);
      var head = new Uint8Array(30 + nameBytes.length);
      var hv = new DataView(head.buffer);
      hv.setUint32(0, 0x04034b50, true);
      hv.setUint16(4, 20, true);
      hv.setUint16(6, 0x0800, true);
      hv.setUint16(8, e.isDir ? 0 : e.method, true);
      hv.setUint16(10, e.time, true);
      hv.setUint16(12, e.date, true);
      hv.setUint32(14, e.isDir ? 0 : e.crc, true);
      hv.setUint32(18, e.isDir ? 0 : e.csize, true);
      hv.setUint32(22, e.isDir ? 0 : e.usize, true);
      hv.setUint16(26, nameBytes.length, true);
      head.set(nameBytes, 30);

      var localOffset = offset;
      parts.push(head);
      offset += head.length;

      if (!e.isDir) {
        var payload = u8.subarray(e.dataStart, e.dataEnd);
        parts.push(payload);
        offset += payload.length;
      }

      var ch = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, e.isDir ? 0 : e.method, true);
      cv.setUint16(12, e.time, true);
      cv.setUint16(14, e.date, true);
      cv.setUint32(16, e.isDir ? 0 : e.crc, true);
      cv.setUint32(20, e.isDir ? 0 : e.csize, true);
      cv.setUint32(24, e.isDir ? 0 : e.usize, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(38, e.extAttr || 0, true);
      cv.setUint32(42, localOffset, true);
      ch.set(nameBytes, 46);
      central.push(ch);
    });

    var cdSize = central.reduce(function (n, c) { return n + c.length; }, 0);
    var cdStart = offset;   // 局部数据写完的位置，就是目录起点

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, list.length, true);
    ev.setUint16(10, list.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdStart, true);

    return new Blob(parts.concat(central, [eocd]), { type: 'application/zip' });
  }

  /* ---------- 命名规则 ---------- */
  function segments(name) {
    return String(name).split('/').filter(function (s) { return s !== ''; });
  }

  function isJunk(name) {
    var low = String(name).toLowerCase();
    if (low.indexOf('__macosx/') === 0) return true;
    var segs = segments(low);
    var last = segs.length ? segs[segs.length - 1] : '';
    return JUNK_NAMES.indexOf(last) >= 0;
  }

  function sanitizeSeg(seg) {
    var s = String(seg).replace(/[^A-Za-z0-9_-]/g, '_').replace(/-+/g, '-').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return s || 'file';
  }

  function sanitizeName(name, isDir) {
    var segs = String(name).split('/');
    var last = -1;
    for (var i = segs.length - 1; i >= 0; i--) { if (segs[i] !== '') { last = i; break; } }
    var out = segs.map(function (seg, i) {
      if (seg === '') return '';
      var isLast = i === last;
      if (!isLast || isDir) return sanitizeSeg(seg);
      var dot = seg.lastIndexOf('.');
      if (dot > 0 && dot < seg.length - 1) {
        return sanitizeSeg(seg.slice(0, dot)) + '.' + sanitizeSeg(seg.slice(dot + 1));
      }
      return sanitizeSeg(seg);
    }).filter(function (s) { return s !== ''; });
    return out.join('/');
  }

  function issuesOfPath(path, isDir) {
    var list = [];
    var segs = segments(path);
    if (!segs.length) return ['路径为空'];
    segs.forEach(function (seg, i) {
      var isLast = i === segs.length - 1;
      var ok = (!isLast || isDir) ? ALLOWED_SEG.test(seg) : ALLOWED_FILE.test(seg);
      if (ok) return;
      if (/[\u4e00-\u9fa5]/.test(seg)) list.push('第 ' + (i + 1) + ' 段含中文');
      else if (/\s/.test(seg)) list.push('第 ' + (i + 1) + ' 段含空格');
      else list.push('第 ' + (i + 1) + ' 段含不合规字符');
    });
    return list.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
  }

  function isValidPath(path, isDir) {
    return segments(path).length > 0 && issuesOfPath(path, isDir).length === 0;
  }

  /* ---------- 检测 ---------- */
  function audit(buffer) {
    var entries = parseZip(buffer);

    var topSet = {};
    var rootFiles = [];
    var junk = [];

    entries.forEach(function (e) {
      if (isJunk(e.name)) { e.junk = true; junk.push(e); return; }
      var segs = segments(e.name);
      if (!segs.length) { e.junk = true; junk.push(e); return; }
      if (segs.length === 1 && !e.isDir) rootFiles.push(e.name);
      else topSet[segs[0]] = true;
    });

    var tops = Object.keys(topSet);
    var topProblem = '';
    if (rootFiles.length) topProblem = '根目录直接有 ' + rootFiles.length + ' 个文件';
    else if (tops.length === 0) topProblem = '压缩包里没有文件夹';
    else if (tops.length > 1) topProblem = '顶层有 ' + tops.length + ' 个文件夹：' + tops.slice(0, 4).join('、');

    /* 顶层只有一个文件夹且名字合规就沿用原名；否则给一个基于压缩包名的建议 */
    var origTop = tops.length === 1 ? tops[0] : '';
    var topName = origTop && ALLOWED_SEG.test(origTop) ? origTop : suggestTopName();

    var rows = [];
    entries.forEach(function (e) {
      if (e.junk) {
        rows.push({ entry: e, original: e.name, isDir: e.isDir, junk: true, inner: '', origInner: '', origIssues: [], suggestion: '', innerIssues: [], changed: false });
        return;
      }
      var segs = segments(e.name);

      /* 顶层那个文件夹本身不作为一行列出 */
      if (tops.length === 1 && segs.length === 1 && e.isDir && segs[0] === tops[0]) return;

      var inner;
      if (segs.length === 1) inner = segs[0];                       // 根目录里的文件：放进顶层文件夹
      else if (tops.length === 1) inner = segs.slice(1).join('/');  // 本来就在唯一顶层文件夹里
      else inner = segs.join('/');                                  // 多个顶层文件夹：把原文件夹当子目录
      var suggestion = sanitizeName(inner, e.isDir);
      rows.push({
        entry: e,
        original: e.name,
        origInner: inner,
        origIssues: issuesOfPath(inner, e.isDir),
        suggestion: suggestion,
        isDir: e.isDir,
        junk: false,
        inner: suggestion,
        innerIssues: issuesOfPath(suggestion, e.isDir),
        changed: suggestion !== inner
      });
    });

    dedupeSuggestions(rows);

    return { entries: entries, rows: rows, tops: tops, topName: topName, origTop: origTop, topProblem: topProblem, rootFiles: rootFiles, junk: junk };
  }

  /* 建议名撞车时补 _2、_3；已被别的文件占用的名字也要避开 */
  function dedupeSuggestions(rows) {
    var used = {};
    rows.forEach(function (r) {
      if (r.junk) return;
      var key = r.suggestion + (r.isDir ? '/' : '');
      if (!used[key]) { used[key] = 1; return; }
      var base = r.suggestion;
      var dot = r.isLastDot || base.lastIndexOf('.');
      var stem = base;
      var ext = '';
      if (!r.isDir && dot > 0) { stem = base.slice(0, dot); ext = base.slice(dot); }
      var n = 2;
      var candidate;
      do { candidate = stem + '_' + n + ext; n++; } while (used[candidate + (r.isDir ? '/' : '')]);
      r.suggestion = candidate;
      r.inner = candidate;
      r.changed = true;
      used[candidate + (r.isDir ? '/' : '')] = 1;
    });
  }

  function suggestTopName() {
    var base = String(pendingBase || 'pack').replace(/\.[^.]+$/, '');
    return sanitizeSeg(base);
  }

  function topValue() {
    return (state.top || (state.audit && state.audit.topName) || '').trim();
  }

  /* ---------- 界面 ---------- */
  function bind() {
    el.input = $('#pack-file');
    if (!el.input) return;

    el.drop = $('#pack-drop');
    el.note = $('#pack-file-note');
    el.report = $('#pack-report');
    el.summary = $('#pack-summary');
    el.topWrap = $('#pack-top');
    el.rows = $('#pack-rows');
    el.result = $('#pack-result');
    el.build = $('#pack-build');
    el.reset = $('#pack-reset');
    el.dropJunk = $('#pack-drop-junk');
    el.useSuggest = $('#pack-use-suggest');

    el.input.addEventListener('change', function () {
      if (el.input.files && el.input.files[0]) load(el.input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (t) {
      el.drop.addEventListener(t, function (ev) {
        ev.preventDefault();
        el.drop.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.drop.addEventListener(t, function (ev) {
        ev.preventDefault();
        el.drop.classList.remove('is-over');
      });
    });
    el.drop.addEventListener('drop', function (ev) {
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) load(f);
    });
    el.drop.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.input.click(); }
    });

    el.reset.addEventListener('click', function () {
      state = { file: null, buffer: null, audit: null, rows: [], top: '' };
      el.input.value = '';
      el.report.hidden = true;
      el.note.textContent = '还没有选择文件';
      el.note.classList.remove('is-bad');
      el.result.textContent = '';
    });

    el.useSuggest.addEventListener('click', function () {
      state.top = '';
      state.rows.forEach(function (r) {
        if (r.junk) return;
        r.inner = r.suggestion;
        r.innerIssues = issuesOfPath(r.inner, r.isDir);
        r.changed = r.inner !== r.origInner;
      });
      paint();
    });

    el.build.addEventListener('click', function () { build(); });
    el.dropJunk.addEventListener('change', function () { paint(); });
  }

  function load(file) {
    if (!/\.zip$/i.test(file.name)) {
      el.report.hidden = true;
      el.note.textContent = '「' + file.name + '」不是 .zip 文件 —— 投稿只收 ZIP';
      el.note.classList.add('is-bad');
      return;
    }
    pendingBase = file.name;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var buf = reader.result;
        state.buffer = buf;
        state.file = file;
        state.top = '';
        state.audit = audit(buf);
        state.rows = state.audit.rows;
        el.note.classList.remove('is-bad');
        el.note.textContent = file.name + ' · ' + sizeText(file.size) + ' ' + sizeUnit(file.size);
        el.report.hidden = false;
        el.result.textContent = '';
        paint();
      } catch (err) {
        el.report.hidden = true;
        el.note.textContent = '读不了这个压缩包：' + err.message;
        el.note.classList.add('is-bad');
      }
    };
    reader.onerror = function () {
      el.note.textContent = '读取文件失败，换一个试试';
      el.note.classList.add('is-bad');
    };
    reader.readAsArrayBuffer(file);
  }

  function visibleRows() {
    var dropJunk = el.dropJunk.checked;
    return state.rows.filter(function (r) { return !(dropJunk && r.junk); });
  }

  function paint() {
    var a = state.audit;
    if (!a) return;

    var rows = visibleRows();
    var files = rows.filter(function (r) { return !r.isDir; });
    var badNames = rows.filter(function (r) { return !r.junk && r.innerIssues.length; });   // 现在还不合规
    var renamed = rows.filter(function (r) { return !r.junk && !r.innerIssues.length && r.changed; }); // 已换成建议名
    var junk = state.rows.filter(function (r) { return r.junk; });
    var top = topValue();
    var topOk = ALLOWED_SEG.test(top);

    el.summary.innerHTML =
      stat(files.length, '个文件', '含目录共 ' + rows.length + ' 项') +
      stat(sizeText(state.file.size), sizeUnit(state.file.size), '压缩包大小') +
      stat((badNames.length + renamed.length) || '0', '处名字要改', badNames.length ? '还有 ' + badNames.length + ' 处没改好' : (renamed.length ? '已自动给出建议名' : '名字都合规')) +
      stat(a.topProblem ? '待修' : '通过', '顶层结构', a.topProblem || '只有一个文件夹') +
      stat(junk.length, '个系统垃圾文件', el.dropJunk.checked && junk.length ? '生成时会去掉' : '来自 macOS / Windows');

    el.topWrap.innerHTML =
      '<label class="pack-top-label" for="pack-top-input">顶层文件夹</label>' +
      '<input class="pack-top-input" id="pack-top-input" type="text" spellcheck="false" value="' + esc(top) + '">' +
      '<span class="pack-top-state ' + (topOk ? 'is-ok' : 'is-bad') + '">' +
        (topOk ? (a.origTop && a.origTop !== top ? '原名 ' + a.origTop + ' 不合规，已换成建议名' : '合规') : '只允许字母、数字、下划线') +
      '</span>';
    el.topWrap.querySelector('#pack-top-input').addEventListener('input', function () {
      state.top = this.value;
      paint();
    });

    el.rows.innerHTML = rows.map(function (r) {
      var isBad = !r.junk && r.innerIssues.length > 0;
      var isChanged = !isBad && !r.junk && r.changed;
      var tag = r.junk ? '垃圾' : (r.isDir ? '目录' : '文件');
      return '<tr class="' + (r.junk ? 'is-junk' : (isBad ? 'is-bad' : (isChanged ? 'is-changed' : ''))) + '">' +
        '<td><span class="pack-status">' + tag + '</span></td>' +
        '<td class="pack-old">' + esc(r.original) + '</td>' +
        '<td class="pack-new"><input type="text" data-id="' + esc(r.entry.name) + '" value="' + esc(r.junk ? '' : r.inner) + '"' +
          (r.junk ? ' disabled placeholder="生成时去掉"' : '') + ' spellcheck="false">' +
          (r.innerIssues.length ? '<span class="pack-issue">' + esc(r.innerIssues.join('；')) + '</span>' :
            (r.changed ? '<span class="pack-note">原名不合规，已给出建议名</span>' : '')) +
        '</td>' +
      '</tr>';
    }).join('');

    Array.prototype.forEach.call(el.rows.querySelectorAll('input[data-id]'), function (input) {
      var original = input.getAttribute('data-id');
      var row = null;
      for (var i = 0; i < state.rows.length; i++) {
        if (state.rows[i].entry.name === original && !state.rows[i].junk) { row = state.rows[i]; break; }
      }
      if (!row) return;
      input.addEventListener('input', function () {
        row.inner = input.value.replace(/^\/+/, '').replace(/\/+$/, '');
        row.innerIssues = issuesOfPath(row.inner, row.isDir);
        row.changed = row.inner !== row.origInner;
      });
      input.addEventListener('blur', function () { paint(); });
    });

    var dup = findDuplicates(rows, top);
    var why = [];
    if (!topOk) why.push('顶层文件夹名不合规');
    if (badNames.length) why.push(badNames.length + ' 处名字仍不合规');
    if (dup.length) why.push('有重名：' + dup.slice(0, 3).join('、'));
    if (!files.length) why.push('没有文件');

    el.build.disabled = why.length > 0;
    el.result.textContent = why.length ? '还不能生成：' + why.join('；') + '。改完上面的输入框即可。' : '';
    el.result.classList.toggle('is-warn', why.length > 0);
  }

  function sizeUnit(size) { return size < 1024 * 1024 ? 'KB' : 'MB'; }
  function sizeText(size) {
    return size < 1024 * 1024 ? (size / 1024).toFixed(1) : (size / 1024 / 1024).toFixed(2);
  }

  function stat(v, label, sub) {
    return '<div class="pack-stat"><b>' + esc(v) + '</b><span>' + esc(label) + '</span>' +
      (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  function findDuplicates(rows, top) {
    var seen = {};
    var dup = [];
    rows.forEach(function (r) {
      if (r.junk) return;
      var path = top + '/' + r.inner + (r.isDir ? '/' : '');
      if (seen[path]) { if (dup.indexOf(path) < 0) dup.push(path); }
      seen[path] = true;
    });
    return dup;
  }

  function build() {
    var rows = visibleRows();
    var top = topValue();
    var out = [];
    var missing = [];

    rows.forEach(function (r) {
      if (r.junk) return;
      var name = top + '/' + r.inner;
      if (r.isDir && !/\/$/.test(name)) name += '/';
      if (!isValidPath(name.replace(/\/$/, ''), r.isDir)) { missing.push(r.original); return; }
      out.push({
        name: name,
        isDir: r.isDir,
        method: r.entry.method,
        time: r.entry.time,
        date: r.entry.date,
        crc: r.entry.crc,
        csize: r.entry.csize,
        usize: r.entry.usize,
        dataStart: r.entry.dataStart,
        dataEnd: r.entry.dataEnd,
        extAttr: r.entry.extAttr
      });
    });

    if (missing.length) {
      el.result.textContent = '还有不合规的名字：' + missing.slice(0, 3).join('、') + (missing.length > 3 ? ' 等' : '');
      el.result.classList.add('is-warn');
      return;
    }

    try {
      var blob = buildZip(out, state.buffer);
      var base = state.file.name.replace(/\.zip$/i, '');
      var fileName = sanitizeSeg(base) + '_packed.zip';
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      el.result.classList.remove('is-warn');
      el.result.textContent = '已生成 ' + fileName + '（' + out.filter(function (o) { return !o.isDir; }).length + ' 个文件）· 检查完可以直接投稿了';
    } catch (err) {
      el.result.textContent = '生成失败：' + err.message;
      el.result.classList.add('is-warn');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

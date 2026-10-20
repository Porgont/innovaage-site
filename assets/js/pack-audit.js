/* ============================================================
   投稿包检测与纠正 / 多种资源类型
   命名规范（站内投稿规范）：
     - 文件夹名、文件名只用拉丁字母、数字、下划线、连字符
     - 文件名允许一个扩展名点号
     - 压缩包必须是 zip
   打包结构参考网易《我的世界中国版资源上传规则》里的 PE 资源：
     地图 / 联机地图 / Add-on / 材质光影 各自的包体结构不同；
     皮肤是直接上传带透明通道的 PNG，不打包。
     PC 资源是 7z，浏览器里暂时读不了，先不纳入检测。

   全部在浏览器里做：读 zip 只解析目录，不做压缩/解压；
   重新打包时直接搬原始压缩数据，文件内容一个字节都不改。
   ============================================================ */
(function () {
  'use strict';

  var ALLOWED_SEG = /^[A-Za-z0-9_-]+$/;
  var ALLOWED_FILE = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/;
  var JUNK_NAMES = ['.ds_store', 'thumbs.db', 'desktop.ini'];
  var utf8 = new TextEncoder();

  var state = { file: null, buffer: null, type: '', audit: null, rows: [], top: '', kind: '' };
  var el = {};
  var pendingBase = '';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bytesOf(str) { return utf8.encode(str); }

  /* ---------- 资源类型 ---------- */
  var TYPES = [
    { id: 'auto', name: '自动识别', kind: 'zip', wrapTop: true },
    { id: 'pe_map', name: 'PE 地图', kind: 'zip', wrapTop: true },
    { id: 'pe_online', name: 'PE 联机地图', kind: 'zip', wrapTop: true },
    { id: 'pe_addon', name: 'PE Add-on', kind: 'zip', wrapTop: false },
    { id: 'pe_tex', name: 'PE 材质光影', kind: 'zip', wrapTop: true },
    { id: 'pe_skin', name: 'PE 皮肤', kind: 'png', wrapTop: false },
    { id: 'site', name: '站内投稿通用', kind: 'zip', wrapTop: true }
  ];

  function typeById(id) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
    return TYPES[0];
  }

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

      if (csize === 0xffffffff || usize === 0xffffffff) throw new Error('包含 ZIP64 条目，当前工具暂不支持');
      if (dv.getUint32(lho, true) !== 0x04034b50) throw new Error('ZIP 局部头损坏');

      var rawName = new TextDecoder('utf-8').decode(u8.subarray(p + 46, p + 46 + nlen));
      var name = rawName.replace(/\\/g, '/');
      var lnlen = dv.getUint16(lho + 26, true);
      var lelen = dv.getUint16(lho + 28, true);
      var dataStart = lho + 30 + lnlen + lelen;

      entries.push({
        name: name, isDir: /\/$/.test(name), method: method, encrypted: !!(flag & 0x1),
        crc: crc, csize: csize, usize: usize, time: time, date: date, extAttr: extAttr,
        dataStart: dataStart, dataEnd: dataStart + csize
      });
      p += 46 + nlen + elen + clen;
    }
    return entries;
  }

  /* ---------- 打包 ---------- */
  function buildZip(list, srcBuffer) {
    var u8 = new Uint8Array(srcBuffer);
    var parts = [], central = [], offset = 0;

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
    var cdStart = offset;
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
    var s = String(seg).replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return s || 'file';
  }
  function sanitizeName(name, isDir) {
    var segs = String(name).split('/');
    var last = -1;
    for (var i = segs.length - 1; i >= 0; i--) { if (segs[i] !== '') { last = i; break; } }
    return segs.map(function (seg, i) {
      if (seg === '') return '';
      if (i !== last || isDir) return sanitizeSeg(seg);
      var dot = seg.lastIndexOf('.');
      if (dot > 0 && dot < seg.length - 1) {
        return sanitizeSeg(seg.slice(0, dot)) + '.' + sanitizeSeg(seg.slice(dot + 1));
      }
      return sanitizeSeg(seg);
    }).filter(function (s) { return s !== ''; }).join('/');
  }
  function descChar(ch) {
    if (/[\u4e00-\u9fa5]/.test(ch)) return '中文「' + ch + '」';
    var names = { ' ': '空格', '.': '点号', '(': '括号', ')': '括号', '（': '全角括号', '）': '全角括号',
      '，': '全角逗号', '。': '句号', '、': '顿号', '+': '加号', '#': '井号', '&': '与号',
      "'": '单引号', '!': '感叹号', ',': '逗号', '~': '波浪号', '@': '艾特号', '$': '美元号', '%': '百分号' };
    return (names[ch] || '') + '「' + ch + '」';
  }
  function issuesOfPath(path, isDir) {
    var list = [];
    var segs = segments(path);
    if (!segs.length) return ['路径为空'];
    segs.forEach(function (seg, i) {
      var isFileSeg = i === segs.length - 1 && !isDir;
      var dotIndex = isFileSeg ? seg.lastIndexOf('.') : -1;
      var bad = [];
      for (var c = 0; c < seg.length; c++) {
        if (c === dotIndex) continue;
        var ch = seg.charAt(c);
        if (!/[A-Za-z0-9_-]/.test(ch) && bad.indexOf(ch) < 0) bad.push(ch);
      }
      if (bad.length) list.push('第 ' + (i + 1) + ' 段含' + bad.map(descChar).join('、'));
    });
    return list;
  }
  function isValidPath(path, isDir) {
    return segments(path).length > 0 && issuesOfPath(path, isDir).length === 0;
  }

  function dedupeSuggestions(rows) {
    var used = {};
    rows.forEach(function (r) {
      if (r.junk) return;
      var key = r.suggestion + (r.isDir ? '/' : '');
      if (!used[key]) { used[key] = 1; return; }
      var base = r.suggestion, stem = base, ext = '';
      var dot = r.isDir ? -1 : base.lastIndexOf('.');
      if (dot > 0) { stem = base.slice(0, dot); ext = base.slice(dot); }
      var n = 2, candidate;
      do { candidate = stem + '_' + n + ext; n++; } while (used[candidate + (r.isDir ? '/' : '')]);
      r.suggestion = candidate; r.inner = candidate; r.changed = true;
      used[candidate + (r.isDir ? '/' : '')] = 1;
    });
  }

  /* ---------- 类型识别 ---------- */
  function buildIndex(entries) {
    var files = {}, dirs = {}, tops = {};
    entries.forEach(function (e) {
      if (isJunk(e.name)) return;
      var segs = segments(e.name);
      if (!segs.length) return;
      tops[segs[0]] = tops[segs[0]] || (segs.length === 1 && !e.isDir ? 'file' : 'dir');
      if (e.isDir) dirs[e.name.replace(/\/$/, '')] = true;
      else files[e.name] = true;
      /* 压缩包常常没有显式目录条目，按路径补出上级目录 */
      for (var d = 1; d < segs.length; d++) dirs[segs.slice(0, d).join('/')] = true;
    });
    return { files: files, dirs: dirs, tops: tops };
  }

  function detectType(index, fileName) {
    if (/\.png$/i.test(fileName || '')) return 'pe_skin';
    var topNames = Object.keys(index.tops);
    var has = function (path) { return !!index.dirs[path] || !!index.files[path]; };
    var anyFile = function (re) { return Object.keys(index.files).some(function (p) { return re.test(p); }); };
    if (has('behavior_packs') && has('resource_packs')) return 'pe_addon';
    if (anyFile(/world_(behavior|resource)_packs\.json$/i)) return 'pe_online';
    if (anyFile(/(^|\/)level\.dat$/i)) return 'pe_map';
    if (anyFile(/textures\//i) && anyFile(/manifest\.json$/i)) return 'pe_tex';
    if (topNames.length === 1 && anyFile(new RegExp('^' + topNames[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/textures/'))) return 'pe_tex';
    return 'site';
  }

  function requiredChecks(typeId, index) {
    var checks = [];
    var has = function (path) { return !!index.dirs[path] || !!index.files[path]; };
    var anyFile = function (re) { return Object.keys(index.files).some(function (p) { return re.test(p); }); };

    if (typeId === 'pe_addon') {
      checks.push({ label: '顶层有 behavior_packs 文件夹', ok: has('behavior_packs') });
      checks.push({ label: '顶层有 resource_packs 文件夹', ok: has('resource_packs') });
      checks.push({ label: 'behavior_packs 里有 manifest.json', ok: anyFile(/^behavior_packs\/.*manifest\.json$/i) });
      checks.push({ label: 'resource_packs 里有 manifest.json', ok: anyFile(/^resource_packs\/.*manifest\.json$/i) });
    } else if (typeId === 'pe_tex') {
      checks.push({ label: '包里有 textures 文件夹', ok: anyFile(/textures\//i) });
      checks.push({ label: '包里有 manifest.json', ok: anyFile(/manifest\.json$/i) });
    } else if (typeId === 'pe_online') {
      var addon = has('behavior_packs') || has('resource_packs') ||
        Object.keys(index.tops).some(function (t) { return has(t + '/behavior_packs') || has(t + '/resource_packs'); });
      if (addon) {
        checks.push({ label: '带 Add-on 时需要 world_behavior_packs.json', ok: anyFile(/world_behavior_packs\.json$/i) });
        checks.push({ label: '带 Add-on 时需要 world_resource_packs.json', ok: anyFile(/world_resource_packs\.json$/i) });
      }
    }
    return checks;
  }

  /* ---------- 检测 ---------- */
  function audit(buffer, typeId, fileName) {
    var entries = parseZip(buffer);
    var index = buildIndex(entries);
    var type = typeId === 'auto' ? detectType(index, fileName) : typeId;
    var spec = typeById(type);

    var tops = Object.keys(index.tops);
    var rootFiles = [];
    entries.forEach(function (e) {
      if (isJunk(e.name)) return;
      var segs = segments(e.name);
      if (segs.length === 1 && !e.isDir) rootFiles.push(e.name);
    });

    var structureOk = true;
    var structureProblem = '';

    if (type === 'pe_addon') {
      if (tops.indexOf('behavior_packs') < 0) { structureOk = false; structureProblem = '顶层没有 behavior_packs 文件夹'; }
      else if (tops.indexOf('resource_packs') < 0) { structureOk = false; structureProblem = '顶层没有 resource_packs 文件夹'; }
      else {
        var extra = tops.filter(function (t) { return t !== 'behavior_packs' && t !== 'resource_packs'; });
        if (extra.length) { structureOk = false; structureProblem = '顶层多了：' + extra.slice(0, 3).join('、'); }
        else if (rootFiles.length) { structureOk = false; structureProblem = '根目录直接有 ' + rootFiles.length + ' 个文件'; }
      }
    } else {
      if (rootFiles.length) { structureOk = false; structureProblem = '根目录直接有 ' + rootFiles.length + ' 个文件'; }
      else if (tops.length === 0) { structureOk = false; structureProblem = '压缩包里没有文件夹'; }
      else if (tops.length > 1) { structureOk = false; structureProblem = '顶层有 ' + tops.length + ' 个文件夹：' + tops.slice(0, 4).join('、'); }
    }

    var checks = requiredChecks(type, index);
    var checksOk = checks.every(function (c) { return c.ok; });

    var topName = spec.wrapTop
      ? (tops.length === 1 && ALLOWED_SEG.test(tops[0]) ? tops[0] : suggestTopName())
      : '';

    var rows = [];
    entries.forEach(function (e) {
      if (isJunk(e.name)) {
        rows.push({ entry: e, original: e.name, isDir: e.isDir, junk: true, inner: '', origInner: '', origIssues: [], suggestion: '', innerIssues: [], changed: false });
        return;
      }
      var segs = segments(e.name);
      if (spec.wrapTop && tops.length === 1 && segs.length === 1 && e.isDir && segs[0] === tops[0]) return;
      var inner = spec.wrapTop && tops.length === 1 ? segs.slice(1).join('/') : segs.join('/');
      var suggestion = sanitizeName(inner, e.isDir);
      rows.push({
        entry: e, original: e.name, origInner: inner, origIssues: issuesOfPath(inner, e.isDir),
        suggestion: suggestion, isDir: e.isDir, junk: false,
        inner: suggestion, innerIssues: issuesOfPath(suggestion, e.isDir),
        changed: suggestion !== inner
      });
    });

    dedupeSuggestions(rows);

    return {
      entries: entries, index: index, type: type, spec: spec, rows: rows, tops: tops,
      rootFiles: rootFiles, topName: topName,
      structureOk: structureOk, structureProblem: structureProblem,
      checks: checks, checksOk: checksOk
    };
  }

  function suggestTopName() {
    var base = String(pendingBase || 'pack').replace(/\.[^.]+$/, '');
    return sanitizeSeg(base);
  }
  function topValue() {
    return (state.top || (state.audit && state.audit.topName) || '').trim();
  }

  /* ---------- PNG 皮肤 ---------- */
  function auditPng(buffer) {
    var u8 = new Uint8Array(buffer);
    if (u8.length < 33) throw new Error('文件太小，不是有效的 PNG');
    var sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (var i = 0; i < 8; i++) if (u8[i] !== sig[i]) throw new Error('不是 PNG 文件（文件头不对）');
    var dv = new DataView(buffer);
    var width = dv.getUint32(16, false);
    var height = dv.getUint32(20, false);
    var bitDepth = u8[24];
    var colorType = u8[25];
    var hasAlpha = colorType === 4 || colorType === 6;
    if (!hasAlpha && colorType === 3) {
      for (var p = 8; p + 8 <= u8.length;) {
        var len = dv.getUint32(p, false);
        var type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
        if (type === 'tRNS') { hasAlpha = true; break; }
        if (type === 'IDAT') break;
        p += 12 + len;
      }
    }
    return { width: width, height: height, bitDepth: bitDepth, colorType: colorType, hasAlpha: hasAlpha };
  }

  /* ---------- 界面 ---------- */
  function bind() {
    el.input = $('#pack-file');
    if (!el.input) return;
    el.drop = $('#pack-drop');
    el.note = $('#pack-file-note');
    el.report = $('#pack-report');
    el.summary = $('#pack-summary');
    el.type = $('#pack-type');
    el.topWrap = $('#pack-top');
    el.checks = $('#pack-checks');
    el.rows = $('#pack-rows');
    el.tableWrap = $('#pack-table-wrap');
    el.result = $('#pack-result');
    el.build = $('#pack-build');
    el.reset = $('#pack-reset');
    el.dropJunk = $('#pack-drop-junk');
    el.useSuggest = $('#pack-use-suggest');

    el.type.addEventListener('change', function () {
      if (state.buffer) reload();
    });

    el.input.addEventListener('change', function () {
      if (el.input.files && el.input.files[0]) load(el.input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (t) {
      el.drop.addEventListener(t, function (ev) { ev.preventDefault(); el.drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.drop.addEventListener(t, function (ev) { ev.preventDefault(); el.drop.classList.remove('is-over'); });
    });
    el.drop.addEventListener('drop', function (ev) {
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) load(f);
    });
    el.drop.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.input.click(); }
    });

    el.reset.addEventListener('click', function () {
      state = { file: null, buffer: null, type: '', audit: null, rows: [], top: '', kind: '' };
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

    el.build.addEventListener('click', build);
    el.dropJunk.addEventListener('change', paint);
  }

  function load(file) {
    pendingBase = file.name;
    var isPng = /\.png$/i.test(file.name);
    if (el.type.value === 'pe_skin' && !isPng) { fail('皮肤类型要选一个 .png 文件，不是压缩包'); return; }
    if (!isPng && !/\.zip$/i.test(file.name)) {
      fail('「' + file.name + '」不是 .zip 文件 —— 投稿只收 ZIP（皮肤是 PNG）');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.buffer = reader.result;
      state.file = file;
      state.top = '';
      el.report.hidden = false;
      el.result.textContent = '';
      reload();
    };
    reader.onerror = function () { fail('读取文件失败，换一个试试'); };
    reader.readAsArrayBuffer(file);
  }

  function reload() {
    try {
      var typeSel = el.type.value;
      if (/\.png$/i.test(state.file.name) || typeSel === 'pe_skin') {
        state.kind = 'png';
        state.audit = null;
        state.rows = [];
        var info = auditPng(state.buffer);
        state.png = info;
        el.note.textContent = state.file.name + ' · ' + info.width + '×' + info.height + ' · PNG';
        el.note.classList.remove('is-bad');
        paintPng(info);
        return;
      }
      state.kind = 'zip';
      state.autoType = typeSel === 'auto';
      state.audit = audit(state.buffer, typeSel, state.file.name);
      state.rows = state.audit.rows;
      if (typeSel === 'auto') el.type.value = state.audit.type;
      el.note.textContent = state.file.name + ' · ' + sizeText(state.file.size) + ' ' + sizeUnit(state.file.size);
      el.note.classList.remove('is-bad');
      paint();
    } catch (err) {
      fail('读不了这个文件：' + err.message);
    }
  }

  function fail(msg) {
    el.report.hidden = true;
    el.note.textContent = msg;
    el.note.classList.add('is-bad');
  }

  function checkLine(label, ok) {
    return '<div class="pack-check-line ' + (ok ? 'is-ok' : 'is-bad') + '">' +
      '<span class="pack-check-dot" aria-hidden="true">' + (ok ? '✓' : '×') + '</span>' + esc(label) + '</div>';
  }

  function paintPng(info) {
    var type = el.type.value === 'auto' ? 'pe_skin' : el.type.value;
    var spec = typeById(type);

    el.summary.innerHTML =
      stat(info.width + '×' + info.height, '像素', '皮肤图尺寸') +
      stat(info.bitDepth, '位深', 'PNG 头信息') +
      stat(info.hasAlpha ? '有' : '无', '透明通道', info.hasAlpha ? '可以直接上传' : '皮肤需要带透明通道') +
      stat(spec.name, '资源类型', '直接上传，不打包');

    el.checks.hidden = false;
    el.checks.innerHTML = checkLine('文件是 PNG（文件头校验通过）', true) +
      checkLine('带透明通道（RGBA / 调色板 tRNS）', info.hasAlpha);
    el.topWrap.innerHTML = '';
    el.tableWrap.hidden = true;
    el.rows.innerHTML = '';
    el.build.disabled = true;
    el.result.textContent = info.hasAlpha
      ? '皮肤不需要打包，直接把这支 PNG 上传到开发者平台即可。'
      : '这张 PNG 没有透明通道，建议用带透明通道的 PNG 重新导出后再上传。';
    el.result.classList.toggle('is-warn', !info.hasAlpha);
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
    var badNames = rows.filter(function (r) { return !r.junk && r.innerIssues.length; });
    var renamed = rows.filter(function (r) { return !r.junk && !r.innerIssues.length && r.changed; });
    var junk = state.rows.filter(function (r) { return r.junk; });
    var top = topValue();
    var topOk = !a.spec.wrapTop || ALLOWED_SEG.test(top);

    el.summary.innerHTML =
      stat(a.spec.name, '资源类型', state.autoType ? '自动识别' : '手动选择') +
      stat(files.length, '个文件', '含目录共 ' + rows.length + ' 项') +
      stat(sizeText(state.file.size), sizeUnit(state.file.size), '包体大小') +
      stat((badNames.length + renamed.length) || '0', '处名字要改', badNames.length ? '还有 ' + badNames.length + ' 处没改好' : (renamed.length ? '已自动给出建议名' : '名字都合规')) +
      stat(a.structureOk ? '通过' : '待修', '包体结构', a.structureOk ? '符合这个类型' : a.structureProblem) +
      (a.checks.length ? stat(a.checksOk ? '通过' : '待修', '必备文件', a.checksOk ? '该有的都有' : '看下面清单') : '') +
      stat(junk.length, '个系统垃圾文件', el.dropJunk.checked && junk.length ? '生成时会去掉' : '来自 macOS / Windows');

    el.checks.hidden = !a.checks.length;
    el.checks.innerHTML = a.checks.map(function (c) { return checkLine(c.label, c.ok); }).join('');

    if (a.spec.wrapTop) {
      el.topWrap.innerHTML =
        '<label class="pack-top-label" for="pack-top-input">顶层文件夹</label>' +
        '<input class="pack-top-input" id="pack-top-input" type="text" spellcheck="false" value="' + esc(top) + '">' +
        '<span class="pack-top-state ' + (topOk ? 'is-ok' : 'is-bad') + '">' +
          (topOk ? '合规' : '只允许字母、数字、下划线、连字符') +
        '</span>';
      el.topWrap.querySelector('#pack-top-input').addEventListener('input', function () {
        state.top = this.value;
        paint();
      });
    } else {
      el.topWrap.innerHTML = '<p class="note" style="margin:4px 0 12px">这个类型不套外层文件夹，直接用 behavior_packs / resource_packs 当顶层目录。</p>';
    }

    el.tableWrap.hidden = false;
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
        '</td></tr>';
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
      input.addEventListener('blur', paint);
    });

    var dup = findDuplicates(rows, top, a.spec.wrapTop);
    var why = [];
    if (!topOk) why.push('顶层文件夹名不合规');
    if (badNames.length) why.push(badNames.length + ' 处名字仍不合规');
    if (dup.length) why.push('有重名：' + dup.slice(0, 3).join('、'));
    if (!a.structureOk) why.push('包体结构待修：' + a.structureProblem);
    if (a.checks.length && !a.checksOk) why.push('必备文件缺失');
    if (!files.length) why.push('没有文件');

    el.build.disabled = why.length > 0;
    el.result.textContent = why.length ? '还不能生成：' + why.join('；') + '。' : '';
    el.result.classList.toggle('is-warn', why.length > 0);
  }

  function stat(v, label, sub) {
    return '<div class="pack-stat"><b>' + esc(v) + '</b><span>' + esc(label) + '</span>' +
      (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  function findDuplicates(rows, top, wrapTop) {
    var seen = {}, dup = [];
    rows.forEach(function (r) {
      if (r.junk) return;
      var path = (wrapTop ? top + '/' : '') + r.inner + (r.isDir ? '/' : '');
      if (seen[path] && dup.indexOf(path) < 0) dup.push(path);
      seen[path] = true;
    });
    return dup;
  }

  function sizeUnit(size) { return size < 1024 * 1024 ? 'KB' : 'MB'; }
  function sizeText(size) {
    return size < 1024 * 1024 ? (size / 1024).toFixed(1) : (size / 1024 / 1024).toFixed(2);
  }

  function build() {
    var a = state.audit;
    if (!a) return;
    var rows = visibleRows();
    var top = topValue();
    var wrap = a.spec.wrapTop;
    var out = [], missing = [];

    rows.forEach(function (r) {
      if (r.junk) return;
      var name = (wrap ? top + '/' : '') + r.inner;
      if (r.isDir && !/\/$/.test(name)) name += '/';
      if (!isValidPath(name.replace(/\/$/, ''), r.isDir)) { missing.push(r.original); return; }
      out.push({
        name: name, isDir: r.isDir, method: r.entry.method, time: r.entry.time, date: r.entry.date,
        crc: r.entry.crc, csize: r.entry.csize, usize: r.entry.usize,
        dataStart: r.entry.dataStart, dataEnd: r.entry.dataEnd, extAttr: r.entry.extAttr
      });
    });

    if (missing.length) {
      el.result.textContent = '还有不合规的名字：' + missing.slice(0, 3).join('、') + (missing.length > 3 ? ' 等' : '');
      el.result.classList.add('is-warn');
      return;
    }

    try {
      var blob = buildZip(out, state.buffer);
      var base = state.file.name.replace(/\.(zip|png)$/i, '');
      var fileName = sanitizeSeg(base) + '_packed.zip';
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url; link.download = fileName;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      el.result.classList.remove('is-warn');
      el.result.textContent = '已生成 ' + fileName + '（' + out.filter(function (o) { return !o.isDir; }).length + ' 个文件）· 检查完可以直接投稿了';
    } catch (err) {
      el.result.textContent = '生成失败：' + err.message;
      el.result.classList.add('is-warn');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

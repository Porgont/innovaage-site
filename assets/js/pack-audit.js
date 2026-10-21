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
  var ALLOWED_FILE = /^[A-Za-z0-9_.-]+$/;
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
    { id: 'pc_map', name: 'PC 地图 / 玩法', kind: '7z', wrapTop: true },
    { id: 'pc_mod', name: 'PC MOD', kind: '7z', wrapTop: true },
    { id: 'pc_tex', name: 'PC 材质 / 光影', kind: '7z', wrapTop: true },
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
  function sanitizeSeg(seg, fallback) {
    var s = String(seg).replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return s || fallback || 'file';
  }
  /* 文件名保留点号（可多段），主名洗不出东西时兜底成 file，扩展名保留 */
  function sanitizeFileSeg(seg) {
    var str = String(seg);
    var dot = str.lastIndexOf('.');
    var stem = dot > 0 ? str.slice(0, dot) : str;
    var ext = dot > 0 ? str.slice(dot) : '';
    stem = stem.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/_+/g, '_').replace(/\.{2,}/g, '.').replace(/^[._]+|[._]+$/g, '');
    ext = ext.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/\.{2,}/g, '.');
    return (stem || 'file') + ext;
  }

  function sanitizeName(name, isDir) {
    var segs = String(name).split('/');
    var last = -1;
    for (var i = segs.length - 1; i >= 0; i--) { if (segs[i] !== '') { last = i; break; } }
    return segs.map(function (seg, i) {
      if (seg === '') return '';
      if (i !== last || isDir) return sanitizeSeg(seg, 'folder');
      return sanitizeFileSeg(seg);
    }).filter(function (s) { return s !== ''; }).join('/');
  }

  function issuesOfPath(path, isDir) {
    var list = [];
    var segs = segments(path);
    if (!segs.length) return ['路径为空'];
    segs.forEach(function (seg, i) {
      var isFileSeg = i === segs.length - 1 && !isDir;
      var spaces = 0, cn = [], sym = [];
      for (var c = 0; c < seg.length; c++) {
        var ch = seg.charAt(c);
        var ok = isFileSeg ? /[A-Za-z0-9_.-]/.test(ch) : /[A-Za-z0-9_-]/.test(ch);
        if (ok) continue;
        if (ch === ' ') { spaces++; continue; }
        if (/[\u4e00-\u9fa5]/.test(ch)) { if (cn.indexOf(ch) < 0) cn.push(ch); continue; }
        if (sym.indexOf(ch) < 0) sym.push(ch);
      }
      var bits = [];
      if (spaces) bits.push('空格');
      if (cn.length) bits.push('中文「' + cn.join('') + '」');
      if (sym.length) bits.push('符号「' + sym.join('') + '」');
      if (bits.length) list.push('第 ' + (i + 1) + ' 段含' + bits.join('、'));
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
        else if (rootFiles.length) { structureOk = false; structureProblem = '根目录直接有 ' + rootFiles.length + ' 个文件：' + rootFiles.slice(0, 4).join('、') + (rootFiles.length > 4 ? ' 等' : ''); }
      }
    } else {
      if (rootFiles.length) { structureOk = false; structureProblem = '根目录直接有 ' + rootFiles.length + ' 个文件：' + rootFiles.slice(0, 4).join('、') + (rootFiles.length > 4 ? ' 等' : ''); }
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
    return sanitizeSeg(base, 'pack');
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

  /* ---------- 7z（延迟加载 wasm） ---------- */
  var sevenZipFactory = null;

  function loadSevenZipFactory() {
    if (sevenZipFactory) return sevenZipFactory;
    sevenZipFactory = new Promise(function (resolve, reject) {
      if (typeof window.SevenZip === 'function') { resolve(window.SevenZip); return; }
      var script = document.createElement('script');
      script.src = 'assets/vendor/7z-wasm/7zz.umd.js';
      script.onload = function () {
        if (typeof window.SevenZip === 'function') resolve(window.SevenZip);
        else reject(new Error('7z 引擎没有注册（脚本不完整）'));
      };
      script.onerror = function () { reject(new Error('7z 引擎加载失败（assets/vendor/7z-wasm/）')); };
      document.head.appendChild(script);
    });
    return sevenZipFactory;
  }

  function parse7zList(text) {
    var entries = [];
    var cur = null;
    var started = false;
    text.split(/\r?\n/).forEach(function (line) {
      if (/^-{6,}$/.test(line.trim())) { started = true; return; }
      if (!started) return;
      var t = line.trim();
      if (t.indexOf('Path = ') === 0) {
        cur = { name: t.slice(7).replace(/\\/g, '/'), isDir: false, size: 0 };
        if (cur.name && cur.name !== '/in.7z') entries.push(cur); else cur = null;
      } else if (cur && t.indexOf('Folder = ') === 0) {
        if (t.slice(9).trim() === '+') cur.isDir = true;
      } else if (cur && t.indexOf('Attributes = ') === 0) {
        if (/^D/.test(t.slice(13).trim())) cur.isDir = true;
      } else if (cur && t.indexOf('Size = ') === 0) {
        var n = parseInt(t.slice(7).trim(), 10);
        if (!isNaN(n)) cur.size = n;
      }
    });
    return entries;
  }

  function list7z(buffer) {
    return loadSevenZipFactory().then(function (Factory) {
      return new Promise(function (resolve, reject) {
        var out = '';
        var err = '';
        Factory({
          locateFile: function (f) { return 'assets/vendor/7z-wasm/' + f; },
          print: function (t) { out += t + '\n'; },
          printErr: function (t) { err += t + '\n'; }
        }).then(function (sz) {
          try {
            sz.FS.writeFile('/in.7z', new Uint8Array(buffer));
            sz.callMain(['l', '-slt', '/in.7z']);
            resolve(parse7zList(out));
          } catch (e) {
            reject(new Error('7z 解析失败：' + (err.trim() || e.message)));
          }
        }, reject);
      });
    });
  }

  function detect7zType(index) {
    var anyFile = function (re) { return Object.keys(index.files).some(function (p) { return re.test(p); }); };
    if (anyFile(/\.zip$/i)) return 'pc_tex';
    if (anyFile(/\.jar$/i)) return 'pc_mod';
    return 'pc_map';
  }

  function audit7z(list, typeSel, fileName) {
    var entries = list.map(function (e) {
      return { name: e.name, isDir: e.isDir, method: 0, time: 0, date: 0, crc: 0,
        csize: 0, usize: e.size || 0, extAttr: 0, dataStart: 0, dataEnd: 0 };
    });
    var index = buildIndex(entries);
    var type = typeSel === 'auto' ? detect7zType(index) : typeSel;
    var spec = typeById(type);

    var tops = Object.keys(index.tops);
    var rootFiles = entries.filter(function (e) {
      return !isJunk(e.name) && segments(e.name).length === 1 && !e.isDir;
    }).map(function (e) { return e.name; });

    var structureOk = true, structureProblem = '';
    if (rootFiles.length) { structureOk = false; structureProblem = '根目录直接有 ' + rootFiles.length + ' 个文件：' + rootFiles.slice(0, 4).join('、') + (rootFiles.length > 4 ? ' 等' : ''); }
    else if (tops.length === 0) { structureOk = false; structureProblem = '压缩包里没有文件夹'; }
    else if (tops.length > 1) { structureOk = false; structureProblem = '顶层有 ' + tops.length + ' 个文件夹：' + tops.slice(0, 4).join('、'); }

    var checks = [];
    var anyFile = function (re) { return Object.keys(index.files).some(function (p) { return re.test(p); }); };
    var zipFiles = Object.keys(index.files).filter(function (p) { return /\.zip$/i.test(p); });
    if (type === 'pc_mod') {
      checks.push({ label: '包里有一个 .jar', ok: anyFile(/\.jar$/i) });
    } else if (type === 'pc_tex') {
      checks.push({ label: '包里有一个 .zip', ok: zipFiles.length > 0 });
      checks.push({ label: '顶层只有一个 .zip', ok: zipFiles.length === 1 });
    }
    var checksOk = checks.every(function (c) { return c.ok; });

    var topName = tops.length === 1 && ALLOWED_SEG.test(tops[0]) ? tops[0] : suggestTopName();

    var rows = [];
    entries.forEach(function (e) {
      if (isJunk(e.name)) {
        rows.push({ entry: e, original: e.name, isDir: e.isDir, junk: true, inner: '', origInner: '', origIssues: [], suggestion: '', innerIssues: [], changed: false });
        return;
      }
      var segs = segments(e.name);
      if (tops.length === 1 && segs.length === 1 && e.isDir && segs[0] === tops[0]) return;
      var inner = tops.length === 1 ? segs.slice(1).join('/') : segs.join('/');
      var suggestion = sanitizeName(inner, e.isDir);
      rows.push({
        entry: e, original: e.name, origInner: inner, origIssues: issuesOfPath(inner, e.isDir),
        suggestion: suggestion, isDir: e.isDir, junk: false,
        inner: suggestion, innerIssues: issuesOfPath(suggestion, e.isDir),
        changed: suggestion !== inner
      });
    });
    dedupeSuggestions(rows);

    return { entries: entries, index: index, type: type, spec: spec, rows: rows, tops: tops,
      rootFiles: rootFiles, topName: topName, structureOk: structureOk, structureProblem: structureProblem,
      checks: checks, checksOk: checksOk, archive: '7z' };
  }

  /* ---------- 7z 生成 ---------- */
  var SEVEN_ZIP_MAX = 120 * 1024 * 1024;   /* 超过 120MB 不试，避免把浏览器内存撑爆 */

  function mkdirP(sz, path) {
    var parts = path.split('/').filter(Boolean);
    var cur = '';
    parts.forEach(function (part) {
      cur += '/' + part;
      try { sz.FS.mkdir(cur); } catch (e) { /* 已存在 */ }
    });
  }

  function build7z(rows, top, wrap) {
    var a = state.audit;
    if (state.file.size > SEVEN_ZIP_MAX) {
      el.result.textContent = '这个 7z 有 ' + sizeText(state.file.size) + ' ' + sizeUnit(state.file.size) +
        '，超过 120 MB，浏览器里解包重压容易崩。请按上面的建议名用 7-Zip 手动改。';
      el.result.classList.add('is-warn');
      return;
    }

    var plan = [];
    var bad = [];
    rows.forEach(function (r) {
      if (r.junk) return;
      var name = (wrap ? top + '/' : '') + r.inner;
      if (r.isDir && !/\/$/.test(name)) name += '/';
      if (!isValidPath(name.replace(/\/$/, ''), r.isDir)) { bad.push(r.original); return; }
      plan.push({ from: '/work/' + r.entry.name, to: '/out/' + name, isDir: r.isDir, name: name });
    });
    if (bad.length) {
      el.result.textContent = '还有不合规的名字：' + bad.slice(0, 3).join('、') + (bad.length > 3 ? ' 等' : '');
      el.result.classList.add('is-warn');
      return;
    }

    var note = el.note;
    note.textContent = '7z：正在解包…';
    el.build.disabled = true;

    setTimeout(function () {
      loadSevenZipFactory().then(function (Factory) {
        var logs = '';
        return Factory({
          locateFile: function (f) { return 'assets/vendor/7z-wasm/' + f; },
          print: function (t) { logs += t + '\n'; },
          printErr: function (t) { logs += t + '\n'; }
        });
      }).then(function (sz) {
        sz.FS.writeFile('/in.7z', new Uint8Array(state.buffer));
        sz.FS.mkdir('/work');
        note.textContent = '7z：正在解包…';
        sz.callMain(['x', '/in.7z', '-o/work', '-y']);

        note.textContent = '7z：正在按新名字重建…';
        sz.FS.mkdir('/out');
        plan.sort(function (x, y) { return x.from.split('/').length - y.from.split('/').length; });
        plan.forEach(function (item) {
          if (item.isDir) { mkdirP(sz, item.to.replace(/\/$/, '')); return; }
          mkdirP(sz, item.to.slice(0, item.to.lastIndexOf('/')));
          try {
            sz.FS.writeFile(item.to, sz.FS.readFile(item.from));
          } catch (e) {
            logs += '复制失败 ' + item.from + '：' + e.message + '\n';
          }
        });

        note.textContent = '7z：正在重新打包…';
        sz.FS.chdir('/out');
        var names = sz.FS.readdir('/out').filter(function (n) { return n !== '.' && n !== '..'; });
        sz.callMain(['a', '/out.7z'].concat(names));
        var data = sz.FS.readFile('/out.7z');
        return data;
      }).then(function (data) {
        var blob = new Blob([data], { type: 'application/x-7z-compressed' });
        var base = state.file.name.replace(/\.(7z|zip|png)$/i, '');
        var fileName = sanitizeSeg(base) + '_packed.7z';
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url; link.download = fileName;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        state.file = state.file;   /* 保留原文件以便再次生成 */
        el.build.disabled = false;
        el.result.classList.remove('is-warn');
        el.result.textContent = '已生成 ' + fileName + '（' + plan.filter(function (x) { return !x.isDir; }).length +
          ' 个文件）· 7z 是重新压缩的，内容不变，时间戳与压缩参数会变';
        note.textContent = state.file.name + ' · ' + sizeText(state.file.size) + ' ' + sizeUnit(state.file.size) + ' · 7z';
      }).catch(function (err) {
        el.build.disabled = false;
        el.result.classList.add('is-warn');
        el.result.textContent = '7z 生成失败：' + err.message;
      });
    }, 30);
  }

  /* ---------- 03 本地校验记录（localStorage） ---------- */
  var HISTORY_KEY = 'innovaage.packAudit.history.v1';
  var HISTORY_MAX = 20;

  function historyRead() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function historyWrite(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* 隐私模式忽略 */ }
  }

  function historySummary(audit, kind) {
    var problems = [];
    var rows = audit.rows.filter(function (r) { return !r.junk; });
    var files = rows.filter(function (r) { return !r.isDir; });

    if (kind === 'png') {
      if (!audit.info.hasAlpha) problems.push('没有透明通道');
      return { ok: audit.info.hasAlpha, problems: problems };
    }

    if (!audit.structureOk) problems.push('包体结构：' + audit.structureProblem);
    audit.checks.forEach(function (c) { if (!c.ok) problems.push('缺少 ' + c.label); });
    var bad = rows.filter(function (r) { return issuesOfPath(r.origInner, r.isDir).length; });
    if (bad.length) problems.push(bad.length + ' 处文件名不合规');
    if (!files.length) problems.push('压缩包里没有文件');
    return { ok: problems.length === 0, problems: problems };
  }

  function historyAdd(name, typeName, kind, audit) {
    var sum = historySummary(audit, kind);
    var list = historyRead();
    var now = Date.now();
    if (list[0] && list[0].n === name && list[0].t === typeName && now - list[0].at < 3000) return;
    list.unshift({ n: name, t: typeName, k: kind, at: now, ok: sum.ok, probs: sum.problems });
    historyWrite(list.slice(0, HISTORY_MAX));
    renderHistory();
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    function two(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) +
      ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }

  function renderHistory() {
    if (!el.historyList) return;
    var list = historyRead();
    el.historyClear.disabled = list.length === 0;

    if (!list.length) {
      el.historyList.innerHTML = '<p class="pack-hist-empty">还没有校验记录。上传一个文件，结果会自动留在这里。</p>';
      return;
    }

    el.historyList.innerHTML = list.map(function (rec, i) {
      var detail = rec.probs && rec.probs.length
        ? '<div class="pack-hist-detail" hidden>' + rec.probs.map(function (t) {
            return '<p>' + esc(t) + '</p>';
          }).join('') + '</div>'
        : '';
      var more = rec.probs && rec.probs.length
        ? '<button class="pack-hist-more" type="button" data-hist="' + i + '" aria-expanded="false">查看报告</button>'
        : '';
      return '<div class="pack-hist-item">' +
        '<div>' +
          '<p class="pack-hist-item__name">' + esc(rec.n) + '</p>' +
          '<p class="pack-hist-item__meta"><span>' + esc(rec.t) + '</span><span>' + fmtTime(rec.at) + '</span></p>' +
        '</div>' +
        '<div class="pack-hist-item__side">' +
          '<span class="pack-hist-badge ' + (rec.ok ? 'is-ok' : 'is-bad') + '">' + (rec.ok ? '通过' : '不通过') + '</span>' +
          more +
        '</div>' +
        detail +
      '</div>';
    }).join('');
  }

  /* ---------- 包体模板：本地生成空目录 zip ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    var c = 0xffffffff;
    for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosTime(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  }
  function dosDate(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  }

  function makeStoredZip(entries) {
    var enc = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;
    var now = new Date();
    var tm = dosTime(now), dt = dosDate(now);

    entries.forEach(function (e) {
      var nameBytes = enc.encode(e.name);
      var data = e.data || new Uint8Array(0);
      var crc = crc32(data);

      var local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, tm, true);
      local.setUint16(12, dt, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true);

      chunks.push(new Uint8Array(local.buffer), nameBytes, data);

      var cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, tm, true);
      cd.setUint16(14, dt, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, nameBytes.length, true);
      cd.setUint16(30, 0, true);
      cd.setUint16(32, 0, true);
      cd.setUint16(34, 0, true);
      cd.setUint16(36, 0, true);
      cd.setUint32(38, e.name.slice(-1) === '/' ? 0x10 : 0, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), nameBytes);

      offset += 30 + nameBytes.length + data.length;
    });

    var centralSize = central.reduce(function (n, u8) { return n + u8.length; }, 0);
    var eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, offset, true);

    var all = chunks.concat(central, [new Uint8Array(eocd.buffer)]);
    var total = all.reduce(function (n, u8) { return n + u8.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    all.forEach(function (u8) { out.set(u8, pos); pos += u8.length; });
    return out;
  }

  function templateFolders(typeId, top) {
    var t = (top || 'pack').replace(/[^A-Za-z0-9_-]/g, '_') || 'pack';
    if (typeId === 'pe_addon') return ['behavior_packs/', 'resource_packs/'];
    if (typeId === 'pe_tex' || typeId === 'pc_tex') return [t + '/', t + '/textures/'];
    return [t + '/'];
  }

  function downloadTemplate() {
    var typeId = el.type.value !== 'auto' ? el.type.value : (state.audit ? state.audit.type : 'pe_map');
    var spec = typeById(typeId);
    var top = state.audit && state.audit.topName ? state.audit.topName : (state.file ? state.file.name.replace(/\.[^.]+$/, '') : 'pack');
    var folders = templateFolders(spec.id, top);
    var bytes = makeStoredZip(folders.map(function (name) { return { name: name, data: new Uint8Array(0) }; }));
    var blob = new Blob([bytes], { type: 'application/zip' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = folders[0].replace(/\/$/, '') + '_template.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- 界面 ---------- */
  function bind() {
    el.input = $('#pack-file');
    if (!el.input) return;
    el.drop = $('#pack-drop');
    el.note = $('#pack-file-note');
    el.report = $('#pack-report');
    el.summary = $('#pack-summary');
    el.verdict = $('#pack-verdict');
    el.type = $('#pack-type');
    el.topWrap = $('#pack-top');
    el.problems = $('#pack-problems');
    el.rows = $('#pack-rows');
    el.tableWrap = $('#pack-table-wrap');
    el.result = $('#pack-result');
    el.build = $('#pack-build');
    el.reset = $('#pack-reset');
    el.dropJunk = $('#pack-drop-junk');
    el.useSuggest = $('#pack-use-suggest');
    el.toggleTable = $('#pack-toggle-table');
    el.historyList = $('#history-list');
    el.historyClear = $('#history-clear');
    el.tplDownload = $('#tpl-download');

    el.type.addEventListener('change', function () {
      if (state.buffer) reload();
    });

    if (el.historyClear) {
      el.historyClear.addEventListener('click', function () {
        if (!historyRead().length) return;
        if (window.confirm('清空全部本地校验记录？')) {
          historyWrite([]);
          renderHistory();
        }
      });
    }

    if (el.historyList) {
      el.historyList.addEventListener('click', function (ev) {
        var btn = ev.target.closest('.pack-hist-more');
        if (!btn) return;
        var item = btn.closest('.pack-hist-item');
        var detail = item && item.querySelector('.pack-hist-detail');
        if (!detail) return;
        var open = detail.hidden;
        detail.hidden = !open;
        btn.textContent = open ? '收起报告' : '查看报告';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (el.tplDownload) {
      el.tplDownload.addEventListener('click', downloadTemplate);
    }

    renderHistory();

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
      state.renameApplied = true;
      var changedCount = 0;
      state.rows.forEach(function (r) {
        if (r.junk) return;
        var before = r.inner;
        r.inner = r.suggestion;
        r.innerIssues = issuesOfPath(r.inner, r.isDir);
        r.changed = r.inner !== r.origInner;
        if (r.inner !== before) changedCount++;
      });
      paint();
      /* 只要点完之后没有残留的不合规名字，就让按钮自己给反馈 */
      var stillBad = state.rows.some(function (r) { return !r.junk && r.innerIssues.length; });
      if (!stillBad && !el.build.disabled) showRenameDone();
    });

    el.toggleTable.addEventListener('click', function () {
      state.tableCollapsed = !state.tableCollapsed;
      paint();
    });

    el.build.addEventListener('click', build);
    el.dropJunk.addEventListener('change', paint);
  }

  function load(file) {
    pendingBase = file.name;
    var isPng = /\.png$/i.test(file.name);
    var is7z = /\.7z$/i.test(file.name);
    if (el.type.value === 'pe_skin' && !isPng) { fail('皮肤类型要选一个 .png 文件，不是压缩包'); return; }
    if (!isPng && !/\.zip$/i.test(file.name) && !is7z) {
      fail('「' + file.name + '」不是 .zip / .7z / .png 文件');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.buffer = reader.result;
      state.file = file;
      state.top = '';
      state.tableCollapsed = null;
      state.renameApplied = false;
      if (el.useSuggest && el.useSuggest.dataset.baseText) {
        el.useSuggest.classList.remove('is-done');
        el.useSuggest.textContent = el.useSuggest.dataset.baseText;
      }
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
      if (/\.7z$/i.test(state.file.name) || typeSel.indexOf('pc_') === 0) {
        state.kind = '7z';
        el.note.textContent = '正在用 7z 引擎读取 ' + state.file.name + ' …';
        el.note.classList.remove('is-bad');
        state.autoType = typeSel === 'auto';
        list7z(state.buffer).then(function (list) {
          state.audit = audit7z(list, typeSel, state.file.name);
          state.rows = state.audit.rows;
          historyAdd(state.file.name, state.audit.spec.name, '7z', state.audit);
          if (typeSel === 'auto') el.type.value = state.audit.type;
          el.note.textContent = state.file.name + ' · ' + sizeText(state.file.size) + ' ' + sizeUnit(state.file.size) + ' · 7z';
          el.note.classList.remove('is-bad');
          paint();
        }).catch(function (err) { fail('读不了这个 7z：' + err.message); });
        return;
      }
      if (/\.png$/i.test(state.file.name) || typeSel === 'pe_skin') {
        state.kind = 'png';
        state.audit = null;
        state.rows = [];
        var info = auditPng(state.buffer);
        state.png = info;
        historyAdd(state.file.name, 'PE 皮肤', 'png', { info: info });
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
      historyAdd(state.file.name, state.audit.spec.name, 'zip', state.audit);
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

  var renameTimer = null;
  function showRenameDone() {
    var btn = el.useSuggest;
    if (!btn) return;
    if (!btn.dataset.baseText) btn.dataset.baseText = btn.textContent.trim();
    btn.classList.remove('is-done');
    void btn.offsetWidth;
    btn.classList.add('is-done');
    btn.textContent = '✓ 已更改';
    if (el.build) {
      el.build.classList.remove('is-pulse');
      void el.build.offsetWidth;
      el.build.classList.add('is-pulse');
    }
    clearTimeout(renameTimer);
    renameTimer = setTimeout(function () {
      btn.classList.remove('is-done');
      btn.textContent = btn.dataset.baseText;
      if (el.build) el.build.classList.remove('is-pulse');
    }, 2400);
  }



  function paintPng(info) {
    var type = el.type.value === 'auto' ? 'pe_skin' : el.type.value;
    var spec = typeById(type);

    if (el.verdict) {
      el.verdict.className = 'pack-verdict ' + (info.hasAlpha ? 'is-ok' : 'is-bad');
      el.verdict.innerHTML = info.hasAlpha
        ? '<b>✓ 合规</b><span>带透明通道的 PNG，直接上传即可</span>'
        : '<b>✗ 不合规</b><span>没有透明通道，换一张带透明通道的 PNG</span>';
    }

    el.summary.innerHTML =
      stat(info.width + '×' + info.height, '像素', '皮肤图尺寸') +
      stat(info.bitDepth, '位深', 'PNG 头信息') +
      stat(info.hasAlpha ? '有' : '无', '透明通道', info.hasAlpha ? '可以直接上传' : '皮肤需要带透明通道') +
      stat(spec.name, '资源类型', '直接上传，不打包');

    paintProblems([
      { cls: 'is-ok', k: '格式', d: '文件是 PNG（文件头校验通过）' },
      { cls: info.hasAlpha ? 'is-ok' : 'is-bad', k: '透明通道', d: info.hasAlpha ? '带透明通道（RGBA / 调色板 tRNS）' : '没有透明通道，需要重新导出' }
    ]);
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
    var fixableStructure = !!a.spec.wrapTop &&
      (!a.structureOk) &&
      (/^根目录直接有/.test(a.structureProblem) || /^顶层有 \d+ 个文件夹/.test(a.structureProblem));
    var top = topValue();
    var topOk = !a.spec.wrapTop || ALLOWED_SEG.test(top);

    var hardProblems = [];
    if (!a.structureOk && !fixableStructure) hardProblems.push('包体结构');
    if (a.checks.length && !a.checksOk) hardProblems.push('必备文件缺失（无法自动修复）');
    if (badNames.length) hardProblems.push(badNames.length + ' 处名字');
    if (!files.length) hardProblems.push('没有文件');
    var pendingRename = renamed.length > 0 && !state.renameApplied;
    if (pendingRename) hardProblems.push(renamed.length + ' 处原名要改名');
    renderVerdict({
      hard: hardProblems,
      structureProblem: a.structureOk ? '' : a.structureProblem,
      fixable: fixableStructure,
      pendingRename: pendingRename,
      renamed: renamed.length
    });

    var problems = [];
    if (!a.structureOk) {
      problems.push({ cls: fixableStructure ? 'is-warn' : 'is-bad', k: '包体结构',
        d: a.structureProblem + (fixableStructure ? '，生成时会自动收进一个顶层文件夹' : '') });
    }
    var missing = a.checks.filter(function (c) { return !c.ok; });
    if (missing.length) {
      var named = { '顶层有 behavior_packs 文件夹': 'behavior_packs 文件夹',
        '顶层有 resource_packs 文件夹': 'resource_packs 文件夹',
        'behavior_packs 里有 manifest.json': 'behavior_packs 里的 manifest.json',
        'resource_packs 里有 manifest.json': 'resource_packs 里的 manifest.json',
        '包里有 textures 文件夹': 'textures 文件夹',
        '包里有 manifest.json': 'manifest.json',
        '带 Add-on 时需要 world_behavior_packs.json': 'world_behavior_packs.json',
        '带 Add-on 时需要 world_resource_packs.json': 'world_resource_packs.json',
        '包里有一个 .jar': '.jar 文件',
        '包里有一个 .zip': '.zip 文件',
        '顶层只有一个 .zip': '顶层的 .zip' };
      problems.push({ cls: 'is-bad', k: '必备文件',
        d: '缺少 ' + missing.map(function (c) { return named[c.label] || c.label; }).join('、') +
          '。当前缺少特定文件，无法自动修复，需要自行修改' });
    }
    if (a.spec.wrapTop && !topOk) {
      problems.push({ cls: 'is-bad', k: '顶层文件夹', path: top,
        why: issuesOfPath(top, true).join('；'), fix: sanitizeSeg(top) });
    }

    if (state.renameApplied && renamed.length) {
      problems.push({ cls: 'is-ok', k: '文件名', d: renamed.length + ' 处原名已替换为合规名' });
    } else {
      var nameRows = rows.filter(function (r) { return !r.junk && (r.innerIssues.length || r.changed); });
      nameRows.slice(0, 8).forEach(function (r) {
        var why = issuesOfPath(r.original, r.isDir);
        if (!why.length) why = issuesOfPath(r.origInner, r.isDir);
        problems.push({ cls: r.innerIssues.length ? 'is-bad' : 'is-warn', k: '文件名',
          path: r.original, why: why.join('；'),
          fix: (a.spec.wrapTop ? (topOk ? top : sanitizeSeg(top)) + '/' : '') + r.inner });
      });
      if (nameRows.length > 8) {
        problems.push({ cls: 'is-warn', k: '文件名', d: '还有 ' + (nameRows.length - 8) + ' 处，见下方路径表' });
      }
    }
    if (junk.length) {
      problems.push({ cls: 'is-ok', k: '系统文件', d: junk.length + ' 个（__MACOSX / .DS_Store 等），生成时会去掉' });
    }
    if (!files.length) problems.push({ cls: 'is-bad', k: '内容', d: '压缩包里没有文件' });
    paintProblems(problems);

    el.summary.innerHTML =
      stat(a.spec.name, '资源类型', state.autoType ? '自动识别' : '手动选择') +
      stat(files.length, '个文件', '含目录共 ' + rows.length + ' 项') +
      stat(sizeText(state.file.size), sizeUnit(state.file.size), '包体大小') +
      stat((badNames.length + renamed.length) || '0', '处名字要改', badNames.length ? '还有 ' + badNames.length + ' 处没改好' : (renamed.length ? '已自动给出建议名' : '名字都合规')) +
      stat(a.structureOk ? '通过' : (fixableStructure ? '可修' : '待修'), '包体结构',
        a.structureOk ? '符合这个类型' : (fixableStructure ? '生成时自动收进一个顶层文件夹' : a.structureProblem)) +
      (a.checks.length ? stat(a.checksOk ? '通过' : '待修', '必备文件', a.checksOk ? '该有的都有' : '有缺失项') : '') +
      stat(junk.length, '个系统垃圾文件', el.dropJunk.checked && junk.length ? '生成时会去掉' : '来自 macOS / Windows');

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

    /* 行太多就默认收起来，让按钮负责展开 */
    if (state.tableCollapsed === null || state.tableCollapsed === undefined) {
      state.tableCollapsed = rows.length > 40;
    }
    el.tableWrap.hidden = state.tableCollapsed;
    el.toggleTable.textContent = state.tableCollapsed ? '展开路径（' + rows.length + ' 行）' : '收起路径';
    el.toggleTable.setAttribute('aria-expanded', state.tableCollapsed ? 'false' : 'true');
    el.toggleTable.hidden = rows.length === 0;

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
    var fixableStructure2 = !!a.spec.wrapTop &&
      (!a.structureOk) &&
      (/^根目录直接有/.test(a.structureProblem) || /^顶层有 \d+ 个文件夹/.test(a.structureProblem));
    if (!a.structureOk && !fixableStructure2) why.push('包体结构待修：' + a.structureProblem);
    if (a.checks.length && !a.checksOk) why.push('必备文件缺失，无法自动修复，需要自行修改');
    if (!files.length) why.push('没有文件');
    if (a.archive === '7z' && state.file && state.file.size > SEVEN_ZIP_MAX) {
      why.push('7z 超过 120 MB，请用 7-Zip 手动处理');
    }

    el.build.disabled = why.length > 0;
    el.result.textContent = why.length ? '还不能生成：' + why.join('；') + '。' : '';
    el.result.classList.toggle('is-warn', why.length > 0);
  }

  function paintProblems(list) {
    if (!el.problems) return;
    if (!list.length) {
      el.problems.innerHTML = '<p class="pack-problem is-ok"><b>没有发现问题</b><span>结构和命名都符合这个资源类型</span></p>';
      return;
    }
    el.problems.innerHTML = list.map(function (item) {
      var body;
      if (item.path) {
        body = '<span class="pack-problem__body">' +
          '<code class="pack-problem__path">' + esc(item.path) + '</code>' +
          '<em class="pack-problem__why">' + esc(item.why) + '</em>' +
          '<span class="pack-problem__fix">建议更名为 <code>' + esc(item.fix) + '</code></span>' +
          '</span>';
      } else {
        body = '<span>' + esc(item.d) + '</span>';
      }
      return '<p class="pack-problem ' + item.cls + '"><b>' + esc(item.k) + '</b>' + body + '</p>';
    }).join('');
  }

  function renderVerdict(v) {
    if (!el.verdict) return;

    /* 缺文件等硬问题：不合规，且说明无法自动修复 */
    if (v.hard.length) {
      el.verdict.className = 'pack-verdict is-bad';
      el.verdict.innerHTML = '<b>✗ 不合规</b><span>还差：' + v.hard.join(' · ') + '</span>';
      return;
    }

    var bits = [];
    if (v.fixable) {
      bits.push('结构会自动改好：' + v.structureProblem + '，生成时收进一个顶层文件夹');
    }
    if (v.pendingRename) {
      bits.push(v.renamed + ' 处原名要改名，点「一键更名为建议名」');
    } else if (v.renamed) {
      bits.push('原名 ' + v.renamed + ' 处已按建议名改好');
    }

    /* 原始包仍有问题：一律写不合规，并说明能自动改的部分 */
    if (bits.length) {
      el.verdict.className = 'pack-verdict is-bad';
      el.verdict.innerHTML = '<b>✗ 不合规</b><span>' + bits.join('；') +
        '；点「生成合规压缩包」得到合规版本</span>';
      return;
    }

    el.verdict.className = 'pack-verdict is-ok';
    el.verdict.innerHTML = '<b>✓ 合规</b><span>结构和名字都过，可以直接投稿</span>';
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
    if (a.archive === '7z') { build7z(rows, topValue(), a.spec.wrapTop); return; }
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

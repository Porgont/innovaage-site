/* ============================================================
   格式转换工具
   全部在浏览器本地跑，文件不上传服务器。

   能做什么：
     · 音频提取：浏览器能解码的音视频 → 16 位 PCM 的 WAV
     · JSON ⇄ CSV
     · 文本 ⇄ Base64
     · Markdown ⇄ HTML（自托管 marked + turndown）
     · 图片格式互转：PNG / JPG / WebP / BMP（BMP 为自写编码器）
     · 字幕 SRT ⇄ VTT
     · 进制转换：10 ⇄ 16 ⇄ 2
   不能做什么：
     · 输出 MP3 —— 浏览器自带的是 MP3 解码器，没有编码器。
     · PDF → Word —— 客户端没有可用的解析与排版引擎。
   ============================================================ */
(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function fmtBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var ms = Math.floor((sec - Math.floor(sec)) * 10);
    return (m > 0 ? m + ':' + (s < 10 ? '0' + s : s) : s + '') + '.' + ms + ' 秒';
  }

  function AudioCtx() { return window.AudioContext || window.webkitAudioContext; }

  /* ---------- 音频解码与重采样 ---------- */

  /* 解码成 AudioBuffer。decodeAudioData 会把传入的 ArrayBuffer 转移走，所以不要复用。 */
  async function decodeAudio(file) {
    var Ctx = AudioCtx();
    if (!Ctx) throw new Error('这个浏览器没有 Web Audio，解码不了音频');
    var ctx = new Ctx();
    try {
      var raw = await file.arrayBuffer();
      return await ctx.decodeAudioData(raw);
    } finally {
      if (ctx.close) ctx.close();
    }
  }

  /* 按目标采样率 / 声道重新渲染。等于原始值就原样返回，避免多做一次无损拷贝。 */
  async function conformBuffer(buffer, rate, channels) {
    var sr = rate > 0 ? rate : buffer.sampleRate;
    var ch = channels > 0 ? channels : buffer.numberOfChannels;
    if (sr === buffer.sampleRate && ch === buffer.numberOfChannels) return buffer;

    var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) return buffer;

    var length = Math.max(1, Math.ceil(buffer.duration * sr));
    var off = new Offline(ch, length, sr);
    var src = off.createBufferSource();
    src.buffer = buffer;
    src.connect(off.destination);
    src.start();
    return await off.startRendering();
  }

  /* 16 位 PCM 的 WAV。头 44 字节，后面跟交错采样。 */
  function encodeWav(buffer) {
    var numCh = buffer.numberOfChannels;
    var len = buffer.length;
    var bytesPerSample = 2;
    var blockAlign = numCh * bytesPerSample;
    var dataSize = len * blockAlign;
    var ab = new ArrayBuffer(44 + dataSize);
    var view = new DataView(ab);

    function str(offset, s) {
      for (var i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    }

    str(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    view.setUint32(16, 16, true);                                  // fmt 块长度
    view.setUint16(20, 1, true);                                   // PCM
    view.setUint16(22, numCh, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * blockAlign, true);      // 每秒字节数
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);                                  // 位深
    str(36, 'data');
    view.setUint32(40, dataSize, true);

    var chans = [];
    for (var c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));

    var off = 44;
    for (var i2 = 0; i2 < len; i2++) {
      for (var c2 = 0; c2 < numCh; c2++) {
        var s = chans[c2][i2];
        if (s > 1) s = 1; else if (s < -1) s = -1;
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }

    return new Blob([ab], { type: 'audio/wav' });
  }

  /* MP3 能用的采样率（MPEG-1 / 2 / 2.5） */
  var MP3_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

  function nearestMp3Rate(rate) {
    if (MP3_RATES.indexOf(rate) >= 0) return rate;
    var best = MP3_RATES[0];
    var bestDiff = Math.abs(rate - best);
    for (var i = 1; i < MP3_RATES.length; i++) {
      var d = Math.abs(rate - MP3_RATES[i]);
      if (d < bestDiff) { best = MP3_RATES[i]; bestDiff = d; }
    }
    return best;
  }

  function toInt16(f32) {
    var out = new Int16Array(f32.length);
    for (var i = 0; i < f32.length; i++) {
      var s = f32[i];
      if (s > 1) s = 1; else if (s < -1) s = -1;
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  /* AudioBuffer → MP3。lamejs 是自托管在 assets/vendor/lamejs/ 的，
     浏览器自己没有 MP3 编码器（MediaRecorder 与 WebCodecs 都不支持）。 */
  async function encodeMp3(buffer, kbps) {
    if (typeof lamejs === 'undefined' || !lamejs.Mp3Encoder) {
      throw new Error('MP3 编码库没加载出来，刷新页面再试');
    }

    var ch = buffer.numberOfChannels === 1 ? 1 : 2;
    var enc = new lamejs.Mp3Encoder(ch, buffer.sampleRate, kbps || 192);
    var left = toInt16(buffer.getChannelData(0));
    var right = ch === 2 ? toInt16(buffer.getChannelData(1)) : null;

    var BLOCK = 1152;
    var parts = [];
    var n = buffer.length;
    var sinceYield = 0;

    for (var i = 0; i < n; i += BLOCK) {
      var end = Math.min(i + BLOCK, n);
      var l = left.subarray(i, end);
      var buf = right
        ? enc.encodeBuffer(l, right.subarray(i, end))
        : enc.encodeBuffer(l);
      if (buf.length) parts.push(buf);

      // 长文件别把主线程卡死
      if (++sinceYield >= 400) {
        sinceYield = 0;
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    }

    var tail = enc.flush();
    if (tail.length) parts.push(tail);

    return new Blob(parts, { type: 'audio/mpeg' });
  }

  /* ---------- 音频界面 ---------- */

  var audio = {
    file: null, buffer: null,
    rate: 0, channels: 0,
    format: 'mp3', bitrate: 192,
    url: null
  };

  function audioNote(msg, warn) {
    var el = $('#audio-note');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('note--warn', !!warn);
  }

  function renderAudioFile(info) {
    var box = $('#audio-file');
    if (!box) return;
    if (!audio.file) { box.hidden = true; box.innerHTML = ''; return; }

    box.hidden = false;
    box.innerHTML =
      '<div class="file-item">' +
        '<b>' + escapeHtml(audio.file.name) + '</b>' +
        '<span style="color:var(--text-mute)">' + escapeHtml(info) + '</span>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* 按当前设置算输出参数：MP3 要先把采样率夹到合法的档位 */
  function outputPlan() {
    var buf = audio.buffer;
    if (!buf) return null;

    var isMp3 = audio.format === 'mp3';
    var rate = audio.rate > 0 ? audio.rate : buf.sampleRate;
    if (isMp3) rate = audio.rate > 0 ? nearestMp3Rate(audio.rate) : nearestMp3Rate(buf.sampleRate);

    var ch = audio.channels > 0 ? audio.channels : buf.numberOfChannels;
    if (isMp3) ch = Math.min(2, ch);

    var seconds = buf.duration;
    var bytes = isMp3
      ? Math.round(seconds * (audio.bitrate * 1000 / 8))
      : Math.round(seconds * ch * rate * 2);

    return { isMp3: isMp3, rate: rate, channels: ch, seconds: seconds, bytes: bytes };
  }

  function describePlan(prefix) {
    var plan = outputPlan();
    if (!plan) return;
    var fmt = plan.isMp3 ? ('MP3 ' + audio.bitrate + ' kbps') : 'WAV（16 位 PCM）';
    audioNote(prefix + fmt + '，' + plan.rate + ' Hz，' + plan.channels + ' 声道，预计约 ' +
      fmtBytes(plan.bytes) + '。', false);
  }

  async function setAudioFile(file) {
    if (!file) return;
    audio.file = file;
    audio.buffer = null;
    if (audio.url) { URL.revokeObjectURL(audio.url); audio.url = null; }

    var runBtn = $('#audio-run');
    if (runBtn) runBtn.disabled = true;

    renderAudioFile(fmtBytes(file.size) + ' · 读取中…');
    audioNote('正在解码，文件大的话要等一会儿。', false);

    try {
      var buf = await decodeAudio(file);
      audio.buffer = buf;
      renderAudioFile(fmtBytes(file.size) + ' · 时长 ' + fmtTime(buf.duration) +
        ' · ' + buf.sampleRate + ' Hz · ' + buf.numberOfChannels + ' 声道');
      if (runBtn) runBtn.disabled = false;
      describePlan('可以提取了：');
    } catch (e) {
      audioNote('这个文件浏览器解码不了：' + (e && e.message ? e.message : '未知原因') +
        '。试一下别的格式，或者先在别的工具里转一次。', true);
      renderAudioFile(fmtBytes(file.size) + ' · 无法解码');
    }
  }

  async function runAudio() {
    if (!audio.buffer) return;
    var plan = outputPlan();
    var btn = $('#audio-run');
    var old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = plan.isMp3 ? '编码 MP3…' : '转换中…'; }

    try {
      var out = await conformBuffer(audio.buffer, plan.rate, plan.channels);
      var blob = plan.isMp3 ? await encodeMp3(out, audio.bitrate) : encodeWav(out);
      var ext = plan.isMp3 ? '.mp3' : '.wav';

      if (audio.url) URL.revokeObjectURL(audio.url);
      audio.url = URL.createObjectURL(blob);

      var base = audio.file.name.replace(/.[^.]+$/, '');
      var a = document.createElement('a');
      a.className = 'btn btn--sm';
      a.href = audio.url;
      a.download = base + ext;
      a.textContent = '下载 ' + ext.slice(1).toUpperCase() + '（' + fmtBytes(blob.size) + '）';

      var bar = $('#audio-result');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'audio-result';
        bar.className = 'result-bar';
        $('#audio-run').parentNode.insertAdjacentElement('afterend', bar);
      }
      bar.innerHTML = '';
      bar.appendChild(a);
      var tip = document.createElement('span');
      tip.textContent = out.sampleRate + ' Hz · ' + out.numberOfChannels + ' 声道 · 时长 ' + fmtTime(out.duration);
      bar.appendChild(tip);

      var src = audio.file.size;
      audioNote('转换完成' +
        '\n源文件 ' + fmtBytes(src) +
        '\n输出 ' + fmtBytes(blob.size) +
        (src > 0 ? '（原体积的 ' + Math.round(blob.size / src * 100) + '%）' : ''), false);
    } catch (e) {
      audioNote('转换失败：' + (e && e.message ? e.message : '未知原因'), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || '提取音频'; }
    }
  }

  function initAudio() {
    var input = $('#audio-input');
    var zone = $('#audio-dropzone');
    if (!input || !zone) return;

    input.addEventListener('change', function () {
      if (input.files && input.files[0]) setAudioFile(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) setAudioFile(f);
    });

    function pick(attr, key, cast) {
      $$('[' + attr + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          $$('[' + attr + ']').forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          audio[key] = cast(b.getAttribute(attr));
          if (audio.buffer) describePlan('当前设置：');
        });
      });
    }

    pick('data-rate', 'rate', function (v) { return Number(v) || 0; });
    pick('data-channels', 'channels', function (v) { return Number(v) || 0; });
    pick('data-bitrate', 'bitrate', function (v) { return Number(v) || 192; });

    // 输出格式：切到 WAV 时把码率那一栏收起来
    $$('[data-format]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-format]').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        audio.format = b.getAttribute('data-format') === 'wav' ? 'wav' : 'mp3';

        var field = $('#bitrate-field');
        if (field) field.hidden = audio.format !== 'mp3';

        if (audio.buffer) describePlan('当前设置：');
      });
    });

    var bitrateField = $('#bitrate-field');
    if (bitrateField) bitrateField.hidden = audio.format !== 'mp3';

    var run = $('#audio-run');
    if (run) run.addEventListener('click', runAudio);

    var clear = $('#audio-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        audio.file = null;
        audio.buffer = null;
        if (audio.url) { URL.revokeObjectURL(audio.url); audio.url = null; }
        if (input) input.value = '';
        renderAudioFile('');
        audioNote('已经清空了。', false);
        if (run) run.disabled = true;
        var bar = $('#audio-result');
        if (bar) bar.innerHTML = '';
      });
    }
  }

  /* ---------- JSON ⇄ CSV ---------- */

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function jsonToCsv(text) {
    var data = JSON.parse(text);
    if (!Array.isArray(data)) {
      if (data && typeof data === 'object') data = [data];
      else throw new Error('JSON 得是对象数组，比如 [{"a":1}]');
    }
    if (!data.length) throw new Error('数组是空的，没有可以转的行');

    var keys = [];
    data.forEach(function (row) {
      if (!row || typeof row !== 'object') throw new Error('数组里每一项都得是对象');
      Object.keys(row).forEach(function (k) {
        if (keys.indexOf(k) < 0) keys.push(k);
      });
    });

    var lines = [keys.map(csvCell).join(',')];
    data.forEach(function (row) {
      lines.push(keys.map(function (k) {
        var v = row[k];
        if (v && typeof v === 'object') v = JSON.stringify(v);
        return csvCell(v);
      }).join(','));
    });

    return lines.join('\n');
  }

  /* 支持双引号包裹、字段内逗号与换行、"" 转义 */
  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ',') { row.push(cell); cell = ''; continue; }
      if (ch === '\r') continue;
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += ch;
    }

    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }

    return rows.filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ''; });
    });
  }

  function csvToJson(text) {
    var rows = parseCsv(text);
    if (rows.length < 2) throw new Error('至少要有表头行和一行数据');

    var keys = rows[0].map(function (k) { return String(k).trim(); });
    var out = rows.slice(1).map(function (r) {
      var o = {};
      keys.forEach(function (k, i) {
        if (!k) return;
        o[k] = r[i] === undefined ? '' : r[i];
      });
      return o;
    });

    return JSON.stringify(out, null, 2);
  }

  function initData() {
    var inEl = $('#data-in');
    var outEl = $('#data-out');
    if (!inEl || !outEl) return;

    var note = $('#data-note');
    function say(msg, warn) {
      if (!note) return;
      note.textContent = msg;
      note.classList.toggle('note--warn', !!warn);
    }

    var j2c = $('#data-json2csv');
    if (j2c) {
      j2c.addEventListener('click', function () {
        try { outEl.value = jsonToCsv(inEl.value); say('已转成 CSV。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var c2j = $('#data-csv2json');
    if (c2j) {
      c2j.addEventListener('click', function () {
        try { outEl.value = csvToJson(inEl.value); say('已转成 JSON。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var copy = $('#data-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        if (!outEl.value) return;
        outEl.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(outEl.value).then(function () {
            say('已复制到剪贴板。', false);
          }, function () {
            say('复制失败，手动选中再复制。', true);
          });
        } else {
          say('这个浏览器不支持自动复制，手动选中再复制。', true);
        }
      });
    }
  }

  /* ---------- 文本 Base64 ---------- */

  function b64Encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64Decode(text) {
    var clean = String(text).replace(/\s+/g, '');
    var bin = atob(clean);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function initB64() {
    var inEl = $('#b64-in');
    var outEl = $('#b64-out');
    if (!inEl || !outEl) return;

    var enc = $('#b64-encode');
    if (enc) {
      enc.addEventListener('click', function () {
        try { outEl.value = b64Encode(inEl.value); }
        catch (e) { outEl.value = ''; }
      });
    }

    var dec = $('#b64-decode');
    if (dec) {
      dec.addEventListener('click', function () {
        try { inEl.value = b64Decode(outEl.value); }
        catch (e) { inEl.value = '不是合法的 Base64：' + e.message; }
      });
    }

    var copy = $('#b64-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        if (!outEl.value) return;
        outEl.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(outEl.value);
        }
      });
    }
  }

  /* ---------- Markdown ⇄ HTML ---------- */

  function mdToHtml(text) {
    if (typeof marked === 'undefined') throw new Error('Markdown 解析库没加载出来，刷新页面再试');
    var parse = marked.parse || marked;
    return parse(text);
  }

  function htmlToMd(text) {
    if (typeof TurndownService === 'undefined') throw new Error('HTML 转 Markdown 的库没加载出来，刷新页面再试');
    var td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    return td.turndown(text);
  }

  function initMd() {
    var inEl = $('#md-in');
    var outEl = $('#md-out');
    if (!inEl || !outEl) return;

    var note = $('#md-note');
    function say(msg, warn) {
      if (!note) return;
      note.textContent = msg;
      note.classList.toggle('note--warn', !!warn);
    }

    var toHtml = $('#md-to-html');
    if (toHtml) {
      toHtml.addEventListener('click', function () {
        try { outEl.value = mdToHtml(inEl.value); say('已转成 HTML。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var toMd = $('#md-to-markdown');
    if (toMd) {
      toMd.addEventListener('click', function () {
        try { outEl.value = htmlToMd(inEl.value); say('已转成 Markdown。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var copy = $('#md-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        if (!outEl.value) return;
        outEl.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(outEl.value).then(function () {
            say('已复制到剪贴板。', false);
          }, function () {
            say('复制失败，手动选中再复制。', true);
          });
        } else {
          say('这个浏览器不支持自动复制，手动选中再复制。', true);
        }
      });
    }
  }

  /* ---------- 图片格式互转 ---------- */

  var imgconv = {
    file: null,
    outType: 'image/png',
    quality: 0.92,
    whiteBg: true,
    url: null
  };

  var IMG_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/bmp': 'bmp'
  };

  /* 把 canvas 编码成 24 位 BMP（无压缩，自底向上，BGR，每行 4 字节对齐）。
     浏览器不支持 canvas 直接导出 BMP，所以自己写编码器。 */
  function encodeBmp(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(0, 0, w, h).data;
    var rowSize = Math.ceil((w * 3) / 4) * 4;   // 每行补到 4 字节
    var pixelBytes = rowSize * h;
    var headerSize = 14 + 40;
    var fileSize = headerSize + pixelBytes;
    var buf = new ArrayBuffer(fileSize);
    var v = new DataView(buf);

    // BITMAPFILEHEADER
    v.setUint8(0, 0x42); v.setUint8(1, 0x4D);            // "BM"
    v.setUint32(2, fileSize, true);
    v.setUint32(6, 0, true);                              // 保留
    v.setUint32(10, headerSize, true);                    // 像素数据偏移

    // BITMAPINFOHEADER
    v.setUint32(14, 40, true);                            // 头部大小
    v.setInt32(18, w, true);
    v.setInt32(22, h, true);
    v.setUint16(26, 1, true);                             // 颜色平面
    v.setUint16(28, 24, true);                            // 位深
    v.setUint32(30, 0, true);                             // 无压缩
    v.setUint32(34, pixelBytes, true);                    // 图像数据大小
    v.setInt32(38, 2835, true);                           // 水平分辨率 72 DPI
    v.setInt32(42, 2835, true);                           // 垂直分辨率 72 DPI
    v.setUint32(46, 0, true);
    v.setUint32(50, 0, true);

    // 像素：自底向上，BGR
    var off = headerSize;
    for (var y = h - 1; y >= 0; y--) {
      var rowStart = y * w * 4;
      var rowOff = off;
      for (var x = 0; x < w; x++) {
        var i = rowStart + x * 4;
        v.setUint8(rowOff, data[i + 2]);      // B
        v.setUint8(rowOff + 1, data[i + 1]);  // G
        v.setUint8(rowOff + 2, data[i]);      // R
        rowOff += 3;
      }
      off += rowSize;
    }

    return new Blob([buf], { type: 'image/bmp' });
  }

  function imgconvToBlob(canvas, type, quality) {
    if (type === 'image/bmp') return encodeBmp(canvas);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error('导出失败，图片可能太大'));
      }, type, type === 'image/png' ? undefined : quality);
    });
  }

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('这个文件不是浏览器能识别的图片')); };
      img.src = url;
    });
  }

  function setImgconvFile(file) {
    imgconv.file = file || null;
    if (imgconv.url) { URL.revokeObjectURL(imgconv.url); imgconv.url = null; }
    var box = $('#imgconv-file');
    var run = $('#imgconv-run');
    var clear = $('#imgconv-clear');
    if (!file) {
      if (box) { box.hidden = true; box.innerHTML = ''; }
      if (run) run.disabled = true;
      if (clear) clear.hidden = true;
      return;
    }
    if (box) {
      box.hidden = false;
      box.innerHTML = '<div class="file-item"><b>' + escapeHtml(file.name) + '</b>' +
        '<span style="color:var(--text-mute)">' + fmtBytes(file.size) + '</span></div>';
    }
    if (run) run.disabled = false;
    if (clear) clear.hidden = false;
  }

  function imgconvNote(msg, warn) {
    var el = $('#imgconv-note');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('note--warn', !!warn);
  }

  async function runImgConv() {
    var file = imgconv.file;
    if (!file) return;
    var btn = $('#imgconv-run');
    var old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '转换中…'; }

    try {
      var img = await loadImageFromFile(file);
      var w = img.naturalWidth;
      var h = img.naturalHeight;

      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');

      // 需要白底：JPG / BMP 没有透明通道，不垫会变黑
      var needWhite = imgconv.whiteBg ||
        (imgconv.outType === 'image/jpeg' || imgconv.outType === 'image/bmp');
      if (needWhite) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      var blob = await imgconvToBlob(canvas, imgconv.outType, imgconv.quality);
      if (imgconv.url) URL.revokeObjectURL(imgconv.url);
      imgconv.url = URL.createObjectURL(blob);

      var base = file.name.replace(/.[^.]+$/, '');
      var outName = base + '.' + IMG_EXT[imgconv.outType];
      var a = document.createElement('a');
      a.className = 'btn btn--sm';
      a.href = imgconv.url;
      a.download = outName;
      a.textContent = '下载 ' + outName + '（' + fmtBytes(blob.size) + '）';

      var bar = $('#imgconv-result');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'imgconv-result';
        bar.className = 'result-bar';
        var runEl = $('#imgconv-run');
        if (runEl) runEl.parentNode.insertAdjacentElement('afterend', bar);
      }
      bar.innerHTML = '';
      bar.appendChild(a);
      var tip = document.createElement('span');
      tip.textContent = w + ' × ' + h + ' 像素' +
        (needWhite ? ' · 已垫白底' : ' · 透明区域保留');
      bar.appendChild(tip);

      imgconvNote('转换完成。', false);
    } catch (e) {
      imgconvNote('转换失败：' + (e && e.message ? e.message : '未知原因'), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || '转换格式'; }
    }
  }

  function initImgConv() {
    var input = $('#imgconv-input');
    var zone = $('#imgconv-dropzone');
    if (!input || !zone) return;

    input.addEventListener('change', function () {
      if (input.files && input.files[0]) setImgconvFile(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) setImgconvFile(f);
    });

    $$('[data-img-out]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-img-out]').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        imgconv.outType = b.getAttribute('data-img-out');
        var qf = $('#imgconv-quality-field');
        if (qf) {
          var lossless = imgconv.outType === 'image/png' || imgconv.outType === 'image/bmp';
          qf.style.opacity = lossless ? '.45' : '1';
          qf.style.pointerEvents = lossless ? 'none' : 'auto';
        }
      });
    });

    var q = $('#imgconv-quality');
    if (q) {
      q.addEventListener('input', function () {
        imgconv.quality = Number(q.value) / 100;
        var v = $('#imgconv-quality-value');
        if (v) v.textContent = q.value;
      });
    }

    var wb = $('#imgconv-whitebg');
    if (wb) {
      wb.addEventListener('change', function () {
        imgconv.whiteBg = wb.checked;
      });
    }

    var run = $('#imgconv-run');
    if (run) run.addEventListener('click', runImgConv);

    var clear = $('#imgconv-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        setImgconvFile(null);
        if (input) input.value = '';
        var bar = $('#imgconv-result');
        if (bar) bar.innerHTML = '';
        imgconvNote('已经清空了。', false);
      });
    }
  }

  /* ---------- 字幕 SRT ⇄ VTT ---------- */

  /* 时间戳行：hh:mm:ss,mmm / hh:mm:ss.mmm / mm:ss.mmm 都认 */
  var TS_RE = /(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?[.,](\d{1,3})/g;

  function tsToSrt(m) {
    var h = m[3] ? Number(m[1]) : 0;
    var min = m[3] ? Number(m[2]) : Number(m[1]);
    var sec = m[3] ? Number(m[3]) : Number(m[2]);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return p2(h) + ':' + p2(min) + ':' + p2(sec) + ',' + (m[4] + '00').slice(0, 3);
  }

  function tsToVtt(m) {
    var h = m[3] ? Number(m[1]) : 0;
    var min = m[3] ? Number(m[2]) : Number(m[1]);
    var sec = m[3] ? Number(m[3]) : Number(m[2]);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return p2(h) + ':' + p2(min) + ':' + p2(sec) + '.' + (m[4] + '00').slice(0, 3);
  }

  function srtToVtt(text) {
    var body = String(text).replace(/^\uFEFF/, '').replace(/,/g, '.');
    body = body.replace(TS_RE, function (mm, a, b, c, d) {
      return tsToVtt([mm, a, b, c, d]);
    });
    // SRT 的序号行在 VTT 里是合法的 cue 标识，保留
    return 'WEBVTT\n\n' + body.replace(/^\s+/, '');
  }

  function vttToSrt(text) {
    var body = String(text).replace(/^\uFEFF/, '');
    // 去掉 WEBVTT 头块（可能带说明注释，遇到第一个时间戳行之前的内容都丢弃）
    var m = body.match(/\d{1,2}:\d{1,2}(?::\d{1,2})?[.,]\d{1,3}\s*-->/);
    if (!m) throw new Error('没找到时间戳行，不是合法的 VTT 内容');
    body = body.slice(m.index);
    body = body.replace(/\./g, ',');
    body = body.replace(TS_RE, function (mm, a, b, c, d) {
      return tsToSrt([mm, a, b, c, d]);
    });
    return body;
  }

  function initSub() {
    var inEl = $('#sub-in');
    var outEl = $('#sub-out');
    if (!inEl || !outEl) return;

    var note = $('#sub-note');
    function say(msg, warn) {
      if (!note) return;
      note.textContent = msg;
      note.classList.toggle('note--warn', !!warn);
    }

    var s2v = $('#sub-srt2vtt');
    if (s2v) {
      s2v.addEventListener('click', function () {
        try { outEl.value = srtToVtt(inEl.value); say('已转成 VTT。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var v2s = $('#sub-vtt2srt');
    if (v2s) {
      v2s.addEventListener('click', function () {
        try { outEl.value = vttToSrt(inEl.value); say('已转成 SRT。', false); }
        catch (e) { outEl.value = ''; say('转换失败：' + e.message, true); }
      });
    }

    var copy = $('#sub-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        if (!outEl.value) return;
        outEl.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(outEl.value).then(function () {
            say('已复制到剪贴板。', false);
          }, function () {
            say('复制失败，手动选中再复制。', true);
          });
        } else {
          say('这个浏览器不支持自动复制，手动选中再复制。', true);
        }
      });
    }
  }

  /* ---------- 进制转换 ---------- */

  function radixValid(text, base) {
    if (!text) return null;
    var t = String(text).trim();
    if (base === 16 && /^0x/i.test(t)) t = t.slice(2);
    if (base === 16) {
      if (!/^[0-9a-fA-F]+$/.test(t)) throw new Error('十六进制只能输入 0-9、A-F（可带 0x 前缀）');
    } else if (!/^\d+$/.test(t)) {
      throw new Error(base === 2 ? '二进制只能输入 0 和 1' : '十进制只能输入数字');
    }
    var n = parseInt(t, base);
    if (!isFinite(n) || n < 0 || n > 9007199254740991) throw new Error('超出支持范围（0 ~ 2^53-1）');
    return n;
  }

  function radixFill(src) {
    try {
      var n = radixValid(src.value, Number(src.getAttribute('data-base')));
      if (n === null) return;
      var dec = $('#radix-dec');
      var hex = $('#radix-hex');
      var bin = $('#radix-bin');
      if (dec && dec !== src) dec.value = String(n);
      if (hex && hex !== src) hex.value = '0x' + n.toString(16).toUpperCase();
      if (bin && bin !== src) bin.value = n.toString(2);
      var note = $('#radix-note');
      if (note) { note.textContent = '已换算：' + n + '（十进制）'; note.classList.remove('note--warn'); }
    } catch (e) {
      var note2 = $('#radix-note');
      if (note2) { note2.textContent = e.message; note2.classList.add('note--warn'); }
    }
  }

  function initRadix() {
    var els = [$('#radix-dec'), $('#radix-hex'), $('#radix-bin')].filter(Boolean);
    if (!els.length) return;
    els.forEach(function (el) {
      el.addEventListener('input', function () { radixFill(el); });
    });
  }

  /* ---------- 启动 ---------- */

  function boot() {
    if (!document.body || document.body.getAttribute('data-page') !== 'tools') {
      // 工具页仍然要能跑，这里只判断节点在不在，不靠 data-page
    }
    initAudio();
    initData();
    initB64();
    initMd();
    initImgConv();
    initSub();
    initRadix();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 给自检用的入口 */
  window.IA_CONVERT = {
    encodeWav: encodeWav,
    encodeMp3: encodeMp3,
    nearestMp3Rate: nearestMp3Rate,
    outputPlan: outputPlan,
    decodeAudio: decodeAudio,
    conformBuffer: conformBuffer,
    jsonToCsv: jsonToCsv,
    csvToJson: csvToJson,
    parseCsv: parseCsv,
    b64Encode: b64Encode,
    b64Decode: b64Decode,
    mdToHtml: mdToHtml,
    htmlToMd: htmlToMd,
    encodeBmp: encodeBmp,
    srtToVtt: srtToVtt,
    vttToSrt: vttToSrt,
    radixValid: radixValid,
    state: audio,
    imgconv: imgconv
  };
})();

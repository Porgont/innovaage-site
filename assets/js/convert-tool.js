/* ============================================================
   格式转换工具
   全部在浏览器本地跑，文件不上传服务器。

   能做什么：
     · 音频提取：浏览器能解码的音视频 → 16 位 PCM 的 WAV
     · JSON ⇄ CSV
     · 文本 ⇄ Base64
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

  /* ---------- 音频界面 ---------- */

  var audio = { file: null, buffer: null, rate: 0, channels: 0, url: null };

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
      audioNote('可以提取了。输出 16 位 PCM 的 WAV，预计约 ' +
        fmtBytes(buf.duration * (audio.channels > 0 ? audio.channels : buf.numberOfChannels) * buf.sampleRate * 2) + '。', false);
    } catch (e) {
      audioNote('这个文件浏览器解码不了：' + (e && e.message ? e.message : '未知原因') +
        '。试一下别的格式，或者先在别的工具里转一次。', true);
      renderAudioFile(fmtBytes(file.size) + ' · 无法解码');
    }
  }

  async function runAudio() {
    if (!audio.buffer) return;
    var btn = $('#audio-run');
    var old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '转换中…'; }

    try {
      var out = await conformBuffer(audio.buffer, audio.rate, audio.channels);
      var blob = encodeWav(out);

      if (audio.url) URL.revokeObjectURL(audio.url);
      audio.url = URL.createObjectURL(blob);

      var base = audio.file.name.replace(/\.[^.]+$/, '');
      var a = document.createElement('a');
      a.className = 'btn btn--sm';
      a.href = audio.url;
      a.download = base + '.wav';
      a.textContent = '下载 WAV（' + fmtBytes(blob.size) + '）';

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

      audioNote('转换完成。WAV 是无损的，所以比 MP3 大得多，拖到视频工具或其它软件还能再压。', false);
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

    $$('[data-rate]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-rate]').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        audio.rate = Number(b.getAttribute('data-rate')) || 0;
      });
    });

    $$('[data-channels]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-channels]').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        audio.channels = Number(b.getAttribute('data-channels')) || 0;
      });
    });

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

  /* ---------- 启动 ---------- */

  function boot() {
    if (!document.body || document.body.getAttribute('data-page') !== 'tools') {
      // 工具页仍然要能跑，这里只判断节点在不在，不靠 data-page
    }
    initAudio();
    initData();
    initB64();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 给自检用的入口 */
  window.IA_CONVERT = {
    encodeWav: encodeWav,
    decodeAudio: decodeAudio,
    conformBuffer: conformBuffer,
    jsonToCsv: jsonToCsv,
    csvToJson: csvToJson,
    parseCsv: parseCsv,
    b64Encode: b64Encode,
    b64Decode: b64Decode,
    state: audio
  };
})();

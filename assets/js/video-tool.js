/* ============================================================
   创想时代开发组 · 工具箱：视频转投稿规格
   ------------------------------------------------------------
   投稿要求：时长 ≤ 90 秒、编码 H.264、MP4 容器、画面 16:9。

   这个工具分两步：
     1) 诊断：读时长 / 分辨率 / 比例 / 编码（编码靠自托管的 mp4box.js 解析 MP4 容器）
     2) 转换：一边播一边录 —— 画面画到 1280×720 的画布上（加黑边或裁切），
        音频从原视频取轨道，用 MediaRecorder 录成 H.264 / MP4。

   为什么要这么绕：浏览器里没有"直接转码"的 API，
   WebCodecs 虽然能编码，但把编码结果封装成 MP4 需要自己写 muxer；
   MediaRecorder 是唯一能直接吐出 MP4 容器的现成接口，代价是只能实时录。
   ============================================================ */
(function () {
  'use strict';

  var OUT_W = 1280;
  var OUT_H = 720;
  var TARGET_RATIO = OUT_W / OUT_H;      // 16:9
  var RATIO_TOLERANCE = 0.01;            // 比例的允许误差

  // 录制码率：从高往低试。
  // 实测 1280×720 @6Mbps 在部分环境（含无头浏览器）会产出无法播放的文件，
  // 所以不能写死一个高码率，必须逐个降级重试。
  var BITRATE_TIERS = [4000000, 2500000, 1500000];

  // 依次尝试，用第一个真的能用的。
  // 注意：Baseline 3.0（avc1.42E01E）在 1280×720 会因超出 level 上限而失败，
  // 所以必须从 High 档开始试。
  var CODEC_CANDIDATES = [
    'video/mp4;codecs=avc1.640028',   // H.264 High 4.0
    'video/mp4;codecs=avc1.640020',   // H.264 High 3.1
    'video/mp4;codecs=avc1.4d401f',   // H.264 Main 3.1
    'video/mp4'
  ];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fmtTime(sec) {
    if (!isFinite(sec)) return '未知';
    var m = Math.floor(sec / 60);
    var s = sec - m * 60;
    return m + '分' + s.toFixed(1) + '秒';
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /** 把宽高化简成最简比例，例如 1920×1080 → 16:9 */
  function ratioLabel(w, h) {
    if (!w || !h) return '未知';
    var g = gcd(w, h);
    return (w / g) + ':' + (h / g);
  }

  /** 选一个当前浏览器真的支持的 MP4 录制格式 */
  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    for (var i = 0; i < CODEC_CANDIDATES.length; i++) {
      if (MediaRecorder.isTypeSupported(CODEC_CANDIDATES[i])) return CODEC_CANDIDATES[i];
    }
    return '';
  }

  /* ---------- 状态 ---------- */
  var state = {
    file: null,
    fit: 'pad',          // pad = 加黑边，crop = 裁切填满
    maxDur: 90,
    maxMb: 0,
    info: null,          // 诊断结果
    result: null,        // 转换结果
    recording: false
  };

  function setStatus(kind, html) {
    var box = $('#v-status');
    if (!box) return;
    box.hidden = false;
    box.className = 'form-status form-status--' + kind;
    box.innerHTML = html;
  }
  function clearStatus() {
    var box = $('#v-status');
    if (box) { box.hidden = true; box.innerHTML = ''; }
  }
  function setProgress(percent, text) {
    var box = $('#v-progress');
    var fill = $('#v-progress-fill');
    var label = $('#v-progress-text');
    if (!box) return;
    if (percent === null) { box.hidden = true; return; }
    box.hidden = false;
    if (fill) fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    if (label && text) label.textContent = text;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function diagRow(k, v, ok) {
    var cls = ok === true ? ' class="t-ok"' : ok === false ? ' class="t-danger"' : '';
    return '<div><dt>' + escapeHtml(k) + '</dt><dd' + cls + '>' + escapeHtml(v) +
      (ok === true ? ' ✓' : ok === false ? ' ✗' : '') + '</dd></div>';
  }

  /* ---------- 第一步：探测基础信息（时长 / 分辨率）----------
     注意：这个 <video> 必须挂在文档上（隐藏即可）。
     游离在 DOM 之外的 video 元素可能不会真正开始加载，
     表现为 readyState 一直停在 0，最后超时。 */
  function probeBasic(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.setAttribute('playsinline', '');
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
      v.src = url;

      var done = false;
      function finish(err, data) {
        if (done) return;
        done = true;
        try { v.pause(); } catch (e) {}
        v.removeAttribute('src');
        if (v.parentNode) v.parentNode.removeChild(v);
        if (err) { URL.revokeObjectURL(url); reject(err); }
        else resolve({ url: url, data: data });
      }

      /** 把 video 元素的内部状态带出来，便于判断到底卡在哪一步 */
      function describeState() {
        var codes = { 1: '加载中(1)', 2: '已读到元数据(2)', 3: '当前帧可用(3)', 4: '可播放(4)' };
        return 'readyState=' + (codes[v.readyState] || v.readyState) +
          '，networkState=' + v.networkState +
          (v.error ? '，错误码=' + v.error.code + ' ' + (v.error.message || '') : '，无错误对象');
      }

      v.onloadedmetadata = function () {
        finish(null, {
          duration: v.duration,
          width: v.videoWidth,
          height: v.videoHeight,
          hasAudio: (function () {
            try {
              var s = v.captureStream ? v.captureStream() : null;
              if (!s) return null;
              var has = s.getAudioTracks().length > 0;
              s.getTracks().forEach(function (t) { t.stop(); });
              return has;
            } catch (e) { return null; }
          })()
        });
      };
      v.onerror = function () {
        finish(new Error('浏览器打不开这个文件（' + describeState() +
          '）。可能是不支持的视频编码，建议先用别的工具转成 MP4 / H.264 再试'));
      };

      setTimeout(function () {
        finish(new Error('读取视频信息超时（' + describeState() +
          '）。文件可能损坏，或格式不被浏览器支持'));
      }, 20000);

      v.load();
    });
  }

  /* ---------- 第二步：用 mp4box 读编码（只对 MP4 容器有效）---------- */
  function probeCodec(file) {
    return new Promise(function (resolve) {
      if (typeof MP4Box === 'undefined') {
        resolve({ available: false, reason: 'mp4box.js 没加载上' });
        return;
      }
      // 只读文件头，别把整个大文件读进内存
      var HEAD = Math.min(file.size, 4 * 1024 * 1024);
      var blob = file.slice(0, HEAD);
      blob.arrayBuffer().then(function (buf) {
        buf.fileStart = 0;
        var file5 = MP4Box.createFile();
        var out = { available: true, isMp4: false, brands: '', tracks: [], error: null };
        var settled = false;
        function settle() {
          if (settled) return;
          settled = true;
          resolve(out);
        }
        file5.onReady = function (md) {
          out.isMp4 = true;
          out.brands = (md.brands || []).join(',');
          out.tracks = (md.tracks || []).map(function (t) {
            return {
              type: t.type,
              codec: t.codec || '',
              width: t.video ? t.video.width : 0,
              height: t.video ? t.video.height : 0,
              nbSamples: t.nb_samples || 0,
              trackDuration: t.duration && t.timescale ? t.duration / t.timescale : 0
            };
          });
          settle();
        };
        file5.onError = function (e) {
          out.error = String(e);
          settle();
        };
        try {
          file5.appendBuffer(buf);
          file5.flush();
        } catch (e) {
          out.error = e.message;
        }
        // MP4 的 moov 有时在文件尾部，头部读不到就只能等超时
        setTimeout(settle, 2500);
      }).catch(function (e) {
        resolve({ available: true, isMp4: false, tracks: [], error: e.message });
      });
    });
  }

  /** 判断编码字符串是不是 H.264（avc1 / avc3 开头） */
  function isH264(codec) {
    return /^avc[13]/i.test(codec || '');
  }

  /* ---------- 组装诊断结论 ---------- */
  function buildDiagnosis(basic, codecInfo) {
    var d = {
      duration: basic.duration,
      width: basic.width,
      height: basic.height,
      ratio: basic.width && basic.height ? basic.width / basic.height : 0,
      hasAudio: basic.hasAudio,
      codecInfo: codecInfo
    };

    d.durationOk = isFinite(d.duration) && d.duration <= state.maxDur;
    d.ratioOk = Math.abs(d.ratio - TARGET_RATIO) <= RATIO_TOLERANCE;
    d.resolutionOk = basic.width === OUT_W && basic.height === OUT_H;
    d.sizeOk = state.maxMb > 0 ? (state.file.size <= state.maxMb * 1024 * 1024) : true;

    var vTrack = (codecInfo.tracks || []).filter(function (t) { return t.type === 'video'; })[0];
    d.videoCodec = vTrack ? vTrack.codec : '';
    d.containerOk = !!codecInfo.isMp4;
    d.codecOk = d.containerOk ? isH264(d.videoCodec) : null;   // 读不出来就不下结论

    // 要做的改动
    d.needTrim = !d.durationOk;
    d.needFit = !d.ratioOk;
    d.needReencode = true;   // 只要走转换产出，就是重编码
    return d;
  }

  function renderDiagnosis(d) {
    var box = $('#v-diag');
    if (!box) return;
    var html = '';

    html += diagRow('文件', state.file.name + '（' + fmtBytes(state.file.size) + '）');
    html += diagRow('时长', fmtTime(d.duration) + '（上限 ' + state.maxDur + ' 秒）', d.durationOk);
    html += diagRow('分辨率', d.width + ' × ' + d.height, d.resolutionOk);
    html += diagRow('画面比例', ratioLabel(d.width, d.height) + (d.ratioOk ? '（16:9 ✓）' : '（应为 16:9）'), d.ratioOk);

    if (d.codecInfo.available) {
      if (d.containerOk) {
        html += diagRow('容器 / 编码', 'MP4 / ' + (d.videoCodec || '未知'), d.codecOk === true);
        if (d.codecInfo.brands) html += diagRow('容器品牌', d.codecInfo.brands);
      } else {
        html += diagRow('容器 / 编码', '不是 MP4 容器（读不到编码信息）', false);
        html += '<div><dt>说明</dt><dd>WebM / MKV 等格式无法直接解析，需转成 MP4</dd></div>';
      }
    } else {
      html += diagRow('容器 / 编码', '检测不可用：' + (d.codecInfo.reason || '未知原因'));
    }

    if (d.hasAudio === true) html += diagRow('音频', '有音轨（转换时会保留）');
    else if (d.hasAudio === false) html += diagRow('音频', '无音轨');
    else html += diagRow('音频', '无法确认（转换时以实际为准）');

    html += diagRow('体积', fmtBytes(state.file.size), d.sizeOk);

    // 总结
    var issues = [];
    if (!d.durationOk) issues.push('时长超出 ' + state.maxDur + ' 秒，需要裁剪');
    if (!d.ratioOk) issues.push('画面不是 16:9，需要' + (state.fit === 'pad' ? '加黑边' : '裁切'));
    if (!d.containerOk) issues.push('不是 MP4 容器，需要重新封装');
    if (d.codecOk === false) issues.push('编码不是 H.264，需要重编码');
    if (!d.sizeOk) issues.push('体积超过 ' + state.maxMb + ' MB');
    if (!issues.length) issues.push('各项都符合，转换只是为了确保编码/封装规范');
    html += '<div><dt>结论</dt><dd>' + escapeHtml(issues.join('；')) + '</dd></div>';

    box.innerHTML = html;

    var plan = $('#v-plan');
    if (plan) {
      var steps = [];
      steps.push('输出 1280 × 720（16:9）');
      steps.push(state.fit === 'pad' ? '画面完整，不足处补黑边' : '画面裁切填满，不留黑边');
      steps.push('时长取前 ' + Math.min(state.maxDur, Math.ceil(d.duration || state.maxDur)) + ' 秒');
      steps.push('编码 H.264 / MP4');
      plan.innerHTML = '将要执行：' + escapeHtml(steps.join(' · ')) + '。';
    }
  }

  /* ---------- 转换（单次尝试，指定码率）----------
     bitrate 由外层逐级降档重试；产出后由外层负责复检能否播放。 */
  function convertOnce(file, d, bitrate) {
    return new Promise(function (resolve, reject) {
      var mime = pickMime();
      if (!mime) {
        reject(new Error('这个浏览器不支持录制 MP4（需要 Chrome / Edge 新版）'));
        return;
      }

      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.src = url;
      v.playsInline = true;
      v.preload = 'auto';

      var canvas = document.createElement('canvas');
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      var ctx = canvas.getContext('2d');

      var raf = 0;
      var rec = null;
      var chunks = [];
      var stopped = false;
      var limit = Math.min(state.maxDur, d.duration > 0 ? d.duration : state.maxDur);

      function cleanup() {
        if (raf) cancelAnimationFrame(raf);
        try { v.pause(); } catch (e) {}
        url && URL.revokeObjectURL(url);
      }

      v.onloadeddata = function () {
        // 音频：把原视频的音轨接进来。接不上就录无声，并如实告知。
        var audioTracks = [];
        try {
          var src = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
          if (src) audioTracks = src.getAudioTracks();
        } catch (e) { audioTracks = []; }

        var canvasStream = canvas.captureStream(30);
        var stream = new MediaStream();
        canvasStream.getVideoTracks().forEach(function (t) { stream.addTrack(t); });
        audioTracks.forEach(function (t) { stream.addTrack(t); });

        try {
          rec = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: bitrate,
            audioBitsPerSecond: 128000
          });
        } catch (e) {
          cleanup();
          reject(new Error('启动录制失败：' + e.message));
          return;
        }

        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

        rec.onstop = function () {
          cleanup();
          var blob = new Blob(chunks, { type: 'video/mp4' });
          resolve({ blob: blob, mimeUsed: rec.mimeType, hadAudio: audioTracks.length > 0, seconds: limit });
        };

        rec.start(1000);
        state.recording = true;

        // 每帧把当前画面按选定方式画到 16:9 画布上
        function draw() {
          if (stopped) return;
          var vw = v.videoWidth || OUT_W;
          var vh = v.videoHeight || OUT_H;

          if (state.fit === 'pad') {
            var scale = Math.min(OUT_W / vw, OUT_H / vh);
            var dw = vw * scale, dh = vh * scale;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, OUT_W, OUT_H);
            ctx.drawImage(v, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh);
          } else {
            var s2 = Math.max(OUT_W / vw, OUT_H / vh);
            var sw = OUT_W / s2, sh = OUT_H / s2;
            ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, OUT_W, OUT_H);
          }

          var pct = limit > 0 ? (v.currentTime / limit) * 100 : 0;
          setProgress(pct, '转换中… ' + Math.floor(v.currentTime) + ' / ' + Math.ceil(limit) + ' 秒');

          if (v.currentTime >= limit || v.ended) { stop(); return; }
          raf = requestAnimationFrame(draw);
        }

        function stop() {
          if (stopped) return;
          stopped = true;
          state.recording = false;
          if (raf) cancelAnimationFrame(raf);
          try { v.pause(); } catch (e) {}
          if (rec && rec.state !== 'inactive') {
            rec.stop();
          } else {
            cleanup();
            reject(new Error('录制没有产生数据'));
          }
        }

        v.onended = stop;
        v.onerror = function () { stop(); };

        v.currentTime = 0;
        var playPromise = v.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function (e) {
            stop();
            reject(new Error('无法播放这个视频：' + e.message));
          });
        }
        raf = requestAnimationFrame(draw);
      };

      v.onerror = function () {
        cleanup();
        reject(new Error('浏览器读不了这个视频，可能是不支持的编码'));
      };

      v.load();
    });
  }

  /* ---------- 复检产物 ---------- */
  function verifyResult(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.setAttribute('playsinline', '');
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
      v.src = url;

      var out = { url: url, duration: 0, width: 0, height: 0, codec: '', isMp4: false, playable: false };
      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        try { v.pause(); } catch (e) {}
        v.removeAttribute('src');
        if (v.parentNode) v.parentNode.removeChild(v);
        resolve(out);
      }
      v.onloadedmetadata = function () {
        out.duration = v.duration;
        out.width = v.videoWidth;
        out.height = v.videoHeight;
        out.playable = v.videoWidth > 0 && isFinite(v.duration) && v.duration > 0;
        done();
      };
      v.onerror = done;
      setTimeout(done, 8000);
      v.load();
    });
  }

  /** 读产物头部的编码信息（复用 mp4box） */
  async function readOutputCodec(blob, verify) {
    try {
      var head = blob.slice(0, Math.min(blob.size, 1024 * 1024));
      var buf = await head.arrayBuffer();
      buf.fileStart = 0;
      var f = MP4Box.createFile();
      var got = null;
      f.onReady = function (md) {
        got = (md.tracks || []).filter(function (t) { return t.type === 'video'; })[0];
      };
      f.appendBuffer(buf);
      f.flush();
      await new Promise(function (r) { setTimeout(r, 800); });
      if (got) { verify.codec = got.codec; verify.isMp4 = true; return; }
      var b = new Uint8Array(buf);
      if (b.byteLength >= 8) {
        verify.isMp4 = String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp';
        if (!verify.isMp4) verify.codec = '';
      }
    } catch (e) { /* 复检失败不影响主流程 */ }
  }

  /* ---------- 转换：逐级降码率重试 ----------
     这一步很关键：高码率在部分机器上会产出没法播放的 MP4，
     所以每录一次都要验一遍「能不能播」，不能播就降档重来。 */
  async function convert(file, d) {
    var lastError = null;
    var lastResult = null;

    for (var i = 0; i < BITRATE_TIERS.length; i++) {
      var bitrate = BITRATE_TIERS[i];
      setProgress(0, '准备中…（第 ' + (i + 1) + ' 次尝试，码率 ' + (bitrate / 1000000).toFixed(1) + ' Mbps）');

      var out;
      try {
        out = await convertOnce(file, d, bitrate);
      } catch (e) {
        lastError = e;
        continue;
      }

      if (!out.blob || out.blob.size < 1024) {
        lastError = new Error('录制没有产生有效数据');
        continue;
      }

      var verify = await verifyResult(out.blob);
      await readOutputCodec(out.blob, verify);
      lastResult = { out: out, verify: verify, bitrate: bitrate };

      if (verify.playable && verify.isMp4) {
        return lastResult;
      }
      lastError = new Error('这次录出来的文件无法播放（码率 ' + (bitrate / 1000000).toFixed(1) + ' Mbps 过高）');
    }

    if (lastResult) {
      // 全都验不过，至少把最后一次结果交出去，并如实说明
      return lastResult;
    }
    throw lastError || new Error('转换失败，请换用新版 Edge / Chrome 再试');
  }

  function renderResult(r) {
    var wrap = $('#v-preview-wrap');
    var empty = $('#v-preview-empty');
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;

    var vid = $('#v-preview');
    if (vid) { vid.src = r.verify.url; vid.load(); }

    var dl = $('#v-download');
    if (dl) {
      dl.href = r.verify.url;
      dl.setAttribute('download', r.name);
    }

    var rows = '';
    rows += diagRow('文件名', r.name);
    rows += diagRow('体积', fmtBytes(r.blob.size));
    rows += diagRow('时长', fmtTime(r.verify.duration), r.verify.duration <= state.maxDur + 0.5);
    rows += diagRow('分辨率', r.verify.width + ' × ' + r.verify.height,
      r.verify.width === OUT_W && r.verify.height === OUT_H);
    rows += diagRow('画面比例', ratioLabel(r.verify.width, r.verify.height),
      Math.abs(r.verify.width / r.verify.height - TARGET_RATIO) <= RATIO_TOLERANCE);
    rows += diagRow('容器', r.verify.isMp4 ? 'MP4' : '未知（复检未能解析）', r.verify.isMp4);
    rows += diagRow('编码', r.verify.codec || '未知', isH264(r.verify.codec) ? true : null);
    rows += diagRow('音频', r.hadAudio ? '已保留' : '无（原视频没有可用的音轨）');
    rows += diagRow('录制格式', r.mimeUsed);

    var box = $('#v-result-stats');
    if (box) box.innerHTML = rows;
  }

  /* ---------- 主流程 ---------- */
  async function loadFile(file) {
    state.file = file;
    state.result = null;
    clearStatus();
    setProgress(null);
    $('#v-preview-wrap').hidden = true;
    $('#v-preview-empty').hidden = false;

    var list = $('#v-file-list');
    if (list) {
      list.hidden = false;
      list.innerHTML = '<div class="file-item"><span class="file-name">' + escapeHtml(file.name) +
        '</span><span class="file-size">' + fmtBytes(file.size) + '</span></div>';
    }

    var diag = $('#v-diag');
    if (diag) diag.innerHTML = '<div><dt>状态</dt><dd>正在读取…</dd></div>';

    var basics;
    try {
      basics = await probeBasic(file);
    } catch (e) {
      if (diag) diag.innerHTML = '<div><dt>状态</dt><dd class="t-danger">' + escapeHtml(e.message) + '</dd></div>';
      setStatus('err', escapeHtml(e.message));
      return;
    }

    var codecInfo = await probeCodec(file);
    var d = buildDiagnosis(basics.data, codecInfo);
    state.info = d;
    renderDiagnosis(d);

    $('#v-run-btn').disabled = false;
    $('#v-clear-btn').disabled = false;

    // 探测用的 objectURL 还留着给转换用？不用，转换时重建
    if (basics.url) URL.revokeObjectURL(basics.url);
  }

  async function run() {
    if (!state.file || !state.info) return;
    var btn = $('#v-run-btn');
    btn.disabled = true;
    btn.textContent = '转换中…';
    clearStatus();
    setProgress(0, '准备中…');

    try {
      var converted = await convert(state.file, state.info);
      setProgress(100, '正在复检产物…');

      var out = converted.out;
      var verify = converted.verify;

      var name = (state.file.name || 'video').replace(/\.[^.]+$/, '') + '-投稿规格.mp4';
      state.result = {
        blob: out.blob,
        verify: verify,
        name: name,
        mimeUsed: out.mimeUsed,
        hadAudio: out.hadAudio,
        bitrate: converted.bitrate
      };

      setProgress(null);
      renderResult(state.result);

      var allOk = verify.playable && verify.duration <= state.maxDur + 0.5 &&
        verify.width === OUT_W && verify.height === OUT_H &&
        verify.isMp4 && isH264(verify.codec);

      if (allOk) {
        setStatus('ok', '转换完成，复检全部通过 ✓（可播放、时长 ' +
          fmtTime(verify.duration) + '、1280×720、MP4、H.264，码率 ' +
          (converted.bitrate / 1000000).toFixed(1) + ' Mbps）');
      } else {
        setStatus('err', '转换产出了文件，但复检没有全部通过' +
          (verify.playable ? '' : '（文件无法播放）') +
          '。请把右侧表格的结果发给我们，或换用新版 Edge / Chrome 再试一次。');
      }
    } catch (e) {
      setProgress(null);
      setStatus('err', '转换失败：' + escapeHtml(e.message) +
        '<br><span style="opacity:.8">如果是编码不支持，请换用新版 Edge / Chrome 再试。</span>');
    } finally {
      btn.disabled = false;
      btn.textContent = '开始转换';
    }
  }

  /* ---------- 事件 ---------- */
  function init() {
    var dz = $('#v-dropzone');
    var input = $('#v-file-input');
    if (!dz || !input) return;

    input.addEventListener('change', function () {
      if (input.files && input.files[0]) loadFile(input.files[0]);
      input.value = '';
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    $$('.chip[data-fit]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $$('.chip[data-fit]').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        state.fit = chip.getAttribute('data-fit');
        if (state.info) {
          state.info = buildDiagnosis(
            { duration: state.info.duration, width: state.info.width, height: state.info.height, hasAudio: state.info.hasAudio },
            state.info.codecInfo
          );
          renderDiagnosis(state.info);
        }
      });
    });

    var maxDur = $('#v-max-dur');
    maxDur.addEventListener('input', function () {
      state.maxDur = Math.max(1, Math.min(600, Number(maxDur.value) || 90));
      if (state.file) loadFile(state.file);
    });

    var maxMb = $('#v-max-mb');
    maxMb.addEventListener('input', function () {
      state.maxMb = Math.max(0, Number(maxMb.value) || 0);
    });

    $('#v-run-btn').addEventListener('click', run);

    $('#v-clear-btn').addEventListener('click', function () {
      state.file = null;
      state.info = null;
      state.result = null;
      $('#v-file-list').hidden = true;
      $('#v-diag').innerHTML = '<div><dt>状态</dt><dd>等待选择文件…</dd></div>';
      $('#v-preview-wrap').hidden = true;
      $('#v-preview-empty').hidden = false;
      $('#v-run-btn').disabled = true;
      $('#v-clear-btn').disabled = true;
      setProgress(null);
      clearStatus();
    });

    // 供自检脚本调用
    window.__videoTool = {
      state: state,
      pickMime: pickMime,
      ratioLabel: ratioLabel,
      isH264: isH264,
      buildDiagnosis: buildDiagnosis,
      loadFile: loadFile,
      run: run
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

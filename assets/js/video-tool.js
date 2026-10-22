/* ============================================================
   创想时代开发组 · 工具箱：视频处理
   ------------------------------------------------------------
   两件事：
     1) 诊断：读时长 / 分辨率 / 比例 / 编码（编码靠自托管的 mp4box.js）
     2) 转换：一边播一边录 —— 画面画到目标尺寸的画布上，
        编码由 MediaRecorder 输出 H.264（H.265 视浏览器支持情况）。

   为什么要「边播边录」：浏览器里没有直接转码的 API。
   WebCodecs 能编码，但把编码结果封装成 MP4 要自己写 muxer；
   MediaRecorder 是唯一能直接吐出 MP4 容器的现成接口，代价是只能实时录。

   导出规格：预设（符合投稿规范 / 1080P / 720P）+ 完全自定义，
   支持改比例、改分辨率、选编码，既能当投稿工具，也能当通用格式转换器。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 编码候选 ----------
     H.264 必须从 High 档开始试：
     avc1.42E01E（Baseline 3.0）在 1280×720 会因超出 level 上限而直接失败。 */
  var CODECS = {
    h264: {
      label: 'H.264 (AVC)',
      mimes: [
        'video/mp4;codecs=avc1.640028',   // High 4.0
        'video/mp4;codecs=avc1.640020',   // High 3.1
        'video/mp4;codecs=avc1.4d401f'    // Main 3.1
      ],
      isMatch: function (c) { return /^avc[13]/i.test(c || ''); },
      name: 'H.264'
    },
    h265: {
      label: 'H.265 (HEVC)',
      mimes: [
        'video/mp4;codecs=hvc1.1.6.L120.90',
        'video/mp4;codecs=hvc1.1.6.L93.B0',
        'video/mp4;codecs=hev1.1.6.L93.B0'
      ],
      isMatch: function (c) { return /^(hvc1|hev1)/i.test(c || ''); },
      name: 'H.265'
    }
  };

  /* 码率降级档位：高码率在部分机器上会产出放不了的文件，必须能退回 */
  var BITRATE_TIERS = [4000000, 2500000, 1500000];

  /** 按实际时长预估输出体积（MB） */
  function estimateMb(bitrateMbps) {
    var dur = state.info && isFinite(state.info.duration) && state.info.duration > 0
      ? state.info.duration
      : state.spec.maxDur;
    dur = Math.min(dur, state.spec.maxDur);
    // 源文件本身的码率是天然上限：重编码一般不会比原文件更大
    var srcMbps = state.file && dur > 0 ? state.file.size * 8 / dur / 1000000 : Infinity;
    var used = Math.min(bitrateMbps, srcMbps);
    return { mb: used * dur / 8, sec: dur };
  }

  /** 自动码率时按目标分辨率取一个经验档位 */
  function autoMbps() {
    var t = resolveTarget();
    var px = t.w * t.h;
    if (px >= 1920 * 1080) return 4;
    if (px >= 1280 * 720) return 2.5;
    return 1.5;
  }

  /** 用户指定了目标码率就用它，失败时按 72% 和 50% 依次降级 */
  function bitrateTiers() {
    var want = Number(state.spec.bitrate) || 0;
    if (want > 0) {
      var base = Math.round(Math.min(50, Math.max(0.3, want)) * 1000000);
      return [base, Math.round(base * 0.72), Math.round(base * 0.5)];
    }
    return BITRATE_TIERS;
  }

  var RATIOS = {
    source: '原样',
    '16:9': [16, 9],
    '9:16': [9, 16],
    '4:3': [4, 3],
    '1:1': [1, 1]
  };

  /* 投稿规范：开发组投稿要求的固定值 */
  var SUBMIT_SPEC = {
    preset: 'submit',
    w: 1280,
    h: 720,
    ratio: '16:9',
    fit: 'pad',
    codec: 'h264',
    maxDur: 90,
    locked: true
  };

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

  function ratioLabel(w, h) {
    if (!w || !h) return '未知';
    var g = gcd(w, h);
    return (w / g) + ':' + (h / g);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** H.264/H.265 要求宽高是偶数，很多编码器还要求是 16 的倍数，这里统一抹平 */
  function alignDim(n) {
    n = Math.round(Number(n) || 0);
    if (n < 16) return 16;
    return Math.floor(n / 16) * 16;
  }

  /** 找一个当前浏览器真的能用的 MP4 录制格式 */
  function pickMime(codecKey) {
    if (typeof MediaRecorder === 'undefined') return '';
    var c = CODECS[codecKey];
    if (!c) return '';
    for (var i = 0; i < c.mimes.length; i++) {
      if (MediaRecorder.isTypeSupported(c.mimes[i])) return c.mimes[i];
    }
    // H.264 退到「随便什么 MP4」（浏览器会自己挑一个）
    if (codecKey === 'h264' && MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    return '';
  }

  /** 这个编码能不能用（用于把 H.265 置灰） */
  function codecAvailable(codecKey) {
    return !!pickMime(codecKey);
  }

  /* ---------- 状态 ---------- */
  var state = {
    file: null,
    spec: {
      preset: 'original',
      w: 1280,
      h: 720,
      ratio: 'source',
      fit: 'pad',
      codec: 'h264',
      maxDur: 600,
      maxMb: 0,
      bitrate: 0,
      locked: false
    },
    info: null,
    result: null,
    recording: false
  };

  /* ---------- 媒体资源登记 ----------
     浏览器对同时存在的媒体管线（captureStream / 解码器）是有额度限制的。
     每次转换都会新建 canvas 流、音轨和一个 video 解码器，如果只依赖
     GC 回收，转两三次之后 MediaRecorder 就再也产不出数据
     （必须刷新页面才恢复）。
     所以这里显式登记，每次转换前统一释放一次，不靠运气。 */
  var LIVE = { streams: [], videos: [] };

  function trackStream(s) {
    if (s) LIVE.streams.push(s);
    return s;
  }
  function trackVideo(v) {
    if (v) LIVE.videos.push(v);
    return v;
  }

  function untrackStream(s) {
    var i = LIVE.streams.indexOf(s);
    if (i >= 0) LIVE.streams.splice(i, 1);
  }
  function untrackVideo(v) {
    var i = LIVE.videos.indexOf(v);
    if (i >= 0) LIVE.videos.splice(i, 1);
  }

  /** 把登记过的媒体资源全部释放掉 */
  function purgeMedia() {
    LIVE.streams.forEach(function (s) {
      try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    });
    LIVE.streams = [];

    LIVE.videos.forEach(function (v) {
      try { v.pause(); } catch (e) {}
      try { v.removeAttribute('src'); } catch (e) {}
      try { v.load(); } catch (e) {}
      try { if (v.parentNode) v.parentNode.removeChild(v); } catch (e) {}
    });
    LIVE.videos = [];
  }

  /** 放掉上一次结果的预览与它的 blob URL */
  function releasePreview() {
    var vid = $('#v-preview');
    if (vid) {
      try { vid.pause(); } catch (e) {}
      try { vid.removeAttribute('src'); } catch (e) {}
      try { vid.load(); } catch (e) {}
    }
    if (state.result && state.result.verify && state.result.verify.url) {
      try { URL.revokeObjectURL(state.result.verify.url); } catch (e) {}
    }
  }

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

  function diagRow(k, v, ok) {
    var cls = ok === true ? ' class="t-ok"' : ok === false ? ' class="t-danger"' : '';
    return '<div><dt>' + escapeHtml(k) + '</dt><dd' + cls + '>' + escapeHtml(v) +
      (ok === true ? ' ✓' : ok === false ? ' ✗' : '') + '</dd></div>';
  }

  /* ---------- 目标规格 ---------- */
  /** 把当前选择换算成实际输出宽高 */
  function resolveTarget() {
    var s = state.spec;

    // 「原尺寸」：直接沿用源分辨率，不做缩放
    if (s.preset === 'original' && state.info && state.info.width) {
      return {
        w: Math.max(2, Math.round(state.info.width / 2) * 2),
        h: Math.max(2, Math.round(state.info.height / 2) * 2)
      };
    }

    // 「原样」：跟着源视频走，超过目标框就等比缩下来
    if (s.ratio === 'source' && state.info && state.info.width) {
      var sw = state.info.width, sh = state.info.height;
      var boxW = s.w, boxH = s.h;
      var scale = Math.min(boxW / sw, boxH / sh, 1);
      if (s.upScale) scale = Math.min(boxW / sw, boxH / sh);
      return {
        w: alignDim(sw * scale),
        h: alignDim(sh * scale)
      };
    }
    return { w: alignDim(s.w), h: alignDim(s.h) };
  }

  /* ---------- 第一步：探测基础信息 ----------
     注意：<video> 必须挂在文档上（隐藏即可）。
     游离在 DOM 之外的 video 元素可能根本不开始加载，
     表现为 readyState 一直停在 0，最后超时。 */
  function probeBasic(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.setAttribute('playsinline', '');
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      trackVideo(v);
      document.body.appendChild(v);
      v.src = url;

      var done = false;
      function finish(err, data) {
        if (done) return;
        done = true;
        try { v.pause(); } catch (e) {}
        v.removeAttribute('src');
        if (v.parentNode) v.parentNode.removeChild(v);
        untrackVideo(v);
        if (err) { URL.revokeObjectURL(url); reject(err); }
        else resolve({ url: url, data: data });
      }

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
          // 这里故意不调 captureStream() 去探测有没有音轨：
          // 每次调用都会建立一条采集会话，转几次之后 MediaRecorder 就
          // 再也产不出数据（浏览器限制，必须刷新页面才恢复）。
          // 音轨情况交给转换时实际结果来报，一样准确。
          hasAudio: null
        });
      };
      v.onerror = function () {
        finish(new Error('浏览器打不开这个文件（' + describeState() +
          '）。可能是不支持的视频编码，建议先用别的工具转成 MP4 / H.264 再试'));
      };
      setTimeout(function () {
        finish(new Error('读取视频信息超时（' + describeState() +
          '）。文件可能损坏、编码不受支持（如 HEVC / AV1），或容器是 MKV 改名成 MP4；先转成标准 MP4 / H.264 再试'));
      }, 15000);

      v.load();
    });
  }

  /* ---------- 第二步：读编码（只对 MP4 容器有效） ---------- */
  function probeCodec(file) {
    return new Promise(function (resolve) {
      var settledOuter = false;
      function fail(reason) {
        if (settledOuter) return;
        settledOuter = true;
        resolve({ available: false, reason: reason });
      }
      setTimeout(function () { fail('读取编码信息超时（容器可能损坏或不是标准 MP4）'); }, 6000);
      if (typeof MP4Box === 'undefined') {
        fail('mp4box.js 没加载上');
        return;
      }
      var HEAD = Math.min(file.size, 4 * 1024 * 1024);
      file.slice(0, HEAD).arrayBuffer().then(function (buf) {
        buf.fileStart = 0;
        var f = MP4Box.createFile();
        var out = { available: true, isMp4: false, brands: '', tracks: [], error: null };
        var settled = false;
        function settle() { if (settled) return; settled = true; resolve(out); }

        f.onReady = function (md) {
          out.isMp4 = true;
          out.brands = (md.brands || []).join(',');
          out.tracks = (md.tracks || []).map(function (t) {
            return {
              type: t.type,
              codec: t.codec || '',
              width: t.video ? t.video.width : 0,
              height: t.video ? t.video.height : 0
            };
          });
          settle();
        };
        f.onError = function (e) { out.error = String(e); settle(); };
        try { f.appendBuffer(buf); f.flush(); } catch (e) { out.error = e.message; }
        // moov 有时在文件尾部，头部读不到就只能等超时
        setTimeout(settle, 2500);
      }).catch(function (e) {
        resolve({ available: true, isMp4: false, tracks: [], error: e.message });
      });
    });
  }

  /* ---------- 组装诊断 ---------- */
  function buildDiagnosis(basic, codecInfo) {
    var target = resolveTarget();
    var d = {
      duration: basic.duration,
      width: basic.width,
      height: basic.height,
      hasAudio: basic.hasAudio,
      codecInfo: codecInfo,
      target: target
    };

    d.durationOk = isFinite(d.duration) && d.duration <= state.spec.maxDur;
    d.sizeOk = state.spec.maxMb > 0 ? (state.file.size <= state.spec.maxMb * 1024 * 1024) : true;
    d.resolutionOk = basic.width === target.w && basic.height === target.h;
    d.ratioOk = basic.width && basic.height
      ? Math.abs((basic.width / basic.height) - (target.w / target.h)) < 0.01
      : false;

    var vTrack = (codecInfo.tracks || []).filter(function (t) { return t.type === 'video'; })[0];
    d.videoCodec = vTrack ? vTrack.codec : '';
    d.containerOk = !!codecInfo.isMp4;
    d.codecOk = d.containerOk ? CODECS[state.spec.codec].isMatch(d.videoCodec) : null;

    d.needTrim = !d.durationOk;
    d.needResize = !d.resolutionOk;
    d.needFit = !d.ratioOk;
    return d;
  }

  function renderDiagnosis(d) {
    var box = $('#v-diag');
    if (!box) return;

    var html = '';
    html += diagRow('文件', state.file.name + '（' + fmtBytes(state.file.size) + '）');
    html += diagRow('时长', fmtTime(d.duration) + '（上限 ' + state.spec.maxDur + ' 秒）', d.durationOk);
    html += diagRow('源分辨率', d.width + ' × ' + d.height, null);
    html += diagRow('源比例', ratioLabel(d.width, d.height), null);

    var estBr = state.spec.bitrate > 0 ? state.spec.bitrate : autoMbps();
    var est = estimateMb(estBr);
    html += diagRow('预计导出体积', '约 ' + est.mb.toFixed(1) + ' MB（' +
      (state.spec.bitrate > 0 ? state.spec.bitrate + ' Mbps' : '自动按 ' + estBr + ' Mbps 估') +
      '，实际随画面复杂度浮动）', null);

    if (d.codecInfo.available) {
      if (d.containerOk) {
        var cname = CODECS[state.spec.codec].isMatch(d.videoCodec)
          ? CODECS[state.spec.codec].name
          : (CODECS.h264.isMatch(d.videoCodec) ? 'H.264' : (CODECS.h265.isMatch(d.videoCodec) ? 'H.265' : d.videoCodec || '未知'));
        html += diagRow('源编码', 'MP4 / ' + cname, d.codecOk);
      } else {
        html += diagRow('源编码', '不是 MP4 容器（读不到编码信息）', false);
        html += '<div><dt>说明</dt><dd>WebM / MKV 等无法直接解析，转换时会重新编码</dd></div>';
      }
    } else {
      html += diagRow('源编码', '检测不可用：' + (d.codecInfo.reason || '未知原因'));
    }

    if (d.hasAudio === true) html += diagRow('音频', '有音轨（转换时会保留）');
    else if (d.hasAudio === false) html += diagRow('音频', '无音轨');
    else html += diagRow('音频', '无法确认（转换时以实际为准）');

    html += diagRow('目标规格', d.target.w + ' × ' + d.target.h + '（' +
      ratioLabel(d.target.w, d.target.h) + '，' + CODECS[state.spec.codec].name + '）');
    html += diagRow('体积', fmtBytes(state.file.size), d.sizeOk);

    var issues = [];
    if (!d.durationOk) issues.push('时长超出 ' + state.spec.maxDur + ' 秒，会截断');
    if (!d.resolutionOk) issues.push('分辨率与目标不同');
    if (!d.ratioOk) issues.push('比例与目标不同，需要' + (state.spec.fit === 'pad' ? '加黑边' : '裁切'));
    if (!d.containerOk) issues.push('不是 MP4 容器');
    if (d.codecOk === false) issues.push('编码要转成 ' + CODECS[state.spec.codec].name);
    if (!d.sizeOk) issues.push('体积超过 ' + state.spec.maxMb + ' MB');
    if (!issues.length) issues.push('源文件已符合当前目标规格，可以按需压缩或直接导出');
    html += '<div><dt>结论</dt><dd>' + escapeHtml(issues.join('；')) + '</dd></div>';

    box.innerHTML = html;

    var plan = $('#v-plan');
    if (plan) {
      var steps = [
        '输出 ' + d.target.w + ' × ' + d.target.h,
        state.spec.fit === 'pad' ? '画面完整、补黑边' : '画面裁切填满',
        '时长取前 ' + Math.min(state.spec.maxDur, Math.ceil(d.duration || state.spec.maxDur)) + ' 秒',
        CODECS[state.spec.codec].name + ' / MP4'
      ];
      plan.innerHTML = '将要执行：' + escapeHtml(steps.join(' · ')) + '。';
    }
  }

  /* ---------- 复用一块画布 ----------
     每次转换都新建 canvas 会不断累积「画布采集源」，
     转几次之后 MediaRecorder 就启动但产不出任何数据。
     所以整个页面共用一块画布，只在尺寸变化时改它。 */
  var sharedCanvas = null;
  var sharedCtx = null;

  function getCanvas(w, h) {
    if (!sharedCanvas) {
      sharedCanvas = document.createElement('canvas');
      sharedCtx = sharedCanvas.getContext('2d');
    }
    if (sharedCanvas.width !== w || sharedCanvas.height !== h) {
      sharedCanvas.width = w;
      sharedCanvas.height = h;
    }
    // 每轮开始先把整块刷黑，避免残留上一帧
    sharedCtx.fillStyle = '#000';
    sharedCtx.fillRect(0, 0, w, h);
    return { canvas: sharedCanvas, ctx: sharedCtx };
  }

  /* ---------- 单次转换 ---------- */
  function convertOnce(file, d, bitrate) {
    var target = d.target;
    var OUT_W = target.w;
    var OUT_H = target.h;

    return new Promise(function (resolve, reject) {
      var mime = pickMime(state.spec.codec);
      if (!mime) {
        reject(new Error('这个浏览器不支持录制 ' + CODECS[state.spec.codec].label));
        return;
      }

      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      trackVideo(v);
      /* 必须挂到文档上（隐藏即可）。
         脱离文档的 video 元素在部分情况下不触发 loadeddata，
         而且连续转换时会越转越容易卡住 —— 这是实测过的坑。 */
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
      v.src = url;
      v.playsInline = true;
      v.preload = 'auto';

      var shared = getCanvas(OUT_W, OUT_H);
      var canvas = shared.canvas;
      var ctx = shared.ctx;

      var raf = 0;
      var rec = null;
      var chunks = [];
      var stopped = false;
      var limit = Math.min(state.spec.maxDur, d.duration > 0 ? d.duration : state.spec.maxDur);

      /* 这两个流必须提到外层，cleanup 才拿得到。
         否则每转换一次就漏一条媒体管线：转第二个视频时 MediaRecorder
         录不出任何数据（必须刷新页面才恢复）。 */
      var canvasStream = null;
      var audioTracks = [];
      var allStreams = [];

      function cleanup() {
        if (raf) cancelAnimationFrame(raf);
        try { v.pause(); } catch (e) {}

        // 关键：把所有轨道都停掉，释放媒体管线
        allStreams.forEach(function (s) {
          try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          untrackStream(s);
        });
        allStreams = [];
        audioTracks = [];
        canvasStream = null;

        // 视频元素也清理干净，别让它继续占着解码器
        try {
          v.removeAttribute('src');
          v.load();
        } catch (e) {}
        if (v.parentNode) v.parentNode.removeChild(v);
        untrackVideo(v);

        url && URL.revokeObjectURL(url);
      }

      v.onloadeddata = function () {
        audioTracks = [];
        try {
          var src = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
          if (src) {
            trackStream(src);
            allStreams.push(src);
            audioTracks = src.getAudioTracks();
          }
        } catch (e) { audioTracks = []; }

        canvasStream = canvas.captureStream(30);
        trackStream(canvasStream);
        allStreams.push(canvasStream);

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
          // 先记下音轨情况，再 cleanup —— cleanup 会把 audioTracks 清空
          var hadAudio = audioTracks.length > 0;
          var mimeUsed = rec.mimeType;
          cleanup();
          resolve({
            blob: new Blob(chunks, { type: 'video/mp4' }),
            mimeUsed: mimeUsed,
            hadAudio: hadAudio,
            seconds: limit
          });
        };

        rec.start(1000);
        state.recording = true;

        function draw() {
          if (stopped) return;
          var vw = v.videoWidth || OUT_W;
          var vh = v.videoHeight || OUT_H;

          if (state.spec.fit === 'pad') {
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
          if (rec && rec.state !== 'inactive') rec.stop();
          else { cleanup(); reject(new Error('录制没有产生数据')); }
        }

        v.onended = stop;
        v.onerror = function () { stop(); };

        v.currentTime = 0;
        var p = v.play();
        if (p && p.catch) {
          p.catch(function (e) { stop(); reject(new Error('无法播放这个视频：' + e.message)); });
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
      trackVideo(v);
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
        untrackVideo(v);
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
      }
    } catch (e) { /* 复检失败不影响主流程 */ }
  }

  /* ---------- 转换：逐级降码率重试 ---------- */
  async function convert(file, d) {
    var lastError = null;
    var lastResult = null;
    state.attempts = [];

    var tiers = bitrateTiers();
    for (var i = 0; i < tiers.length; i++) {
      var bitrate = tiers[i];
      setProgress(0, '准备中…（第 ' + (i + 1) + ' 次尝试，码率 ' + (bitrate / 1000000).toFixed(1) + ' Mbps）');

      var out;
      try {
        out = await convertOnce(file, d, bitrate);
      } catch (e) {
        lastError = e;
        state.attempts.push({ bitrate: bitrate, stage: 'record', err: e.message });
        continue;
      }
      if (!out.blob || out.blob.size < 1024) {
        lastError = new Error('录制没有产生有效数据');
        state.attempts.push({ bitrate: bitrate, stage: 'size', size: out.blob ? out.blob.size : 0 });
        continue;
      }

      var verify = await verifyResult(out.blob);
      await readOutputCodec(out.blob, verify);
      lastResult = { out: out, verify: verify, bitrate: bitrate };
      state.attempts.push({ bitrate: bitrate, stage: 'verify', size: out.blob.size, playable: verify.playable });

      if (verify.playable && verify.isMp4) return lastResult;
      lastError = new Error('这次录出来的文件无法播放（码率 ' + (bitrate / 1000000).toFixed(1) + ' Mbps 过高）');
    }

    if (lastResult) return lastResult;
    throw lastError || new Error('转换失败，请换用新版 Edge / Chrome 再试');
  }

  function renderResult(r) {
    var dw = r.verify.width, dh = r.verify.height;
    var box = $('#v-preview-wrap');
    var empty = $('#v-preview-empty');
    if (empty) empty.hidden = true;
    if (box) box.hidden = false;

    var vid = $('#v-preview');
    if (vid) { vid.src = r.verify.url; vid.load(); }

    var dl = $('#v-download');
    if (dl) {
      dl.href = r.verify.url;
      dl.setAttribute('download', r.name);
    }

    var rows = '';
    rows += diagRow('文件名', r.name);
    rows += diagRow('体积', fmtBytes(r.blob.size) +
      (r.estimatedMb ? '（导出前预估约 ' + r.estimatedMb.toFixed(1) + ' MB）' : ''));
    rows += diagRow('时长', fmtTime(r.verify.duration), r.verify.duration <= state.spec.maxDur + 0.5);
    rows += diagRow('分辨率', dw + ' × ' + dh, dw === r.target.w && dh === r.target.h);
    rows += diagRow('比例', ratioLabel(dw, dh));
    rows += diagRow('容器', r.verify.isMp4 ? 'MP4' : '未知（复检未能解析）', r.verify.isMp4);
    rows += diagRow('编码', r.verify.codec || '未知',
      CODECS[state.spec.codec].isMatch(r.verify.codec) ? true : null);
    rows += diagRow('音频', r.hadAudio ? '已保留' : '无（原视频没有可用的音轨）');

    var host = $('#v-result-stats');
    if (host) host.innerHTML = rows;
  }

  /* ---------- 主流程 ---------- */
  async function loadFile(file) {
    state.file = file;
    state.result = null;
    clearStatus();
    setProgress(null);
    // 换文件时也把上一次的媒体资源放干净
    releasePreview();
    purgeMedia();
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

    var slowTimer = setTimeout(function () {
      if (diag) diag.innerHTML = '<div><dt>状态</dt><dd>还在读取…（文件较大或编码特殊时会久一点，20 秒内读不出会提示原因）</dd></div>';
    }, 3500);

    var basics;
    try {
      basics = await probeBasic(file);
    } catch (e) {
      clearTimeout(slowTimer);
      if (diag) diag.innerHTML = '<div><dt>状态</dt><dd class="t-danger">' + escapeHtml(e.message) + '</dd></div>';
      setStatus('err', escapeHtml(e.message));
      return;
    }
    clearTimeout(slowTimer);

    var codecInfo;
    try {
      codecInfo = await probeCodec(file);
    } catch (e) {
      codecInfo = { available: false, reason: '读取编码信息失败：' + (e.message || '未知原因') };
    }
    state.info = basics.data;
    state.info.codecInfo = codecInfo;
    var d = buildDiagnosis(state.info, codecInfo);
    state.info.diag = d;
    renderDiagnosis(d);

    syncSpecUi();
    $('#v-run-btn').disabled = false;
    $('#v-clear-btn').disabled = false;
    if (basics.url) URL.revokeObjectURL(basics.url);
  }

  /** 只重算诊断（改规格时调用，不必重新读文件） */
  function refreshDiagnosis() {
    if (!state.info || !state.info.codecInfo) return;
    var d = buildDiagnosis(state.info, state.info.codecInfo);
    state.info.diag = d;
    renderDiagnosis(d);
  }

  async function run() {
    if (!state.file || !state.info) return;
    var btn = $('#v-run-btn');
    btn.disabled = true;
    btn.textContent = '转换中…';
    clearStatus();
    setProgress(0, '准备中…');

    // 上一次的预览与残留媒体先放掉，否则转几次之后录不出数据
    releasePreview();
    purgeMedia();

    try {
      var d = buildDiagnosis(state.info, state.info.codecInfo);
      var converted = await convert(state.file, d);
      setProgress(100, '正在复检产物…');

      var out = converted.out;
      var verify = converted.verify;
      var target = d.target;

      var base = (state.file.name || 'video').replace(/\.[^.]+$/, '');
      var name = base + '-' + target.w + 'x' + target.h + '-' + CODECS[state.spec.codec].name.replace('.', '') + '.mp4';

      state.result = {
        estimatedMb: estimateMb(state.spec.bitrate > 0 ? state.spec.bitrate : autoMbps()).mb,
        blob: out.blob,
        verify: verify,
        name: name,
        mimeUsed: out.mimeUsed,
        hadAudio: out.hadAudio,
        bitrate: converted.bitrate,
        target: target
      };

      setProgress(null);
      renderResult(state.result);

      var allOk = verify.playable &&
        verify.duration <= state.spec.maxDur + 0.5 &&
        verify.width === target.w && verify.height === target.h &&
        verify.isMp4 && CODECS[state.spec.codec].isMatch(verify.codec);

      if (allOk) {
        state.convCount = (state.convCount || 0) + 1;
        var hint = state.convCount >= 2
          ? '<br><span style="opacity:.8">提示：同一次打开里连续转换较多次之后，' +
            '浏览器可能暂时无法再编码，届时按 F5 刷新页面即可继续。</span>'
          : '';
        setStatus('ok', '转换完成，复检全部通过 ✓（可播放、时长 ' + fmtTime(verify.duration) +
          '、' + target.w + '×' + target.h + '、MP4、' + CODECS[state.spec.codec].name +
          '，码率 ' + (converted.bitrate / 1000000).toFixed(1) + ' Mbps）' + hint);
      } else {
        setStatus('err', '转换产出了文件，但复检没有全部通过' +
          (verify.playable ? '' : '（文件无法播放）') +
          '。请把右侧表格发给我们，或换用新版 Edge / Chrome 再试一次。');
      }
    } catch (e) {
      setProgress(null);
      var msg = e.message || '';
      // 编码器被用尽时给出可执行的下一步，而不是一句「转换失败」
      var exhausted = (state.attempts || []).length > 0 &&
        state.attempts.every(function (a) { return a.stage === 'size' && !a.size; });
      if (exhausted) {
        setStatus('err',
          '<b>浏览器的视频编码器暂时用尽了。</b>' +
          '<br>这是 Chrome / Edge 连续转换多次后的限制，不是文件的问题 —— ' +
          '<b>按 F5 刷新页面</b>再继续就行，已经转好的结果可以先下载。' +
          '<br><span style="opacity:.8">（如果一打开就出现这句，请换用新版 Edge / Chrome。）</span>');
      } else {
        setStatus('err', '转换失败：' + escapeHtml(msg) +
          '<br><span style="opacity:.8">如果是编码不支持，请换用新版 Edge / Chrome 再试。</span>');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '开始转换';
    }
  }

  /* ---------- 规格面板 ---------- */
  var PRESETS = {
    original: { w: 1280, h: 720, ratio: 'source', codec: 'h264', maxDur: 600, locked: false },
    p1080:    { w: 1920, h: 1080, ratio: '16:9', codec: 'h264', maxDur: 600, locked: false },
    p720:     { w: 1280, h: 720, ratio: '16:9', codec: 'h264', maxDur: 600, locked: false },
    submit:   { w: 1280, h: 720, ratio: '16:9', codec: 'h264', maxDur: 90, locked: true },
    custom:   { locked: false }
  };

  function applyPreset(name) {
    var p = PRESETS[name];
    if (!p) return;
    state.spec.preset = name;
    state.spec.locked = !!p.locked;

    if (name !== 'custom') {
      state.spec.w = p.w;
      state.spec.h = p.h;
      state.spec.ratio = p.ratio;
      state.spec.maxDur = p.maxDur;
      // 只有「投稿规范」强制 H.264；其余预设保留用户已选的编码
      if (p.locked) state.spec.codec = p.codec;
    }
    syncSpecUi();
    refreshDiagnosis();
  }

  /** 把 state.spec 写回界面控件 */
  function syncSpecUi() {
    var s = state.spec;

    $$('.chip[data-preset]').forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-preset') === s.preset);
    });

    // 比例：始终可点，点了会自动切到「自定义」
    $$('.chip[data-ratio]').forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-ratio') === s.ratio);
    });

    // 画面处理
    $$('.chip[data-fit]').forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-fit') === s.fit);
    });

    // 分辨率输入：锁定预设下不可改
    var wEl = $('#v-out-w'), hEl = $('#v-out-h');
    if (wEl) { wEl.value = s.w; wEl.disabled = s.ratio === 'source'; }
    if (hEl) { hEl.value = s.h; hEl.disabled = s.ratio === 'source'; }

    // 编码
    var codecEl = $('#v-codec');
    if (codecEl) {
      codecEl.value = s.codec;
      $$('option', codecEl).forEach(function (o) {
        if (o.value === 'h265' && !codecAvailable('h265')) o.disabled = true;
      });
    }

    // 时长
    var durEl = $('#v-max-dur');
    if (durEl) { durEl.value = s.maxDur; }

    // 锁定提示
    var lockNote = $('#v-lock-note');
    if (lockNote) lockNote.hidden = !s.locked;

    // H.265 不可用时的说明
    var h265Note = $('#v-h265-note');
    if (h265Note) h265Note.hidden = codecAvailable('h265');

    // 目标码率
    var brEl = $('#v-bitrate');
    if (brEl) brEl.value = s.bitrate;

    var brNote = $('#v-bitrate-est');
    if (brNote) {
      if (!state.info) {
        brNote.textContent = '选好视频后按实际时长估算导出体积';
      } else if (s.bitrate > 0) {
        var est = estimateMb(s.bitrate);
        brNote.textContent = '按 ' + s.bitrate + ' Mbps、' + est.sec.toFixed(1) + ' 秒估算，导出约 ' + est.mb.toFixed(1) + ' MB';
      } else {
        var autoBr = autoMbps();
        var autoEst = estimateMb(autoBr);
        brNote.textContent = '自动：按 ' + autoBr + ' Mbps 估算，' + autoEst.sec.toFixed(1) + ' 秒导出约 ' + autoEst.mb.toFixed(1) + ' MB';
      }
    }

    // 目标规格与体积：分成多行，字号放大
    var summary = $('#v-spec-summary');
    if (summary) {
      if (!state.info) {
        summary.innerHTML = '<p class="spec-empty">选好视频后显示目标规格与预计体积</p>';
      } else {
        var t = resolveTarget();
        var volText;
        if (s.bitrate > 0) {
          var se = estimateMb(s.bitrate);
          volText = '约 ' + se.mb.toFixed(1) + ' MB（' + s.bitrate + ' Mbps）';
        } else {
          var sAutoBr = autoMbps();
          var sAuto = estimateMb(sAutoBr);
          volText = '约 ' + sAuto.mb.toFixed(1) + ' MB（自动约 ' + sAutoBr + ' Mbps）';
        }
        summary.innerHTML =
          '<div class="spec-line"><span>输出分辨率</span><b>' + t.w + ' × ' + t.h +
            '（' + ratioLabel(t.w, t.h) + '）</b></div>' +
          '<div class="spec-line"><span>编码与容器</span><b>' + CODECS[s.codec].name + ' / MP4</b></div>' +
          '<div class="spec-line"><span>最长时长</span><b>' + s.maxDur + ' 秒</b></div>' +
          '<div class="spec-line spec-line--volume"><span>预计导出体积</span><b>' + volText + '</b></div>';
      }
    }
  }

  /* ---------- 事件 ---------- */
  function init() {
    var dz = $('#v-dropzone');
    var input = $('#v-file-input');
    if (!dz || !input) return;

    // 编码可选性：一开始就把不支持的置灰
    var codecEl = $('#v-codec');
    if (codecEl) {
      $$('option', codecEl).forEach(function (o) {
        if (o.value === 'h265' && !codecAvailable('h265')) o.disabled = true;
      });
    }

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

    // 导出预设
    $$('.chip[data-preset]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        applyPreset(chip.getAttribute('data-preset'));
      });
    });

    // 画面比例
    $$('.chip[data-ratio]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (state.spec.locked) applyPreset('custom');
        state.spec.ratio = chip.getAttribute('data-ratio');
        // 选具体比例时，短边固定 720，长边按比例算，保证比例和数值对得上
        var r = RATIOS[state.spec.ratio];
        if (r) {
          var base = 720;
          if (r[0] >= r[1]) {
            state.spec.h = base;
            state.spec.w = alignDim(base * r[0] / r[1]);
          } else {
            state.spec.w = base;
            state.spec.h = alignDim(base * r[1] / r[0]);
          }
        }
        syncSpecUi();
        refreshDiagnosis();
      });
    });

    // 画面处理
    $$('.chip[data-fit]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.spec.fit = chip.getAttribute('data-fit');
        syncSpecUi();
        refreshDiagnosis();
      });
    });

    // 分辨率输入
    var wEl = $('#v-out-w'), hEl = $('#v-out-h');
    function onDimInput(which) {
      if (state.spec.locked) applyPreset('custom');
      var val = alignDim(which === 'w' ? wEl.value : hEl.value);
      if (which === 'w') { state.spec.w = val; wEl.value = val; }
      else { state.spec.h = val; hEl.value = val; }
      // 手动改尺寸后，比例不再是固定档位
      state.spec.ratio = 'source' === state.spec.ratio ? 'source' : 'custom';
      state.spec.preset = 'custom';
      syncSpecUi();
      refreshDiagnosis();
    }
    if (wEl) wEl.addEventListener('change', function () { onDimInput('w'); });
    if (hEl) hEl.addEventListener('change', function () { onDimInput('h'); });

    // 编码
    if (codecEl) {
      codecEl.addEventListener('change', function () {
        if (state.spec.locked) applyPreset('custom');
        state.spec.codec = codecEl.value;
        syncSpecUi();
        refreshDiagnosis();
      });
    }

    // 最长时长
    var durEl = $('#v-max-dur');
    if (durEl) {
      durEl.addEventListener('change', function () {
        if (state.spec.locked) applyPreset('custom');
        state.spec.maxDur = Math.max(1, Math.min(600, Number(durEl.value) || 90));
        syncSpecUi();
        refreshDiagnosis();
      });
    }

    // 最大体积
    var mbEl = $('#v-max-mb');
    if (mbEl) {
      mbEl.addEventListener('change', function () {
        state.spec.maxMb = Math.max(0, Number(mbEl.value) || 0);
        refreshDiagnosis();
      });
    }

    // 目标码率
    var brEl = $('#v-bitrate');
    if (brEl) {
      brEl.addEventListener('change', function () {
        state.spec.bitrate = Math.max(0, Math.min(50, Number(brEl.value) || 0));
        syncSpecUi();
        refreshDiagnosis();
      });
    }

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
      var plan = $('#v-plan');
      if (plan) plan.textContent = '';
    });

    // 初始同步一次（预设默认是「符合投稿规范」）
    syncSpecUi();

    // 供自检脚本调用
    window.__videoTool = {
      state: state,
      CODECS: CODECS,
      PRESETS: PRESETS,
      pickMime: pickMime,
      codecAvailable: codecAvailable,
      ratioLabel: ratioLabel,
      alignDim: alignDim,
      resolveTarget: resolveTarget,
      applyPreset: applyPreset,
      syncSpecUi: syncSpecUi,
      isH264: function (c) { return CODECS.h264.isMatch(c); },
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

/* ============================================================
   创想时代开发组 · 工具箱
   ------------------------------------------------------------
   当前只有一件工具：把图片压到指定分辨率以内（默认 1000 × 4000）。
   全部在浏览器本地完成，图片不上传。

   「1000 × 4000」是竖长画布：宽最多 1000、高最多 4000。
   如果用户需要横图，可以点预设里的 4000 × 1000，或用 ⇄ 按钮对调。
   ============================================================ */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  /**
   * 算出等比缩放后的目标尺寸。
   * 规则：两个方向都不能超过上限；只缩小不放大；取整后不会越界。
   */
  function fitSize(w, h, maxW, maxH) {
    const scale = Math.min(maxW / w, maxH / h, 1);   // 上限 1 → 不放大
    return {
      width: Math.max(1, Math.floor(w * scale)),
      height: Math.max(1, Math.floor(h * scale)),
      scale: scale
    };
  }

  /** 解码图片（尽量带上 EXIF 方向），返回 { bitmap, width, height, revoke } */
  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      // 先试带方向信息的方式，失败再退回普通方式
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { source: bmp, width: bmp.width, height: bmp.height, revoke: () => bmp.close && bmp.close() };
      } catch (e) { /* 继续试下一种 */ }
      try {
        const bmp = await createImageBitmap(file);
        return { source: bmp, width: bmp.width, height: bmp.height, revoke: () => bmp.close && bmp.close() };
      } catch (e) { /* 回退到 <img> */ }
    }

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('这个文件不是浏览器能识别的图片'));
        el.src = url;
      });
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        revoke: () => URL.revokeObjectURL(url)
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  /**
   * 分步缩放：一次缩太多（比如 8000 → 1000）会丢细节，
   * 每次最多缩一半，反复几次，质量明显更好。
   */
  function drawScaled(source, fromW, fromH, toW, toH) {
    let curW = fromW;
    let curH = fromH;
    let cur = source;

    while (curW / 2 >= toW && curH / 2 >= toH) {
      const nextW = Math.max(toW, Math.floor(curW / 2));
      const nextH = Math.max(toH, Math.floor(curH / 2));
      const step = document.createElement('canvas');
      step.width = nextW;
      step.height = nextH;
      const sctx = step.getContext('2d');
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(cur, 0, 0, curW, curH, 0, 0, nextW, nextH);
      cur = step;
      curW = nextW;
      curH = nextH;
    }

    const out = document.createElement('canvas');
    out.width = toW;
    out.height = toH;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // 输出 JPG 时先铺白底，避免透明区域变黑
    if (state.format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, toW, toH);
    }
    ctx.drawImage(cur, 0, 0, curW, curH, 0, 0, toW, toH);
    return out;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('导出失败，可能是图片太大超出浏览器限制'))),
        type,
        type === 'image/png' ? undefined : quality
      );
    });
  }

  /* ---------- 状态 ---------- */
  const state = {
    files: [],
    maxW: 1000,
    maxH: 4000,
    format: 'image/jpeg',
    quality: 0.92,
    results: []
  };

  function setStatus(kind, html) {
    const box = $('#tool-status');
    if (!box) return;
    box.hidden = false;
    box.className = 'form-status form-status--' + kind;
    box.innerHTML = html;
  }

  function clearStatus() {
    const box = $('#tool-status');
    if (box) { box.hidden = true; box.innerHTML = ''; }
  }

  function extFor(type) {
    return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  }

  /* ---------- 选图 ---------- */
  function addFiles(fileList) {
    const incoming = Array.prototype.slice.call(fileList).filter((f) => /^image\//.test(f.type));
    if (!incoming.length) {
      setStatus('err', '拖进来的文件里没有浏览器能识别的图片（支持 JPG / PNG / WebP）。');
      return;
    }
    state.files = state.files.concat(incoming);
    renderFileList();
    clearStatus();
  }

  function renderFileList() {
    const box = $('#file-list');
    const runBtn = $('#run-btn');
    const clearBtn = $('#clear-btn');
    if (!box) return;

    if (!state.files.length) {
      box.hidden = true;
      box.innerHTML = '';
      if (runBtn) runBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
      return;
    }

    box.hidden = false;
    box.innerHTML = state.files
      .map((f, i) => '<div class="file-item"><span class="file-name">' + escapeHtml(f.name) +
        '</span><span class="file-size">' + fmtBytes(f.size) + '</span>' +
        '<button class="file-del" type="button" data-index="' + i + '" aria-label="移除">×</button></div>')
      .join('');

    $$('.file-del', box).forEach((btn) => {
      btn.addEventListener('click', () => {
        state.files.splice(Number(btn.getAttribute('data-index')), 1);
        renderFileList();
      });
    });

    if (runBtn) runBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- 处理 ---------- */
  async function run() {
    if (!state.files.length) return;

    const runBtn = $('#run-btn');
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '处理中…'; }
    clearStatus();

    state.results.forEach((r) => { if (r.url) URL.revokeObjectURL(r.url); });
    state.results = [];

    const lines = [];

    for (const file of state.files) {
      let decoded = null;
      try {
        decoded = await decode(file);
        const srcW = decoded.width;
        const srcH = decoded.height;
        const fit = fitSize(srcW, srcH, state.maxW, state.maxH);

        const name = file.name.replace(/\.[^.]+$/, '');
        let blob, outW, outH, skipped = false;

        if (fit.scale >= 1) {
          // 本来就在范围内：不放大，直接沿用原图另存一份
          skipped = true;
          outW = srcW;
          outH = srcH;
          blob = file;
        } else {
          const canvas = drawScaled(decoded.source, srcW, srcH, fit.width, fit.height);
          outW = fit.width;
          outH = fit.height;
          blob = await canvasToBlob(canvas, state.format, state.quality);
        }

        const outName = name + '-' + outW + 'x' + outH + '.' + extFor(state.format);
        const url = URL.createObjectURL(blob);

        state.results.push({
          name: outName,
          url: url,
          blob: blob,
          srcName: file.name,
          srcW: srcW,
          srcH: srcH,
          srcBytes: file.size,
          outW: outW,
          outH: outH,
          outBytes: blob.size,
          skipped: skipped
        });

        lines.push(
          '<li><b>' + escapeHtml(file.name) + '</b>：' + srcW + '×' + srcH + '（' + fmtBytes(file.size) + '） → ' +
          '<b>' + outW + '×' + outH + '</b>（' + fmtBytes(blob.size) + '）' +
          (skipped ? ' <span class="t-dim">已在范围内，未放大</span>' : '') + '</li>'
        );
      } catch (err) {
        lines.push('<li><b>' + escapeHtml(file.name) + '</b>：处理失败 —— ' + escapeHtml(err.message) + '</li>');
      } finally {
        if (decoded && decoded.revoke) decoded.revoke();
      }
    }

    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '开始处理'; }

    if (!state.results.length) {
      setStatus('err', '没有成功处理任何图片：<ul>' + lines.join('') + '</ul>');
      return;
    }

    showResult(state.results[0]);
    setStatus('ok', '处理完成：<ul>' + lines.join('') + '</ul>');
  }

  function showResult(r) {
    $('#preview-empty').hidden = true;
    $('#preview-wrap').hidden = false;
    $('#preview-img').src = r.url;
    $('#download-link').href = r.url;
    $('#download-link').setAttribute('download', r.name);

    const saved = r.srcBytes - r.outBytes;
    const pct = r.srcBytes ? Math.round((saved / r.srcBytes) * 100) : 0;

    $('#stat-list').innerHTML =
      row('原图', r.srcW + ' × ' + r.srcH + '　' + fmtBytes(r.srcBytes)) +
      row('结果', r.outW + ' × ' + r.outH + '　' + fmtBytes(r.outBytes)) +
      row('体积', r.skipped ? '未改动（原图已在范围内）'
        : (saved > 0 ? '减少 ' + fmtBytes(saved) + '（−' + pct + '%）' : '未减少，可把画质调低一点')) +
      row('文件名', r.name);

    const all = $('#download-all');
    if (all) {
      const many = state.results.length > 1;
      all.hidden = !many;
      all.textContent = many ? '继续下载其余 ' + (state.results.length - 1) + ' 张' : '';
    }
  }

  function row(k, v) {
    return '<div><dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(v) + '</dd></div>';
  }

  /* ---------- 事件绑定 ---------- */
  function init() {
    const dropzone = $('#dropzone');
    const input = $('#file-input');
    if (!dropzone || !input) return;

    input.addEventListener('change', () => {
      addFiles(input.files);
      input.value = '';
    });

    ['dragenter', 'dragover'].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-over'); }));

    ['dragleave', 'drop'].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-over'); }));

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    // 分辨率上限
    const maxW = $('#max-w');
    const maxH = $('#max-h');
    function syncMax() {
      const w = Math.max(16, Math.min(20000, Number(maxW.value) || 1000));
      const h = Math.max(16, Math.min(20000, Number(maxH.value) || 4000));
      state.maxW = w;
      state.maxH = h;
      highlightPreset();
      const note = $('#fit-note');
      if (note) {
        note.innerHTML = w >= h
          ? '当前是<b>横幅</b>范围（宽 ' + w + ' × 高 ' + h + '）。图片等比缩放到不超过它。'
          : '当前是<b>竖幅</b>范围（宽 ' + w + ' × 高 ' + h + '）。投稿长图请保持 1000 × 4000。';
      }
    }
    maxW.addEventListener('input', syncMax);
    maxH.addEventListener('input', syncMax);

    $$('.chip[data-preset]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const [w, h] = chip.getAttribute('data-preset').split('x');
        maxW.value = w;
        maxH.value = h;
        syncMax();
      });
    });

    $('#swap-wh').addEventListener('click', () => {
      const w = maxW.value;
      maxW.value = maxH.value;
      maxH.value = w;
      syncMax();
    });

    function highlightPreset() {
      $$('.chip[data-preset]').forEach((chip) => {
        const [w, h] = chip.getAttribute('data-preset').split('x');
        chip.classList.toggle('is-active', Number(w) === state.maxW && Number(h) === state.maxH);
      });
    }

    // 输出格式
    $$('.chip[data-format]').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('.chip[data-format]').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.format = chip.getAttribute('data-format');
        const qf = $('#quality-field');
        const lossless = state.format === 'image/png';
        qf.style.opacity = lossless ? '.45' : '1';
        qf.style.pointerEvents = lossless ? 'none' : 'auto';
      });
    });

    const quality = $('#quality');
    quality.addEventListener('input', () => {
      state.quality = Number(quality.value) / 100;
      $('#quality-value').textContent = quality.value;
    });

    $('#run-btn').addEventListener('click', run);

    $('#clear-btn').addEventListener('click', () => {
      state.files = [];
      state.results.forEach((r) => { if (r.url) URL.revokeObjectURL(r.url); });
      state.results = [];
      renderFileList();
      clearStatus();
      $('#preview-wrap').hidden = true;
      $('#preview-empty').hidden = false;
      $('#preview-img').removeAttribute('src');
    });

    $('#download-all').addEventListener('click', () => {
      // 依次触发下载（浏览器会逐个保存），第一张已由前面的按钮负责
      state.results.slice(1).forEach((r, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = r.url;
          a.download = r.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, i * 350);
      });
    });

    // 供自检脚本调用，不在界面上暴露
    window.__toolbox = {
      fitSize: fitSize,
      state: state,
      addFiles: addFiles,
      run: run
    };

    syncMax();
    renderFileList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

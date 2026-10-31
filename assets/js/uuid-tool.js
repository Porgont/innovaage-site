/* UUID 生成器：批量生成 UUID v4，一键复制
 * 依赖：浏览器原生 crypto.randomUUID()，无外部库
 */
(function () {
  'use strict';

  var count = 5;
  var out = document.getElementById('uuid-out');
  var note = document.getElementById('uuid-note');
  var runBtn = document.getElementById('uuid-run');
  var copyBtn = document.getElementById('uuid-copy');
  var clearBtn = document.getElementById('uuid-clear');
  var countBar = document.getElementById('uuid-count');

  if (!out) return;

  /* chip 切换数量 */
  countBar.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-count]');
    if (!btn) return;
    countBar.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
    btn.classList.add('is-active');
    count = parseInt(btn.dataset.count, 10) || 5;
  });

  function genOne() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    /* 兜底：手动拼 v4 */
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push(b[i].toString(16).padStart(2, '0'));
    return h.slice(0,4).join('') + '-' + h.slice(4,6).join('') + '-' +
           h.slice(6,8).join('') + '-' + h.slice(8,10).join('') + '-' + h.slice(10).join('');
  }

  function flash(btn, text) {
    var old = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 1200);
  }

  runBtn.addEventListener('click', function () {
    var lines = [];
    for (var i = 0; i < count; i++) lines.push(genOne());
    out.value = lines.join('\n');
    note.textContent = '已生成 ' + count + ' 个 UUID，点「复制全部」复制到剪贴板';
  });

  copyBtn.addEventListener('click', function () {
    if (!out.value) { flash(copyBtn, '先点生成'); return; }
    navigator.clipboard.writeText(out.value).then(function () {
      flash(copyBtn, '已复制 ✓');
    }, function () {
      /* 剪贴板 API 失败时退回选中复制 */
      out.select();
      try { document.execCommand('copy'); flash(copyBtn, '已复制 ✓'); }
      catch (e) { flash(copyBtn, '复制失败'); }
    });
  });

  clearBtn.addEventListener('click', function () {
    out.value = '';
    note.textContent = '已清空';
  });

  /* 页面打开自动生成一次 */
  runBtn.click();
})();

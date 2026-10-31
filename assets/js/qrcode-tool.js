/* 二维码生成器：用自托管 qrcode.js 画到 canvas，导出 PNG
 * 中文按 UTF-8 编码
 */
(function () {
  'use strict';

  if (typeof qrcode === 'undefined') return;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var text = document.getElementById('qr-text');
  var canvas = document.getElementById('qr-canvas');
  var note = document.getElementById('qr-note');
  var dlBtn = document.getElementById('qr-download');
  var copyBtn = document.getElementById('qr-copy');
  var levelBar = document.getElementById('qr-level');
  var sizeBar = document.getElementById('qr-size');

  var level = 'M';
  var cell = 8;

  function currentLevel() {
    var active = levelBar.querySelector('.chip.is-active');
    return active ? active.dataset.level : 'M';
  }
  function currentCell() {
    var active = sizeBar.querySelector('.chip.is-active');
    return active ? parseInt(active.dataset.size, 10) : 8;
  }

  function draw() {
    var v = text.value.trim();
    if (!v) {
      var ctx0 = canvas.getContext('2d');
      ctx0.fillStyle = '#fff';
      ctx0.fillRect(0, 0, canvas.width, canvas.height);
      note.textContent = '输入内容后自动生成';
      return;
    }

    try {
      var qr = qrcode(0, currentLevel());
      qr.addData(v, 'Byte');
      qr.make();
      var n = qr.getModuleCount();
      cell = currentCell();
      var margin = 2 * cell;
      var size = n * cell + margin * 2;

      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
          }
        }
      }
      note.textContent = '已生成 · ' + n + '×' + n + ' 模块 · 容错 ' + currentLevel();
    } catch (e) {
      note.textContent = '内容太长或有不支持的字符：' + e.message;
    }
  }

  function flash(btn, t) {
    var old = btn.textContent;
    btn.textContent = t;
    setTimeout(function () { btn.textContent = old; }, 1200);
  }

  text.addEventListener('input', draw);

  levelBar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-level]');
    if (!b) return;
    levelBar.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
    b.classList.add('is-active');
    draw();
  });

  sizeBar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-size]');
    if (!b) return;
    sizeBar.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
    b.classList.add('is-active');
    draw();
  });

  dlBtn.addEventListener('click', function () {
    if (!text.value.trim()) { flash(dlBtn, '先输入内容'); return; }
    canvas.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  });

  copyBtn.addEventListener('click', function () {
    if (!text.value.trim()) { flash(copyBtn, '先输入内容'); return; }
    canvas.toBlob(function (blob) {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(function () { flash(copyBtn, '已复制 ✓'); })
          .catch(function () { flash(copyBtn, '当前浏览器不支持复制图片'); });
      } else {
        flash(copyBtn, '当前浏览器不支持复制图片');
      }
    }, 'image/png');
  });

  /* 默认填个示例 */
  text.value = 'https://innovaage.cn';
  draw();
})();

/* manifest.json 生成器：按 MCBE 资源包 / 行为包规范生成
 * 字段以用户提供的模板为准：format_version=1，header{uuid,version,min_engine_version}，
 * modules[{type:resources|data, uuid, version}]
 */
(function () {
  'use strict';

  var type = 'resources';
  var headerUuid = '';
  var moduleUuid = '';

  var typeBar = document.getElementById('mf-type');
  var out = document.getElementById('mf-out');
  var note = document.getElementById('mf-note');
  var runBtn = document.getElementById('mf-run');
  var rerollBtn = document.getElementById('mf-reroll');
  var copyBtn = document.getElementById('mf-copy');
  var dlBtn = document.getElementById('mf-download');

  var vMaj = document.getElementById('mf-ver-major');
  var vMin = document.getElementById('mf-ver-minor');
  var vPat = document.getElementById('mf-ver-patch');
  var eMaj = document.getElementById('mf-eng-major');
  var eMin = document.getElementById('mf-eng-minor');
  var ePat = document.getElementById('mf-eng-patch');

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push(b[i].toString(16).padStart(2, '0'));
    return h.slice(0,4).join('') + '-' + h.slice(4,6).join('') + '-' +
           h.slice(6,8).join('') + '-' + h.slice(8,10).join('') + '-' + h.slice(10).join('');
  }

  function num(el, dflt) {
    var v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = dflt;
    return v;
  }

  function build() {
    return {
      format_version: 1,
      header: {
        uuid: headerUuid,
        version: [num(vMaj, 1), num(vMin, 0), num(vPat, 0)],
        min_engine_version: [num(eMaj, 1), num(eMin, 18), num(ePat, 0)]
      },
      modules: [
        {
          type: type,
          uuid: moduleUuid,
          version: [num(vMaj, 1), num(vMin, 0), num(vPat, 0)]
        }
      ]
    };
  }

  function render() {
    out.value = JSON.stringify(build(), null, 2);
  }

  function rerollUuids() {
    headerUuid = uuid();
    do { moduleUuid = uuid(); } while (moduleUuid === headerUuid);
  }

  function flash(btn, t) {
    var old = btn.textContent;
    btn.textContent = t;
    setTimeout(function () { btn.textContent = old; }, 1200);
  }

  typeBar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-type]');
    if (!b) return;
    typeBar.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
    b.classList.add('is-active');
    type = b.dataset.type;
    if (headerUuid) render();
  });

  [vMaj, vMin, vPat, eMaj, eMin, ePat].forEach(function (el) {
    el.addEventListener('input', function () { if (headerUuid) render(); });
  });

  runBtn.addEventListener('click', function () {
    rerollUuids();
    render();
    note.textContent = '已生成 · ' + (type === 'resources' ? '资源包' : '行为包') +
      ' · 版本 ' + num(vMaj,1) + '.' + num(vMin,0) + '.' + num(vPat,0);
  });

  rerollBtn.addEventListener('click', function () {
    if (!headerUuid) { flash(rerollBtn, '先点生成'); return; }
    rerollUuids();
    render();
    note.textContent = '已换一对新 UUID';
  });

  copyBtn.addEventListener('click', function () {
    if (!out.value) { flash(copyBtn, '先生成'); return; }
    navigator.clipboard.writeText(out.value).then(function () {
      flash(copyBtn, '已复制 ✓');
    }, function () {
      out.select();
      try { document.execCommand('copy'); flash(copyBtn, '已复制 ✓'); }
      catch (e) { flash(copyBtn, '复制失败'); }
    });
  });

  dlBtn.addEventListener('click', function () {
    if (!out.value) { flash(dlBtn, '先生成'); return; }
    var blob = new Blob([out.value], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manifest.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* 页面打开自动生成一次 */
  runBtn.click();
})();

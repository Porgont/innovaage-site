/* ============================================================
   创想时代开发组 · 官网脚本
   - 站点配置（联系方式 / 表单接收地址）集中在 SITE_CONFIG
   - 公告数据集中在 ANNOUNCEMENTS
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     ① 站点配置  —— 只需要改这里的联系方式
     ========================================================== */
  var SITE_CONFIG = {
    // ★★★ 报名问卷：把你们的问卷星链接填到这里 ★★★
    // 填好后，「加入我们」页会自动出现「填写报名问卷」按钮。
    // 留空时页面会提示「问卷准备中，请先加审核群」。
    surveyUrl: '',

    // ★★★ 三个 QQ 群 ★★★
    qqAudit: '1045216325',      // 对外审核群（加入我们）
    qqPublic: '788233856',      // 对外交流群（交流探讨）
    qqCouncil: '1018260006',    // 开发理事会（对外代投）

    // 邮箱：暂时留空，「联系我们」页会自动隐藏邮箱那一行。
    // 想显示邮箱就填上，例如 'contact@innovaage.cn'
    email: '',

    // 其他平台（没有就留空，页面对应行会自动隐藏）
    bilibili: '',                   // B 站主页链接
    douyin: '',                     // 抖音主页链接
    discord: '',                    // Discord 邀请链接
    github: 'https://github.com/porgont',
    site: 'https://innovaage.cn',
    siteRepo: 'https://github.com/porgont/innovaage-site'
  };

  /* ==========================================================
     ② 公告数据 —— 公告页在这里增删改
     字段：date(YYYY-MM-DD) / title / color / tags[] / body(html) / pin(可选，置顶)
     ★ 下面三条是示例，改成你们自己的内容，或者直接删掉
     ========================================================== */
  var ANNOUNCEMENTS = [
    {
      date: '2026-02-14',
      title: '创想时代开发组官网正式上线',
      color: 'green',
      pin: true,
      tags: ['站点', '里程碑'],
      body:
        '<p>我们的官网正式启用了，地址是 <a href="https://innovaage.cn">innovaage.cn</a>。' +
        '以后工作室的公开信息都会在这里发布。</p>' +
        '<ul>' +
        '<li><b>关于我们</b>：团队沿革、规模、宗旨与平台账号</li>' +
        '<li><b>公告</b>：资源发布、招募通知、合作与联动</li>' +
        '<li><b>加入我们</b>：招募方向说明 + 报名问卷入口</li>' +
        '</ul>'
    },
    {
      date: '2026-02-10',
      title: '长期招募：地图 / 皮肤 / 材质 / 光影 / Addon / 美术 / 视频',
      color: 'gold',
      tags: ['招募'],
      body:
        '<p>创想时代开发组长期开放招募，欢迎有作品、有耐心、愿意沟通的伙伴加入。</p>' +
        '<p>报名与审核方式见 <a href="join.html">加入我们</a> 页面。' +
        '我们不要求你什么都会，只要求你对自己负责的那一块认真。</p>'
    },
    {
      date: '2026-02-01',
      title: '示例公告：这里演示一条带列表和标签的公告写法',
      color: 'diamond',
      tags: ['示例'],
      body:
        '<p>这条是给管理员看的示例，可以直接删掉。公告支持列表、链接、加粗，' +
        '以及底部的彩色标签。</p>' +
        '<ul><li>短公告写 1 段就够</li><li>重要公告加 pin: true 置顶</li></ul>'
    }
  ];

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    var el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.style.cssText =
        'position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);z-index:200;' +
        'padding:11px 20px;border-radius:4px;font-size:14px;font-weight:700;' +
        'background:#212936;border:1px solid #3b4757;color:#e8eef6;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;pointer-events:none;' +
        'transition:opacity .2s ease,transform .2s ease;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,0)';
    });
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,20px)';
    }, 1800);
  }

  /* ---------- 当前页高亮 ---------- */
  function markActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    $$('.nav a').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- 年份 ---------- */
  function fillYear() {
    var y = String(new Date().getFullYear());
    $$('[data-year]').forEach(function (el) { el.textContent = y; });
  }

  /* ---------- 提交联系方式到页面 ----------
     页面上用 data-fill="xxx" 标记要填的位置，这里把配置里的真实值填进去。
     值为空的项：联系方式整行自动隐藏，不会在页面上留下空行或「待填写」。 */
  var FILL_KEYS = {
    qqAudit: 'qqAudit',
    qqPublic: 'qqPublic',
    qqCouncil: 'qqCouncil',
    email: 'email',
    bilibili: 'bilibili',
    douyin: 'douyin',
    discord: 'discord',
    github: 'github',
    site: 'site',
    siteRepo: 'siteRepo'
  };

  function applyConfigToDom() {
    function valueOf(fillName) {
      return SITE_CONFIG[FILL_KEYS[fillName] || fillName];
    }

    // 1) 填文字
    $$('[data-fill]').forEach(function (el) {
      var v = valueOf(el.getAttribute('data-fill'));
      el.textContent = v || '待填写';
    });

    // 2) 填链接
    $$('[data-fill-href]').forEach(function (el) {
      var name = el.getAttribute('data-fill-href');
      var val = valueOf(name);
      if (val) {
        el.setAttribute('href', name === 'email' ? 'mailto:' + val : val);
        el.hidden = false;
      } else {
        var row = el.closest('li') || el.closest('.contact-item') || el.parentElement;
        if (row) row.hidden = true;
      }
    });

    // 3) 值为空的联系方式：整行隐藏（含里面的复制按钮）
    $$('[data-fill]').forEach(function (el) {
      var row = el.closest('.contact-item') || el.closest('[data-row]');
      if (row && !valueOf(el.getAttribute('data-fill'))) row.hidden = true;
    });
  }

  /* ---------- 报名问卷入口（问卷星链接） ---------- */
  function initSurvey() {
    var link = $('#survey-link');
    if (!link) return;

    var url = SITE_CONFIG.surveyUrl;
    if (url) {
      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      var note = $('#survey-note');
      if (note) note.textContent = '问卷在新窗口打开（问卷星）。';
      return;
    }

    // 没填链接：按钮变灰，并给出备用方式
    link.setAttribute('href', '#panel-contact');
    link.classList.add('is-disabled');
    link.setAttribute('aria-disabled', 'true');
    var warn = $('#survey-fallback');
    if (warn) warn.hidden = false;
  }

  /* ---------- 公告渲染 ---------- */
  var _notices = [];   // 已排序的全部公告

  function paintNotices(host, list) {
    if (!list.length) {
      host.innerHTML = '<p style="color:#9aa8bb">暂时没有符合条件的公告。</p>';
      return;
    }

    host.innerHTML = list.map(function (n) {
      var d = String(n.date || '').split('-');
      var tags = (n.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');

      // 日期块：只有「年-月-日」完整时才拆成「月 / 日 + 年份」，否则原样显示
      var dateBlock = d.length === 3 && d[0] && d[1] && d[2]
        ? '<b>' + esc(d[1]) + ' / ' + esc(d[2]) + '</b>' + esc(d[0])
        : '<b>' + esc(n.date || '') + '</b>';

      return '' +
        '<article class="notice notice--' + esc(n.color || 'green') + '">' +
          '<div class="notice-date">' + dateBlock + '</div>' +
          '<div class="notice-body">' +
            '<h3>' + esc(n.title || '') +
              (n.pin ? ' <span class="tag tag--redstone">置顶</span>' : '') +
            '</h3>' +
            (n.body || '') +
            (tags ? '<div class="notice-meta">' + tags + '</div>' : '') +
          '</div>' +
        '</article>';
    }).join('');
  }

  function renderAnnouncements() {
    var host = $('#notice-list');
    if (!host) return;

    // 置顶优先，其余按日期倒序
    _notices = ANNOUNCEMENTS.slice().sort(function (a, b) {
      if (!!b.pin !== !!a.pin) return b.pin ? 1 : -1;
      return String(b.date).localeCompare(String(a.date));
    });

    var filter = host.getAttribute('data-filter') || '';
    var list = filter
      ? _notices.filter(function (n) { return (n.tags || []).indexOf(filter) >= 0; })
      : _notices.slice();

    var limit = parseInt(host.getAttribute('data-limit'), 10);
    if (limit > 0) list = list.slice(0, limit);

    paintNotices(host, list);
  }

  /* ---------- 公告分类筛选 ---------- */
  function initNoticeFilter() {
    var box = $('#notice-filter');
    var host = $('#notice-list');
    if (!box || !host) return;

    var btns = $$('button[data-filter]', box);
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        var tag = btn.getAttribute('data-filter') || '';
        paintNotices(host, tag
          ? _notices.filter(function (n) { return (n.tags || []).indexOf(tag) >= 0; })
          : _notices.slice());
      });
    });
  }

  /* ---------- 复制按钮 ---------- */
  function initCopy() {
    $$('.copy-btn').forEach(function (btn) {
      // 把配置里的真实值写进按钮（data-copy-target 指向 SITE_CONFIG 的键）
      var key = btn.getAttribute('data-copy-target');
      if (key) btn.setAttribute('data-copy', SITE_CONFIG[key] || '');

      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-copy') || '';
        if (!val) { toast('这项联系方式还没填写'); return; }

        var done = function () {
          var old = btn.textContent;
          btn.textContent = '已复制';
          btn.classList.add('is-done');
          toast('已复制到剪贴板');
          setTimeout(function () {
            btn.textContent = old;
            btn.classList.remove('is-done');
          }, 1500);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(val).then(done, function () { fallbackCopy(val, done); });
        } else {
          fallbackCopy(val, done);
        }
      });
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }

  /* ---------- 标签切换 ---------- */
  function initTabs() {
    var tabs = $$('.tabs .tab');
    if (!tabs.length) return;

    function activate(tab, scroll) {
      if (!tab) return;
      var id = tab.getAttribute('aria-controls');

      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      $$('.tab-panel').forEach(function (p) {
        p.hidden = p.id !== id;
      });

      // 切到带 #hash 的地址，方便直接分享「报名问卷」这一栏
      if (history.replaceState) {
        history.replaceState(null, '', '#' + id);
      }

      if (scroll) {
        var box = $('.tabs');
        if (box) {
          var y = box.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { activate(tab, true); });
    });

    function openFromHash() {
      var hash = (location.hash || '').replace('#', '');
      if (!hash) return;
      var target = tabs.filter(function (t) {
        return t.getAttribute('aria-controls') === hash;
      })[0];
      if (target && !target.classList.contains('is-active')) activate(target, false);
    }

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  /* ---------- 深浅主题切换 ----------
     默认浅色（终末地风格）。没手动选过就跟随系统；选过就记住，刷新与换页都不变。
     页面 <head> 里另有一段同样逻辑的内联脚本，负责在渲染前先定主题、避免闪一下。 */
  var THEME_KEY = 'ia-theme';

  function systemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function savedTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return (t === 'light' || t === 'dark') ? t : '';
    } catch (e) { return ''; }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || savedTheme() || systemTheme();
  }

  function applyTheme(theme, animate) {
    var root = document.documentElement;

    if (animate) {
      // 蒙版闪一下：颜色本身是瞬时切换的，蒙版只负责视觉过渡。
      // 定个时限摘掉类，避免在动画不推进的环境里一直挂着。
      root.classList.add('theme-switching');
      clearTimeout(root._themeTimer);
      root._themeTimer = setTimeout(function () {
        root.classList.remove('theme-switching');
      }, 400);
    } else {
      clearTimeout(root._themeTimer);
      root.classList.remove('theme-switching');
    }

    root.setAttribute('data-theme', theme);

    var icon = $('[data-theme-icon]');
    var label = $('[data-theme-label]');
    var btn = $('#theme-toggle');

    // 显示“将要切到的模式”，而不是当前模式
    var next = theme === 'dark' ? '浅色' : '深色';
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    if (label) label.textContent = next;
    if (btn) btn.setAttribute('aria-label', '切换到' + next + '主题');
  }

  function initTheme() {
    // 没手动选过时不写 data-theme，交给 CSS 跟随系统
    var saved = savedTheme();
    applyTheme(saved || currentTheme(), false);

    var btn = $('#theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next, true);
    });

    // 没手动选过时，跟随系统变化实时更新
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (savedTheme()) return;   // 已经手动选过就不再跟随系统
        applyTheme(systemTheme(), true);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- 启动 ---------- */
  function boot() {
    markActiveNav();
    fillYear();
    applyConfigToDom();
    renderAnnouncements();
    initNoticeFilter();
    initTabs();
    initCopy();
    initSurvey();
    initTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

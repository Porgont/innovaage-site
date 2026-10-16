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
    // 表单接收地址（Formspree）。去 https://formspree.io 免费注册，
    // 新建一个 Form，把形如 https://formspree.io/f/xxxxxxxx 的地址填到这里。
    // 留空 = 表单不提交到服务器，改为「生成邮件」的备用方式。
    formEndpoint: '',

    // 备用收件邮箱：表单没配好时，点击提交会打开邮件客户端发到这个地址。
    // ★★★ 请改成你们的真实邮箱 ★★★
    email: 'contact@innovaage.cn',

    // ★★★ 联系方式占位符，请全部改成真实信息 ★★★
    qqGroup: '000000000',            // QQ 群号
    qqGroupLink: '',                 // QQ 群加入链接（可留空）
    discord: '',                     // Discord 邀请链接（可留空）
    bilibili: '',                    // B 站主页链接（可留空）
    github: 'https://github.com/',   // GitHub 组织/主页链接
    site: 'https://innovaage.cn'
  };

  /* ==========================================================
     ② 公告数据 —— 公告页在这里增删改
     字段：date(YYYY-MM-DD) / title / color / tags[] / body(html) / pin(可选，置顶)
     ★ 下面三条是示例，改成你们自己的内容，或者直接删掉
     ========================================================== */
  var ANNOUNCEMENTS = [
    {
      date: '2025-01-01',
      title: '创想时代开发组官网正式上线',
      color: 'green',
      pin: true,
      tags: ['站点', '里程碑'],
      body:
        '<p>我们的官网正式启用了，地址是 <a href="https://innovaage.cn">innovaage.cn</a>。' +
        '以后工作室的公开信息都会在这里发布。</p>' +
        '<ul>' +
        '<li><b>关于我们</b>：工作室定位、负责方向、成员分工</li>' +
        '<li><b>公告</b>：版本发布、招募通知、合作与联动</li>' +
        '<li><b>加入我们</b>：招募方向说明 + 在线报名问卷</li>' +
        '</ul>'
    },
    {
      date: '2024-12-20',
      title: '长期招募：建筑 / 红石 / 材质 / 光影 / Addon / 美术 / 视频',
      color: 'gold',
      tags: ['招募'],
      body:
        '<p>工作室长期开放招募，欢迎有作品、有耐心、愿意沟通的伙伴加入。</p>' +
        '<p>报名入口见 <a href="join.html">加入我们</a> 页面。我们不要求你什么都会，' +
        '只要求你对自己负责的那一块认真。</p>'
    },
    {
      date: '2024-12-01',
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

  /* ---------- 提交联系方式到页面（占位符统一替换） ---------- */
  // 页面上的 data-fill 名字 → SITE_CONFIG 里的真实字段名
  // （写成映射表，避免 data-fill="qq" 去查一个不存在的 SITE_CONFIG.qq）
  var FILL_KEYS = {
    qq: 'qqGroup',
    email: 'email',
    discord: 'discord',
    bilibili: 'bilibili',
    github: 'github',
    site: 'site'
  };

  function applyConfigToDom() {
    function valueOf(fillName) {
      return SITE_CONFIG[FILL_KEYS[fillName] || fillName];
    }

    $$('[data-fill]').forEach(function (el) {
      var v = valueOf(el.getAttribute('data-fill'));
      if (v) el.textContent = v;
      else el.textContent = '待填写';
    });

    $$('[data-fill-href]').forEach(function (el) {
      var fillName = el.getAttribute('data-fill-href');
      var val = valueOf(fillName);
      if (val) {
        el.setAttribute('href', fillName === 'email' ? 'mailto:' + val : val);
      } else {
        var li = el.closest('li') || el.closest('.contact-item');
        if (li) li.hidden = true;
        else el.hidden = true;
      }
    });

    // 未填写的联系方式：整行隐藏，避免页面上留下空行
    $$('[data-fill]').forEach(function (el) {
      var v = valueOf(el.getAttribute('data-fill'));
      var row = el.closest('.contact-item');
      if (row && !v) row.hidden = true;
    });
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

  /* ---------- 报名表单 ---------- */
  function initForm() {
    var form = $('#join-form');
    if (!form) return;

    var status = $('#form-status');
    var submitBtn = $('#join-submit');

    // 把配置里的接收地址写进表单（没有配置则走邮件备用方案）
    if (SITE_CONFIG.formEndpoint) {
      form.setAttribute('action', SITE_CONFIG.formEndpoint);
      form.setAttribute('method', 'POST');
    }

    // 备用收件邮箱隐藏字段
    var hidden = form.querySelector('input[name="_replyto"], input[name="email_fallback"]');
    if (!hidden && SITE_CONFIG.email) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'reply_email';
      hidden.value = SITE_CONFIG.email;
      form.appendChild(hidden);
    }

    function show(kind, html) {
      if (!status) return;
      status.hidden = false;
      status.className = 'form-status form-status--' + kind;
      status.innerHTML = html;
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 字数计数
    var intro = form.querySelector('textarea[name="intro"]');
    var counter = $('#intro-count');
    if (intro && counter) {
      var sync = function () { counter.textContent = intro.value.length; };
      intro.addEventListener('input', sync);
      sync();
    }

    // 收集数据 → 纯文本（用于邮件正文 / 复制）
    function collect() {
      var fd = new FormData(form);
      var roles = fd.getAll('roles');
      var lines = [];
      var labels = {
        nickname: '昵称 / 游戏 ID',
        contact: '联系方式',
        age: '年龄段',
        roles: '想参与的方向',
        experience: '经验水平',
        portfolio: '作品链接',
        weekly: '每周可投入时间',
        intro: '自我介绍',
        other: '其他想说的'
      };
      var order = ['nickname', 'contact', 'age', 'roles', 'experience', 'portfolio', 'weekly', 'intro', 'other'];

      order.forEach(function (k) {
        var v = k === 'roles' ? roles.join('、') : (fd.get(k) || '');
        v = String(v).trim();
        if (v) lines.push(labels[k] + '：' + v);
      });

      return { text: lines.join('\n'), data: fd };
    }

    form.addEventListener('submit', function (e) {
      var emailInput = form.querySelector('input[type="email"]');
      var consent = form.querySelector('input[name="consent"]');

      if (consent && !consent.checked) {
        e.preventDefault();
        show('err', '请先勾选「我已阅读并同意信息使用说明」，再提交问卷。');
        return;
      }
      if (emailInput && emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
        e.preventDefault();
        show('err', '邮箱格式看起来不对，请检查一下（也可以留空，只填 QQ 或其它联系方式）。');
        return;
      }

      // 没配置接收地址：不提交，给出邮件备用方案
      if (!SITE_CONFIG.formEndpoint) {
        e.preventDefault();
        var c = collect();
        var subject = encodeURIComponent('【加入申请】' + (c.data.get('nickname') || '未填写昵称'));
        var body = encodeURIComponent(c.text + '\n\n—— 来自 innovaage.cn 报名问卷');
        show('err',
          '表单的服务器接收地址还没配置，暂时无法在线提交。<br>' +
          '可以改用邮件发送：<a href="mailto:' + esc(SITE_CONFIG.email) + '?subject=' + subject + '&body=' + body + '">' +
          '点这里生成邮件</a>（收件人 ' + esc(SITE_CONFIG.email) + '）。<br>' +
          '<span style="opacity:.75">站长：在 assets/js/site.js 里填好 formEndpoint 后即可在线提交。</span>');
        return;
      }

      e.preventDefault();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '提交中…'; }

      fetch(SITE_CONFIG.formEndpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        show('ok', '✅ 提交成功，感谢你的报名！我们会在 3～7 天内通过你填写的联系方式回复。');
        toast('报名已提交');
      }).catch(function () {
        var c = collect();
        var subject = encodeURIComponent('【加入申请】' + (c.data.get('nickname') || '未填写昵称'));
        var body = encodeURIComponent(c.text + '\n\n—— 来自 innovaage.cn 报名问卷');
        show('err',
          '提交失败（网络或服务异常）。请稍后重试，或改用邮件发送：' +
          '<a href="mailto:' + esc(SITE_CONFIG.email) + '?subject=' + subject + '&body=' + body + '">点这里生成邮件</a>。');
      }).then(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '提交报名'; }
      });
    });
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
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

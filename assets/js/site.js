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
    // ★★★ 一审问卷（问卷星）★★★
    // 「加入我们」页第二步的按钮指向它；审核条例面板的「一审」行内链接也指向它。
    // 注意：问卷是一审才填的，初审在对外审核群内完成。
    surveyUrl: 'https://www.wjx.cn/vm/OtrfYCj.aspx',

    // ★★★ 三个 QQ 群 ★★★
    qqAudit: '1045216325',      // 对外审核群（加入我们）
    qqPublic: '788233856',      // 对外交流群（交流探讨）
    qqCouncil: '1018260006',    // 开发理事会（对外代投）

    // 邮箱：暂时留空，「联系我们」页会自动隐藏邮箱那一行。
    // 想显示邮箱就填上，例如 'contact@innovaage.cn'
    email: '',

    // 其他平台（没有就留空，页面对应行会自动隐藏）
    // 带 url 的会渲染成可点链接，没 url 的只显示账号名
    neteaseMc: '创想时代开发组',       // 网易我的世界 团队开发者主账号
    neteaseHd: '创想时代工作室',       // 网易大神（认证账号）
    douyin: '创想时代开发组',          // 抖音账号名
    bilibiliName: '创想时代开发组',    // B 站账号名
    bilibili: 'https://space.bilibili.com/488348167',  // B 站主页链接
    discord: '',                       // Discord 邀请链接
    github: 'https://github.com/porgont',
    site: 'https://innovaage.cn',
    siteRepo: 'https://github.com/porgont/innovaage-site',

    // ★★★ 首页大图 ★★★
    // 留空则首页只显示文字（不报错）。图片放在 assets/img/ 下面。
    heroImage: 'assets/img/shader-2.jpg',
    heroImageAlt: 'Log光影橡木SA 渲染效果：樱花林地里飘落的花瓣与透光树冠'
  };

  /* ==========================================================
     ③ 作品数据 —— 首页「作品展示」与作品页都用这份数据
     字段：img / title / meta / category / desc(可选)
     category 用下面 CATEGORIES 里的键，用于筛选
     ========================================================== */
  var CATEGORIES = {
    shader: '光影',
    map: '地图',
    skin: '皮肤',
    tex: '材质',
    addon: 'Addon'
  };

  /* ==========================================================
     ④ 作品列表 —— 一个作品只占一项，点进去才是它的详情页
     字段：id / img(封面) / title / meta / category / desc
     ★ 一个作品只能有一条！同一作品的多张截图请写进下面 WORKS 里那一项的 shots，
       不要在这里重复列出（否则列表页会把同一个作品显示成好几个）。
     ========================================================== */
  var CATEGORIES = {
    shader: '光影',
    map: '地图',
    skin: '皮肤',
    tex: '材质',
    addon: 'Addon'
  };

  var SHOWCASE = [
    {
      id: 'log-shader-sa',
      img: 'assets/img/shader-2.jpg',
      title: 'Log光影 · 橡木 SA',
      meta: '作者：Log坤',
      category: 'shader',
      desc: '基岩版光影，主打水面镜面反射与自然光过渡。'
    }
  ];

  /* ==========================================================
     ④ 作品详情 —— 代表作单独成页：work.html?id=xxx
     字段：
       name      作品名（与 SHOWCASE 里的 title 对应）
       author    作者
       type      类型文字，如「光影 / Shader」
       tagline   一句话定位，显示在标题下面
       cover     详情页头图
       facts     左侧信息栏，[{k,v}] 形式
       intro     正文段落数组
       shots     截图清单 [{img, caption}]
       notice    使用须知（可选）
     ★ 加新代表作：在这里加一项，id 用英文小写短横线，
       然后在 SHOWCASE 对应那条上填同名的 id，作品页就会出现「查看详情」入口。
     ========================================================== */
  var WORKS = {
    'log-shader-sa': {
      name: 'Log光影 · 橡木 SA',
      author: '创想时代 Log坤',
      type: '光影 / Shader',
      tagline: 'Log 光影两周年特别版：方块卷云、氛围雨天、流动星辰、特调 ACES 色调映射',
      cover: 'assets/img/shader-rain.jpg',
      coverAlt: '雨天场景：石板路积水倒影、暖色窗光与雨幕',
      facts: [
        { k: '作品名', v: 'LogSA（Log Second Anniversary）' },
        { k: '作者', v: '创想时代 Log坤' },
        { k: '类型', v: '光影 / Shader' },
        { k: '平台', v: 'Minecraft 基岩版' },
        { k: '前置', v: 'SRC 光影（组件码 0559302）' },
        { k: '反馈群', v: '1017068586' },
        { k: 'Log 光影外群', v: '822955272' },
        { k: 'Log 光影内群', v: '980037287' }
      ],
      intro: [
        'LogSA，即 Log Second Anniversary，Log 光影两周年特别版。' +
        '拥有独特的方块卷云、氛围雨天、流动星辰、特调 ACES 色调映射。',

        'LogSA 集合了 Log3、4、6、7 等系列的优点，萃取橡木、桦木、樱花木、原木等各家的精华，' +
        '综合反馈群十余人的想法与提议，历经 Log坤 数个月的打磨与调制，' +
        '最终呈现出 Log 光影迄今为止色彩最通透、技术最完善、风格最独特的 LogSA：两周年版本。',

        '⚠️ 使用前请注意：请务必搭配 SRC 光影前置（组件码 0559302），否则部分效果无法正常显示。'
      ],
      shots: [
        { img: 'assets/img/shader-rain.jpg', caption: '雨天：石板路面的积水倒影、雨幕与暖色窗光' },
        { img: 'assets/img/shader-1.jpg', caption: '晴天：雪山与松林的强光表现，天空过曝与积雪明暗过渡' },
        { img: 'assets/img/shader-3.jpg', caption: '水面：峡谷水道的镜面反射，天空与地形完整倒映' },
        { img: 'assets/img/shader-2.jpg', caption: '林地：樱花树冠的透光与飘落花瓣，草地花簇的色彩层次' }
      ],
      notice:
        '开发作者：创想时代 Log坤。' +
        '鸣谢：冷夜、被遗忘的青色剑士、关于本人、只问为何、老楚、范帛、柑柠、linlin 等人' +
        '的支持和帮助，同时也感谢各位玩家一直以来的陪伴与支持（排名不分先后）。',
      thanks: [
        { k: '开发作者', v: '创想时代 Log坤' },
        { k: '鸣谢', v: '冷夜、被遗忘的青色剑士、关于本人、只问为何、老楚、范帛、柑柠、linlin' },
        { k: '反馈途径', v: '创想时代反馈群 1017068586' }
      ]
    }
  };

  /* ==========================================================
     ② 公告数据 —— 公告页在这里增删改
     字段：date(YYYY-MM-DD) / title / color / tags[] / body(html) / pin(可选，置顶)
     ★ 下面三条是示例，改成你们自己的内容，或者直接删掉
     ========================================================== */
  var ANNOUNCEMENTS = [
    {
      date: '2026-02-14',
      title: '开放代投业务，同步公布入室审核条例',
      color: 'green',
      pin: true,
      tags: ['招募', '代投', '里程碑'],
      body:
        '<p>两件事一起说：</p>' +
        '<p><b>一、开放代投业务。</b>依托我们庞大的粉丝群体与流量优势，你的作品上架资源中心，' +
        '能够拿到更高曝光，获得更多玩家浏览下载。接收地图、皮肤、材质、光影、功能玩法优质组件，' +
        '免费 / 付费作品均可投递。</p>' +
        '<ul>' +
        '<li>✅ <b>优势：</b>粉丝基数大，自带流量加持，助力你的作品被更多玩家看见。</li>' +
        '<li>⚠️ <b>转载非原创作品需原作者授权</b>，否则无法代投（例如从网站上随意下载的皮肤）。</li>' +
        '<li>所投组件必须遵守《创想时代开发组投稿条例》。</li>' +
        '<li>结算规则见群内公告的《创想时代开发组收益结算细则》。</li>' +
        '<li>以上文件均可在《创想时代开发组投稿问卷》中查阅，加入开发理事会即可详细了解并投递稿件。</li>' +
        '</ul>' +
        '<p>代投请加<b>创想时代开发理事会群：1018260006</b>。详见 <a href="join.html#panel-invest">代投与投稿</a>。</p>' +

        '<p><b>二、入室审核条例已公布。</b>如需审核加入我室，请按照 ' +
        '<a href="https://docs.qq.com/doc/DUEhwRVVmaE1ESUts" target="_blank" rel="noopener">' +
        '《创想时代开发组入室审核条例》</a> 中所述流程进行审核，条例中同时也有各部门的介绍。</p>' +
        '<p style="color:var(--text-dim)">' +
        '注意：阅读理解能力也算做基本素质的一部分，因此需要您<b>自行阅读条例</b>；' +
        '若有疑问请询问群内管理员。</p>' +
        '<p>流程概要：<b>初审 → 一审 → 二审</b>。' +
        '其中<b>初审在对外审核群（1045216325）内进行</b>，' +
        '初审通过后再到官网填写 <a href="join.html#panel-rules">一审问卷</a>。</p>'
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

  /* ---------- 当前页高亮 ----------
     桌面导航与手机侧栏都要高亮，所以两处一起扫。 */
  function markActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    $$('.nav a, .mnav-links a').forEach(function (a) {
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
    neteaseMc: 'neteaseMc',
    neteaseHd: 'neteaseHd',
    douyin: 'douyin',
    bilibili: 'bilibili',          // 主页网址，给 data-fill-href 用
    bilibiliName: 'bilibiliName',  // 账号名，给 data-fill 用
    discord: 'discord',
    github: 'github',
    site: 'site',
    siteRepo: 'siteRepo'
  };

  function applyConfigToDom() {
    function valueOf(fillName) {
      return SITE_CONFIG[FILL_KEYS[fillName] || fillName];
    }

    // 先算出所有带链接的元素该指向哪，供下面的文字填充复用。
    // 顺序很重要：同一个元素可能同时有 data-fill（要显示的文字）
    // 和 data-fill-href（要跳转的链接），必须先决定链接再决定文字，
    // 否则文字会被另一套取值覆盖成「待填写」。
    var hrefValues = {};
    $$('[data-fill-href]').forEach(function (el) {
      var name = el.getAttribute('data-fill-href');
      var val = valueOf(name);
      hrefValues[name] = val || '';

      if (val) {
        el.setAttribute('href', name === 'email' ? 'mailto:' + val : val);
        // 站外链接一律新窗口打开，别把访客从站点带走
        if (name !== 'email') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
        }
      } else {
        var row = el.closest('li') || el.closest('.contact-item') || el.parentElement;
        if (row) row.hidden = true;
      }
    });

    // 1) 填文字。
    //    文字一律以 data-fill 为准（它就是要显示的那句话）；
    //    data-fill-href 只管跳转地址。两者可以指向不同键，
    //    例如 B 站：显示 bilibiliName（账号名），链接用 bilibili（主页网址）。
    $$('[data-fill]').forEach(function (el) {
      el.textContent = valueOf(el.getAttribute('data-fill')) || '待填写';
    });

    // 2) 值为空的联系方式：整行隐藏（含里面的复制按钮）。
    //    判断「空不空」时，显示文字和链接地址任一有值就算不空。
    $$('[data-fill]').forEach(function (el) {
      var hrefName = el.getAttribute('data-fill-href');
      var hasText = !!valueOf(el.getAttribute('data-fill'));
      var hasLink = hrefName ? !!hrefValues[hrefName] : false;
      var row = el.closest('.contact-item') || el.closest('[data-row]');
      if (row && !hasText && !hasLink) row.hidden = true;
    });

    // 3) 长网址降一档字号，避免在窄栏里断成好几行
    $$('.contact-item .info b').forEach(function (b) {
      var t = b.textContent.trim();
      if (t.length > 26 && /^[\w.:/-]+$/.test(t)) b.classList.add('is-long');
    });
  }

  /* ---------- 一审问卷入口（问卷星） ----------
     两处共用同一个链接：
       #survey-link        报名加入面板的按钮
       #survey-link-rules  审核条例面板「一审」那一步的行内链接
     链接填了 → 两处都可点；没填 → 按钮变灰给备用方案，行内链接降级成普通文字。 */
  function initSurvey() {
    var link = $('#survey-link');
    if (!link) return;

    var url = SITE_CONFIG.surveyUrl;
    var inline = $('#survey-link-rules');

    if (url) {
      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      var note = $('#survey-note');
      if (note) note.textContent = '问卷在新窗口打开（问卷星）。';

      if (inline) {
        inline.setAttribute('href', url);
        inline.setAttribute('target', '_blank');
        inline.setAttribute('rel', 'noopener');
      }
      return;
    }

    // 没填链接：按钮变灰，并给出备用方式
    link.setAttribute('href', '#panel-contact');
    link.classList.add('is-disabled');
    link.setAttribute('aria-disabled', 'true');
    var warn = $('#survey-fallback');
    if (warn) warn.hidden = false;

    // 行内链接降级成普通文字，避免死链
    if (inline) {
      var span = document.createElement('b');
      span.textContent = '一审问卷';
      inline.parentNode.replaceChild(span, inline);
    }
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
      // 复制内容有两种来源：
      //   1) data-copy-target：取 SITE_CONFIG 里的值（群号、邮箱、仓库地址）
      //   2) 没写 target 的：直接复制同一行里显示出来的那串文字
      var key = btn.getAttribute('data-copy-target');

      function value() {
        if (key) return SITE_CONFIG[key] || '';
        var row = btn.closest('.contact-item');
        var shown = row && row.querySelector('.info b');
        return shown ? shown.textContent.trim() : '';
      }

      btn.addEventListener('click', function () {
        var val = value();
        if (!val || val === '待填写') { toast('这项联系方式还没填写'); return; }

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

      // 切到带 #hash 的地址，方便直接分享某一栏
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

  /* ---------- 首页大图 ---------- */
  function initHeroImage() {
    var box = $('#hero-figure');
    if (!box) return;

    if (!SITE_CONFIG.heroImage) { box.hidden = true; return; }

    var img = new Image();
    img.src = SITE_CONFIG.heroImage;
    img.alt = SITE_CONFIG.heroImageAlt || '';
    img.loading = 'eager';
    img.decoding = 'async';
    // 图挂了就整块收起来，别留一个破图标
    img.onerror = function () { box.hidden = true; };
    box.appendChild(img);
  }

  /* ---------- 作品展示 ---------- */
  function initShowcase() {
    var host = $('#showcase-grid');
    if (!host) return;

    var filter = host.getAttribute('data-category') || '';
    var limit = parseInt(host.getAttribute('data-limit'), 10);

    var list = filter
      ? SHOWCASE.filter(function (it) { return it.category === filter; })
      : SHOWCASE.slice();
    if (limit > 0) list = list.slice(0, limit);

    // 作品页的「当前共 N 件」用总数，不受筛选影响
    var counter = $('#work-count');
    if (counter) counter.textContent = SHOWCASE.length;

    if (!list.length) {
      host.innerHTML = '<p style="color:var(--text-dim)">作品还在整理中。</p>';
      return;
    }

    host.innerHTML = list.map(function (it) {
      var cat = CATEGORIES[it.category] || '';
      var detail = it.id
        ? '<a class="work-more" href="work.html?id=' + esc(it.id) + '">查看详情 →</a>'
        : '';
      return '' +
        '<article class="work">' +
          '<div class="work-media"><img src="' + esc(it.img) + '" alt="' + esc(it.title + (it.meta ? ' ' + it.meta : '')) + '" decoding="async"></div>' +
          '<div class="work-body">' +
            '<h3>' + esc(it.title) + '</h3>' +
            (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') +
            '<div class="work-meta">' +
              (cat ? '<span class="tag tag--gold">' + esc(cat) + '</span>' : '') +
              (it.meta ? '<span>' + esc(it.meta) + '</span>' : '') +
              detail +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------- 作品详情页 ----------
     地址形如 work.html?id=log-shader-sa
     HTML 里已经写了一份默认内容（Log光影 · 橡木 SA），
     所以即使 JS 没跑起来或者 id 不对，页面也不会空白。 */
  function initWorkDetail() {
    var host = $('#work-detail');
    if (!host) return;

    var id = '';
    try {
      id = new URLSearchParams(location.search).get('id') || '';
    } catch (e) {
      // 老浏览器：手动解析
      var m = /[?&]id=([^&]+)/.exec(location.search);
      id = m ? decodeURIComponent(m[1]) : '';
    }

    var work = WORKS[id];
    if (!work) {
      // 没带 id 或 id 不存在：保留 HTML 里的默认代表作，并提示一句
      if (id) {
        var note = $('#work-notice');
        if (note) {
          note.hidden = false;
          note.className = 'callout';
          note.innerHTML = '<span class="icon" aria-hidden="true">🛈</span><div>' +
            '没找到编号为 <code>' + esc(id) + '</code> 的作品，下面展示的是代表作 ' +
            '<b>Log光影 · 橡木 SA</b>。<a href="works.html">回作品列表</a></div>';
        }
      }
      // 走兜底分支时，放大功能也得能用 —— 从页面上已有的静态内容里取截图
      initLightbox(null);
      return;
    }

    document.title = work.name + ' | 创想时代开发组';

    // 标记 JS 真的跑通了。
    // 页面里有一份写死的兜底内容，长得和渲染结果几乎一样，
    // 光比对文字无法区分「JS 渲染成功」和「JS 没跑、只是静态兜底」，
    // 所以留这个标记给自检用。
    host.setAttribute('data-work-id', id);

    var setText = function (sel, text) {
      var el = $(sel);
      if (el) el.textContent = text;
    };

    setText('#work-type', work.type || '');
    setText('#work-name', work.name || '');
    setText('#work-tagline', work.tagline || '');
    setText('#work-author', work.author ? '作者：' + work.author : '');

    var desc = $('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content',
        work.name + (work.author ? '（作者 ' + work.author + '）' : '') + '：' +
        (work.tagline || '') + ' —— 创想时代开发组作品展示。');
    }

    // 头图
    var cover = $('#work-cover');
    if (cover && work.cover) {
      cover.src = work.cover;
      cover.alt = work.coverAlt || work.name;
    }

    // 左侧信息栏
    var facts = $('#work-facts');
    if (facts && work.facts && work.facts.length) {
      facts.innerHTML = work.facts.map(function (f) {
        return '<div><dt>' + esc(f.k) + '</dt><dd>' + esc(f.v) + '</dd></div>';
      }).join('');
    }

    // 正文
    var intro = $('#work-intro');
    if (intro && work.intro && work.intro.length) {
      intro.innerHTML = work.intro.map(function (p) {
        return '<p>' + esc(p) + '</p>';
      }).join('');
    }

    // 鸣谢 / 反馈渠道
    var thanks = $('#work-thanks');
    if (thanks && work.thanks && work.thanks.length) {
      thanks.hidden = false;
      thanks.innerHTML = work.thanks.map(function (t) {
        return '<div><dt>' + esc(t.k) + '</dt><dd>' + esc(t.v) + '</dd></div>';
      }).join('');
    }

    // 截图
    var shots = $('#work-shots');
    if (shots && work.shots && work.shots.length) {
      shots.innerHTML = work.shots.map(function (s, i) {
        return '' +
          '<figure class="shot">' +
            '<button class="shot-btn" type="button" data-index="' + i + '"' +
              ' aria-label="放大查看第 ' + (i + 1) + ' 张截图">' +
              '<img src="' + esc(s.img) + '" alt="' + esc(s.caption || work.name) + '" decoding="async">' +
            '</button>' +
            (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') +
          '</figure>';
      }).join('');
    }

    // 使用须知
    var notice = $('#work-notice');
    if (notice && work.notice) {
      notice.hidden = false;
      notice.className = 'callout';
      notice.innerHTML = '<span class="icon" aria-hidden="true">🛈</span><div>' +
        esc(work.notice) + '</div>';
    }

    // 上一件 / 下一件
    var ids = Object.keys(WORKS);
    if (ids.length > 1) {
      var idx = ids.indexOf(id);
      var prev = WORKS[ids[(idx - 1 + ids.length) % ids.length]];
      var next = WORKS[ids[(idx + 1) % ids.length]];
      var nav = $('#work-nav');
      if (nav) {
        nav.hidden = false;
        nav.innerHTML =
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(ids[(idx - 1 + ids.length) % ids.length]) + '">← ' + esc(prev.name) + '</a>' +
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(ids[(idx + 1) % ids.length]) + '">' + esc(next.name) + ' →</a>';
      }
    }

    initLightbox(work.shots || []);
  }

  /* ---------- 截图放大 ----------
     传入 shots 就用它；传 null / 空数组时，直接从页面上已有的截图读，
     这样静态兜底分支也能有放大功能。 */
  function initLightbox(shots) {
    var box = $('#lightbox');
    if (!box) return;

    if (!shots || !shots.length) {
      shots = $$('#work-shots .shot').map(function (fig) {
        var img = fig.querySelector('img');
        var cap = fig.querySelector('figcaption');
        return {
          img: img ? img.getAttribute('src') : '',
          caption: cap ? cap.textContent.trim() : ''
        };
      }).filter(function (s) { return s.img; });
    }
    if (!shots.length) return;

    var img = $('#lightbox-img');
    var cap = $('#lightbox-caption');
    var lastFocus = null;

    function open(i) {
      var s = shots[i];
      if (!s) return;
      lastFocus = document.activeElement;
      img.src = s.img;
      img.alt = s.caption || '';
      cap.textContent = s.caption || '';
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#lightbox-close').focus();
    }

    function close() {
      box.hidden = true;
      img.removeAttribute('src');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('.shot-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        open(Number(btn.getAttribute('data-index')));
      });
    });

    $('#lightbox-close').addEventListener('click', close);
    box.addEventListener('click', function (e) {
      // 点背景关闭，点图片本身不关
      if (e.target === box) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close();
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
    initSurvey();
    initTheme();
    initHeroImage();
    initShowcase();
    initWorkDetail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

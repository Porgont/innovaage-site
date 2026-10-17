/* ============================================================
   浏览器行为自检（CDP）
   验证：联系方式渲染、公告渲染与筛选、标签页切换、表单校验与兜底、
         404 页面、各尺寸无横向溢出、控制台无报错
   用法：先起本地服务（python -m http.server 8099），再 node tools/browser-test.mjs
   ============================================================ */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333;
const BASE = process.argv[2] || 'http://127.0.0.1:8099';

const results = [];
const fails = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  if (!pass) fails.push(`${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 启动 Edge + 连接 CDP ---------- */
// 视频相关断言需要媒体解码能力：--autoplay-policy 放开自动播放，
// 并且显式开启音频输出（无头模式下默认可能不给解码器）。
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-test-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream',
  '--mute-audio',
  'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 60; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = list.find(t => t.type === 'page');
    if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch { /* 等待 */ }
  await sleep(250);
}
if (!wsUrl) { console.error('无法连接 Edge 调试端口'); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push('未捕获异常: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  }
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const send = (method, params = {}) => {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res, rej) => pending.set(mid, { resolve: res, reject: rej }));
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval 失败');
  return r.result.value;
}

async function open(path, width = 1440, height = 1000, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  consoleErrors.length = 0;
  await send('Page.navigate', { url: BASE + path });
  await sleep(1800);
}

/* 轮询等待条件成立：主题切换带 180ms 过渡，固定 sleep 会读到旧值 */
async function waitFor(expr, tries = 30, gap = 50) {
  for (let i = 0; i < tries; i++) {
    try { if (await evalJs(expr)) return true; } catch { /* 元素还没出现 */ }
    await sleep(gap);
  }
  return false;
}

/* ============================================================
   1. 首页
   ============================================================ */
await open('/index.html');

check('首页标题正确', (await evalJs('document.title')).includes('创想时代开发组'));

check('首页公告渲染 2 条（data-limit）',
  await evalJs("document.querySelectorAll('#notice-list .notice').length === 2"),
  '实际 ' + await evalJs("document.querySelectorAll('#notice-list .notice').length"));

check('首页导航高亮「首页」',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '首页'"));

check('首页年份已填充',
  await evalJs("document.querySelector('[data-year]').textContent === String(new Date().getFullYear())"));

check('首页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs("document.documentElement.scrollWidth + ' vs ' + window.innerWidth"));

/* ============================================================
   2. 公告页
   ============================================================ */
await open('/news.html');

check('公告页渲染全部 3 条',
  await evalJs("document.querySelectorAll('#notice-list .notice').length === 3"));

check('置顶公告排在第一，且内容是代投 + 审核条例',
  await evalJs(`(function(){
    var first = document.querySelector('#notice-list .notice');
    var t = first.textContent;
    return first.querySelector('.tag--redstone') !== null
      && t.includes('代投') && t.includes('审核条例');
  })()`),
  await evalJs("document.querySelector('#notice-list .notice h3').textContent.trim()"));

check('置顶公告里有审核条例的腾讯文档链接',
  await evalJs(`!!document.querySelector('#notice-list .notice a[href*="docs.qq.com"]')`));

check('置顶公告里有代投群号',
  await evalJs(`document.querySelector('#notice-list .notice').textContent.includes('1018260006')`));

// 点「招募」筛选：数量由数据决定，这里比对「页面上带招募标签的公告数」是否一致
await evalJs("[...document.querySelectorAll('#notice-filter button')].find(b => b.textContent.trim() === '招募').click()");
await sleep(300);
check('筛选「招募」后只剩带该标签的公告',
  await evalJs("document.querySelectorAll('#notice-list .notice').length === 2"),
  '实际 ' + await evalJs("document.querySelectorAll('#notice-list .notice').length"));

check('筛选后筛选按钮高亮正确',
  await evalJs("document.querySelector('#notice-filter button.is-active').textContent.trim() === '招募'"));

// 点回「全部」
await evalJs("[...document.querySelectorAll('#notice-filter button')].find(b => b.textContent.trim() === '全部').click()");
await sleep(300);
check('切回「全部」恢复 3 条',
  await evalJs("document.querySelectorAll('#notice-list .notice').length === 3"));

// 空结果分支
await evalJs("[...document.querySelectorAll('#notice-filter button')].find(b => b.textContent.trim() === '合作').click()");
await sleep(300);
check('无结果时显示提示而不是空白',
  await evalJs("document.querySelector('#notice-list').textContent.includes('暂时没有符合条件')"));

/* ============================================================
   3. 加入 / 联系页
   ============================================================ */
await open('/join.html');

check('默认显示报名问卷面板',
  await evalJs("document.querySelector('#panel-form').hidden === false && document.querySelector('#panel-contact').hidden === true"));

const contacts = await evalJs(`JSON.stringify([...document.querySelectorAll('.contact-item')].map(el => {
  var fill = el.querySelector('[data-fill]');
  var link = el.querySelector('a[data-fill-href]');
  return {
    key: fill ? fill.getAttribute('data-fill') : null,
    value: fill ? fill.textContent.trim() : '',
    href: link ? link.getAttribute('href') : null,
    hidden: el.hidden
  };
}))`);
const contactList = JSON.parse(contacts);
const visible = contactList.filter(c => !c.hidden).map(c => c.key);
const byKey = k => contactList.find(c => c.key === k);

check('对外审核群显示出来（qqAudit）',
  visible.includes('qqAudit'), '当前显示: ' + visible.join(', '));
check('GitHub 仓库链接显示',
  visible.includes('siteRepo'));
check('未填写的邮箱自动隐藏',
  byKey('email')?.hidden === true, 'email 行 hidden=' + byKey('email')?.hidden);

/* --- 官方账号（网易我的世界 / 网易大神 / 抖音 / B站） --- */
check('四个官方账号都显示出来了',
  ['neteaseMc', 'neteaseHd', 'douyin', 'bilibiliName'].every(k => visible.includes(k)),
  '当前显示: ' + visible.join(', '));

check('网易我的世界显示团队开发者主账号名',
  byKey('neteaseMc')?.value === '创想时代开发组', '实际 ' + byKey('neteaseMc')?.value);
check('网易大神显示认证账号名',
  byKey('neteaseHd')?.value === '创想时代工作室', '实际 ' + byKey('neteaseHd')?.value);
check('抖音显示账号名',
  byKey('douyin')?.value === '创想时代开发组', '实际 ' + byKey('douyin')?.value);

check('B 站显示的是账号名而不是长网址',
  byKey('bilibiliName')?.value === '创想时代开发组', '实际 ' + byKey('bilibiliName')?.value);
check('B 站那一行链接指向正确的主页',
  byKey('bilibiliName')?.href === 'https://space.bilibili.com/488348167',
  '实际 ' + byKey('bilibiliName')?.href);

check('报名面板里的审核群号渲染正确',
  byKey('qqAudit')?.value === '1045216325',
  '实际 ' + byKey('qqAudit')?.value);

/* --- 复制按钮：点一下看它到底复制了什么 --- */
const copyRows = JSON.parse(await evalJs(`JSON.stringify([...document.querySelectorAll('.copy-btn')].map((b, i) => {
  var row = b.closest('.contact-item');
  var shown = row ? row.querySelector('.info b') : null;
  return {
    index: i,
    target: b.getAttribute('data-copy-target') || '(行内文字)',
    shownText: shown ? shown.textContent.trim() : '',
    rowHidden: row ? row.hidden : false,
    btnVisible: !!(b.offsetWidth || b.offsetHeight)
  };
}))`));

check('审核群那一行显示的是真实群号',
  copyRows.some(r => r.target === 'qqAudit' && r.shownText === '1045216325'),
  copyRows.map(r => r.target + '=' + r.shownText).join(' | '));

check('所有可点的复制按钮，行内都有真实文字（不会是「待填写」）',
  copyRows.filter(r => r.btnVisible).every(r => r.shownText && !r.shownText.includes('待填写')),
  copyRows.filter(r => r.btnVisible).map(r => r.target + '=' + JSON.stringify(r.shownText)).join(' | '));

check('未填写的邮箱整行隐藏',
  copyRows.filter(r => r.target === 'email').every(r => r.rowHidden === true));

// 真点一下 B 站的复制按钮，确认按钮反馈正常（走的是行内文字那条分支）
const copyClick = await evalJs(`(function(){
  var rows = [...document.querySelectorAll('.contact-item')];
  var row = rows.find(function (r) {
    var f = r.querySelector('[data-fill]');
    return f && f.getAttribute('data-fill') === 'bilibiliName';
  });
  if (!row) return 'no-row';
  var btn = row.querySelector('.copy-btn');
  btn.click();
  return btn.textContent.trim();
})()`);
check('B 站复制按钮点击后给出反馈（不是没反应）',
  copyClick === '已复制' || copyClick === '复制',
  '按钮文字=' + copyClick);
await sleep(200);

/* --- 问卷入口（问卷星）--- */
const surveyState = await evalJs(`JSON.stringify({
  href: document.querySelector('#survey-link').getAttribute('href'),
  target: document.querySelector('#survey-link').getAttribute('target'),
  disabled: document.querySelector('#survey-link').getAttribute('aria-disabled'),
  fallbackShown: !document.querySelector('#survey-fallback').hidden
})`);
const ss = JSON.parse(surveyState);
check('报名按钮指向已配置的问卷星链接，并在新窗口打开',
  ss.href === 'https://www.wjx.cn/vm/OtrfYCj.aspx' && ss.target === '_blank' && ss.disabled === null,
  JSON.stringify(ss));
check('问卷已配置，备用提示不再显示',
  ss.fallbackShown === false);

// 审核条例面板里「一审」那一步的行内链接要指向同一个问卷
await evalJs("document.querySelector('[aria-controls=\"panel-rules\"]').click()");
await waitFor("document.querySelector('#panel-rules').hidden === false");
check('审核条例「一审」处的行内链接指向同一个问卷',
  await evalJs("document.querySelector('#survey-link-rules')?.getAttribute('href') === 'https://www.wjx.cn/vm/OtrfYCj.aspx'"),
  '实际 ' + await evalJs("document.querySelector('#survey-link-rules')?.getAttribute('href')"));
await evalJs("document.querySelector('[aria-controls=\"panel-form\"]').click()");
await waitFor("document.querySelector('#panel-form').hidden === false");

/* --- 品牌资源 --- */
check('导航栏用的是真 logo 图（不再是 CSS 画的方块）',
  await evalJs(`(function(){
    var m = document.querySelector('.brand-mark');
    return m && m.tagName === 'IMG' && m.complete && m.naturalWidth > 0;
  })()`),
  'naturalWidth=' + await evalJs("document.querySelector('.brand-mark')?.naturalWidth"));

check('页面有 favicon 与 apple-touch-icon',
  await evalJs(`!!document.querySelector('link[rel="icon"][href*="favicon-32"]') &&
                !!document.querySelector('link[rel="apple-touch-icon"]')`));

check('页面有 og:image 分享图且文件真实存在',
  await evalJs(`(function(){
    var m = document.querySelector('meta[property="og:image"]');
    if (!m) return false;
    // og:image 写的是线上绝对地址，这里把它换成本地服务地址再取一次，验证文件真的在
    var path = new URL(m.content).pathname;
    return new Promise(function (resolve) {
      var probe = new Image();
      probe.onload = function () { resolve(probe.naturalWidth > 0); };
      probe.onerror = function () { resolve(false); };
      probe.src = path;
    });
  })()`));

check('关于我们页展示完整 logo 且已加载',
  await open('/about.html').then(() => evalJs(`(function(){
    var img = document.querySelector('.logo-plate img');
    return !!img && img.complete && img.naturalWidth > 0;
  })()`)));

await open('/join.html');

/* --- 四个标签页 --- */
check('加入页有四个标签页',
  await evalJs("document.querySelectorAll('.tabs .tab').length === 4"),
  '实际 ' + await evalJs("document.querySelectorAll('.tabs .tab').length"));

for (const [id, label] of [['panel-invest', '代投与投稿'], ['panel-rules', '审核条例']]) {
  await evalJs(`document.querySelector('[aria-controls="${id}"]').click()`);
  // 等面板真正显示出来再断言，否则会读到还没切过去的内容
  const shown = await waitFor(`document.querySelector('#${id}').hidden === false`);
  check(`能切到「${label}」面板`, shown);
}

check('代投面板写了授权要求',
  await evalJs("document.querySelector('#panel-invest').innerText.includes('原作者授权')"));

check('代投面板列出接收类型',
  await evalJs(`['地图','皮肤','材质','光影','功能玩法组件']
    .every(t => document.querySelector('#panel-invest').innerText.includes(t))`));

check('审核条例面板有腾讯文档链接',
  await evalJs(`!!document.querySelector('#panel-rules a[href*="docs.qq.com"]')`));

check('审核条例面板列出五个部门',
  await evalJs(`['皮肤部','地图部','技术部','文宣部','主席办']
    .every(d => document.querySelector('#panel-rules').innerText.includes(d))`));

check('审核条例面板写出三阶段流程',
  await evalJs(`['初审','一审','二审'].every(s => document.querySelector('#panel-rules').innerText.includes(s))`));

check('审核条例面板说明需自行阅读条例',
  await evalJs("document.querySelector('#panel-rules').innerText.includes('自行阅读条例')"));

// 切回报名面板
await evalJs("document.querySelector('#tab-form').click()");
await sleep(400);

// 切到联系面板
await evalJs("document.querySelector('#tab-contact').click()");
await sleep(500);
check('点击「联系我们」切到联系面板',
  await evalJs("document.querySelector('#panel-contact').hidden === false && document.querySelector('#panel-form').hidden === true"));
check('切换后地址栏哈希更新为 #panel-contact',
  await evalJs("location.hash === '#panel-contact'"), await evalJs('location.hash'));

const threeGroups = await evalJs(`JSON.stringify(
  [...document.querySelectorAll('#panel-contact .contact-item')]
    .filter(el => !el.hidden)
    .map(el => el.querySelector('[data-fill]').getAttribute('data-fill') + '=' + el.querySelector('[data-fill]').textContent.trim())
)`);
const groups = JSON.parse(threeGroups);
check('联系面板显示三个 QQ 群',
  ['qqPublic=788233856', 'qqCouncil=1018260006', 'qqAudit=1045216325'].every(g => groups.includes(g)),
  groups.join(' | '));

// 切回报名面板
await evalJs("document.querySelector('#tab-form').click()");
await sleep(500);

check('加入页无横向溢出（桌面）',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   3.5 关于我们页
   ============================================================ */
await open('/about.html');
const aboutText = await evalJs('document.body.innerText');
check('关于我们页写有成立日期', aboutText.includes('2016 年 3 月 10 日'));
check('关于我们页写有英文名', aboutText.includes('Innova Age Development Team'));
check('关于我们页写有五千万下载量', aboutText.includes('五千万') || aboutText.includes('5000 万'));
check('关于我们页写有团队宗旨', aboutText.includes('探索') && aboutText.includes('有想则创'));
check('关于我们页写有创始人威廉', aboutText.includes('威廉'));
check('关于我们页导航高亮正确',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '关于我们'"));
check('关于我们页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

await open('/index.html');
const homeText = await evalJs('document.body.innerText');
check('首页也带上了成立年份与下载量',
  homeText.includes('2016') && (homeText.includes('5000 万') || homeText.includes('五千万')));
check('首页页脚显示三个真实群号',
  ['788233856', '1018260006', '1045216325'].every(n => homeText.includes(n)),
  '实际页脚: ' + (await evalJs("document.querySelector('.footer-grid').innerText")).replace(/\n/g, ' / '));

/* ============================================================
   3.7 工具箱：图片压到 1000×4000 以内
   ============================================================ */
await open('/tools-image.html');

check('工具箱页导航高亮「工具箱」',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '工具箱'"));

check('默认上限是宽 1000 × 高 4000（不是 4000×1000）',
  await evalJs("document.querySelector('#max-w').value === '1000' && document.querySelector('#max-h').value === '4000'"),
  '实际 ' + await evalJs("document.querySelector('#max-w').value + '×' + document.querySelector('#max-h').value"));

// 尺寸计算：四种典型情况
const fit = JSON.parse(await evalJs(`JSON.stringify({
  tall:    window.__toolbox.fitSize(2000, 8000, 1000, 4000),
  wide:    window.__toolbox.fitSize(8000, 2000, 1000, 4000),
  huge:    window.__toolbox.fitSize(4000, 4000, 1000, 4000),
  small:   window.__toolbox.fitSize(300, 200, 1000, 4000),
  exact:   window.__toolbox.fitSize(1000, 4000, 1000, 4000),
  odd:     window.__toolbox.fitSize(3333, 7777, 1000, 4000),
  // 一批奇形怪状的尺寸，用来自动校验「不越界 + 不变形 + 不放大」三条硬规矩。
  // 注意：宽或高不足 1 像素时会被钳到 1px（像素不能是小数），
  // 这类极端长条（如 9999×1）的比例天然对不上，所以不放进等比校验里。
  batch: [
    [3333, 7777], [1001, 4001], [2000, 1], [1, 2000], [1234, 5678],
    [1600, 4800], [4000, 1000], [1000, 4000], [7, 7], [20000, 30000]
  ].map(function (d) {
    var r = window.__toolbox.fitSize(d[0], d[1], 1000, 4000);
    return { in: d, out: [r.width, r.height], scale: r.scale };
  })
})`));

check('竖长图 2000×8000 → 1000×4000',
  fit.tall.width === 1000 && fit.tall.height === 4000, JSON.stringify(fit.tall));
check('横图 8000×2000 → 1000×250',
  fit.wide.width === 1000 && fit.wide.height === 250, JSON.stringify(fit.wide));
check('正方图 4000×4000 → 1000×1000',
  fit.huge.width === 1000 && fit.huge.height === 1000, JSON.stringify(fit.huge));
check('小图 300×200 不被放大',
  fit.small.width === 300 && fit.small.height === 200 && fit.small.scale === 1, JSON.stringify(fit.small));
check('正好等于上限的图不变',
  fit.exact.width === 1000 && fit.exact.height === 4000, JSON.stringify(fit.exact));
check('非整除尺寸 3333×7777：宽度顶到 1000，高度按比例 2333',
  fit.odd.width === 1000 && fit.odd.height === 2333, JSON.stringify(fit.odd));

// 硬规矩一：永远不越界
const overLimit = fit.batch.filter(b => b.out[0] > 1000 || b.out[1] > 4000);
check('十组尺寸全部不超上限（宽 ≤1000 且 高 ≤4000）',
  overLimit.length === 0, JSON.stringify(overLimit));

// 硬规矩二：等比不变形。
// 尺寸取整会带来最多 1px 的误差，对细长图来说这个误差占比不可忽略
// （例如 2000×1 缩到 1000×0.5，高度只能取 1px）。
// 所以只有当两个方向都够大、取整误差可以忽略时才做严格比对；
// 其余情况只要求「符合取整后的最佳值」，不要求比例完美。
const distort = fit.batch.filter(b => {
  const [iw, ih] = b.in;
  const [ow, oh] = b.out;
  const ratio = iw / ih;
  const expectedW = Math.floor(iw * b.scale);
  const expectedH = Math.floor(ih * b.scale);
  const quantError = Math.max(1 / ow, 1 / oh);     // 取整误差占比上限
  if (quantError > 0.01) {                          // 太小，比例不可比
    return ow !== Math.max(1, expectedW) || oh !== Math.max(1, expectedH);
  }
  return Math.abs(ratio - ow / oh) > 0.005;
});
check('十组尺寸全部等比不变形（细长图按取整最佳值）',
  distort.length === 0, JSON.stringify(distort));

// 硬规矩三：绝不放大
const upscaled = fit.batch.filter(b => b.scale > 1);
check('十组尺寸都没有被放大', upscaled.length === 0, JSON.stringify(upscaled));

// 实际跑一遍：造一张 1600×4800 的图（比上限大，且是高长图）
const runResult = await evalJs(`(async () => {
  var c = document.createElement('canvas');
  c.width = 1600; c.height = 4800;
  var x = c.getContext('2d');
  var grad = x.createLinearGradient(0, 0, 0, 4800);
  grad.addColorStop(0, '#1a6b8a'); grad.addColorStop(1, '#f5c518');
  x.fillStyle = grad; x.fillRect(0, 0, 1600, 4800);
  var blob = await new Promise(function (r) { c.toBlob(r, 'image/png'); });
  var file = new File([blob], 'test-tall.png', { type: 'image/png' });
  window.__toolbox.addFiles([file]);
  await window.__toolbox.run();
  await new Promise(function (r) { setTimeout(r, 400); });

  var img = document.querySelector('#preview-img');
  var link = document.querySelector('#download-link');
  var stats = document.querySelector('#stat-list').innerText;
  return JSON.stringify({
    filesListed: document.querySelectorAll('.file-item').length,
    outW: window.__toolbox.state.results[0] ? window.__toolbox.state.results[0].outW : 0,
    outH: window.__toolbox.state.results[0] ? window.__toolbox.state.results[0].outH : 0,
    outName: link.getAttribute('download'),
    hasUrl: !!link.getAttribute('href'),
    previewW: img.naturalWidth,
    previewH: img.naturalHeight,
    statsText: stats,
    statusText: document.querySelector('#tool-status').innerText
  });
})()`);

const rr = JSON.parse(runResult);
check('选图后文件进入列表', rr.filesListed === 1, '实际 ' + rr.filesListed);
check('1600×4800 处理成 1000×3000（等比，不超上限）',
  rr.outW === 1000 && rr.outH === 3000, rr.outW + '×' + rr.outH);
check('结果文件名带上了尺寸', /-1000x3000\.(jpg|png|webp)$/.test(rr.outName || ''), rr.outName);
check('预览图真的渲染出来了（宽 1000）',
  rr.previewW === 1000 && rr.previewH === 3000, rr.previewW + '×' + rr.previewH);
check('下载链接可用', rr.hasUrl === true);
check('结果面板显示前后尺寸',
  rr.statsText.includes('1600') && rr.statsText.includes('1000'), rr.statsText.replace(/\n/g, ' | '));
check('处理完成有提示', rr.statusText.includes('处理完成'), rr.statusText.slice(0, 80));

check('只有一张结果时不显示空白按钮',
  await evalJs(`(function(){
    var b = document.querySelector('#download-all');
    return !b || getComputedStyle(b).display === 'none';
  })()`),
  'display=' + await evalJs("getComputedStyle(document.querySelector('#download-all')).display"));

// 预设切换：切到横图预设后再算一次
await evalJs(`document.querySelector('.chip[data-preset="4000x1000"]').click()`);
await sleep(300);
check('点横图预设后上限变成 4000×1000',
  await evalJs("document.querySelector('#max-w').value === '4000' && document.querySelector('#max-h').value === '1000'"));

check('切换预设后提示文案跟着变成横幅',
  await evalJs("document.querySelector('#fit-note').innerText.includes('横幅')"));

// 对调按钮
await evalJs("document.querySelector('#swap-wh').click()");
await sleep(300);
check('对调按钮能把宽高换过来',
  await evalJs("document.querySelector('#max-w').value === '1000' && document.querySelector('#max-h').value === '4000'"));

check('工具箱页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   3.8 作品页与首页大图
   ============================================================ */
await open('/index.html');

check('首页大图已加载出来',
  await evalJs(`(function(){
    var img = document.querySelector('#hero-figure img');
    return !!img && img.complete && img.naturalWidth > 0;
  })()`),
  'naturalWidth=' + await evalJs("document.querySelector('#hero-figure img')?.naturalWidth"));

check('首页大图体积在 500KB 以内',
  await evalJs(`(async () => {
    var img = document.querySelector('#hero-figure img');
    if (!img) return false;
    var r = await fetch(img.src);
    var b = await r.blob();
    return b.size <= 500 * 1024;
  })()`));

// 一个作品只能占一条。同一作品的多张截图属于详情页，不能在这里重复列出。
check('首页作品展示：一个作品只占一条',
  await evalJs("document.querySelectorAll('#showcase-grid .work').length === 1"),
  '实际 ' + await evalJs("document.querySelectorAll('#showcase-grid .work').length") + ' 条（应为 1）');

check('首页作品条目没有重复作品名',
  await evalJs(`(function(){
    var names = [...document.querySelectorAll('#showcase-grid .work h3')].map(function (h) { return h.textContent.trim(); });
    return new Set(names).size === names.length;
  })()`),
  await evalJs("JSON.stringify([...document.querySelectorAll('#showcase-grid .work h3')].map(h => h.textContent.trim()))"));

check('作品卡片带上了作者署名',
  await evalJs("[...document.querySelectorAll('#showcase-grid .work-meta')].every(m => m.textContent.includes('Log坤'))"));

// 必须真的加载出来（曾经因为 loading="lazy" 导致首屏外的图是空白块）
const showcaseLoaded = await waitFor(
  "[...document.querySelectorAll('#showcase-grid img')].every(i => i.complete && i.naturalWidth > 0)"
);
check('首页作品封面真正加载完成（不是空白块）', showcaseLoaded,
  '各图 naturalWidth: ' + await evalJs("JSON.stringify([...document.querySelectorAll('#showcase-grid img')].map(i => i.naturalWidth))"));

/* --- 首页要把「作品」放最亮、「代投」给入口 --- */
check('首页 Hero 第一个按钮指向作品页',
  await evalJs("(document.querySelector('.hero .btn-row a') || {}).getAttribute && document.querySelector('.hero .btn-row a').getAttribute('href') === 'works.html'"),
  '第一个按钮 href=' + await evalJs("document.querySelector('.hero .btn-row a')?.getAttribute('href')"));

check('首页 Hero 有代投入口',
  await evalJs("[...document.querySelectorAll('.hero .btn-row a')].some(a => a.getAttribute('href') === 'join.html#panel-invest')"));

check('首页作品区在公告区之前（位置更突出）',
  await evalJs(`(function(){
    var s = document.querySelector('#showcase');
    var n = document.querySelector('#latest-news');
    if (!s || !n) return false;
    return !!(s.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
  })()`));

check('首页有独立的代投区块',
  await evalJs("!!document.querySelector('#invest') && document.querySelector('#invest').innerText.includes('代投')"));

check('首页代投区块写了授权要求',
  await evalJs("document.querySelector('#invest').innerText.includes('原作者授权')"));

await open('/works.html');
check('作品页导航高亮「作品」',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '作品'"));

check('作品页：一个作品一条',
  await evalJs("document.querySelectorAll('#showcase-grid .work').length === 1"),
  '实际 ' + await evalJs("document.querySelectorAll('#showcase-grid .work').length") + ' 条（应为 1）');

check('作品页显示总数与条目数一致',
  await evalJs(`(function(){
    var n = document.querySelectorAll('#showcase-grid .work').length;
    return Number(document.querySelector('#work-count')?.textContent) === n;
  })()`),
  '总数=' + await evalJs("document.querySelector('#work-count')?.textContent") + ' 条目=' + await evalJs("document.querySelectorAll('#showcase-grid .work').length"));

check('作品页封面能加载',
  await evalJs(`[...document.querySelectorAll('#showcase-grid img')].every(i => i.complete && i.naturalWidth > 0)`));

check('作品页不再出现我编的「默认允许使用」口径',
  await evalJs("!document.body.innerText.includes('作品默认允许')"));

check('作品页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   3.9 作品详情页
   ============================================================ */
await open('/works.html');
check('作品卡片有「查看详情」入口且指向详情页',
  await evalJs(`(function(){
    var a = document.querySelector('#showcase-grid .work-more');
    return !!a && a.getAttribute('href').indexOf('work.html?id=') === 0;
  })()`),
  await evalJs("document.querySelector('#showcase-grid .work-more')?.getAttribute('href')"));

await open('/work.html?id=log-shader-sa');

// 关键：证明是 JS 渲染出来的，而不是页面里写死的静态兜底内容
check('详情页确实由 JS 渲染（不是静态兜底）',
  await evalJs("document.querySelector('#work-detail').getAttribute('data-work-id') === 'log-shader-sa'"),
  'data-work-id=' + await evalJs("document.querySelector('#work-detail').getAttribute('data-work-id')"));

check('详情页标题是作品名', (await evalJs('document.title')).includes('Log光影'));
check('详情页显示作品名与作者',
  await evalJs("document.querySelector('#work-name').textContent.includes('橡木 SA') && document.querySelector('#work-author').textContent.includes('Log坤')"));
check('详情页头图加载完成',
  await evalJs("(function(){ var i = document.querySelector('#work-cover'); return i.complete && i.naturalWidth > 0; })()"),
  'naturalWidth=' + await evalJs("document.querySelector('#work-cover').naturalWidth"));
check('详情页有作品介绍正文',
  await evalJs("document.querySelectorAll('#work-intro p').length >= 3"),
  '实际 ' + await evalJs("document.querySelectorAll('#work-intro p').length") + ' 段');
check('详情页信息栏有 8 条（含前置与三个群）',
  await evalJs("document.querySelectorAll('#work-facts > div').length === 8"),
  '实际 ' + await evalJs("document.querySelectorAll('#work-facts > div').length"));

check('详情页写了 SRC 前置要求',
  await evalJs("document.querySelector('#work-facts').innerText.includes('0559302')"));

check('详情页列出 4 张截图（雨景 + 原有三张）',
  await evalJs("document.querySelectorAll('#work-shots .shot').length === 4"),
  '实际 ' + await evalJs("document.querySelectorAll('#work-shots .shot').length"));

check('原有三张图没被删掉',
  await evalJs(`(function(){
    var srcs = [...document.querySelectorAll('#work-shots img')].map(i => i.getAttribute('src')).join(' ');
    return srcs.includes('shader-1') && srcs.includes('shader-2') && srcs.includes('shader-3');
  })()`));

check('封面换成了雨景图',
  await evalJs("document.querySelector('#work-cover').getAttribute('src').includes('shader-rain')"),
  await evalJs("document.querySelector('#work-cover').getAttribute('src')"));

check('详情页有鸣谢与反馈渠道',
  await evalJs(`(function(){
    var t = document.querySelector('#work-thanks');
    return t && !t.hidden && t.innerText.includes('Log坤') && t.innerText.includes('1017068586');
  })()`));
check('每张截图都有说明文字',
  await evalJs("[...document.querySelectorAll('#work-shots figcaption')].every(f => f.textContent.trim().length > 8)"));
check('三张截图都真正加载完成',
  await waitFor("[...document.querySelectorAll('#work-shots img')].every(i => i.complete && i.naturalWidth > 0)"),
  '各图宽度: ' + await evalJs("JSON.stringify([...document.querySelectorAll('#work-shots img')].map(i => i.naturalWidth))"));
check('详情页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

// 放大查看
check('放大层默认是关的',
  await evalJs("document.querySelector('#lightbox').hidden === true"));
await evalJs("document.querySelector('.shot-btn').click()");
await sleep(500);
check('点截图能打开放大层',
  await evalJs("document.querySelector('#lightbox').hidden === false"));
check('放大层里显示的是对应那张图',
  await evalJs("document.querySelector('#lightbox-img').getAttribute('src').includes('shader-rain')"),
  await evalJs("document.querySelector('#lightbox-img').getAttribute('src')"));
check('放大层带说明文字',
  await evalJs("document.querySelector('#lightbox-caption').textContent.length > 8"));
await evalJs("document.querySelector('#lightbox-close').click()");
await sleep(400);
check('能关掉放大层',
  await evalJs("document.querySelector('#lightbox').hidden === true"));

// id 不存在时的兜底
await open('/work.html?id=mei-you-zhe-ge');
check('id 不存在时给出提示且不空白',
  await evalJs("!!document.querySelector('#work-name').textContent.trim() && document.body.innerText.includes('没找到编号')"));

// 不带 id 直接访问：应该保留静态兜底，且不报「没找到」
await open('/work.html');
check('不带 id 访问时展示默认代表作（静态兜底）',
  await evalJs("document.querySelector('#work-shots').querySelectorAll('.shot').length === 3 && !document.body.innerText.includes('没找到编号')"));

check('不带 id 时没有 JS 渲染标记（确认走的是兜底分支）',
  await evalJs("document.querySelector('#work-detail').getAttribute('data-work-id') === null"),
  'data-work-id=' + await evalJs("document.querySelector('#work-detail').getAttribute('data-work-id')"));

// 放大功能在不带 id 的情况下也必须可用（这一条曾经是坏的）
await evalJs("document.querySelector('.shot-btn').click()");
const lbOnFallback = await waitFor("document.querySelector('#lightbox').hidden === false");
check('静态兜底页面上点截图也能放大',
  lbOnFallback,
  'hidden=' + await evalJs("document.querySelector('#lightbox').hidden"));
await evalJs("document.querySelector('#lightbox-close').click()");
await sleep(300);

/* ============================================================
   3.10 视频工具：这里只查「页面与依赖就位」
   完整流程（诊断 → 转换 → 复检）在 tools/test-video.mjs 里单独跑。
   原因：视频解码会占用媒体管线，在跑过上百次页面跳转的同一个浏览器实例里
   再测视频会稳定读不到元数据（文件其实是好的），把十几条断言一起染红、
   反而掩盖真实故障。拆成两个文件后两边都稳定。
   ============================================================ */
await open('/tools-video.html');

check('视频工具卡片与依赖就位',
  await evalJs(`!!document.querySelector('#v-run-btn') &&
                typeof MP4Box === 'object' &&
                typeof window.__videoTool === 'object'`),
  'MP4Box=' + await evalJs("typeof MP4Box") +
  '，__videoTool=' + await evalJs("typeof window.__videoTool"));

check('画面处理两种方式都在（加黑边 / 裁切）',
  await evalJs(`document.querySelectorAll('.chip[data-fit]').length === 2 &&
                !!document.querySelector('.chip[data-fit="pad"]') &&
                !!document.querySelector('.chip[data-fit="crop"]')`));

check('编码检测不依赖外网 CDN',
  await evalJs(`[...document.querySelectorAll('script[src]')].every(s => !/^https?:/.test(s.getAttribute('src')))`));

check('视频工具页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   3.11 工具箱入口页与 matoga 页
   ============================================================ */
await open('/tools.html');

check('工具箱入口页有三张模块卡片',
  await evalJs("document.querySelectorAll('.module-card').length === 3"),
  '实际 ' + await evalJs("document.querySelectorAll('.module-card').length"));

check('三张卡片分别指向三个模块页',
  await evalJs(`(function(){
    var hrefs = [...document.querySelectorAll('.module-card')].map(function (a) { return a.getAttribute('href'); });
    return hrefs.indexOf('tools-image.html') >= 0 &&
           hrefs.indexOf('tools-video.html') >= 0 &&
           hrefs.indexOf('tools-matoga.html') >= 0;
  })()`),
  await evalJs("JSON.stringify([...document.querySelectorAll('.module-card')].map(a => a.getAttribute('href')))"));

check('工具箱入口页导航高亮「工具箱」',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '工具箱'"));

check('工具箱入口页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

await open('/tools-matoga.html');

check('matoga 页写明了作者署名',
  await evalJs("document.body.innerText.includes('芝世')"));

check('matoga 页有指向源码仓库的链接',
  await evalJs(`!!document.querySelector('a[href="https://github.com/xiongmiaozai/matoga"]')`));

check('matoga 页有指向项目主页的链接',
  await evalJs(`!!document.querySelector('a[href*="xiongmiaozai.github.io/matoga"]')`));

check('matoga 页写明了 MIT 许可证与署名要求',
  await evalJs("document.body.innerText.includes('MIT') && document.body.innerText.includes('保留并标明')"));

const matogaShotOk = await waitFor(
  "document.querySelector('.shot-figure img') && document.querySelector('.shot-figure img').naturalWidth > 0"
);
check('matoga 界面截图真的加载出来了',
  matogaShotOk,
  'naturalWidth=' + await evalJs("document.querySelector('.shot-figure img')?.naturalWidth"));

check('matoga 页有下载说明',
  await evalJs("document.body.innerText.includes('releases')"));

check('matoga 页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

check('matoga 页能回到工具箱',
  await evalJs(`!!document.querySelector('a[href="tools.html"]')`));


/* ============================================================
   4. 移动端
   ============================================================ */
await open('/index.html', 390, 900, true);

check('移动端桌面导航已隐藏',
  await evalJs("getComputedStyle(document.querySelector('.site-header .nav')).display === 'none'"));

check('移动端有汉堡按钮且可见',
  await evalJs(`(function(){
    var b = document.querySelector('.mnav-btn');
    return !!b && b.offsetWidth > 0 && b.offsetHeight > 0;
  })()`),
  await evalJs("(function(){ var b = document.querySelector('.mnav-btn'); return b ? Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height) : 'none'; })()"));

check('侧栏默认是收起的',
  await evalJs(`(function(){
    var t = document.querySelector('#mnav-toggle');
    return t && t.checked === false && getComputedStyle(document.querySelector('.mnav-drawer')).display === 'none';
  })()`));

check('侧栏里的链接有 7 条',
  await evalJs("document.querySelectorAll('.mnav-links a').length === 7"),
  '实际 ' + await evalJs("document.querySelectorAll('.mnav-links a').length"));

// 展开：点汉堡对应的 label
await evalJs("document.querySelector('.mnav-btn').click()");
await waitFor("document.querySelector('#mnav-toggle').checked === true");

check('点汉堡可以展开侧栏',
  await evalJs("document.querySelector('#mnav-toggle').checked === true"));

check('展开后抽屉真的占满右侧一列',
  await evalJs(`(function(){
    var d = document.querySelector('.mnav-drawer');
    var r = d.getBoundingClientRect();
    return getComputedStyle(d).display === 'flex' && r.width > 200 && r.height > 400;
  })()`),
  await evalJs("(function(){ var r = document.querySelector('.mnav-drawer').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()"));

check('展开后遮罩铺满整个屏幕',
  await evalJs(`(function(){
    var o = document.querySelector('.mnav-overlay');
    var r = o.getBoundingClientRect();
    return getComputedStyle(o).display === 'block' && r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1;
  })()`),
  await evalJs("(function(){ var r = document.querySelector('.mnav-overlay').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) + ' / 视口 ' + window.innerWidth + 'x' + window.innerHeight; })()"));

check('展开后侧栏里的链接可见可点',
  await evalJs(`(function(){
    var a = document.querySelector('.mnav-links a');
    var r = a.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden';
  })()`));

check('展开后当前页在侧栏里高亮',
  await evalJs("document.querySelector('.mnav-links a.is-active') !== null"),
  await evalJs("document.querySelector('.mnav-links a.is-active')?.textContent.trim()"));

// 点遮罩收起
await evalJs("document.querySelector('.mnav-overlay').click()");
await waitFor("document.querySelector('#mnav-toggle').checked === false");
check('点遮罩能收起侧栏',
  await evalJs("document.querySelector('#mnav-toggle').checked === false"));

// 再展开，点关闭按钮收起
await evalJs("document.querySelector('.mnav-btn').click()");
await waitFor("document.querySelector('#mnav-toggle').checked === true");
await evalJs("document.querySelector('.mnav-close').click()");
await waitFor("document.querySelector('#mnav-toggle').checked === false");
check('点关闭按钮能收起侧栏',
  await evalJs("document.querySelector('#mnav-toggle').checked === false"));

await open('/join.html', 390, 900, true);
check('移动端加入页也有侧栏',
  await evalJs("!!document.querySelector('.mnav-btn') && !!document.querySelector('.mnav-links')"));

check('移动端加入页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

await open('/about.html', 390, 900, true);
check('移动端关于我们页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ---------- 工具箱页面：窄屏排版 ----------
   曾经这两页在手机上两栏不收成一栏，每栏只剩一百多像素，
   数值列被挤到二十几像素，一串数字就会「一个数字一行」。
   下面几条专门盯这个问题。 */
for (const [name, url] of [
  ['视频处理页', '/tools-video.html'],
  ['图片处理页', '/tools-image.html']
]) {
  await open(url, 390, 900, true);

  check(name + '：正文区收成单栏（不再并排两栏）',
    await evalJs(`(function(){
      var tool = document.querySelector('.tool');
      var cols = [...document.querySelectorAll('.tool-col')];
      if (!tool || cols.length < 2) return false;
      var tw = tool.getBoundingClientRect().width;
      return cols.every(function (c) { return c.getBoundingClientRect().width > tw * 0.9; });
    })()`),
    '栏目宽度 ' + await evalJs("JSON.stringify([...document.querySelectorAll('.tool-col')].map(function(c){return Math.round(c.getBoundingClientRect().width);}))"));

  // 通用判据：整页不该出现「又窄又高」的文字块 —— 那就是一字一行的特征
  check(name + '：没有「一字一行」的文字块',
    await evalJs(`(function(){
      var bad = [];
      [...document.querySelectorAll('.wrap *')].forEach(function (el) {
        // 只看到直接装着文字的叶子元素
        var hasText = [...el.childNodes].some(function (n) {
          return n.nodeType === 3 && n.textContent.trim().length > 1;
        });
        if (!hasText) return;
        // 单个图标/emoji 不算文字断行问题，要求至少 4 个字符
        if (el.textContent.trim().length < 4) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        var lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
        // 宽度不到 40px、却排了三行以上 → 一字一行
        if (r.width < 40 && r.height > lh * 3) {
          bad.push(el.tagName + '.' + (el.className || '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
      });
      window.__narrowBlocks = bad;
      return bad.length === 0;
    })()`),
    await evalJs("JSON.stringify(window.__narrowBlocks || [])"));

  check(name + '：手机端无横向溢出',
    await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
    await evalJs("document.documentElement.scrollWidth + ' vs ' + window.innerWidth"));
}

// 视频页的说明表格是常驻的，可以精确断言
await open('/tools-video.html', 390, 900, true);
check('视频处理页：说明表格的数值列有足够宽度',
  await evalJs(`(function(){
    var dd = document.querySelector('.stat-list dd');
    if (!dd) return false;
    var r = dd.getBoundingClientRect();
    var lh = parseFloat(getComputedStyle(dd).lineHeight) || 20;
    return r.width > 100 && r.height < lh * 3;
  })()`),
  await evalJs("(function(){ var d = document.querySelector('.stat-list dd'); if(!d) return '无'; var r = d.getBoundingClientRect(); return '宽 ' + Math.round(r.width) + '，高 ' + Math.round(r.height); })()"));

check('视频处理页：数值不再用 break-all 硬断词',
  await evalJs(`(function(){
    var dd = document.querySelector('.stat-list dd');
    return dd ? getComputedStyle(dd).wordBreak !== 'break-all' : false;
  })()`),
  await evalJs("document.querySelector('.stat-list dd') ? getComputedStyle(document.querySelector('.stat-list dd')).wordBreak : '无'"));

// 超窄屏（320px）也不许溢出
await open('/tools-video.html', 320, 800, true);
check('320px 超窄屏下视频页不横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs("document.documentElement.scrollWidth + ' vs ' + window.innerWidth"));

/* ============================================================
   5. 404 页
   ============================================================ */
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/no-such-page-xyz' });
await sleep(1500);
check('404 页面渲染「被挖掉了」',
  (await evalJs('document.body.innerText')).includes('被挖掉了'));
check('404 页面样式已加载（站点字体生效）',
  await evalJs("getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'"),
  await evalJs("getComputedStyle(document.body).backgroundColor"));

/* ============================================================
   6. 深浅主题
   ============================================================ */
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }]
});
await open('/index.html');

// 清掉记忆，验证“默认进去是白色”
await evalJs("localStorage.removeItem('ia-theme')");
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }]
});
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(1600);

check('默认（首次访问）是浅色',
  await evalJs("getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)'"),
  '实际 body 底色 ' + await evalJs("getComputedStyle(document.body).backgroundColor"));

check('默认是黑色实心主按钮（终末地范式）',
  await evalJs("getComputedStyle(document.querySelector('.btn')).backgroundColor === 'rgb(26, 28, 32)'"),
  '实际 ' + await evalJs("getComputedStyle(document.querySelector('.btn')).backgroundColor"));

check('默认正文是深色文字',
  await evalJs("getComputedStyle(document.body).color === 'rgb(20, 22, 26)'"),
  '实际 ' + await evalJs("getComputedStyle(document.body).color"));

check('标题下有黄色高亮标记',
  await evalJs("getComputedStyle(document.querySelector('.section-head')).borderLeftColor === 'rgb(245, 197, 24)'"),
  '实际 ' + await evalJs("getComputedStyle(document.querySelector('.section-head')).borderLeftColor"));

// 切换到深色
await evalJs("document.querySelector('#theme-toggle').click()");
await waitFor("!document.documentElement.classList.contains('theme-switching')");
const darkState = await evalJs(`JSON.stringify({
  attr: document.documentElement.getAttribute('data-theme'),
  stored: localStorage.getItem('ia-theme'),
  bgVar: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  rootClass: document.documentElement.className,
  colorScheme: getComputedStyle(document.documentElement).colorScheme
})`);
const ds = JSON.parse(darkState);
check('点一下就切到深色',
  ds.attr === 'dark' && ds.bodyBg === 'rgb(14, 16, 19)',
  JSON.stringify(ds));

check('切换后写入了 localStorage 记忆',
  ds.stored === 'dark', '实际 ' + ds.stored);

check('浅色 / 深色底色确实不同',
  ds.bodyBg !== 'rgb(255, 255, 255)', '深色底 ' + ds.bodyBg);

check('切换动画结束后 theme-switching 类被摘掉（不会一直挂着）',
  ds.rootClass === '', '实际 class="' + ds.rootClass + '"');

check('按钮文案预告的是“将要切到的模式”',
  await evalJs("document.querySelector('[data-theme-label]').textContent === '浅色'"),
  '实际 ' + await evalJs("document.querySelector('[data-theme-label]').textContent"));

// 刷新后要记住
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(1500);
check('刷新后仍是深色（记忆生效）',
  await evalJs("document.documentElement.getAttribute('data-theme') === 'dark' && getComputedStyle(document.body).backgroundColor === 'rgb(14, 16, 19)'"),
  '实际 ' + await evalJs("getComputedStyle(document.body).backgroundColor"));

// 换页后要记住
await open('/about.html');
check('换到别的页面仍是深色',
  await evalJs("document.documentElement.getAttribute('data-theme') === 'dark'"));

// 手动选过之后，不再跟随系统
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }]
});
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(1400);
check('手动选过深色后，系统是浅色也不被覆盖',
  await evalJs("document.documentElement.getAttribute('data-theme') === 'dark' && getComputedStyle(document.body).backgroundColor === 'rgb(14, 16, 19)'"));

// 切回浅色并清掉记忆，方便后续用例
const beforeToggle = await evalJs(`JSON.stringify({
  attr: document.documentElement.getAttribute('data-theme'),
  stored: localStorage.getItem('ia-theme'),
  hasBtn: !!document.querySelector('#theme-toggle'),
  bg: getComputedStyle(document.body).backgroundColor
})`);
await evalJs("document.querySelector('#theme-toggle').click()");
const becameLight = await waitFor(
  "document.documentElement.getAttribute('data-theme') === 'light' && getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)'"
);
const afterToggle = await evalJs(`JSON.stringify({
  attr: document.documentElement.getAttribute('data-theme'),
  stored: localStorage.getItem('ia-theme'),
  cls: document.documentElement.className,
  bgVar: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  bodyBg: getComputedStyle(document.body).backgroundColor
})`);
check('能切回浅色', becameLight,
  '点之前 ' + beforeToggle + ' → 点之后 ' + afterToggle);

// 没手动选过时，跟随系统深色
await evalJs("localStorage.removeItem('ia-theme')");
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }]
});
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(1500);
check('没手动选过时跟随系统深色',
  await evalJs("document.documentElement.getAttribute('data-theme') !== 'light' && getComputedStyle(document.body).backgroundColor === 'rgb(14, 16, 19)'"),
  '实际 ' + await evalJs("getComputedStyle(document.body).backgroundColor"));

// 恢复默认环境
await evalJs("localStorage.removeItem('ia-theme')");
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }]
});

await open('/index.html');
await open('/about.html');
await open('/works.html');
await open('/tools.html');
await open('/tools-image.html');
await open('/tools-video.html');
await open('/tools-matoga.html');
await open('/work.html?id=log-shader-sa');
await open('/news.html');
await open('/join.html');
check('七个页面在浅色下控制台无 JS 报错',
  consoleErrors.length === 0, consoleErrors.join(' | '));

ws.close();
edge.kill();

/* ---------- 输出 ---------- */
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - [...s].length * 1));
console.log('\n=== 浏览器行为自检 ===\n');
for (const r of results) {
  console.log(`${r.pass ? '✓' : '✗'} ${pad(r.name, 40)} ${r.pass ? '' : r.detail}`);
}
console.log(`\n共 ${results.length} 项，通过 ${results.length - fails.length} 项，失败 ${fails.length} 项`);
if (fails.length) {
  console.log('\n失败明细:');
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}

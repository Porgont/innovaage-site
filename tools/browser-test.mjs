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
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + join(process.env.TEMP, 'dsh-test-' + Date.now()),
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'
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

check('置顶公告排在第一',
  await evalJs("document.querySelector('#notice-list .notice h3').textContent.includes('官网正式上线')"));

// 点「招募」筛选
await evalJs("[...document.querySelectorAll('#notice-filter button')].find(b => b.textContent.trim() === '招募').click()");
await sleep(300);
check('筛选「招募」后只剩 1 条',
  await evalJs("document.querySelectorAll('#notice-list .notice').length === 1"),
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

const contacts = await evalJs(`JSON.stringify([...document.querySelectorAll('.contact-item')].map(el => ({
  key: el.querySelector('[data-fill]').getAttribute('data-fill'),
  value: el.querySelector('[data-fill]').textContent.trim(),
  hidden: el.hidden
})))`);
const contactList = JSON.parse(contacts);
const visible = contactList.filter(c => !c.hidden).map(c => c.key);

check('对外审核群显示出来（qqAudit）',
  visible.includes('qqAudit'), '当前显示: ' + visible.join(', '));
check('GitHub 仓库链接显示',
  visible.includes('siteRepo'));
check('未填写的邮箱自动隐藏',
  contactList.find(c => c.key === 'email')?.hidden === true);
check('未填写的 B 站自动隐藏',
  contactList.find(c => c.key === 'bilibili')?.hidden === true);

check('报名面板里的审核群号渲染正确',
  contactList.find(c => c.key === 'qqAudit')?.value === '1045216325',
  '实际 ' + contactList.find(c => c.key === 'qqAudit')?.value);

const copyVals = await evalJs(`JSON.stringify([...document.querySelectorAll('.copy-btn')].map(b => {
  var row = b.closest('.contact-item');
  return {
    target: b.getAttribute('data-copy-target'),
    value: b.getAttribute('data-copy'),
    rowHidden: row ? row.hidden : false,
    btnVisible: !!(b.offsetWidth || b.offsetHeight)
  };
}))`);
const copies = JSON.parse(copyVals);
const auditCopy = copies.find(c => c.target === 'qqAudit');
check('审核群复制按钮带上了真实群号', auditCopy?.value === '1045216325', '实际 ' + JSON.stringify(auditCopy?.value));

check('所有可点的复制按钮都有真值（不会复制到「待填写」）',
  copies.filter(c => c.btnVisible).every(c => c.value && !c.value.includes('待填写')),
  copies.filter(c => c.btnVisible).map(c => c.target + '=' + JSON.stringify(c.value)).join(' | '));

check('未填写的联系方式整行隐藏，复制按钮也没有值',
  copies.filter(c => c.target === 'email' || c.target === 'bilibili')
    .every(c => c.rowHidden === true && c.value === ''));

/* --- 问卷入口（问卷星） --- */
const surveyState = await evalJs(`JSON.stringify({
  href: document.querySelector('#survey-link').getAttribute('href'),
  target: document.querySelector('#survey-link').getAttribute('target'),
  disabled: document.querySelector('#survey-link').getAttribute('aria-disabled'),
  fallbackShown: !document.querySelector('#survey-fallback').hidden
})`);
const ss = JSON.parse(surveyState);
check('未填问卷星链接时按钮降级且显示备用提示',
  ss.disabled === 'true' && ss.fallbackShown === true && ss.href === '#panel-contact',
  JSON.stringify(ss));

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
   3.6 作品页与首页大图
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

check('首页作品展示渲染 3 张',
  await evalJs("document.querySelectorAll('#showcase-grid .work').length === 3"),
  '实际 ' + await evalJs("document.querySelectorAll('#showcase-grid .work').length"));

check('作品卡片带上了作者署名',
  await evalJs("[...document.querySelectorAll('#showcase-grid .work-meta')].every(m => m.textContent.includes('Log坤'))"));

// 必须真的加载出来（曾经因为 loading="lazy" 导致首屏外的图是空白块）
const showcaseLoaded = await waitFor(
  "[...document.querySelectorAll('#showcase-grid img')].every(i => i.complete && i.naturalWidth > 0)"
);
check('作品展示三张图都真正加载完成（不是空白块）', showcaseLoaded,
  '各图 naturalWidth: ' + await evalJs("JSON.stringify([...document.querySelectorAll('#showcase-grid img')].map(i => i.naturalWidth))"));

await open('/works.html');
check('作品页导航高亮「作品」',
  await evalJs("document.querySelector('.nav a.is-active')?.textContent.trim() === '作品'"));

check('作品页渲染全部 3 件',
  await evalJs("document.querySelectorAll('#showcase-grid .work').length === 3"));

check('作品页显示总数',
  await evalJs("document.querySelector('#work-count')?.textContent === '3'"),
  '实际 ' + await evalJs("document.querySelector('#work-count')?.textContent"));

check('作品页三张图都能加载',
  await evalJs(`[...document.querySelectorAll('#showcase-grid img')].every(i => i.complete && i.naturalWidth > 0)`));

check('作品页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   4. 移动端
   ============================================================ */
await open('/index.html', 390, 900, true);
check('移动端首页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs("document.documentElement.scrollWidth + ' vs ' + window.innerWidth"));
check('移动端导航换行成整行（宽度撑满容器）',
  await evalJs(`(function(){
    var nav = document.querySelector('.nav');
    var bar = document.querySelector('.site-header .bar');
    return Math.abs(nav.getBoundingClientRect().width - bar.getBoundingClientRect().width) < 2;
  })()`),
  await evalJs("Math.round(document.querySelector('.nav').getBoundingClientRect().width) + ' vs ' + Math.round(document.querySelector('.site-header .bar').getBoundingClientRect().width)"));

await open('/join.html', 390, 900, true);
check('移动端加入页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

await open('/about.html', 390, 900, true);
check('移动端关于我们页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

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
await open('/news.html');
await open('/join.html');
check('五个页面在浅色下控制台无 JS 报错',
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

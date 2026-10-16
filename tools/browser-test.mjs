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

check('QQ 群联系方式显示出来（qqGroup 映射修复）',
  visible.includes('qq'), '当前显示: ' + visible.join(', '));
check('邮箱联系方式显示',
  visible.includes('email'));
check('GitHub 联系方式显示',
  visible.includes('github'));
check('未填写的 Discord 自动隐藏',
  contactList.find(c => c.key === 'discord')?.hidden === true);
check('未填写的 B 站自动隐藏',
  contactList.find(c => c.key === 'bilibili')?.hidden === true);

check('QQ 群号正确渲染为 000000000',
  contactList.find(c => c.key === 'qq')?.value === '000000000',
  '实际 ' + contactList.find(c => c.key === 'qq')?.value);

const copyVals = await evalJs(`JSON.stringify([...document.querySelectorAll('.copy-btn')].map(b => ({
  target: b.getAttribute('data-copy-target'),
  value: b.getAttribute('data-copy'),
  rowHidden: b.closest('.contact-item').hidden
})))`);
const copies = JSON.parse(copyVals);
const qqCopy = copies.find(c => c.target === 'qqGroup');
check('QQ 复制按钮带上了真实号码', qqCopy?.value === '000000000', '实际 ' + JSON.stringify(qqCopy?.value));
check('隐藏行的复制按钮值为空（不会复制到「待填写」）',
  copies.filter(c => c.rowHidden).every(c => c.value === ''));

// 切到联系面板
await evalJs("document.querySelector('#tab-contact').click()");
await sleep(500);
check('点击「联系我们」切到联系面板',
  await evalJs("document.querySelector('#panel-contact').hidden === false && document.querySelector('#panel-form').hidden === true"));
check('切换后地址栏哈希更新为 #panel-contact',
  await evalJs("location.hash === '#panel-contact'"), await evalJs('location.hash'));

// 切回问卷面板
await evalJs("document.querySelector('#tab-form').click()");
await sleep(500);

/* --- 表单校验 --- */
// 1) 未勾选同意 → 拦截
await evalJs(`(function(){
  document.querySelector('#f-nickname').value = '测试员';
  document.querySelector('#f-contact').value = 'QQ 123';
  document.querySelector('#f-intro').value = '提交测试';
  document.querySelector('input[name="consent"]').checked = false;
})()`);
await evalJs("document.querySelector('#join-submit').click()");
await sleep(400);
check('未勾选同意时拦截提交并提示',
  (await evalJs("document.querySelector('#form-status').textContent")).includes('勾选'));

// 2) 邮箱格式错误 → 拦截
await evalJs(`(function(){
  document.querySelector('input[name="consent"]').checked = true;
  document.querySelector('#f-email').value = 'not-an-email';
})()`);
await evalJs("document.querySelector('#join-submit').click()");
await sleep(400);
check('邮箱格式错误时拦截提交',
  (await evalJs("document.querySelector('#form-status').textContent")).includes('邮箱格式'));

// 3) 合法数据 + 未配置 formEndpoint → 邮件兜底
await evalJs(`(function(){
  document.querySelector('#f-email').value = '';
  document.querySelector('input[name="roles"][value="建筑 / 地形"]').checked = true;
})()`);
await evalJs("document.querySelector('#join-submit').click()");
await sleep(500);
const fallback = await evalJs("document.querySelector('#form-status').innerHTML");
check('未配置接收地址时给出邮件兜底',
  fallback.includes('mailto:') && fallback.includes('contact@innovaage.cn'));
check('邮件兜底链接包含填写的昵称',
  decodeURIComponent(fallback).includes('测试员') || decodeURIComponent(fallback).includes('建筑 / 地形'));

// 4) 字数计数器
await evalJs("document.querySelector('#f-intro').value='12345'; document.querySelector('#f-intro').dispatchEvent(new Event('input'))");
await sleep(200);
check('自我介绍字数计数器工作',
  await evalJs("document.querySelector('#intro-count').textContent === '5'"),
  '实际 ' + await evalJs("document.querySelector('#intro-count').textContent"));

/* --- 表单字段完整性 --- */
const fieldInfo = await evalJs(`JSON.stringify({
  inputs: document.querySelectorAll('#join-form input:not([type=hidden]), #join-form select, #join-form textarea').length,
  roleBoxes: document.querySelectorAll('input[name="roles"]').length,
  required: document.querySelectorAll('#join-form [required]').length,
  hasConsent: !!document.querySelector('input[name="consent"]'),
  hasSubject: !!document.querySelector('input[name="_subject"]')
})`);
const fi = JSON.parse(fieldInfo);
check('问卷字段齐全（≥12 个输入项）', fi.inputs >= 12, '实际 ' + fi.inputs);
check('方向多选框 10 个', fi.roleBoxes === 10, '实际 ' + fi.roleBoxes);
check('必填项 ≥ 4 个', fi.required >= 4, '实际 ' + fi.required);
check('有同意勾选框与邮件主题隐藏字段', fi.hasConsent && fi.hasSubject);

check('加入页无横向溢出（桌面）',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'));

/* ============================================================
   4. 移动端
   ============================================================ */
await open('/index.html', 390, 900, true);
check('移动端首页无横向溢出',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs("document.documentElement.scrollWidth + ' vs ' + window.innerWidth"));
check('移动端导航横向可滚动且不换行错位',
  await evalJs("getComputedStyle(document.querySelector('.nav')).order === '3'"));

await open('/join.html', 390, 900, true);
check('移动端加入页无横向溢出',
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
   6. 控制台错误
   ============================================================ */
await open('/index.html');
await open('/news.html');
await open('/join.html');
check('三个页面控制台无 JS 报错',
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

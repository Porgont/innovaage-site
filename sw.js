/*
 * 极简 service worker，只为让浏览器认可「可安装」。
 *
 * 策略刻意保守：
 *   - 页面（HTML）永远走网络，避免离线缓存导致内容陈旧
 *   - 图片 / 字体 / CSS / JS 用 stale-while-revalidate，先给缓存再后台更新
 *   - 换版本时清掉旧缓存
 *
 * 想彻底停用：删掉这个文件，或把 site.js 里的 initPwa() 调用去掉。
 */

const CACHE = 'ia-static-v1';
const ASSET = /\.(?:png|jpe?g|webp|gif|svg|woff2?|css|js)$/i;

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML 一律走网络
  if (req.mode === 'navigate' || /\.html?$/i.test(url.pathname)) return;
  if (!ASSET.test(url.pathname)) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

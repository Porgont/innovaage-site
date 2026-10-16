/* 模拟 GitHub Pages 的本地静态服务器：找不到文件时返回 404.html（HTTP 404） */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = Number(process.argv[2] || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = join(root, urlPath);
  const inRoot = filePath.startsWith(root);

  if (inRoot && existsSync(filePath) && statSync(filePath).isFile()) {
    res.writeHead(200, {
      'Content-Type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(readFileSync(filePath));
    return;
  }

  // GitHub Pages 行为：返回 404.html 内容，状态码 404
  const notFound = join(root, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(existsSync(notFound) ? readFileSync(notFound) : 'Not Found');
}).listen(port, '127.0.0.1', () => {
  console.log(`静态服务器已启动：http://127.0.0.1:${port}  (根目录 ${root})`);
  console.log('404 行为与 GitHub Pages 一致：未找到文件时返回 404.html，状态码 404');
});

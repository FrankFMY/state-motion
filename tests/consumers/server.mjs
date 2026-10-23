import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { ssr } from './server/server-entry.js';
const root = resolve('dist');
const server = createServer(async (req, res) => {
 try {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (req.url === '/' || req.url === '/index.html') {
   const html = await readFile(resolve(root, 'index.html'), 'utf8');
   const result = ssr();
   res.setHeader('Content-Type', 'text/html');
   res.end(html.replace('<!--head-->', result.head).replace('<!--app-->', result.body));
   return;
  }
  const path = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  const body = await readFile(path);
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(path)] ?? 'application/octet-stream');
  res.end(body);
 } catch { res.writeHead(404); res.end(); }
});
server.listen(0, '127.0.0.1', () => { const address = server.address(); console.log(JSON.stringify({ port: address.port, pid: process.pid })); });
process.on('SIGTERM', () => server.close(() => process.exit(0)));

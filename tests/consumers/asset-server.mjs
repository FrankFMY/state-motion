import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const directory = resolve(process.argv[2]);
const names = new Set(['frankfmy-state-motion-0.1.0.tgz', 'frankfmy-state-motion-svelte-0.1.0.tgz']);
const prefix = '/FrankFMY/state-motion/releases/download/v0.1.0/';
const server = createServer(async (request, response) => {
 const url = new URL(request.url, 'http://localhost');
 const name = url.pathname.slice(prefix.length);
 if (!url.pathname.startsWith(prefix) || !names.has(name)) { response.writeHead(404); response.end(); return; }
 // A local redirect exercises curl --location without contacting GitHub.
 if (!url.searchParams.has('download')) { response.writeHead(302, { Location: `${url.pathname}?download=1` }); response.end(); return; }
 try { const bytes = await readFile(join(directory, name)); response.setHeader('Content-Type', 'application/gzip'); response.end(bytes); }
 catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ port: server.address().port, pid: process.pid })));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Core and adapter releases need not share a version number.
test('asset transport serves the manifest filenames and rejects unlisted archives', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'state-motion-asset-test-'));
 const expected = new Map([['frankfmy-state-motion-0.1.1.tgz', 'core fixture'], ['frankfmy-state-motion-svelte-0.1.2.tgz', 'adapter fixture']]);
 let server; let timer;
 try {
  await writeFile(join(directory, 'manifest.json'), JSON.stringify([...expected.keys()].map((name) => ({ path: join(directory, name) }))));
  for (const [name, bytes] of expected) await writeFile(join(directory, name), bytes);
  server = spawn('node', [fileURLToPath(new URL('./consumers/asset-server.mjs', import.meta.url)), directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  const address = await new Promise((accept, reject) => {
   timer = setTimeout(() => reject(new Error('asset fixture startup timed out')), 10000);
   server.once('error', reject); server.once('exit', (code) => reject(new Error(`asset fixture exited ${code}`)));
   server.stdout.once('data', (data) => { try { accept(JSON.parse(data.toString())); } catch (error) { reject(error); } });
  });
  clearTimeout(timer); assert.equal(address.pid, server.pid);
  const base = `http://127.0.0.1:${address.port}/FrankFMY/state-motion/releases/download/v0.1.1/`;
  for (const [name, bytes] of expected) {
   assert.equal((await fetch(base + name, { redirect: 'manual' })).status, 302);
   const response = await fetch(base + name);
   assert.equal(response.status, 200); assert.equal(await response.text(), bytes);
  }
  assert.equal((await fetch(base + 'frankfmy-state-motion-svelte-9.9.9.tgz')).status, 404);
 } finally {
  clearTimeout(timer);
  if (server && server.exitCode === null && server.signalCode === null) {
   const exited = once(server, 'exit'); server.kill('SIGTERM');
   const kill = setTimeout(() => server.kill('SIGKILL'), 3000);
   try { await exited; } finally { clearTimeout(kill); }
  }
  await rm(directory, { recursive: true, force: true });
 }
});

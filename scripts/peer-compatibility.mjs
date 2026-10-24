import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statfsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'packages/svelte/package.json'), 'utf8'));
const sealed = process.env.STATE_MOTION_SVELTE_TARBALL;
const artifact = sealed ? { path: resolve(sealed) } : JSON.parse(readFileSync(join(root, '.artifacts/latest.json'), 'utf8')).packages.find((item) => item.name === manifest.name);
const spec = process.env.STATE_MOTION_SVELTE_REGISTRY_VERSION ?? `file:${artifact.path}`;
const svgSpec = process.env.STATE_MOTION_SVG_TARBALL ? `file:${resolve(process.env.STATE_MOTION_SVG_TARBALL)}` : '0.1.3';
const work = realpathSync(mkdtempSync(join(tmpdir(), 'state-motion-peers-')));
const evidence = resolve(process.env.STATE_MOTION_COMPAT_EVIDENCE ?? join(work, 'evidence'));
mkdirSync(evidence, { recursive: true });
const report = { status: 'running', work, spec, commands: [], artifactSha256: createHash('sha256').update(readFileSync(artifact.path)).digest('hex') };
if (artifact.sha256) assert.equal(report.artifactSha256, artifact.sha256);
function json(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
function run(cwd, command, args, extraEnv = {}) {
 const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 ** 2, env: { ...process.env, ...extraEnv } });
 const log = join(evidence, `${report.commands.length + 1}.log`);
 writeFileSync(log, (result.stdout ?? '') + (result.stderr ?? ''));
 report.commands.push({ cwd, command, args, status: result.status, signal: result.signal, log });
 process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
 if (result.error) throw result.error;
 assert.equal(result.signal, null);
 assert.equal(result.status, 0, `${command} ${args.join(' ')} failed; see ${log}`);
 return (result.stdout ?? '') + (result.stderr ?? '');
}
function install(name, dependencies, lockOnly = false) {
 const disk = statfsSync(work); assert(disk.bavail * disk.bsize >= 10 * 1024 ** 3, 'Peer consumer allocation requires 10 GiB free');
 const directory = join(work, name); mkdirSync(directory);
 json(join(directory, 'package.json'), { name: `state-motion-${name}-consumer`, private: true, type: 'module', dependencies });
 run(directory, 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/', ...(lockOnly ? ['--package-lock-only'] : [])]);
 cpSync(join(directory, 'package-lock.json'), join(evidence, `${name}-lock.json`));
 if (!lockOnly) {
  const installed = join(directory, 'node_modules', manifest.name);
  assert(realpathSync(installed).startsWith(directory + '/'), 'must install packed bytes, not workspace links');
  assert.equal(JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')).version, manifest.version);
 }
 return directory;
}
try {
 // Ordinary npm resolution: all six libraries may share a single application.
 const all = install('all-six', {
  '@frankfmy/async-control': '0.2.3', '@frankfmy/typed-document-runtime': '0.1.2',
  '@frankfmy/state-motion': '0.1.1', '@frankfmy/state-motion-svelte': spec,
  '@frankfmy/realine-core': '0.1.1', '@frankfmy/svg-sprite-toolkit': svgSpec, svelte: '5.57.2',
 }, true);
 const lock = JSON.parse(readFileSync(join(all, 'package-lock.json'), 'utf8'));
 for (const name of ['async-control', 'typed-document-runtime', 'state-motion', 'state-motion-svelte', 'realine-core', 'svg-sprite-toolkit']) assert(lock.packages[`node_modules/@frankfmy/${name}`]);
 assert.equal(lock.packages['node_modules/svelte'].version, '5.57.2');
 rmSync(all, { recursive: true });
 if (!process.argv.includes('--resolve-only')) {
  // The previously supported minimum and the optional-core boundary stay valid.
  const minimum = install('minimum-root', { [manifest.name]: spec, svelte: '5.57.0' });
  assert(!existsSync(join(minimum, 'node_modules/@frankfmy/state-motion')));
  for (const file of ['root-only.mjs', 'root-types.ts']) cpSync(join(root, 'tests/consumers', file), join(minimum, file));
  json(join(minimum, 'tsconfig.json'), { compilerOptions: { module: 'NodeNext', target: 'ES2022', lib: ['ES2022', 'DOM'], strict: true, skipLibCheck: false, customConditions: ['svelte'], types: [] }, include: ['root-types.ts'] });
  run(minimum, 'node', [join(root, 'node_modules/@typescript/native/bin/tsc'), '--noEmit', '-p', 'tsconfig.json']);
  run(minimum, 'node', ['--conditions=svelte', 'root-only.mjs']);
  rmSync(minimum, { recursive: true });
  const app = install('combined', {
   [manifest.name]: spec, '@frankfmy/state-motion': '0.1.1', '@frankfmy/svg-sprite-toolkit': svgSpec,
   svelte: '5.57.2', vite: '7.3.7', '@sveltejs/vite-plugin-svelte': '6.2.1',
   typescript: '6.0.3', '@typescript/native': 'npm:typescript@7.0.2', 'svelte-check': '4.7.7', '@playwright/test': '1.63.0',
  });
  cpSync(join(root, 'tests/consumers'), app, { recursive: true });
  renameSync(join(app, 'App.svelte'), join(app, 'StateDemo.svelte'));
  // Only the deliberate negative fixture is excluded from positive compilation.
  rmSync(join(app, 'Negative.svelte'));
  cpSync(join(root, 'tests/composition'), app, { recursive: true });
  const installedSvelte = JSON.parse(readFileSync(join(app, 'node_modules/svelte/package.json'), 'utf8'));
  assert.equal(installedSvelte.version, '5.57.2');
  // The sprite plugin generates the type module consumed by the checks.
  run(app, 'node', ['node_modules/vite/bin/vite.js', 'build']);
  run(app, 'node', ['node_modules/@typescript/native/bin/tsc', '--noEmit', '-p', 'tsconfig.json']);
  const diagnostics = run(app, 'node', ['node_modules/svelte-check/bin/svelte-check', '--tsgo', '--tsconfig', './tsconfig.json', '--fail-on-warnings']);
  assert.match(diagnostics, /svelte-check found 0 errors and 0 warnings/);
  run(app, 'node', ['node_modules/vite/bin/vite.js', 'build', '--ssr', 'server-entry.ts', '--outDir', 'server']);
  const server = spawn('node', ['server.mjs'], { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] });
  let timer;
  try {
   const address = await new Promise((accept, reject) => {
    timer = setTimeout(() => reject(new Error('combined server startup timed out')), 15000);
    server.once('error', reject); server.once('exit', (code) => reject(new Error(`combined server exited ${code}`)));
    server.stdout.once('data', (data) => { try { accept(JSON.parse(data.toString())); } catch (error) { reject(error); } });
    server.stderr.on('data', (data) => process.stderr.write(data));
   });
   clearTimeout(timer); assert.equal(address.pid, server.pid);
   const html = await (await fetch(`http://127.0.0.1:${address.port}/`)).text();
   assert.match(html, /Count: 0; doubled: 0/); assert.match(html, /aria-label="Combined circle"/);
   assert.doesNotMatch(html, /file:\/\//);
   writeFileSync(join(evidence, 'ssr.html'), html);
   run(app, 'node', ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.mjs'], { STATE_MOTION_TEST_URL: `http://127.0.0.1:${address.port}`, STATE_MOTION_EVIDENCE_DIR: evidence });
   const browsers = JSON.parse(readFileSync(join(evidence, 'playwright.json'), 'utf8'));
   assert.equal(browsers.stats.unexpected, 0); assert.equal(browsers.stats.skipped, 0); assert.equal(browsers.stats.flaky, 0); assert.equal(browsers.stats.expected, 16);
  } finally {
   clearTimeout(timer);
   if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit'); server.kill('SIGTERM');
    const kill = setTimeout(() => server.kill('SIGKILL'), 3000);
    try { await exited; } finally { clearTimeout(kill); }
   }
   report.serverCleanup = { pid: server.pid, exit: server.exitCode, signal: server.signalCode };
  }
 }
 report.status = 'passed'; console.log('PEER_COMPATIBILITY_PASS', evidence);
} catch (error) {
 report.status = 'failed'; report.error = String(error.stack ?? error); throw error;
} finally {
 // Keep logs, locks and browser evidence; remove only this invocation's fixture.
 if (evidence.startsWith(work + '/')) {
  for (const name of ['all-six', 'minimum-root', 'combined']) rmSync(join(work, name), { recursive: true, force: true });
 } else rmSync(work, { recursive: true, force: true });
 report.fixtureCleanup = !existsSync(join(work, 'combined'));
 json(join(evidence, 'report.json'), report);
}

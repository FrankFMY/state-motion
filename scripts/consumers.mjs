import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, statfsSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const attempt = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
// A core-only consumer must not resolve optional peers from the development checkout.
const work = realpathSync(mkdtempSync(join(tmpdir(), 'state-motion-consumers-')));
const evidence = resolve(process.argv[2] ?? join(work, 'evidence'), attempt);
mkdirSync(work, { recursive: true }); mkdirSync(evidence, { recursive: true });
const disk = statfsSync(root); assert(disk.bavail * disk.bsize >= 10 * 1024 ** 3, 'Consumer allocation requires 10 GiB free');
const artifacts = JSON.parse(readFileSync(join(root, '.artifacts/latest.json'), 'utf8'));
const packages = Object.fromEntries(artifacts.packages.map((p) => [p.name, p]));
for (const artifact of artifacts.packages) assert.equal(createHash('sha256').update(readFileSync(artifact.path)).digest('hex'), artifact.sha256);
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const results = { attempt, work, evidence, packages: artifacts.packages.map(({ name, path, sha256 }) => ({ name, path, sha256 })), commands: [] };
const log = (value) => console.log(JSON.stringify(value));
function run(command, args, cwd, expected = 0, extraEnv = {}) {
 log({ command, args, cwd });
 const p = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...extraEnv }, maxBuffer: 32 * 1024 ** 2 });
 process.stdout.write(p.stdout ?? ''); process.stderr.write(p.stderr ?? '');
 results.commands.push({ command, args, cwd, exit: p.status, expected });
 if (p.error) throw p.error;
 if (expected === 'failure') assert.notEqual(p.status, 0, 'negative consumer must fail'); else assert.equal(p.status, expected, `${command} failed`);
 return p;
}
function json(path, object) { writeFileSync(path, `${JSON.stringify(object, null, 2)}\n`); }
function install(name, dependencies) {
 const free = statfsSync(root); assert(free.bavail * free.bsize >= 10 * 1024 ** 3, 'Install requires 10 GiB free');
 const directory = join(work, name); mkdirSync(directory);
 json(join(directory, 'package.json'), { name: `consumer-${name}`, private: true, type: 'module', workspaces: [], dependencies });
 run('bun', ['install', '--ignore-scripts', '--linker=hoisted'], directory);
 for (const [name, item] of Object.entries(packages)) {
  if (!dependencies[name]) continue;
  const installed = join(directory, 'node_modules', name);
  assert(realpathSync(installed).startsWith(directory), 'consumer resolved a workspace package');
  for (const file of item.files) {
   if (!file.startsWith('dist/')) continue;
   const source = join(root, 'packages', name.endsWith('-svelte') ? 'svelte' : 'core', file);
   assert.deepEqual(readFileSync(join(installed, file)), readFileSync(source), `release byte mismatch: ${name}/${file}`);
  }
 }
 return directory;
}
const tar = (name) => `file:${packages[name].downloadedPath}`;
try {
 const downloads = join(work, 'downloads'); mkdirSync(downloads);
 const assetServer = spawn('node', [join(root, 'tests/consumers/asset-server.mjs'), artifacts.directory], { stdio: ['ignore', 'pipe', 'pipe'] });
 let assetTimeout;
 try {
  const address = await new Promise((resolveStart, reject) => {
   assetTimeout = setTimeout(() => reject(new Error('asset server startup timed out')), 15000);
   assetServer.once('error', reject);
   assetServer.once('exit', (code) => reject(new Error(`asset server exited: ${code}`)));
   assetServer.stdout.once('data', (buffer) => { try { resolveStart(JSON.parse(buffer.toString())); } catch (error) { reject(error); } });
   assetServer.stderr.on('data', (buffer) => process.stderr.write(buffer));
  });
  clearTimeout(assetTimeout); assert.equal(address.pid, assetServer.pid);
  results.assetTransport = { kind: 'loopback HTTP redirect and download', githubContacted: false, pid: assetServer.pid, sha256Verified: true };
  for (const artifact of Object.values(packages)) {
   const filename = artifact.path.split('/').at(-1);
   const path = join(downloads, filename);
   run('curl', ['--fail', '--location', '--output', path, `http://127.0.0.1:${address.port}/FrankFMY/state-motion/releases/download/v0.1.0/${filename}`], work);
   assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), artifact.sha256);
   artifact.downloadedPath = path;
  }
 } finally {
  clearTimeout(assetTimeout);
  if (assetServer.exitCode === null && assetServer.signalCode === null) {
   const exited = once(assetServer, 'exit'); assetServer.kill('SIGTERM');
   const timer = setTimeout(() => assetServer.kill('SIGKILL'), 3000);
   try { await exited; } finally { clearTimeout(timer); }
  }
  results.assetServerCleanup = { pid: assetServer.pid, exitCode: assetServer.exitCode, signal: assetServer.signalCode };
  log({ ownedAssetServerCleanup: results.assetServerCleanup });
 }
 const core = install('core', { '@frankfmy/state-motion': tar('@frankfmy/state-motion') });
 cpSync(join(root, 'tests/consumers/core.test.mjs'), join(core, 'core.test.mjs'));
 cpSync(join(root, 'tests/consumers/core-types.ts'), join(core, 'core-types.ts'));
 assert(!existsSync(join(core, 'node_modules/svelte')));
 const simple = install('svelte-root', { '@frankfmy/state-motion-svelte': tar('@frankfmy/state-motion-svelte'), svelte: '5.57.0' });
 cpSync(join(root, 'tests/consumers/root-only.mjs'), join(simple, 'root-only.mjs'));
 cpSync(join(root, 'tests/consumers/root-types.ts'), join(simple, 'root-types.ts'));
 assert(!existsSync(join(simple, 'node_modules/@frankfmy/state-motion')));
 // Temporarily hide only this checkout's development dependencies. The consumers
 // must prove that undeclared Svelte/core imports fail without ancestor fallback.
 const development = join(root, 'node_modules'); const hidden = join(work, 'development-node_modules');
 const typeConfig = { compilerOptions: { module: 'NodeNext', target: 'ES2022', lib: ['ES2022'], strict: true, skipLibCheck: false, types: ['node'], typeRoots: [join(hidden, '@types')] }, include: ['core-types.ts'] };
 json(join(core, 'tsconfig.json'), typeConfig);
 json(join(simple, 'tsconfig.json'), { ...typeConfig, compilerOptions: { ...typeConfig.compilerOptions, lib: ['ES2022', 'DOM'], customConditions: ['svelte'] }, include: ['root-types.ts'] });
 renameSync(development, hidden);
 try {
  run('node', [join(hidden, '@typescript/native/bin/tsc'), '--noEmit', '-p', 'tsconfig.json'], core);
  run('node', [join(hidden, '@typescript/native/bin/tsc'), '--noEmit', '-p', 'tsconfig.json'], simple);
  run('node', ['--test', 'core.test.mjs'], core);
  run('bun', ['test', 'core.test.mjs'], core);
  run('node', ['--conditions=svelte', 'root-only.mjs'], simple);
 } finally { renameSync(hidden, development); }
 const deps = {};
 for (const name of ['svelte', 'typescript', '@typescript/native', 'svelte-check', 'vite', 'vitest', '@sveltejs/vite-plugin-svelte', '@playwright/test', '@types/bun', '@types/node']) deps[name] = rootManifest.devDependencies[name];
 Object.assign(deps, { '@frankfmy/state-motion': tar('@frankfmy/state-motion'), '@frankfmy/state-motion-svelte': tar('@frankfmy/state-motion-svelte') });
 const app = install('svelte-app', deps);
 for (const file of readdirSync(join(root, 'tests/consumers'))) {
  if (['core.test.mjs', 'core-types.ts', 'root-only.mjs', 'root-types.ts', 'Negative.svelte'].includes(file)) continue;
  cpSync(join(root, 'tests/consumers', file), join(app, file));
 }
 const config = { compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, skipLibCheck: false, isolatedModules: true, verbatimModuleSyntax: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: ['svelte'], customConditions: ['svelte'] }, include: ['*.ts', '*.svelte'], exclude: ['node_modules', 'dist', 'server', 'unit'] };
 json(join(app, 'tsconfig.json'), config);
 run('node', ['node_modules/@typescript/native/bin/tsc', '--noEmit', '-p', 'tsconfig.json'], app);
 run('node', ['node_modules/svelte-check/bin/svelte-check', '--tsgo', '--tsconfig', './tsconfig.json', '--fail-on-warnings'], app);
 cpSync(join(root, 'tests/consumers/Negative.svelte'), join(app, 'Negative.svelte'));
 json(join(app, 'tsconfig.negative.json'), { ...config, include: ['Negative.svelte'] });
 const negative = run('node', ['node_modules/svelte-check/bin/svelte-check', '--tsgo', '--tsconfig', './tsconfig.negative.json'], app, 'failure');
 assert.match(negative.stdout + negative.stderr, /somewhere/); assert.match(negative.stdout + negative.stderr, /number/);
 renameSync(join(app, 'Negative.svelte'), join(app, 'Negative.svelte.rejected'));
 // Re-run the retained inventory against installed JS and declarations. Test-only
 // builders remain fixture code; every implementation import resolves into a tarball.
 const files = [];
 const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else files.push(path); } };
 for (const name of ['core', 'svelte']) walk(join(root, 'packages', name, 'src'));
 const selected = files.filter((f) => /\.(test|vitest)\.ts$|\/__tests\.ts$/.test(f));
 const targetOf = (source) => join(app, 'unit', relative(join(root, 'packages'), source));
 const runtimeOf = (source) => {
  const [name, , ...parts] = relative(join(root, 'packages'), source).split('/');
  return join(app, 'node_modules', name === 'core' ? '@frankfmy/state-motion' : '@frankfmy/state-motion-svelte', 'dist', ...parts).replace(/\.ts$/, '.js');
 };
 for (const source of selected) {
  const target = targetOf(source); mkdirSync(dirname(target), { recursive: true });
  const code = readFileSync(source, 'utf8').replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_all, prefix, spec, suffix) => {
   const original = resolve(dirname(source), spec).replace(/\.js$/, '.ts');
   const destination = original.endsWith('/__tests.ts') ? targetOf(original) : runtimeOf(original);
   assert(existsSync(destination) || original.endsWith('/__tests.ts'), `missing release import ${destination}`);
   return prefix + pathToFileURL(destination).href + suffix;
  });
  writeFileSync(target, code);
 }
 results.releaseInventory = selected.map((f) => relative(root, f));
 run('bun', ['test', './unit'], app);
 writeFileSync(join(app, 'vitest.config.js'), `import { defineConfig } from 'vitest/config';\nimport { svelte } from '@sveltejs/vite-plugin-svelte';\nexport default defineConfig({ plugins: [svelte()], test: { include: ['unit/**/*.vitest.ts'], environment: 'node' } });\n`);
 run('node', ['node_modules/vitest/vitest.mjs', 'run'], app);
 run('node', ['node_modules/vite/bin/vite.js', 'build'], app);
 run('node', ['node_modules/vite/bin/vite.js', 'build', '--ssr', 'server-entry.ts', '--outDir', 'server'], app);
 const server = spawn('node', ['server.mjs'], { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] });
 let output = ''; let timeout;
 const started = new Promise((resolveStart, reject) => {
  timeout = setTimeout(() => reject(new Error('consumer server startup timed out')), 15000);
  server.stdout.on('data', (buffer) => { const line = buffer.toString(); process.stdout.write(line); output += line; const match = output.match(/\{"port":(\d+),"pid":(\d+)\}/); if (match) resolveStart({ port: Number(match[1]), pid: Number(match[2]) }); });
  server.stderr.on('data', (buffer) => process.stderr.write(buffer));
  server.once('error', reject);
  server.once('exit', (code) => reject(new Error(`server exited before startup: ${code}`)));
 });
 try {
  const startedServer = await started; clearTimeout(timeout);
  assert.equal(startedServer.pid, server.pid); results.server = startedServer;
  const response = await fetch(`http://127.0.0.1:${startedServer.port}/`); assert.equal(response.status, 200);
  const html = await response.text(); assert.match(html, /Count: 0; doubled: 0/); assert.match(html, /hydration-idle">busy/);
  writeFileSync(join(evidence, 'ssr.html'), html, { flag: 'wx' });
  run('node', ['node_modules/@playwright/test/cli.js', 'test'], app, 0, { STATE_MOTION_TEST_URL: `http://127.0.0.1:${startedServer.port}`, STATE_MOTION_EVIDENCE_DIR: evidence });
 } finally {
  clearTimeout(timeout);
  const exited = once(server, 'exit'); server.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolveWait) => { const timer = setTimeout(() => { if (server.exitCode === null) server.kill('SIGKILL'); resolveWait(); }, 3000); timer.unref(); })]);
  results.serverCleanup = { pid: server.pid, exitCode: server.exitCode, signal: server.signalCode };
  log({ ownedServerCleanup: results.serverCleanup });
 }
 results.status = 'passed';
} catch (error) {
 results.status = 'failed'; results.error = String(error); throw error;
} finally {
 json(join(evidence, 'consumer-results.json'), results);
 console.log('CONSUMER_RESULTS', join(evidence, 'consumer-results.json'));
}
console.log('PACKED_CONSUMERS_PASS');

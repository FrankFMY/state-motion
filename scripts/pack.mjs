import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = resolve('.artifacts', `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
mkdirSync(directory, { recursive: true });
const results = [];
for (const name of ['core', 'svelte']) {
 const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: `packages/${name}`, encoding: 'utf8', env: { ...process.env, npm_config_cache: resolve('.fixtures/cache/npm') } });
 process.stdout.write(packed.stdout ?? ''); process.stderr.write(packed.stderr ?? '');
 if (packed.error) throw packed.error;
 assert.equal(packed.status, 0, `npm pack ${name}`);
 const native = JSON.parse(packed.stdout);
 const [info] = Array.isArray(native) ? native : Object.values(native);
 const names = info.files.map((file) => file.path).sort();
 assert(names.length > 10);
 for (const file of names) {
  assert(/^(package\.json|README\.md|LICENSE|THIRD_PARTY_NOTICES\.md|dist\/.+\.(js|d\.ts|svelte))$/.test(file), `Unexpected packed file: ${file}`);
  assert(!/(?:test|vitest|__tests)\.|\.map$/.test(file), `Test or sourcemap in package: ${file}`);
 }
 for (const required of ['package.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) assert(names.includes(required));
 const manifest = JSON.parse(readFileSync(`packages/${name}/package.json`, 'utf8'));
 assert.equal(manifest.private, false);
 for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const version of Object.values(manifest[key] ?? {})) assert(!version.startsWith('workspace:'));
 }
 const path = resolve(directory, info.filename);
 const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
 results.push({ name: manifest.name, path, sha256, files: names, bytes: info.size, unpackedBytes: info.unpackedSize });
}
writeFileSync(`${directory}/manifest.json`, `${JSON.stringify(results, null, 2)}\n`, { flag: 'wx' });
writeFileSync('.artifacts/latest.json', `${JSON.stringify({ directory, packages: results }, null, 2)}\n`);
console.log('PACK_ALLOWLIST_PASS', JSON.stringify(results.map(({ name, sha256, bytes }) => ({ name, sha256, bytes }))));

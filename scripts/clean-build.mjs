import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, statfsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const target = resolve('.fixtures', `clean-${randomUUID()}`);
const space = statfsSync(root); assert(space.bavail * space.bsize >= 10 * 1024 ** 3, 'Clean build requires 10 GiB free');
const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' });
assert.equal(listed.status, 0);
const files = listed.stdout.split('\0').filter(Boolean);
assert(files.includes('bun.lock') && files.includes('package.json'));
for (const file of files) {
 assert(!file.startsWith('.fixtures/') && !file.startsWith('node_modules/'));
 const path = join(target, file); mkdirSync(dirname(path), { recursive: true }); cpSync(join(root, file), path);
}
function run(args) {
 console.log('CLEAN_SOURCE_COMMAND', JSON.stringify(args));
 const p = spawnSync('bun', args, { cwd: target, stdio: 'inherit' });
 if (p.error) throw p.error;
 assert.equal(p.status, 0, `clean ${args.join(' ')}`);
}
run(['install', '--frozen-lockfile']);
// This fixture lives beneath an intentionally ignored parent directory.
// Override that ancestor ignore for the source-only lint pass, before generation.
const lintFiles = files.filter((file) => /^(packages|scripts|tests)\//.test(file) && /\.(ts|js|mjs)$/.test(file));
assert(lintFiles.length > 40);
run(['run', 'lint', '--', '--no-ignore', ...lintFiles]);
for (const gate of ['check', 'test', 'build', 'pack']) run(['run', gate]);
const hashes = (directory, prefix = '') => {
 const result = {};
 for (const entry of readdirSync(directory, { withFileTypes: true })) {
  if (entry.isDirectory()) Object.assign(result, hashes(join(directory, entry.name), prefix + entry.name + '/'));
  else result[prefix + entry.name] = createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex');
 }
 return result;
};
for (const name of ['core', 'svelte']) assert.deepEqual(hashes(join(target, 'packages', name, 'dist')), hashes(join(root, 'packages', name, 'dist')), `clean ${name} build differs`);
writeFileSync(join(target, 'clean-build-result.json'), JSON.stringify({ status: 'passed', sourceFiles: files.length, distBytesMatch: true, target }, null, 2));
console.log('CLEAN_SOURCE_BUILD_PASS', JSON.stringify({ target, files: files.length, distBytesMatch: true, gitCloneTested: false }));

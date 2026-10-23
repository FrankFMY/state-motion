import { spawnSync } from 'node:child_process';
import { cpSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
function run(command, args, cwd) {
 const r = spawnSync(command, args, { cwd, stdio: 'inherit' });
 if (r.error) throw r.error;
 if (r.status) process.exit(r.status);
}
for (const name of ['core', 'svelte']) {
 const cwd = `packages/${name}`;
 rmSync(`${cwd}/dist`, { recursive: true, force: true });
 run('bun', ['run', 'build'], cwd);
 const clean = (dir) => {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
   const path = join(dir, item.name);
   if (item.isDirectory()) clean(path);
   else if (/\.(test|vitest)\.|__tests\./.test(item.name)) rmSync(path);
  }
 };
 clean(`${cwd}/dist`);
 for (const f of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) if (existsSync(f)) cpSync(f, `${cwd}/${f}`);
}

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
if (!existsSync(resolve(root, 'vite.preview.config.ts'))) process.exit(0);
const result = spawnSync('pnpm', ['preview:build'], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
if (!existsSync(resolve(root, 'vite.preview.config.ts'))) process.exit(0);

function run(args) {
  const result = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status) process.exit(result.status);
}

// Vercel Root Directory is www/, so the extension package is not installed.
// --ignore-scripts skips postinstall (`wxt prepare`); preview:build runs it.
if (!existsSync(resolve(root, 'node_modules/vite'))) {
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--prod=false']);
}

run(['preview:build']);

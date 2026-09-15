import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const hasPreview = existsSync(resolve(root, 'vite.preview.config.ts'));
const hasWebapp = existsSync(resolve(root, 'vite.webapp.config.ts'));
if (!hasPreview && !hasWebapp) process.exit(0);

function run(args) {
  const result = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status) process.exit(result.status);
}

// Vercel Root Directory is www/, so the extension package is not installed.
// --ignore-scripts skips postinstall (`wxt prepare`); preview/webapp builds run it.
if (!existsSync(resolve(root, 'node_modules/vite'))) {
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--prod=false']);
}

if (hasPreview) run(['preview:build']);
if (hasWebapp) run(['webapp:build']);

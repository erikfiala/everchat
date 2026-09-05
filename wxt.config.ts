import { resolve } from 'node:path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Visible folder for Load unpacked: dist/everchat (or dist/everchat-dev)
  outDir: 'dist',
  outDirTemplate: 'everchat{{modeSuffix}}',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  // Classic (non-module) FOUC boot scripts — Vite leaves <script src> as-is;
  // copy them next to sidepanel.html so MV3 script-src 'self' can load them.
  hooks: {
    'build:publicAssets': (_wxt, assets) => {
      assets.push(
        {
          absoluteSrc: resolve('entrypoints/sidepanel/boot-theme.js'),
          relativeDest: 'boot-theme.js',
        },
        {
          absoluteSrc: resolve('entrypoints/sidepanel/boot-locale.js'),
          relativeDest: 'boot-locale.js',
        },
      );
    },
  },
  manifest: {
    name: 'Everchat',
    description:
      'Public comments on any URL. Sign in anonymously with a passkey. No email.',
    permissions: ['sidePanel', 'tabs', 'storage', 'notifications', 'activeTab'],
    host_permissions: ['https://*.supabase.co/*'],
    action: {
      default_title: 'Everchat',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});

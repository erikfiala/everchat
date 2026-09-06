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
    // Stable extension ID for WebAuthn (ID: hnafijpegchmgpmkefjihhfpegonnjdb).
    // Chrome/Firefox only allow claiming RP ID everch.at when that host is in
    // host_permissions (not via related-origins alone). See MDN WebAuthn extensions.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyna26i/m1MBkUrM8+Ty9KAbWLVDwABPuCEdPp3pbzJz9FzpseX5PBdamKIzvbmLWg0h/2YE6+bfDrabgLtZJ54xGYq8W91XdPhJ9Cq6utVqFm90RnyGbBJmcBf2HW4v/RxtsnA+J0L9vUpKbhuBKnOV6ep5319PKZe60sRZ1fORQtxhix3m/SbFta5S0DxCdAuz/zJmQlhrlzB2ZVb1EwlJESOgChvIV49TF/PTqMnskQZH/Z/6tBlePAc7nhg0cEeLvrd37E0UWpvbyK9qhFKWvDUyMHGvimEouwrUIptVyNp1Sv6bG9dEflrYypCaBdwKRodqVkGlUM+Aff+MggwIDAQAB',
    name: 'Everchat',
    description:
      'Public comments on any URL. Sign in anonymously with a passkey. No email.',
    permissions: ['sidePanel', 'tabs', 'storage', 'notifications', 'activeTab'],
    host_permissions: [
      'https://*.supabase.co/*',
      // Required to claim WebAuthn RP ID `everch.at` from the extension origin.
      'https://everch.at/*',
    ],
    action: {
      default_title: 'Everchat',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});

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
    // Stable unpacked ID for WebAuthn (hnafijpegchmgpmkefjihhfpegonnjdb).
    // Chrome Web Store listing ID is igfakbmcceaekceoahmecaecfeoidpdc
    // (must be in www/.well-known/webauthn and WEBAUTHN_ORIGIN).
    // Chrome Web Store rejects `key` on upload — omit it with `pnpm zip:cws`.
    // Chrome/Firefox only allow claiming RP ID everch.at when that host is in
    // host_permissions (not via related-origins alone). See MDN WebAuthn extensions.
    ...(process.env.CWS_UPLOAD
      ? {}
      : {
          key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyna26i/m1MBkUrM8+Ty9KAbWLVDwABPuCEdPp3pbzJz9FzpseX5PBdamKIzvbmLWg0h/2YE6+bfDrabgLtZJ54xGYq8W91XdPhJ9Cq6utVqFm90RnyGbBJmcBf2HW4v/RxtsnA+J0L9vUpKbhuBKnOV6ep5319PKZe60sRZ1fORQtxhix3m/SbFta5S0DxCdAuz/zJmQlhrlzB2ZVb1EwlJESOgChvIV49TF/PTqMnskQZH/Z/6tBlePAc7nhg0cEeLvrd37E0UWpvbyK9qhFKWvDUyMHGvimEouwrUIptVyNp1Sv6bG9dEflrYypCaBdwKRodqVkGlUM+Aff+MggwIDAQAB',
        }),
    name: 'Everchat',
    description:
      'Public comments on any URL. Sign up anonymously with a passkey. No email.',
    permissions: [
      'sidePanel',
      'tabs',
      'storage',
      'notifications',
      'activeTab',
      'alarms',
    ],
    host_permissions: [
      'https://*.supabase.co/*',
      // Required to claim WebAuthn RP ID `everch.at` from the extension origin.
      'https://everch.at/*',
    ],
    // www share trampoline (`/m/{id}`) and theme import (`/themes/:slug`).
    externally_connectable: {
      matches: ['https://everch.at/*', 'https://www.everch.at/*'],
    },
    content_security_policy: {
      // Sonner/Radix set toast and overlay geometry via inline style.
      // Chrome MV3 allows style-src unsafe-inline on extension pages.
      extension_pages:
        "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com",
    },
    action: {
      default_title: 'Everchat',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});

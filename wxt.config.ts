import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Everchat',
    description:
      'Public Reddit-style comments on any URL. Sign in anonymously with a passkey — no email.',
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

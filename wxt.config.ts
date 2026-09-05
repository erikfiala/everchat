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

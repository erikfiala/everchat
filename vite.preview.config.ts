import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve('entrypoints/preview'),
  base: '/panel/',
  publicDir: resolve('public'),
  envDir: resolve('.'),
  resolve: {
    alias: {
      '@': resolve('.'),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
  build: {
    outDir: resolve('www/panel'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});

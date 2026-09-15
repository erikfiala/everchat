import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Live /app client — real VITE_SUPABASE_* from env (unlike vite.preview.config.ts). */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve('entrypoints/webapp'),
  base: '/app/',
  publicDir: resolve('entrypoints/webapp/public'),
  envDir: resolve('.'),
  resolve: {
    alias: {
      '@': resolve('.'),
    },
  },
  build: {
    outDir: resolve('www/app'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});

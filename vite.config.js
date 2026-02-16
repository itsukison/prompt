import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  publicDir: '../../public',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer'),
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
        'main-window': resolve(__dirname, 'src/renderer/main-window.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});

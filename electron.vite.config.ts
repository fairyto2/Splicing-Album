import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Desktop build. The renderer reuses the SAME root index.html + src/ as the plain
// `vite` build (Capacitor), so there is one React core for both targets.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'electron/main/index.ts') } },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'electron/preload/index.ts') } },
    },
  },
  renderer: {
    root: '.',
    resolve: { alias: { '@': resolve(__dirname, 'src') } },
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'index.html') } },
    },
    plugins: [react()],
  },
});

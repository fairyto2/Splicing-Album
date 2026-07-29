import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Shared web build → dist/. Consumed by Capacitor (webDir: 'dist') and any static host.
// base: './' keeps asset URLs relative so they resolve under capacitor://localhost / http://localhost.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Única dependência de build além do Vite: o plugin oficial do React (JSX + Fast Refresh).
export default defineConfig({
  // BASE_PATH=/alicerce/ gera a versão para o GitHub Pages (site servido numa subpasta)
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  worker: { format: 'es' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});

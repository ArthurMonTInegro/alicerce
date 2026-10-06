import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Única dependência de build além do Vite: o plugin oficial do React (JSX + Fast Refresh).
export default defineConfig({
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

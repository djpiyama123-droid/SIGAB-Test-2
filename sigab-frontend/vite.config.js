import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Versión real del release (archivo VERSION en la raíz del repo) — el
// sidebar la muestra; nunca más literales "v2.0" olvidados.
let sigabVersion = 'dev';
try {
  sigabVersion = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
} catch { /* build fuera del repo: queda "dev" */ }

export default defineConfig({
  plugins: [react()],
  define: {
    __SIGAB_VERSION__: JSON.stringify(sigabVersion),
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            if (id.includes('qrcode') || id.includes('jsqr')) {
              return 'qr';
            }
            if (id.includes('react-router')) {
              return 'router';
            }
          }
        },
      },
    },
  },
});

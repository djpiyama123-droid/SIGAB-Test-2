import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
            if (id.includes('recharts') || id.includes('framer-motion') || id.includes('d3-')) {
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

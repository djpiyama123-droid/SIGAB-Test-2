import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://sigab.129-121-100-147.sslip.io',
        changeOrigin: true,
        secure: true,
      },
      '/static': {
        target: 'https://sigab.129-121-100-147.sslip.io',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // ponytail: split de vendors pesados (portado de 568ca98 del repo main)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/recharts|@tremor|framer-motion|d3-/.test(id)) return 'charts';
            if (/qrcode|jsqr/.test(id)) return 'qr';
            if (/react-router/.test(id)) return 'router';
          }
        },
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://panel.129-121-100-147.sslip.io',
        changeOrigin: true,
        secure: true,
      },
      '/static': {
        target: 'https://panel.129-121-100-147.sslip.io',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});

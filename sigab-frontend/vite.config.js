import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server para PREVISUALIZAR el sprint 27-28 jun contra la BD real de prod.
// Proxy /api y /static hacia https://sigab.129-121-100-147.sslip.io
// (la BD prod, los uploads prod, los 882 equipos reales).
//
// SOLO LECTURA del frontend contra prod — el backend de prod sigue con el
// modelo viejo y no expone los 3 campos nuevos (imagen_referencial, contrato_pdf_url,
// hojas_servicio_urls), así que la UI los renderizará vacíos hasta que se haga
// deploy del backend el lunes. Pero Lightbox, badges de tipo_adquisicion, badge
// imagen_referencial y la nueva ficha SÍ se ven porque son código frontend.
//
// NO TOCAR sigab-frontend/src/ durante este dev — solo previsualizar.
const PROD = 'https://sigab.129-121-100-147.sslip.io';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': {
        target: PROD,
        changeOrigin: true,
        secure: true,
      },
      '/static': {
        target: PROD,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
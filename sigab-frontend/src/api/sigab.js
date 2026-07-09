/**
 * @module api/sigah
 * @description Cliente HTTP centralizado del frontend SIGAH.
 *
 * Provee un objeto `api` con métodos para todos los endpoints del backend.
 * Utiliza Axios con interceptores automáticos para:
 * - Inyección del token JWT en cada request (header Authorization)
 * - Extracción de `response.data` (evita `.data.data` en cada llamada)
 * - Gestión de blobs para descargas PDF/Excel (responseType: 'blob')
 *
 * Patrón de uso:
 *   import { api } from '../api/sigah';
 *   const equipos = await api.getEquipos({ estado: 'operativo' });
 *
 * @requires axios
 */
import axios from 'axios';

// iPadOS se anuncia como Mac; se distingue por pantalla multitouch
// Guard de `typeof navigator`: permite importar este módulo en tests bajo
// Node (sin DOM) sin romper — no cambia la detección en navegador real.
const isIOS = typeof navigator !== 'undefined' && (
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

// Cliente axios con proxy via Vite (/api → localhost:8000/api)
const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de petición para agregar el token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta para manejar 401
client.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401) {
      // Opcional: manejar lógica de refresh_token aquí
      // Por ahora deslogueamos (redirección se maneja a nivel router)
      const isAuthError = err.config.url.startsWith('/auth');
      if (!isAuthError) {
         console.warn('No autorizado, token expirado o inválido.');
         localStorage.removeItem('token');
         localStorage.removeItem('user');
         window.location.href = '/login';
      }
    }
    console.error('SIGAH API Error:', err.response?.status, err.config?.url);
    return Promise.reject(err);
  }
);

// ── Media (fotos/PDFs subidos) — URL absoluta iOS-Safari-safe (SIG-11) ────
// El backend devuelve rutas relativas (ej. "/static/uploads/equipos/x.jpg").
// Safari iOS no siempre las resuelve bien cuando el documento se abre desde
// un origen distinto (QR escaneado, tunel remoto, etc). Reutiliza la MISMA
// baseURL de axios (no inventa otra fuente de verdad): si baseURL es
// relativa ("/api") el prefijo queda vacío (sin cambio de comportamiento
// hoy); si en el futuro baseURL es absoluta ("https://host/api") el helper
// prefija automáticamente con ese origen.
const mediaBase = client.defaults.baseURL.replace(/\/api\/?$/, '');

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${mediaBase}${path.startsWith('/') ? path : `/${path}`}`;
};

export const api = {
  // ── Auth ──────────────────────────────────────────────────
  login: (data) => client.post('/auth/login', data),
  getMe: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),

  // ── Helpers de descarga/PDF (iOS-safe) ────────────────────
  // En iOS Safari <a download> con blob no descarga y window.open tras un
  // await lo mata el popup blocker. En iOS se usa el share sheet nativo
  // (Guardar en Archivos / AirDrop / Imprimir); en el resto, pestaña
  // pre-abierta síncrona + revoke diferido.

  // Llamar SIN await, al inicio del handler del click (antes de cualquier
  // fetch), para que el popup blocker lo cuente como gesto del usuario.
  prepararVentanaPdf: () => (isIOS ? null : window.open('', '_blank')),

  abrirPdf: async (blob, filename, win = null) => {
    if (isIOS && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(blob);
    if (win && !win.closed) win.location = url;
    else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  triggerDownload: async (blob, filename) => {
    if (isIOS && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // revoke inmediato cancela la descarga en Safari y Android lentos
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  // ── Dashboard ─────────────────────────────────────────────
  getDashboard: () => client.get('/dashboard/resumen'),
  getDashboardEquipos: (params = {}) =>
    client.get('/dashboard/equipos', { params }),
  getMapaEquipos: () => client.get('/dashboard/mapa'),
  getFiabilidad: () => client.get('/dashboard/fiabilidad'),

  // ── Equipos ───────────────────────────────────────────────
  getEquipos: (params = {}) => client.get('/equipos', { params }),
  getEquipo: (id) => client.get(`/equipos/${id}`),
  crearEquipo: (data) => client.post('/equipos/', data),
  updateEquipo: (id, data) => client.put(`/equipos/${id}`, data),
  eliminarEquipo: (id) => client.delete(`/equipos/${id}`),
  updateEquipoPosicion: (id, data) => client.patch(`/equipos/${id}/posicion`, data),
  getAreasCatalogo: () => client.get('/equipos/areas/catalogo'),
  getZonasCatalogo: () => client.get('/equipos/zonas/catalogo'),
  getHistorialEquipo: (id) => client.get(`/equipos/${id}/historial`),
  getExpedienteEquipo: (id) => client.get(`/equipos/${id}/expediente`),
  descargarEquiposCsv: (params = {}) => client.get('/equipos/exportar/csv', { params, responseType: 'blob' }),
  subirImagenEquipo: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/equipos/${id}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Órdenes ───────────────────────────────────────────────
  // NOTA: '/ordenes/' lleva slash final porque el backend registra la
  // colección como '@router.get("/")' / '@router.post("/")' bajo el
  // prefijo '/api/ordenes' (routes/ordenes.py) — la ruta real es
  // '/api/ordenes/'. Sin el slash, FastAPI responde 307 redirect a la URL
  // con slash (confirmado con TestClient), lo cual añade un round-trip
  // innecesario y es frágil detrás de proxies que no reescriben el
  // header Location al hostname público (fix/os-flujo-2026-07-09).
  getOrdenes: (params = {}) => client.get('/ordenes/', { params }),
  getArchivosHistoricos: (params = {}) => client.get('/ordenes/archivos-historicos', { params }),
  getOrden: (id) => client.get(`/ordenes/${id}`),
  crearOrden: (data) => client.post('/ordenes/', data),
  updateOrden: (id, data) => client.put(`/ordenes/${id}`, data),
  cerrarOrden: (id) => client.put(`/ordenes/${id}/cerrar`),
  cambiarEstadoOrden: (id, estado) =>
    client.put(`/ordenes/${id}/estado`, { estado }),
  subirEvidenciaOrden: (id, tipo, descripcion, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/ordenes/${id}/evidencia?tipo=${tipo}&descripcion=${descripcion}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  scanOCR: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/ordenes/ocr-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  scanImssOS: (file, autoCreate = false) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/ordenes/scan-imss?auto_create=${autoCreate}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  finalizarOrden: (id, data) => client.put(`/ordenes/${id}/finalizar`, data),
  getPdfOrdenUrl: (id) => `${client.defaults.baseURL}/ordenes/${id}/pdf`,
  getPdfOrdenFisicaUrl: (id) => `${client.defaults.baseURL}/ordenes/${id}/pdf-fisico`,
  // Descargas con auth via interceptor (window.open NO envía Authorization)
  descargarPdfOrden: (id) =>
    client.get(`/ordenes/${id}/pdf`, { responseType: 'blob' }),
  descargarPdfOrdenFisica: (id) =>
    client.get(`/ordenes/${id}/pdf-fisico`, { responseType: 'blob' }),

  // ── Casillas CENEVAL (Conservación) ──────────────────────
  getCasillas: (ordenId) => client.get(`/casillas/${ordenId}`),
  upsertCasillas: (ordenId, data) => client.post(`/casillas/${ordenId}`, data),
  ocrCasillas: (ordenId, file) => {
    const formData = new FormData();
    formData.append('foto', file);
    return client.post(`/casillas/ocr/${ordenId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
  getResumenCasillas: () => client.get('/casillas/resumen/dominio'),
  descargarPdfCasillas: (ordenId) => client.get(`/casillas/${ordenId}/pdf`, { responseType: 'blob' }),
  getFormato: (tipo, ordenId) => client.get(`/formatos/${tipo}/${ordenId}`),
  // Helper para uso directo por URL desde OrdenCasillasForm
  post: (url, data) => client.post(url, data),
  postForm: (url, formData) =>
    client.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }),

  // ── Alertas ───────────────────────────────────────────────
  getAlertas: (params = {}) => client.get('/alertas', { params }),
  getAlertasPendientes: () => client.get('/alertas/pendientes'),
  marcarLeida: (id) => client.put(`/alertas/${id}/leer`),
  marcarTodasLeidas: () => client.put('/alertas/leer-todas'),

  // ── Trazabilidad ──────────────────────────────────────────
  getTrazabilidad: (params = {}) => client.get('/trazabilidad', { params }),
  getTrazabilidadEquipo: (id) => client.get(`/trazabilidad/equipo/${id}`),
  registrarTraslado: (data) => client.post('/trazabilidad', data),

  // ── Preventivos ───────────────────────────────────────────
  getPreventivos: (params = {}) => client.get('/preventivos', { params }),
  ejecutarPreventivo: (id) => client.put(`/preventivos/${id}/ejecutar`),

  // ── Reservas ──────────────────────────────────────────────
  getReservas: () => client.get('/reservas'),
  crearReserva: (data) => client.post('/reservas', data),
  cambiarEstadoReserva: (id, data) => client.put(`/reservas/${id}/estado`, data),
  editarReserva: (id, data) => client.put(`/reservas/${id}`, data),
  eliminarReserva: (id) => client.delete(`/reservas/${id}`),

  // ── Reportes ──────────────────────────────────────────────
  getReporteDiario: () => client.get('/reportes/diario'),
  getEquiposCriticos: () => client.get('/reportes/equipos-criticos'),
  getHistorialOrdenes: (mes, anio) =>
    client.get('/reportes/historial', { params: { mes, anio } }),

  // ── Exportación PDF / Excel ────────────────────────────────
  descargarReporteDiarioPdf:   () => client.get('/reportes/diario/pdf',     { responseType: 'blob' }),
  descargarReporteDiarioExcel: () => client.get('/reportes/diario/excel',   { responseType: 'blob' }),
  descargarHistorialPdf:   (mes, anio) => client.get('/reportes/historial/pdf',   { responseType: 'blob', params: { mes, anio } }),
  descargarHistorialExcel: (mes, anio) => client.get('/reportes/historial/excel', { responseType: 'blob', params: { mes, anio } }),

  // ── Tecnovigilancia (NOM-240) ─────────────────────────────────
  getEventos: (params = {}) => client.get('/tecnovigilancia', { params }),
  getEvento: (id) => client.get(`/tecnovigilancia/${id}`),
  crearEvento: (data) => client.post('/tecnovigilancia', data),
  cambiarEstadoEvento: (id, estado) =>
    client.put(`/tecnovigilancia/${id}/estado`, { estado }),
  investigarEvento: (id, data) =>
    client.put(`/tecnovigilancia/${id}/investigar`, data),
  escalarEvento: (id, folio_cofepris) =>
    client.post(`/tecnovigilancia/${id}/escalar`, { folio_cofepris }),
  cerrarEvento: (id, conclusion) =>
    client.put(`/tecnovigilancia/${id}/cerrar`, { conclusion }),
  subirEvidenciaEvento: (id, tipo, descripcion, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(
      `/tecnovigilancia/${id}/evidencia?tipo=${tipo}&descripcion=${encodeURIComponent(descripcion)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  descargarPdfNom240: (id) =>
    client.get(`/tecnovigilancia/${id}/pdf`, { responseType: 'blob' }),

  // ── SIGAH Copilot (IA Local Gemma) ────────────────────────────
  getCopilotEstado: () => client.get('/copilot/estado'),
  getCopilotPromptsRapidos: () => client.get('/copilot/prompts-rapidos'),
  copilotDiagnostico: (data) => client.post('/copilot/diagnostico', data),
  copilotCausaRaiz: (data) => client.post('/copilot/causa-raiz', data),
  copilotResumenIa: () => client.get('/copilot/resumen-ia'),
  copilotVision: (data) => client.post('/copilot/vision', data),
  // El chat usa fetch nativo por streaming SSE (no axios)
  // Ver: chatStreamUrl en la página Copilot
  getCopilotChatUrl: () => '/api/copilot/chat',

  // ── Almacén de Refacciones ─────────────────────────────────
  getAlmacen: (params = {}) => client.get('/almacen/', { params }),
  crearRefaccion: (data) => client.post('/almacen/', data),
  ajustarStock: (id, data) => client.put(`/almacen/${id}/stock`, data),

  // ── Metrología y Calibración ───────────────────────────────
  getMetrologia: () => client.get('/metrologia/'),
  crearCalibracion: (data) => client.post('/metrologia/', data),
  getMetrologiaVencidas: () => client.get('/metrologia/vencidas'),

  // ── Capacitación de Personal ───────────────────────────────
  getCapacitaciones: () => client.get('/capacitaciones/'),
  crearCapacitacion: (data) => client.post('/capacitaciones/', data),

  // ── SuperAdmin SIGAH ──────────────────────────────────────
  getAdminStats: () => client.get('/admin/stats'),
  getAdminHospitales: () => client.get('/admin/hospitales'),
  getAdminActividad: () => client.get('/admin/actividad-reciente'),

  // ── Auditoría NOM-016 ──────────────────────────────────────
  getAuditLogs: () => client.get('/auditoria/'),
  verificarCadena: () => client.get('/auditoria/verificar'),
  descargarBitacoraPdf: () => client.get('/auditoria/pdf', { responseType: 'blob' }),

  // ── Checklists NOM-016 ─────────────────────────────────────
  getChecklistTemplates: () => client.get('/checklists/templates'),
  getChecklistResultados: () => client.get('/checklists/resultados'),
  ejecutarChecklist: (data) => client.post('/checklists/ejecutar', data),
};

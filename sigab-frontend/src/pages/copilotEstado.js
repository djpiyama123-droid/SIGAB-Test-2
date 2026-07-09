// Estado visual del Copilot a partir del health del backend (GET /copilot/estado).
//
// Módulo separado de Copilot.jsx (sin imports) a propósito: así es testeable
// con vitest en entorno Node puro, sin jsdom (ver convención en
// CalendarioMantenimiento.test.js). Copilot.jsx importa desde aquí.
//
// status: { mode: "api"|"ollama", ok, detail, modelo_activo, modelo_disponible,
// modelos_instalados } — shape de services/gemma_service.verificar_ollama().
//
// Antes el frontend leía solo `ollama_activo`, que el backend fijaba en
// `false` SIEMPRE en modo "api" (aunque el proveedor en la nube estuviera
// sano) — por eso el banner de "instala Ollama" salía también en modo api.
export function estadoCopilot(status) {
  if (!status || !status.mode) {
    return { badge: 'desconocido', banner: null };
  }
  if (!status.ok) {
    return {
      badge: status.mode === 'ollama' ? 'ollama_offline' : 'api_offline',
      banner: status.mode === 'ollama' ? 'instalar_ollama' : 'api_no_disponible',
    };
  }
  if (status.mode === 'ollama' && !status.modelo_disponible) {
    return { badge: 'modelo_no_descargado', banner: 'descargar_modelo' };
  }
  return { badge: 'activo', banner: null };
}

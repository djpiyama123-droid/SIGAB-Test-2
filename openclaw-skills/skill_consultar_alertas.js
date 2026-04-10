'use strict';
/**
 * SIGAB Skill — skill_consultar_alertas
 * Lee alertas pendientes y las formatea para envío por WhatsApp.
 * Endpoint: GET http://localhost:8000/api/openclaw/alertas-pendientes
 *
 * Reglas de envío:
 *  - CRITICA → enviar inmediatamente
 *  - ALTA    → agrupar, enviar cada 30 min
 *  - MEDIA   → solo en reporte diario
 *  - BAJA    → nunca por WhatsApp
 */

const ENDPOINT = 'http://localhost:8000/api/openclaw/alertas-pendientes';

const EMOJIS = {
  critica: '🚨',
  alta:    '⚠️',
  media:   '📋',
  baja:    'ℹ️',
};

/**
 * @param {'critica'|'alta'|'media'|'todas'} [nivel='critica']
 * @returns {Promise<string>} Mensaje formateado para WhatsApp
 */
async function skill_consultar_alertas(nivel = 'critica') {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const todas = json.alertas || [];
    if (todas.length === 0) return '✅ Sin alertas pendientes.';

    // Filtrar por nivel solicitado
    let filtradas;
    if (nivel === 'todas') {
      filtradas = todas.filter((a) => a.prioridad !== 'baja'); // nunca baja por WA
    } else {
      filtradas = todas.filter((a) => a.prioridad === nivel);
    }

    if (filtradas.length === 0) {
      return `✅ Sin alertas de prioridad "${nivel}".`;
    }

    // Formatear (máximo 5 para no saturar WA)
    const top = filtradas.slice(0, 5);
    const lineas = top.map((a) => {
      const em = EMOJIS[a.prioridad] || '📌';
      const eq = a.equipo_nombre ? ` (${a.equipo_nombre})` : '';
      return `${em} ${a.mensaje.slice(0, 70)}${eq}`;
    });

    const header = `🔔 ${filtradas.length} alerta(s) ${nivel}:`;
    const cuerpo = lineas.join('\n');
    const pie    = filtradas.length > 5 ? `\n...y ${filtradas.length - 5} más.` : '';

    return `${header}\n${cuerpo}${pie}`;
  } catch (err) {
    console.error('[skill_consultar_alertas]', err.message);
    return `❌ Error obteniendo alertas: ${err.message.slice(0, 60)}`;
  }
}

module.exports = skill_consultar_alertas;

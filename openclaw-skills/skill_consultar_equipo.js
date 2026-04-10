'use strict';
/**
 * SIGAB Skill — skill_consultar_equipo
 * Consulta el estado completo de un equipo por serie, nombre o modelo.
 * Endpoint: GET http://localhost:8000/api/openclaw/estado-equipo/{serie}
 *           GET http://localhost:8000/api/openclaw/buscar-equipo?q={query}
 */

const BASE = 'http://localhost:8000/api/openclaw';

const EMOJI_ESTADO = {
  operativo:        '🟢',
  en_mantenimiento: '🟡',
  fuera_servicio:   '🔴',
  en_traslado:      '🔵',
  baja:             '⚫',
};

/**
 * @param {string} query - Número de serie, nombre, marca o modelo
 * @returns {Promise<string>} Respuesta formateada para WhatsApp
 */
async function skill_consultar_equipo(query) {
  if (!query || query.trim().length < 2) {
    return '❌ Proporciona al menos 2 caracteres para buscar el equipo.';
  }

  try {
    // Primero intenta búsqueda exacta por serie
    const estadoRes = await fetch(
      `${BASE}/estado-equipo/${encodeURIComponent(query.trim())}`
    );
    const estadoJson = await estadoRes.json();

    if (estadoJson.ok && estadoJson.equipo) {
      return formatearEquipo(estadoJson.equipo, estadoJson.historial_ordenes);
    }

    // Si no encuentra por serie exacta, busca en general
    const buscarRes = await fetch(
      `${BASE}/buscar-equipo?q=${encodeURIComponent(query.trim())}`
    );
    const buscarJson = await buscarRes.json();

    if (!buscarJson.ok || !buscarJson.resultados?.length) {
      return `🔍 Sin resultados para "${query}"\nVerifica nombre, serie o modelo.`;
    }

    // Devuelve lista si hay múltiples resultados
    if (buscarJson.resultados.length > 1) {
      const lista = buscarJson.resultados
        .slice(0, 4)
        .map((e, i) => {
          const em = EMOJI_ESTADO[e.estado] || '❓';
          return `${i + 1}. ${em} ${e.nombre} (${e.serie})`;
        })
        .join('\n');
      return `🔍 ${buscarJson.total} equipos encontrados:\n${lista}`;
    }

    // Único resultado — detalle completo
    const eq = buscarJson.resultados[0];
    return formatearEquipo(eq, []);
  } catch (err) {
    console.error('[skill_consultar_equipo]', err.message);
    return `❌ Error consultando: ${err.message.slice(0, 80)}`;
  }
}

function formatearEquipo(eq, historial = []) {
  const em = EMOJI_ESTADO[eq.estado] || '❓';
  const ult = eq.ultimo_mantenimiento || eq.fecha_ultimo_mantenimiento || 'N/A';
  const prox = eq.fecha_proximo_mantenimiento || 'No prog.';
  const tickets = eq.tickets_abiertos ?? 0;

  let msg = `📊 ${eq.nombre}\n`;
  msg += `Serie: ${eq.serie}\n`;
  msg += `${em} ${(eq.estado || '').replace(/_/g, ' ')}\n`;
  msg += `📍 ${eq.area || '—'}, Piso ${eq.piso || '—'}\n`;
  msg += `🔧 Últ. mtto: ${ult}\n`;
  msg += `📅 Próx: ${prox}`;
  if (tickets > 0) msg += `\n⚠️ ${tickets} ticket(s) abierto(s)`;

  return msg;
}

module.exports = skill_consultar_equipo;

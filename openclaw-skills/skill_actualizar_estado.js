'use strict';
/**
 * SIGAB Skill — skill_actualizar_estado
 * Cambia el estado de un equipo identificado por su número de serie.
 * Endpoint: PUT http://localhost:8000/api/equipos/{id}  (campo: estado)
 * Flujo: busca id por serie → actualiza estado
 */

const BASE = 'http://localhost:8000/api';

const ESTADOS_VALIDOS = [
  'operativo',
  'en_mantenimiento',
  'fuera_servicio',
  'en_traslado',
  'baja',
];

const EMOJI_ESTADO = {
  operativo:        '🟢',
  en_mantenimiento: '🟡',
  fuera_servicio:   '🔴',
  en_traslado:      '🔵',
  baja:             '⚫',
};

/**
 * @param {string} serie   - Número de serie del equipo
 * @param {string} estado  - Nuevo estado (debe estar en ESTADOS_VALIDOS)
 * @returns {Promise<string>}
 */
async function skill_actualizar_estado(serie, estado) {
  if (!serie) return '❌ Proporciona el número de serie del equipo.';
  if (!estado) return '❌ Indica el nuevo estado del equipo.';

  const estadoNorm = estado.toLowerCase().replace(/ /g, '_');
  if (!ESTADOS_VALIDOS.includes(estadoNorm)) {
    return `❌ Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}`;
  }

  try {
    // 1. Buscar equipo por serie
    const searchRes = await fetch(
      `${BASE}/openclaw/buscar-equipo?q=${encodeURIComponent(serie)}`
    );
    const searchJson = await searchRes.json();

    if (!searchJson.ok || !searchJson.resultados?.length) {
      return `❌ Equipo "${serie}" no encontrado en SIGAB.`;
    }

    const equipo = searchJson.resultados[0];

    // 2. Actualizar estado
    const updateRes = await fetch(`${BASE}/equipos/${equipo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: estadoNorm }),
    });

    if (!updateRes.ok) throw new Error(`HTTP ${updateRes.status}`);

    const emoji = EMOJI_ESTADO[estadoNorm] || '❓';
    return `${emoji} ${equipo.nombre} → ${estadoNorm.replace(/_/g, ' ')}\nSerie: ${serie}`;
  } catch (err) {
    console.error('[skill_actualizar_estado]', err.message);
    return `❌ Error: ${err.message.slice(0, 80)}`;
  }
}

module.exports = skill_actualizar_estado;

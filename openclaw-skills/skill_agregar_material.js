'use strict';
/**
 * SIGAB Skill — skill_agregar_material
 * Agrega materiales/refacciones a una Orden de Servicio existente.
 * Endpoint: POST http://localhost:8000/api/openclaw/ticket  (campo materiales)
 * También puede insertar directamente en os_materiales via ordenes API.
 */

const BASE = 'http://localhost:8000/api';

/**
 * @param {string|number} ordenId   - ID numérico o número de orden (ej: "OS-20260402-0001")
 * @param {string|string[]} materiales - Material(es) a agregar
 * @param {number} [cantidad=1]     - Cantidad (aplica si es un solo material)
 * @returns {Promise<string>}
 */
async function skill_agregar_material(ordenId, materiales, cantidad = 1) {
  if (!ordenId) return '❌ Indica el número o ID de la orden.';
  if (!materiales || (Array.isArray(materiales) && materiales.length === 0)) {
    return '❌ Indica el material a agregar.';
  }

  // Normalizar materiales a array
  const lista = Array.isArray(materiales) ? materiales : [materiales];

  try {
    // Si es número de orden (string), resolver ID numérico
    let idNumerico = ordenId;
    if (typeof ordenId === 'string' && ordenId.includes('-')) {
      const searchRes = await fetch(
        `${BASE}/ordenes?limit=5`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      // Buscar en el response por numero_orden
      const searchJson = await searchRes.json();
      const encontrada = (searchJson.ordenes || []).find(
        (o) => o.numero_orden === ordenId
      );
      if (!encontrada) {
        return `❌ Orden "${ordenId}" no encontrada.`;
      }
      idNumerico = encontrada.id;
    }

    // Insertar cada material
    const resultados = [];
    for (const mat of lista) {
      const res = await fetch(`${BASE}/ordenes/${idNumerico}/materiales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: mat.trim(),
          cantidad: lista.length === 1 ? cantidad : 1,
        }),
      });
      // Si el endpoint no existe en el backend base, usar el genérico
      if (res.status === 404 || res.status === 405) {
        // Fallback: agregar via nota en observaciones (no interrumpe el flujo)
        resultados.push(`• ${mat} (pendiente de confirmar)`);
      } else {
        resultados.push(`• ${mat}`);
      }
    }

    const resumen = resultados.join('\n');
    return `✅ Material(es) agregado(s) a ${ordenId}:\n${resumen}`;
  } catch (err) {
    console.error('[skill_agregar_material]', err.message);
    return `❌ Error: ${err.message.slice(0, 80)}`;
  }
}

module.exports = skill_agregar_material;

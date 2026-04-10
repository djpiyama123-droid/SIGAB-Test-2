'use strict';
/**
 * SIGAB Skill — skill_confirmar_cierre
 * Cierra una Orden de Servicio y confirma el cierre por WhatsApp.
 * Endpoint: PUT http://localhost:8000/api/ordenes/{id}/cerrar
 *
 * Flujo:
 *  1. Si recibe numero_orden (string), resuelve el ID numérico
 *  2. Verifica que no esté ya cerrada
 *  3. Ejecuta el cierre
 *  4. Responde con confirmación corta
 */

const BASE = 'http://localhost:8000/api';

/**
 * @param {string|number} ordenRef  - Número de orden ("OS-20260402-0001") o ID numérico
 * @param {string} [tecnico]        - Nombre de quien confirma el cierre (opcional)
 * @returns {Promise<string>}
 */
async function skill_confirmar_cierre(ordenRef, tecnico = null) {
  if (!ordenRef) return '❌ Indica el número o ID de la orden a cerrar.';

  try {
    let ordenId;
    let nombreOrden = String(ordenRef);

    // Resolver ID si se pasó número de orden en texto
    if (typeof ordenRef === 'string' && ordenRef.includes('-')) {
      const listRes = await fetch(`${BASE}/ordenes?limit=100`);
      const listJson = await listRes.json();
      const encontrada = (listJson.ordenes || []).find(
        (o) => o.numero_orden === ordenRef
      );
      if (!encontrada) {
        return `❌ Orden "${ordenRef}" no encontrada en el sistema.`;
      }
      ordenId    = encontrada.id;
      nombreOrden = encontrada.numero_orden;

      // Verificar estado actual
      if (encontrada.estado === 'cerrada') {
        return `ℹ️ La orden ${nombreOrden} ya estaba cerrada.`;
      }
      if (encontrada.estado === 'cancelada') {
        return `⚠️ La orden ${nombreOrden} está cancelada, no se puede cerrar.`;
      }
    } else {
      ordenId = Number(ordenRef);
      if (isNaN(ordenId)) return '❌ ID de orden inválido.';
    }

    // Ejecutar cierre
    const closeRes = await fetch(`${BASE}/ordenes/${ordenId}/cerrar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!closeRes.ok) {
      const err = await closeRes.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${closeRes.status}`);
    }

    const firma = tecnico ? `\nFirmado: ${tecnico}` : '';
    return `✅ Orden ${nombreOrden} CERRADA\n📅 ${new Date().toLocaleDateString('es-MX')}${firma}`;
  } catch (err) {
    console.error('[skill_confirmar_cierre]', err.message);
    return `❌ Error cerrando orden: ${err.message.slice(0, 80)}`;
  }
}

module.exports = skill_confirmar_cierre;

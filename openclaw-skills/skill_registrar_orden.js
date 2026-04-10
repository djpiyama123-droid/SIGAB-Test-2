'use strict';
/**
 * SIGAB Skill — skill_registrar_orden
 * Crea una Orden de Servicio desde datos OCR/audio extraídos por Gemini.
 * Endpoint: POST http://localhost:8000/api/openclaw/ticket
 * Respuesta WhatsApp: ≤ 150 chars
 */

const ENDPOINT = 'http://localhost:8000/api/openclaw/ticket';

/**
 * @param {Object} datos - Campos extraídos del formato físico
 * @param {string} [datos.equipo_serie]
 * @param {string} [datos.equipo_nombre]
 * @param {string} [datos.equipo_marca]
 * @param {string} [datos.equipo_modelo]
 * @param {string} [datos.falla_reportada]
 * @param {string} [datos.tecnico_nombre]
 * @param {string} [datos.ubicacion]
 * @param {string} [datos.area]
 * @param {string} [datos.piso]
 * @param {string[]} [datos.materiales]
 * @param {string} [datos.observaciones]
 * @param {string} [datos.prioridad]  - 'baja'|'media'|'alta'|'critica'
 * @returns {Promise<string>} Mensaje de respuesta para WhatsApp
 */
async function skill_registrar_orden(datos = {}) {
  // Validación mínima
  if (!datos.equipo_nombre && !datos.equipo_serie) {
    return '❌ Falta identificar el equipo. ¿Nombre o número de serie?';
  }
  if (!datos.falla_reportada) {
    return '❌ No se detectó la falla. ¿Qué problema tiene el equipo?';
  }

  try {
    const formData = new URLSearchParams();
    const campos = [
      'equipo_serie','equipo_nombre','equipo_marca','equipo_modelo',
      'falla_reportada','tecnico_nombre','ubicacion','area','piso',
      'observaciones','prioridad',
    ];
    campos.forEach((k) => {
      if (datos[k]) formData.append(k, datos[k]);
    });

    // Materiales como JSON array
    if (Array.isArray(datos.materiales) && datos.materiales.length > 0) {
      formData.append('materiales', JSON.stringify(datos.materiales));
    }

    formData.append('tipo_mantenimiento', datos.tipo_mantenimiento || 'correctivo');

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.ok) throw new Error(json.mensaje || 'Error desconocido');

    // Respuesta ≤ 150 chars para WhatsApp
    const equipo = datos.equipo_nombre || datos.equipo_serie || 'Equipo';
    return `✅ ${json.numero_orden} creado\n🔧 ${equipo}\n📋 ${datos.falla_reportada.slice(0, 60)}`;
  } catch (err) {
    console.error('[skill_registrar_orden]', err.message);
    return `❌ Error creando ticket: ${err.message.slice(0, 80)}`;
  }
}

module.exports = skill_registrar_orden;

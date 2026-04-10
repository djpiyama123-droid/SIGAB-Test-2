/**
 * SIGAB Bot — Router de comandos WhatsApp
 * Interpreta mensajes en español y ejecuta acciones contra la API de SIGAB.
 * 
 * HGR No.1 IMSS Tijuana — 100% On-Premise
 */

const API = 'http://localhost:8000/api/openclaw';

const EMOJI_ESTADO = {
  operativo:        '🟢',
  en_mantenimiento: '🟡',
  fuera_servicio:   '🔴',
  en_traslado:      '🔵',
  baja:             '⚫',
};

// ── Ayuda ──────────────────────────────────────────────────
function cmdAyuda() {
  return `🏥 *SIGAB Bot — Comandos*

📋 */equipo* _[serie o nombre]_
   Consulta datos y estado de un equipo

🔧 */ticket* _[descripción de falla]_
   Crear orden de servicio correctivo

🔄 */estado* _[serie] [nuevo_estado]_
   Cambiar estado del equipo
   Estados: operativo, en_mantenimiento, fuera_servicio

🚚 */traslado* _[serie] [área_destino]_
   Registrar traslado de equipo

⚠️ */alertas*
   Ver alertas pendientes

📊 */reporte*
   Reporte del día

❓ */ayuda*
   Mostrar este menú`;
}

// ── Consultar Equipo ───────────────────────────────────────
async function cmdEquipo(query) {
  if (!query) return '❌ Uso: */equipo* _serie o nombre_';

  try {
    // Intenta por serie exacta primero
    let res = await fetch(`${API}/estado-equipo/${encodeURIComponent(query)}`);
    let json = await res.json();

    if (json.ok && json.equipo) {
      return formatEquipo(json.equipo, json.historial_ordenes);
    }

    // Búsqueda general
    res = await fetch(`${API}/buscar-equipo?q=${encodeURIComponent(query)}`);
    json = await res.json();

    if (!json.ok || !json.resultados?.length) {
      return `🔍 Sin resultados para "${query}"`;
    }

    if (json.resultados.length > 1) {
      const lista = json.resultados.slice(0, 5).map((e, i) => {
        const em = EMOJI_ESTADO[e.estado] || '❓';
        return `${i + 1}. ${em} *${e.nombre}* (${e.serie})`;
      }).join('\n');
      return `🔍 ${json.total} equipo(s):\n${lista}`;
    }

    return formatEquipo(json.resultados[0], []);
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

function formatEquipo(eq, historial = []) {
  const em = EMOJI_ESTADO[eq.estado] || '❓';
  let msg = `📊 *${eq.nombre}*\n`;
  msg += `Serie: \`${eq.serie}\`\n`;
  msg += `${em} ${(eq.estado || '').replace(/_/g, ' ')}\n`;
  msg += `📍 ${eq.area || '—'}, Piso ${eq.piso || '—'}\n`;
  msg += `🏭 ${eq.marca || ''} ${eq.modelo || ''}\n`;

  const ult = eq.ultimo_mantenimiento || eq.fecha_ultimo_mantenimiento || 'N/A';
  const prox = eq.fecha_proximo_mantenimiento || 'No prog.';
  msg += `🔧 Últ. mtto: ${ult}\n`;
  msg += `📅 Próx: ${prox}`;

  if (eq.tickets_abiertos > 0) msg += `\n⚠️ ${eq.tickets_abiertos} ticket(s) abierto(s)`;

  if (historial?.length > 0) {
    msg += `\n\n📜 _Últimas órdenes:_`;
    historial.slice(0, 3).forEach(o => {
      msg += `\n  • ${o.numero_orden} — ${o.estado} (${o.fecha})`;
    });
  }

  return msg;
}

// ── Crear Ticket ───────────────────────────────────────────
async function cmdTicket(texto, sender) {
  if (!texto) return '❌ Uso: */ticket* _Descripción de la falla_\nEj: */ticket* Monitor no enciende en Quirofano';

  try {
    const params = new URLSearchParams();
    params.append('falla_reportada', texto);
    params.append('tecnico_nombre', sender || 'WhatsApp Bot');
    params.append('tipo_mantenimiento', 'correctivo');
    params.append('prioridad', 'media');

    // Intenta extraer área del texto
    const areas = ['Quirófano', 'Urgencias', 'UCIN', 'Terapias', 'Hospitalización', 'Tococirugía', 'Recuperación', 'Anestesiología'];
    const areaMatch = areas.find(a => texto.toLowerCase().includes(a.toLowerCase()));
    if (areaMatch) params.append('area', areaMatch);

    const res = await fetch(`${API}/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = await res.json();

    if (json.ok) {
      return `✅ *${json.numero_orden}* creado\n📋 ${texto.slice(0, 80)}\n📱 Se notificó al sistema SIGAB`;
    }
    return `❌ Error: ${json.mensaje || 'No se pudo crear'}`;
  } catch (err) {
    return `❌ Error creando ticket: ${err.message}`;
  }
}

// ── Cambiar Estado ─────────────────────────────────────────
async function cmdEstado(args) {
  const parts = args?.trim().split(/\s+/) || [];
  if (parts.length < 2) {
    return `❌ Uso: */estado* _[serie] [nuevo_estado]_
Estados válidos: operativo, en_mantenimiento, fuera_servicio, en_traslado, baja`;
  }

  const serie = parts[0];
  const estado = parts.slice(1).join('_').toLowerCase();
  const VALIDOS = ['operativo', 'en_mantenimiento', 'fuera_servicio', 'en_traslado', 'baja'];

  if (!VALIDOS.includes(estado)) {
    return `❌ Estado "${estado}" no válido.\nOpciones: ${VALIDOS.join(', ')}`;
  }

  try {
    // Buscar equipo
    const searchRes = await fetch(`${API}/buscar-equipo?q=${encodeURIComponent(serie)}`);
    const searchJson = await searchRes.json();
    if (!searchJson.ok || !searchJson.resultados?.length) {
      return `❌ Equipo "${serie}" no encontrado`;
    }

    const equipo = searchJson.resultados[0];

    // Actualizar via OpenClaw endpoint directo
    const updateRes = await fetch(`http://localhost:8000/api/openclaw/cambiar-estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ equipo_serie: serie, nuevo_estado: estado }).toString(),
    });
    const updateJson = await updateRes.json();

    if (updateJson.ok) {
      const em = EMOJI_ESTADO[estado] || '❓';
      return `${em} *${equipo.nombre}* → ${estado.replace(/_/g, ' ')}\nSerie: \`${serie}\``;
    }
    return `❌ ${updateJson.mensaje || 'Error actualizando'}`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

// ── Registrar Traslado ─────────────────────────────────────
async function cmdTraslado(args) {
  const parts = args?.trim().split(/\s+/) || [];
  if (parts.length < 2) {
    return '❌ Uso: */traslado* _[serie] [área_destino]_\nEj: */traslado* 82-0751 Urgencias';
  }

  const serie = parts[0];
  const destino = parts.slice(1).join(' ');

  try {
    const res = await fetch(`${API}/traslado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        equipo_serie: serie,
        area_destino: destino,
      }).toString(),
    });
    const json = await res.json();
    return json.ok
      ? `🚚 *Traslado registrado*\n${json.mensaje}`
      : `❌ ${json.mensaje}`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

// ── Alertas ────────────────────────────────────────────────
async function cmdAlertas() {
  try {
    const res = await fetch(`${API}/alertas-pendientes`);
    const json = await res.json();

    if (!json.ok || json.total === 0) return '✅ Sin alertas pendientes';

    const lista = json.alertas.slice(0, 8).map((a, i) => {
      const icon = a.prioridad === 'critica' ? '🚨' : '⚠️';
      return `${i + 1}. ${icon} ${a.mensaje?.slice(0, 60) || 'Sin mensaje'}`;
    }).join('\n');

    return `⚠️ *${json.total} alerta(s) pendiente(s):*\n\n${lista}`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

// ── Reporte Diario ─────────────────────────────────────────
async function cmdReporte() {
  try {
    const res = await fetch(`${API}/reporte-diario`);
    const json = await res.json();

    if (!json.ok) return '❌ Error generando reporte';

    let msg = `📊 *Reporte SIGAB — ${json.fecha}*\n\n`;
    msg += `📝 Órdenes nuevas hoy: *${json.ordenes_nuevas_hoy}*\n`;
    msg += `✅ Órdenes cerradas hoy: *${json.ordenes_cerradas_hoy}*\n`;

    if (json.equipos_fuera_servicio?.length > 0) {
      msg += `\n🔴 *Equipos fuera de servicio:*\n`;
      json.equipos_fuera_servicio.forEach(e => {
        msg += `  • ${e.nombre} (${e.serie}) — ${e.area || '?'}\n`;
      });
    } else {
      msg += `\n🟢 Todos los equipos operativos`;
    }

    if (json.preventivos_vencidos?.length > 0) {
      msg += `\n\n⏰ *Preventivos vencidos:*\n`;
      json.preventivos_vencidos.forEach(p => {
        msg += `  • ${p.nombre} (${p.serie}) — ${p.tipo_preventivo}\n`;
      });
    }

    msg += `\n\n_Hospital General Regional No. 1 — IMSS Tijuana_`;
    return msg;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

// ── Router Principal ───────────────────────────────────────
export async function handleCommand(text, senderName) {
  const trimmed = (text || '').trim();

  // Detectar comando con / o sin /
  let cmd, args;
  if (trimmed.startsWith('/')) {
    const spaceIdx = trimmed.indexOf(' ');
    cmd = spaceIdx > 0 ? trimmed.slice(1, spaceIdx).toLowerCase() : trimmed.slice(1).toLowerCase();
    args = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1).trim() : '';
  } else {
    return null; // No es un comando, ignorar
  }

  switch (cmd) {
    case 'ayuda':
    case 'help':
    case 'menu':
      return cmdAyuda();

    case 'equipo':
    case 'eq':
    case 'buscar':
      return cmdEquipo(args);

    case 'ticket':
    case 'os':
    case 'orden':
    case 'falla':
      return cmdTicket(args, senderName);

    case 'estado':
      return cmdEstado(args);

    case 'traslado':
    case 'mover':
      return cmdTraslado(args);

    case 'alertas':
    case 'alerta':
      return cmdAlertas();

    case 'reporte':
    case 'resumen':
      return cmdReporte();

    default:
      return null; // Comando no reconocido, no responder
  }
}

// Exportar reporte para el scheduler
export { cmdReporte, cmdAlertas };

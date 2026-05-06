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

📄 */pdf* _[serie]_
   Generar PDF IMSS del equipo

📸 */escanear* _(envía foto)_
   Escanear OS IMSS llena → IA crea la orden

📧 */email* _[serie]_ _[correo]_
   Mandar reporte por Gmail

☎️ */proveedor* _[serie]_
   Info de contrato y empresa externa

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

// ── Generar PDF del Equipo ─────────────────────────────────
async function cmdPdf(serie) {
  if (!serie) return '❌ Uso: */pdf* _serie_';

  try {
    const url = `${API}/equipo-pdf/${encodeURIComponent(serie)}`;
    const res = await fetch(url);
    if (!res.ok) {
       const json = await res.json();
       return `❌ Error: ${json.mensaje || 'No se pudo generar el PDF'}`;
    }

    const buffer = await res.arrayBuffer();
    return {
      type: 'document',
      document: Buffer.from(buffer),
      fileName: `Reporte_${serie}.pdf`,
      mimetype: 'application/pdf',
      caption: `📄 Reporte Técnico: *${serie}*`
    };
  } catch (err) {
    return `❌ Error generando PDF: ${err.message}`;
  }
}

// ── Enviar Reporte por Correo ──────────────────────────────
async function cmdEmail(args) {
  const parts = args?.trim().split(/\s+/) || [];
  if (parts.length < 2) return '❌ Uso: */email* _serie_ _correo_';

  const serie = parts[0];
  const email = parts[1];

  try {
    const res = await fetch(`${API}/enviar-reporte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ serie, email }).toString(),
    });
    const json = await res.json();
    return json.ok ? `📧 *Envío Exitoso*\n${json.mensaje}` : `❌ ${json.mensaje}`;
  } catch (err) {
    return `❌ Error enviando email: ${err.message}`;
  }
}

// ── Procesar Lenguaje Natural (IA Copilot) ─────────────────
async function cmdAI(mensaje) {
  if (!mensaje || mensaje.length < 3) return null;

  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje }),
    });
    const json = await res.json();
    if (json.ok) return `🤖 *SIGAB Copilot:*\n\n${json.respuesta}`;
    return null;
  } catch (err) {
    console.error('Error AI Bot:', err);
    return null;
  }
}

// ── Casillas CENEVAL desde foto ────────────────────────────────────────────────
/**
 * Handler para fotos enviadas con caption "/casillas [serie]"
 * O mensajes de texto "/casillas [orden_id]"
 * Sube la imagen a POST /api/casillas/ocr/{orden_id} y responde con resumen.
 */
async function cmdCasillasOCR(mediaBuffer, mimeType, args) {
  const CASILLAS_API = 'http://localhost:8000/api/casillas';

  // Si se mandó sin imagen o sin orden_id, dar instrucciones
  if (!args && !mediaBuffer) {
    return `📋 *Casillas CENEVAL — Instrucciones*

Para registrar desde foto del formato físico:
1. Toma foto clara del formato SIGAB relleno
2. Envía la foto con caption: */casillas [número_orden]*
   Ej: _/casillas 123_

O si no sabes el número de orden:
   */casillas serie [no_serie]*
   Ej: _/casillas serie 82-0751_

El sistema usará IA para leer las casillas automáticamente. ✅`;
  }

  try {
    let ordenId = null;
    const argsTrimmed = (args || '').trim();

    // Modo: /casillas serie [serie] → buscar orden abierta del equipo
    if (argsTrimmed.toLowerCase().startsWith('serie ')) {
      const serie = argsTrimmed.slice(6).trim();
      const searchRes = await fetch(`http://localhost:8000/api/openclaw/buscar-equipo?q=${encodeURIComponent(serie)}`);
      const searchJson = await searchRes.json();
      if (!searchJson.ok || !searchJson.resultados?.length) {
        return `❌ Equipo con serie "${serie}" no encontrado en SIGAB`;
      }
      const equipoId = searchJson.resultados[0].id;

      // Crear OS automática para el equipo
      const osParams = new URLSearchParams({
        equipo_serie: serie,
        tipo_mantenimiento: 'correctivo',
        falla_reportada: 'Reportado vía WhatsApp foto-casillas',
        origen: 'whatsapp_foto',
        prioridad: 'media',
      });
      const osRes = await fetch('http://localhost:8000/api/openclaw/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: osParams.toString(),
      });
      const osJson = await osRes.json();
      if (!osJson.ok) return `❌ No se pudo crear la OS: ${osJson.mensaje}`;
      ordenId = osJson.orden_id;
    } else if (/^\d+$/.test(argsTrimmed)) {
      ordenId = parseInt(argsTrimmed, 10);
    } else {
      return `❌ Formato incorrecto.\nUso: */casillas [número_orden]* o */casillas serie [no_serie]*`;
    }

    // Si hay imagen, enviar a OCR
    if (mediaBuffer) {
      const FormData = (await import('formdata-node')).FormData;
      const { Blob } = await import('buffer');

      const fd = new FormData();
      fd.set('foto', new Blob([mediaBuffer], { type: mimeType || 'image/jpeg' }), 'foto.jpg');

      const ocrRes = await fetch(`${CASILLAS_API}/ocr/${ordenId}`, {
        method: 'POST',
        body: fd,
      });

      if (!ocrRes.ok) {
        const err = await ocrRes.json();
        return `❌ Error en OCR: ${err.detail || 'Intenta de nuevo'}`;
      }

      const casillas = await ocrRes.json();

      const DOMINIO_LABEL = { medico: '⚕ Médico', polivalente: '🛏 Polivalente', ac_infra: '❄ A/C' };
      const ESTADO_EMOJI  = { operativo: '🟢', operativo_obs: '🟡', fuera_servicio: '🔴', en_taller: '🔵' };
      const RESOLUCION_LABEL = { sitio: '✅ Sitio', refaccion: '🔩 Refacción', taller: '🏭 Taller', externo: '🤝 Externo', baja: '🗑 Baja' };

      // Contar fallas marcadas
      const fallasMarcadas = Object.entries(casillas)
        .filter(([k, v]) => k.startsWith('falla_') && v === 1)
        .map(([k]) => k.replace('falla_', '').replace(/_/g, ' '));

      let reply = `📋 *OS #${ordenId} — Casillas leídas* ✅\n\n`;
      reply += `${DOMINIO_LABEL[casillas.dominio] || casillas.dominio} · ${casillas.tipo_servicio}\n`;
      reply += `Fallas detectadas: ${fallasMarcadas.length > 0 ? fallasMarcadas.join(', ') : 'ninguna'}\n`;
      reply += `Resolución: ${RESOLUCION_LABEL[casillas.resolucion] || casillas.resolucion}\n`;
      reply += `Estado final: ${ESTADO_EMOJI[casillas.estado_final] || ''} ${casillas.estado_final.replace('_', ' ')}\n`;
      if (casillas.observaciones_breves) reply += `Obs: _${casillas.observaciones_breves}_\n`;
      if (casillas.ocr_confianza) reply += `\n🎯 Confianza OCR: ${Math.round(casillas.ocr_confianza * 100)}%`;
      reply += `\n\n_Datos guardados en SIGAB. Dashboard actualizado._`;

      return reply;
    }

    // Sin imagen → instrucciones
    return `📋 OS #${ordenId} encontrada.\nAhora envía la *foto del formato físico* con caption: */casillas ${ordenId}*`;

  } catch (err) {
    console.error('cmdCasillasOCR error:', err);
    return `❌ Error procesando casillas: ${err.message}`;
  }
}

// ── Escanear OS IMSS desde foto (formato SIGAB-IMSS-OS-V3) ─────────────────
/**
 * Handler para fotos con caption "/escanear" (o sin caption — auto-detecta el banner).
 * Envía la imagen a POST /api/openclaw/scan-os, que ejecuta Gemma 3:4b → Gemini
 * y crea automáticamente la OS en estado 'pendiente_validacion'.
 */
async function cmdEscanearOS(mediaBuffer, mimeType, args, senderName) {
  if (!mediaBuffer) {
    return `📸 *Escanear Orden de Servicio IMSS*

Para crear una OS automáticamente desde una foto:
1. Imprime el formato desde SIGAB (Órdenes → "📄 Formato IMSS").
2. Llena la hoja a mano (asegúrate que el banner *SIGAB-IMSS-OS-V3* esté visible al pie).
3. Envíame la foto con caption: */escanear*

Yo usaré IA (Gemma local + Gemini fallback) para extraer:
✅ Folio, fecha, hora inicio/término
✅ Equipo (serie, marca, modelo)
✅ Tipo de mantenimiento, prioridad
✅ Descripción, observaciones, técnico
✅ Refacciones utilizadas
✅ Validaciones Poka-Yoke

La OS quedará en estado *pendiente_validacion* para que la revises en SIGAB.`;
  }

  try {
    const FormData = (await import('formdata-node')).FormData;
    const { Blob } = await import('buffer');

    const fd = new FormData();
    fd.set('foto', new Blob([mediaBuffer], { type: mimeType || 'image/jpeg' }), 'os.jpg');
    fd.set('auto_create', 'true');
    if (senderName) fd.set('remitente', senderName);

    const res = await fetch(`${API}/scan-os`, {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();

    if (!json.ok) {
      return `❌ ${json.mensaje || 'No se pudo procesar la imagen'}`;
    }

    const conf = Math.round((json.confianza || 0) * 100);
    const engine = json.engine === 'gemma' ? '🏠 Gemma local' : '☁ Gemini cloud';
    let reply = `✅ *${json.numero_orden}* creada\n\n`;
    reply += `🤖 Motor: ${engine}\n`;
    reply += `🎯 Confianza: ${conf}%\n`;
    reply += `📋 Estado: _pendiente_validacion_\n\n`;
    reply += `Revisa la OS en SIGAB para validar los datos extraídos.`;
    return reply;
  } catch (err) {
    console.error('cmdEscanearOS error:', err);
    return `❌ Error escaneando: ${err.message}`;
  }
}

// ── Info de Proveedor/Contrato ─────────────────────────────
async function cmdProveedor(serie) {
  if (!serie) return '❌ Uso: */proveedor* _serie_';

  try {
    const res = await fetch(`${API}/estado-equipo/${encodeURIComponent(serie)}`);
    const json = await res.json();

    if (!json.ok || !json.equipo) return `❌ Equipo "${serie}" no encontrado`;

    const eq = json.equipo;
    let msg = `☎️ *Servicio Externo — ${eq.nombre}*\n`;
    msg += `Empresa: *${eq.proveedor_servicio || 'No asignada'}*\n`;
    msg += `Contrato: \`${eq.numero_contrato || 'Sin contrato'}\`\n`;
    msg += `Serie: \`${eq.serie}\`\n`;
    msg += `\n📞 *Acción Sugerida:* Llamar a la empresa para reporte de falla bajo contrato.`;
    
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
    // Si no es comando pero el bot es mencionado o el mensaje es relevante
    // Por ahora, procesar todo lo que no sea comando con IA si tiene más de 5 palabras
    if (trimmed.split(' ').length >= 3) {
      return cmdAI(trimmed);
    }
    return null;
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

    case 'pdf':
    case 'descargar':
    case 'formato':
      return cmdPdf(args);

    case 'email':
    case 'correo':
    case 'gmail':
      return cmdEmail(args);

    case 'proveedor':
    case 'contrato':
    case 'empresa':
    case 'servicio':
      return cmdProveedor(args);

    case 'casillas':
    case 'ceneval':
    case 'conservacion':
      // mediaBuffer y mimeType se pasan desde index.js cuando hay imagen adjunta
      return cmdCasillasOCR(null, null, args);

    case 'escanear':
    case 'escaneo':
    case 'scan':
    case 'leer':
      return cmdEscanearOS(null, null, args, senderName);

    default:
      return null; // Comando no reconocido, no responder
  }
}

/**
 * Llamada especial desde index.js cuando llega una IMAGEN con caption /casillas
 * Debe invocarse ANTES de handleCommand si el mensaje es de tipo imagen.
 */
export async function handleImageCommand(text, mediaBuffer, mimeType, senderName) {
  const trimmed = (text || '').trim().toLowerCase();
  if (trimmed.startsWith('/casillas') || trimmed.startsWith('/ceneval')) {
    const spaceIdx = trimmed.indexOf(' ');
    const args = spaceIdx > 0 ? text.slice(spaceIdx + 1).trim() : '';
    return cmdCasillasOCR(mediaBuffer, mimeType, args);
  }
  if (
    trimmed.startsWith('/escanear') ||
    trimmed.startsWith('/escaneo') ||
    trimmed.startsWith('/scan') ||
    trimmed.startsWith('/leer')
  ) {
    const spaceIdx = trimmed.indexOf(' ');
    const args = spaceIdx > 0 ? text.slice(spaceIdx + 1).trim() : '';
    return cmdEscanearOS(mediaBuffer, mimeType, args, senderName);
  }
  return null; // No es un comando con imagen reconocido
}

// Exportar reporte para el scheduler
export { cmdReporte, cmdAlertas };

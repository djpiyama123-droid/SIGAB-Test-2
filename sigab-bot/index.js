/**
 * ════════════════════════════════════════════════════════════
 * SIGAH Bot — WhatsApp Agent (Baileys)
 * 100% Local, On-Premise / VPS
 * ════════════════════════════════════════════════════════════
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrTerminal from 'qrcode-terminal';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';
import { handleCommand, handleImageCommand } from './commands.js';
import { initScheduler } from './scheduler.js';
import { initBotAuth, botLogin, authPost, authGet, getAuthHeaders } from './auth.js';

// ponytail: evita que un error async no manejado (bug conocido de Baileys
// al reintentar mensajes tras un cierre de conexion) tumbe el proceso a
// medio emparejamiento de QR. Solo loguea y deja que el propio bot
// reconecte via su logica existente.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

// ── Configuración ──────────────────────────────────────────
const GRUPO_BIOMEDICOS    = process.env.GRUPO_BIOMEDICOS || 'Residentes de biomedica 2025';
const AUTH_DIR            = './auth_sigah';
const FASTAPI_BASE        = process.env.FASTAPI_BASE_URL  || 'http://localhost:8000';
const FASTAPI_WEBHOOK_URL = `${FASTAPI_BASE}/api/v1/events/whatsapp/webhook`;
const OPENCLAW_API        = `${FASTAPI_BASE}/api/openclaw`;
const BOT_PORT            = process.env.BOT_PORT || 3000;
const BOT_API_KEY         = process.env.BOT_API_KEY;
const BOT_STANDBY         = process.env.BOT_STANDBY === 'true' || process.env.BOT_STANDBY === '1';

// JIDs que reciben DM de notificaciones (supervisores)
const SUPERVISORES_JID = [
  process.env.SUPERVISOR_JID_1 || '526645534349@s.whatsapp.net',  // Gustavo
  process.env.SUPERVISOR_JID_2 || '526643057010@s.whatsapp.net',  // Carlos Oswaldo
];

const logger = pino({ level: 'warn' });
let sock = null;
let grupoJid = null;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ── DM a supervisores ─────────────────────────────────────
async function notificarSupervisores(mensaje) {
  if (!sock) return;
  for (const jid of SUPERVISORES_JID) {
    try { await sock.sendMessage(jid, { text: mensaje }); }
    catch (err) { console.warn(`⚠️ No se pudo enviar DM a ${jid}: ${err.message}`); }
  }
}

// ── Reenvio del PDF de la orden recien creada ─────────────
async function reenviarPdfOrden(senderJid, ordenId, numeroOrden) {
  if (!senderJid || !ordenId) return;
  try {
    const res = await axios.get(`${OPENCLAW_API}/orden-pdf/${ordenId}`, {
      headers: getAuthHeaders(),
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    await sock.sendMessage(senderJid, {
      document: Buffer.from(res.data),
      fileName: `${numeroOrden || 'Orden'}.pdf`,
      mimetype: 'application/pdf',
      caption: `📄 PDF de la Orden de Servicio ${numeroOrden || ''}`,
    });
  } catch (err) {
    console.error('❌ Error reenviando PDF de la orden:', err.message);
  }
}

// ── Intake pasivo: texto libre del grupo ──────────────────
async function procesarMensajeGrupo(texto, senderJid, senderName) {
  if (!texto || texto.length < 8) return;

  const PALABRAS_FALLA = [
    'falla','fallo','falló','error','problema','roto','rota','dañado','dañada',
    'no enciende','no funciona','apagado','descompuesto','avería','averia',
    'correctivo','preventivo','mantenimiento','reparar','revisar',
    'urgente','urgencia','crítico','critico','equipo','monitor','ventilador',
    'desfibrilador','bomba','autoclave','incubadora','lámpara','lampara',
    'quirófano','quirofano','ucin','urgencias','hospitalización',
  ];
  const textoLower = texto.toLowerCase();
  if (!PALABRAS_FALLA.some(p => textoLower.includes(p))) return;

  console.log(`📋 Reporte detectado en grupo de ${senderName}: "${texto.slice(0, 60)}"`);
  try {
    const params = new URLSearchParams({
      mensaje: texto,
      sender_name: senderName || 'Técnico WA',
      sender_jid: senderJid || '',
      tipo: 'texto',
    });
    const res = await authPost(`${OPENCLAW_API}/intake-group`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });
    const data = res.data;
    if (data.ok) {
      const msg = `📋 *SIGAH — Registro automático*\n\n${data.mensaje}\n\n_Registrado automáticamente por SIGAH Bot._`;
      if (senderJid) {
        try { await sock.sendMessage(senderJid, { text: msg }); } catch (_) {}
        await reenviarPdfOrden(senderJid, data.orden_id, data.numero_orden);
      }
      await notificarSupervisores(`🔔 *Nuevo reporte en grupo*\nTécnico: ${senderName}\n\n${data.mensaje}`);
    }
  } catch (err) {
    console.error('❌ Error intake grupo texto:', err.message);
  }
}

// ── Intake pasivo: imagen del grupo ───────────────────────
async function procesarImagenGrupo(buffer, mimeType, caption, senderJid, senderName) {
  if (caption?.startsWith('/')) return false;
  console.log(`🖼️ Imagen de grupo de ${senderName} → procesando...`);
  try {
    // Multipart manual con axios (FIX 2026-07-06: formdata-node no estaba en package.json)
    const boundary = '----SIGAH' + Date.now().toString(36);
    const parts = [];
    const enc = (s) => Buffer.from(s, 'utf-8');
    const fileName = 'foto.' + ((mimeType || 'image/jpeg').split('/')[1] || 'jpg');
    parts.push(enc('--' + boundary + '\r\n'));
    parts.push(enc(`Content-Disposition: form-data; name="foto"; filename="${fileName}"\r\n`));
    parts.push(enc(`Content-Type: ${mimeType || 'image/jpeg'}\r\n\r\n`));
    parts.push(buffer);
    parts.push(enc('\r\n'));
    for (const [field, value] of [
      ['sender_name', senderName || 'Técnico WA'],
      ['sender_jid', senderJid || ''],
      ['tipo', 'imagen'],
      ['mensaje', caption || ''],
    ]) {
      parts.push(enc('--' + boundary + '\r\n'));
      parts.push(enc(`Content-Disposition: form-data; name="${field}"\r\n\r\n`));
      parts.push(enc((value || '') + '\r\n'));
    }
    parts.push(enc('--' + boundary + '--\r\n'));
    const body = Buffer.concat(parts);

    const res = await authPost(`${OPENCLAW_API}/intake-group`, body, {
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      timeout: 45000,
    });
    const data = res.data;
    if (data.ok) {
      const msg = `📋 *SIGAH — OS registrada desde foto*\n\n${data.mensaje}`;
      if (senderJid) {
        try { await sock.sendMessage(senderJid, { text: msg }); } catch (_) {}
        await reenviarPdfOrden(senderJid, data.orden_id, data.numero_orden);
      }
      await notificarSupervisores(`📸 *Foto del grupo → OS creada*\nTécnico: ${senderName}\n\n${data.mensaje}`);
      return true;
    }
  } catch (err) {
    console.error('❌ Error intake grupo imagen:', err.message);
  }
  return false;
}

// ── DEMO 2026-07-06: accion-qr desde DM con foto+texto ────────────
async function procesarAccionQr(buffer, mimeType, caption, senderJid, senderName) {
  console.log(`📷 Foto en DM de ${senderName} → accion-qr...`);
  try {
    const boundary = '----SIGAH' + Date.now().toString(36);
    const parts = [];
    const enc = (s) => Buffer.from(s, 'utf-8');
    const fileName = 'qr.' + ((mimeType || 'image/jpeg').split('/')[1] || 'jpg');
    parts.push(enc('--' + boundary + '\r\n'));
    parts.push(enc(`Content-Disposition: form-data; name="foto"; filename="${fileName}"\r\n`));
    parts.push(enc(`Content-Type: ${mimeType || 'image/jpeg'}\r\n\r\n`));
    parts.push(buffer);
    parts.push(enc('\r\n'));
    for (const [field, value] of [
      ['texto', caption || ''],
      ['sender_name', senderName || 'Gustavo (Demo)'],
    ]) {
      parts.push(enc('--' + boundary + '\r\n'));
      parts.push(enc(`Content-Disposition: form-data; name="${field}"\r\n\r\n`));
      parts.push(enc((value || '') + '\r\n'));
    }
    parts.push(enc('--' + boundary + '--\r\n'));
    const body = Buffer.concat(parts);

    const res = await authPost(`${OPENCLAW_API}/accion-qr`, body, {
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      timeout: 60000,
    });
    const data = res.data;
    if (!data.ok) {
      const msg = `❌ *No se pudo procesar*\n${data.mensaje || JSON.stringify(data)}`;
      if (senderJid) try { await sock.sendMessage(senderJid, { text: msg }); } catch (_) {}
      return false;
    }

    // Responder al remitente con el resumen
    if (senderJid) {
      try { await sock.sendMessage(senderJid, { text: data.mensaje }); } catch (_) {}
    }

    // Si el endpoint genero PDF y hay OS, mandarlo como documento
    if (data.orden_id && data.numero_orden) {
      try {
        await reenviarPdfOrden(senderJid, data.orden_id, data.numero_orden);
      } catch (e) {
        console.error('⚠️  No se pudo reenviar PDF:', e.message);
      }
    }
    return true;
  } catch (err) {
    console.error('❌ Error accion-qr:', err.message);
    if (senderJid) {
      try {
        await sock.sendMessage(senderJid, { text: `❌ Error procesando foto: ${err.message}` });
      } catch (_) {}
    }
  }
  return false;
}

// ── Conexión Principal ─────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: ['SIGAH-Bot', 'Chrome', '125.0.0'],
  });

  // Interceptar sock.sendMessage para silenciar salidas en modo Standby
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid, content, options) => {
    if (BOT_STANDBY) {
      console.log(`[STANDBY] Envío de mensaje omitido a ${jid}. Contenido:`, JSON.stringify(content));
      return { key: { id: 'standby-' + Date.now() } };
    }
    return await originalSendMessage(jid, content, options);
  };

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n──────── SIGAH BOT — ESCANEA EL QR ────────');
      qrTerminal.generate(qr, { small: true });
      console.log('─────────────────────────────────────────────\n');
    }
    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconectando en 5 s...');
        setTimeout(startBot, 5000);
      } else {
        console.log('❌ Desconectado permanentemente. Escanea el QR de nuevo.');
      }
    }
    if (connection === 'open') {
      console.log(`🟢 SIGAH Bot conectado. Buscando grupo "${GRUPO_BIOMEDICOS}"...`);
      if (BOT_STANDBY) {
        console.log('⚠️ MODO STANDBY ACTIVO: Las respuestas automáticas y salientes a WhatsApp están desactivadas.');
      }
      await initBotAuth();
      await resolverGrupo();
      initScheduler(sendToGroup);
      await notificarSupervisores(
        `🟢 *SIGAH Bot iniciado*\n\nEscuchando grupo:\n"${GRUPO_BIOMEDICOS}"\n\nLos reportes se registrarán automáticamente en SIGAH.\n🌐 https://sigab.129-121-100-147.sslip.io`
      );
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid  = msg.key.remoteJid;
      const isGroup    = remoteJid?.endsWith('@g.us');
      const senderJid  = isGroup ? (msg.key.participant || '') : remoteJid;
      const senderName = msg.pushName || senderJid;
      const esBioGrupo = isGroup && grupoJid && remoteJid === grupoJid;

      // ── Audio ────────────────────────────────────────────
      if (msg.message?.audioMessage) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
          await axios.post(FASTAPI_WEBHOOK_URL, {
            from: senderJid, pushName: senderName, type: 'audio',
            timestamp: msg.messageTimestamp,
            data: buffer.toString('base64'),
            mimetype: msg.message.audioMessage.mimetype,
            isGroup, grupoJid: isGroup ? remoteJid : null,
          }, { headers: getAuthHeaders() });
          console.log('✅ Voice note reenviada a FastAPI');
        } catch (err) {
          console.error('❌ Error procesando voice note:', err.message);
        }
        continue;
      }

      // ── Imagen ───────────────────────────────────────────
      if (msg.message?.imageMessage) {
        const caption = (msg.message.imageMessage.caption || '').trim();
        try {
          const buffer   = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
          const mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';

          if (caption.startsWith('/')) {
            const response = await handleImageCommand(caption, buffer, mimeType, senderName);
            if (response) {
              if (Array.isArray(response)) {
                for (const r of response) {
                  await sock.sendMessage(remoteJid, typeof r === 'string' ? { text: r } : r);
                }
              } else {
                await sock.sendMessage(remoteJid, typeof response === 'string' ? { text: response } : response);
              }
            }
            continue;
          }
          // DEMO 2026-07-06: si es foto en el grupo biomedicos -> intake-group;
          // si es DM al bot con foto -> /accion-qr (lee QR + accion + crea OS + PDF)
          if (esBioGrupo) {
            await procesarImagenGrupo(buffer, mimeType, caption, senderJid, senderName);
          } else if (!isGroup) {
            await procesarAccionQr(buffer, mimeType, caption, senderJid, senderName);
          }
        } catch (err) { console.error('❌ Error imagen:', err.message); }
        continue;
      }

      // ── Texto ────────────────────────────────────────────
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text) continue;

      // Audit log a FastAPI
      try {
        await axios.post(FASTAPI_WEBHOOK_URL, {
          from: senderJid, pushName: senderName, type: 'text',
          body: text, timestamp: msg.messageTimestamp,
          isGroup, grupoJid: isGroup ? remoteJid : null,
        }, { headers: getAuthHeaders() });
      } catch (err) {
        console.warn('⚠️ Webhook a FastAPI falló:', err.message);
      }

      if (text.startsWith('/')) {
        const response = await handleCommand(text, senderName);
        if (response) {
          if (Array.isArray(response)) {
            for (const r of response) {
              await sock.sendMessage(remoteJid, typeof r === 'string' ? { text: r } : r);
            }
          } else {
            await sock.sendMessage(remoteJid, typeof response === 'string' ? { text: response } : response);
          }
        }
        continue;
      }

      // Texto libre del grupo → intake pasivo
      if (esBioGrupo) await procesarMensajeGrupo(text, senderJid, senderName);
    }
  });
}

// ── API del Bot ────────────────────────────────────────────
app.post('/send', async (req, res) => {
  const { to, message, type = 'text', options = {} } = req.body;
  if (!sock) return res.status(503).json({ error: 'Bot no conectado' });
  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    let payload = { text: message };
    if (type === 'document') {
      payload = { document: Buffer.from(options.data, 'base64'), fileName: options.fileName, mimetype: options.mimetype, caption: message };
    }
    await sock.sendMessage(jid, payload);
    res.json({ status: 'sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/send-group', async (req, res) => {
  const { message } = req.body;
  if (!sock || !grupoJid) return res.status(503).json({ error: 'Bot no conectado o grupo no resuelto' });
  try {
    await sock.sendMessage(grupoJid, { text: message });
    res.json({ status: 'sent', grupo: grupoJid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  connected: !!sock,
  grupo_resuelto: !!grupoJid,
  grupo_nombre: GRUPO_BIOMEDICOS,
}));

app.listen(BOT_PORT, () => console.log(`🚀 SIGAH Bot API en :${BOT_PORT}`));

// ── Helpers ───────────────────────────────────────────────
async function resolverGrupo(retryCount = 0) {
  try {
    const groups = await sock.groupFetchAllParticipating();
    const entries = Object.entries(groups);
    console.log(`🔍 Grupos encontrados en WhatsApp (${entries.length}):`, entries.map(([_, g]) => g.subject));
    const target = GRUPO_BIOMEDICOS.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const [jid, group] of entries) {
      const subject = (group.subject || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (subject.includes(target)) {
        grupoJid = jid;
        console.log(`✅ Grupo encontrado: "${group.subject}" → ${jid}`);
        return;
      }
    }
    if (retryCount < 6) {
      console.warn(`⚠️ Grupo "${GRUPO_BIOMEDICOS}" no encontrado. Reintentando en 5s... (intento ${retryCount + 1}/6)`);
      setTimeout(() => resolverGrupo(retryCount + 1), 5000);
    } else {
      console.warn(`❌ Grupo "${GRUPO_BIOMEDICOS}" no encontrado. Asegúrate de que el bot esté en el grupo y que el nombre sea correcto.`);
    }
  } catch (err) {
    console.warn('Error buscando grupo:', err.message);
    if (retryCount < 6) {
      setTimeout(() => resolverGrupo(retryCount + 1), 5000);
    }
  }
}

async function sendToGroup(text) {
  // ponytail: modo observacion para la demo del 2026-07-06 - el bot no debe
  // escribir al grupo real de residentes (reportes/alertas del scheduler),
  // solo escuchar. Revertir este no-op despues de la demo con Carlos Grave.
  console.log('[GRUPO-OBSERVACION] Mensaje al grupo omitido:', text);
}

startBot().catch(err => { console.error('❌ Error fatal:', err); process.exit(1); });

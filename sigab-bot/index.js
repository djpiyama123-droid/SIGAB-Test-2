/**
 * ════════════════════════════════════════════════════════════
 * SIGAB Bot — WhatsApp Agent (Baileys)
 * 100% Local, 0 APIs de paga, on-premise en Lenovo ThinkCentre
 * 
 * Hospital General Regional No. 1 — IMSS Tijuana, B.C.
 * Desarrollado por equipo de Bioingeniería 10mo — Xochicalco
 * ════════════════════════════════════════════════════════════
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrTerminal from 'qrcode-terminal';
import { handleCommand } from './commands.js';
import { initScheduler } from './scheduler.js';

// ── Configuración ──────────────────────────────────────────
const GRUPO_BIOMEDICOS = 'Residentes de biomedica 2025'; // Nombre del grupo
const AUTH_DIR = './auth_sigab'; // Directorio de sesión persistente

const logger = pino({ level: 'warn' });
let sock = null;
let grupoJid = null; // Se resuelve al conectar

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
    printQRInTerminal: false, // Lo manejamos nosotros
    browser: ['SIGAB-Bot', 'Chrome', '125.0.0'],
    generateHighQualityLinkPreview: false,
  });

  // ── Eventos de conexión ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n' + '═'.repeat(50));
      console.log('  SIGAB Bot — Escanea este QR con WhatsApp');
      console.log('  (Ajustes → Dispositivos vinculados → Vincular)');
      console.log('═'.repeat(50));
      qrTerminal.generate(qr, { small: true });
      console.log('═'.repeat(50) + '\n');
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️  Conexión cerrada (código: ${statusCode})`);

      if (shouldReconnect) {
        console.log('🔄 Reconectando en 5 segundos...');
        setTimeout(startBot, 5000);
      } else {
        console.log('❌ Sesión cerrada. Elimina la carpeta auth_sigab/ y reconecta.');
      }
    }

    if (connection === 'open') {
      console.log('');
      console.log('═'.repeat(50));
      console.log('  🟢 SIGAB Bot conectado a WhatsApp');
      console.log('  🏥 Hospital General Regional No. 1');
      console.log('  📱 Escuchando grupo: ' + GRUPO_BIOMEDICOS);
      console.log('═'.repeat(50));
      console.log('');

      // Buscar el JID del grupo
      await resolverGrupo();

      // Iniciar scheduler con función de envío
      initScheduler(sendToGroup);
    }
  });

  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds);

  // ── Escuchar mensajes ──
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignorar mensajes propios
      if (msg.key.fromMe) continue;

      // Solo procesar mensajes de grupos
      const isGroup = msg.key.remoteJid?.endsWith('@g.us');
      if (!isGroup) continue;

      // Verificar que sea el grupo correcto
      if (grupoJid && msg.key.remoteJid !== grupoJid) continue;

      // Extraer texto
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || '';

      if (!text || !text.startsWith('/')) continue;

      // Obtener nombre del remitente
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderName = msg.pushName || senderJid.split('@')[0];

      console.log(`📩 [${senderName}]: ${text}`);

      try {
        const response = await handleCommand(text, senderName);

        if (response) {
          await sock.sendMessage(msg.key.remoteJid, { text: response });
          console.log(`📤 Respuesta enviada (${response.length} chars)`);
        }
      } catch (err) {
        console.error('❌ Error procesando comando:', err.message);
        await sock.sendMessage(msg.key.remoteJid, {
          text: `❌ Error interno del bot: ${err.message.slice(0, 60)}`,
        });
      }
    }
  });
}

// ── Resolver JID del grupo ─────────────────────────────────
async function resolverGrupo() {
  try {
    const groups = await sock.groupFetchAllParticipating();

    for (const [jid, group] of Object.entries(groups)) {
      if (group.subject?.toLowerCase().includes(GRUPO_BIOMEDICOS.toLowerCase())) {
        grupoJid = jid;
        console.log(`📌 Grupo encontrado: "${group.subject}" → ${jid}`);
        return;
      }
    }

    console.log(`⚠️  Grupo "${GRUPO_BIOMEDICOS}" no encontrado.`);
    console.log('   El bot aceptará comandos de cualquier grupo.');
    console.log('   Asegúrate de que el número del bot esté en el grupo.');
  } catch (err) {
    console.error('Error buscando grupo:', err.message);
  }
}

// ── Enviar al grupo (para scheduler) ───────────────────────
async function sendToGroup(text) {
  if (!sock || !grupoJid) {
    console.log('⚠️  No se puede enviar: sin conexión o grupo no encontrado');
    return;
  }

  try {
    await sock.sendMessage(grupoJid, { text });
    console.log(`📤 [SCHEDULER] Mensaje enviado al grupo (${text.length} chars)`);
  } catch (err) {
    console.error('❌ Error enviando al grupo:', err.message);
  }
}

// ── Arranque ───────────────────────────────────────────────
console.log('');
console.log('🏥 SIGAB Bot — Sistema Integral de Gestión de Activos Biomédicos');
console.log('   Hospital General Regional No. 1 — IMSS Tijuana');
console.log('   100% On-Premise — Lenovo ThinkCentre');
console.log('   Bioingeniería 10mo Semestre — Universidad Xochicalco');
console.log('');

startBot().catch(err => {
  console.error('❌ Error fatal al iniciar bot:', err);
  process.exit(1);
});

/**
 * ════════════════════════════════════════════════════════════
 * SIGAB Bot — WhatsApp Agent (Baileys)
 * 100% Local, 0 APIs de paga, on-premise en Lenovo ThinkCentre
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

// ── Configuración ──────────────────────────────────────────
const GRUPO_BIOMEDICOS = 'Residentes de biomedica 2025';
const AUTH_DIR = './auth_sigab';
const FASTAPI_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || 'http://localhost:8000/api/v1/events/whatsapp/webhook';
const BOT_PORT = process.env.BOT_PORT || 3000;

const logger = pino({ level: 'warn' });
let sock = null;
let grupoJid = null;

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
    browser: ['SIGAB-Bot', 'Chrome', '125.0.0'],
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('--- SIGAB BOT QR CODE ---');
      qrTerminal.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 5000);
      }
    }
    if (connection === 'open') {
      console.log('🟢 WhatsApp Bot Conectado');
      await resolverGrupo();
      initScheduler(sendToGroup);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid.endsWith('@g.us');
      
      // Handle Voice Notes (AG-07)
      if (msg.message?.audioMessage) {
        console.log(`🎙️ Voice note recibida de ${msg.pushName || remoteJid}`);
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
          
          // Forward to FastAPI for STT (Whisper)
          await axios.post(FASTAPI_WEBHOOK_URL, {
            from: remoteJid,
            pushName: msg.pushName,
            type: 'audio',
            timestamp: msg.messageTimestamp,
            data: buffer.toString('base64'),
            mimetype: msg.message.audioMessage.mimetype
          });
          console.log('✅ Voice note reenviada a FastAPI');
        } catch (err) {
          console.error('❌ Error procesando voice note:', err.message);
        }
        continue;
      }

      // Handle Image messages (OS scan, casillas CENEVAL, etc.)
      if (msg.message?.imageMessage) {
        const caption = (msg.message.imageMessage.caption || '').trim();
        const senderName = msg.pushName || remoteJid;
        console.log(`🖼️ Imagen recibida de ${senderName} con caption: "${caption}"`);

        if (caption.startsWith('/')) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
            const response = await handleImageCommand(caption, buffer, mimeType, senderName);
            if (response) {
              await sock.sendMessage(remoteJid, typeof response === 'string' ? { text: response } : response);
            }
          } catch (err) {
            console.error('❌ Error procesando imagen:', err.message);
            await sock.sendMessage(remoteJid, { text: `❌ Error procesando la imagen: ${err.message}` });
          }
        }
        continue;
      }

      // Handle Text
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text) continue;

      // Forward everything to FastAPI webhook (logging/audit)
      try {
        await axios.post(FASTAPI_WEBHOOK_URL, {
          from: remoteJid,
          pushName: msg.pushName,
          type: 'text',
          body: text,
          timestamp: msg.messageTimestamp,
          isGroup
        });
      } catch (err) {
        console.warn('⚠️ Webhook a FastAPI falló:', err.message);
      }

      // Local commands (fallback/internal)
      if (text.startsWith('/')) {
        const response = await handleCommand(text, msg.pushName || remoteJid);
        if (response) {
          await sock.sendMessage(remoteJid, typeof response === 'string' ? { text: response } : response);
        }
      }
    }
  });
}

// ── API del Bot (para que backend mande mensajes) ────────────
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', connected: !!sock }));

app.listen(BOT_PORT, () => {
  console.log(`🚀 API del Bot escuchando en puerto ${BOT_PORT}`);
});

// ── Helpers ───────────────────────────────────────────────
async function resolverGrupo() {
  try {
    const groups = await sock.groupFetchAllParticipating();
    for (const [jid, group] of Object.entries(groups)) {
      if (group.subject?.toLowerCase().includes(GRUPO_BIOMEDICOS.toLowerCase())) {
        grupoJid = jid;
        return;
      }
    }
  } catch (err) {
    console.warn('Error buscando grupo:', err.message);
  }
}

async function sendToGroup(text) {
  if (sock && grupoJid) {
    await sock.sendMessage(grupoJid, { text });
  }
}

startBot().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});

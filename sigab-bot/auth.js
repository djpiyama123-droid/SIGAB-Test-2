/**
 * sigab-bot/auth.js — Autenticación JWT del bot contra el backend SIGAH
 *
 * Flujo:
 *   1. Al arrancar el bot, llama initBotAuth() — obtiene JWT vía bot-login
 *   2. El token se guarda en memoria y se renueva automáticamente 1 h antes de expirar
 *   3. Cada llamada al backend incluye getAuthHeaders() en sus headers
 *
 * Variables de entorno requeridas:
 *   BOT_API_KEY       — clave secreta del hospital (coincide con BOT_API_KEYS en el backend)
 *   SIGAB_BACKEND_URL — base URL del backend (default: http://localhost:8000)
 */

const BACKEND_URL = process.env.SIGAB_BACKEND_URL || 'http://localhost:8000';
const BOT_API_KEY = process.env.BOT_API_KEY;
const LOGIN_URL   = `${BACKEND_URL}/api/openclaw/bot-login`;

let _token      = null;
let _expiresAt  = 0;   // epoch ms
let _refreshTimer = null;

/**
 * Inicializa la autenticación del bot. Llamar una sola vez al arrancar.
 * Si BOT_API_KEY no está configurada, el bot opera sin token (modo legacy).
 */
export async function initBotAuth() {
  if (!BOT_API_KEY) {
    console.warn('⚠️  BOT_API_KEY no configurada — las llamadas al backend irán sin JWT');
    return;
  }
  await _fetchToken();
}

async function _fetchToken() {
  try {
    const res = await fetch(LOGIN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ api_key: BOT_API_KEY }),
    });

    if (!res.ok) {
      console.error(`❌ Bot login fallido: HTTP ${res.status} — reintentando en 60 s`);
      _scheduleRefresh(60);
      return;
    }

    const data   = await res.json();
    _token       = data.access_token;
    _expiresAt   = Date.now() + data.expires_in * 1000;

    // Renovar 1 hora antes de que expire (mínimo 60 s de margen)
    const refreshInMs = Math.max((data.expires_in - 3600) * 1000, 60_000);
    _scheduleRefresh(refreshInMs / 1000);

    const horas = Math.round(data.expires_in / 3600);
    console.log(`🔑 Bot autenticado — token JWT válido por ${horas} h`);
  } catch (err) {
    console.error('❌ Error en bot-login:', err.message, '— reintentando en 60 s');
    _scheduleRefresh(60);
  }
}

function _scheduleRefresh(seconds) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(_fetchToken, Math.round(seconds) * 1000);
}

/**
 * Retorna el objeto de headers con Authorization para fetch/axios.
 * Si aún no hay token, retorna {} (las llamadas van sin auth).
 */
export function getAuthHeaders() {
  if (!_token || Date.now() >= _expiresAt) return {};
  return { Authorization: `Bearer ${_token}` };
}

/** true si hay un token válido en memoria */
export function isAuthenticated() {
  return !!_token && Date.now() < _expiresAt;
}

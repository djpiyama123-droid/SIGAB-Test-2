/**
 * sigab-bot/auth.js — Autenticación JWT del bot contra el backend SIGAH
 *
 * Flujo:
 *   1. Al arrancar el bot, llama initBotAuth() / botLogin() — obtiene JWT vía bot-login
 *   2. El token se guarda en memoria y se usa en authPost y authGet.
 *   3. Si expira o se obtiene un 401, se realiza un re-intento único tras refrescar.
 *
 * Variables de entorno requeridas:
 *   BOT_API_KEY       — clave secreta del hospital (coincide con BOT_API_KEYS en el backend)
 *   SIGAB_BACKEND_URL — base URL del backend (default: http://localhost:8000)
 */

import axios from 'axios';

const BACKEND_URL = process.env.SIGAB_BACKEND_URL || process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
const BOT_API_KEY = process.env.BOT_API_KEY;
const LOGIN_URL   = `${BACKEND_URL}/api/openclaw/bot-login`;

export let botToken = null;

/**
 * Inicializa la autenticación del bot.
 */
export async function initBotAuth() {
  await botLogin();
}

/**
 * Realiza el login del bot contra el backend para adquirir un token JWT.
 */
export async function botLogin() {
  if (!BOT_API_KEY) {
    console.warn('⚠️ BOT_API_KEY no está definida en las variables de entorno — las llamadas irán sin JWT');
    return;
  }
  try {
    console.log('🔑 Iniciando autenticación del bot con JWT...');
    const res = await axios.post(LOGIN_URL, {
      api_key: BOT_API_KEY
    }, { timeout: 10000 });
    
    if (res.data && res.data.access_token) {
      botToken = res.data.access_token;
      console.log('🟢 Bot autenticado con éxito. Token JWT adquirido.');
    } else {
      console.error('❌ Error de autenticación: No se recibió access_token.');
    }
  } catch (err) {
    console.error('❌ Error al autenticar el bot:', err.response?.data?.detail || err.message);
  }
}

/**
 * Realiza una petición POST autenticada con re-intento único tras un error 401.
 */
export async function authPost(url, data, config = {}) {
  if (!botToken) {
    await botLogin();
  }
  const headers = {
    ...config.headers,
    'Authorization': `Bearer ${botToken}`
  };
  try {
    return await axios.post(url, data, { ...config, headers });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.warn('⚠️ Token de bot expirado o inválido (401). Intentando re-login...');
      await botLogin();
      const retryHeaders = {
        ...config.headers,
        'Authorization': `Bearer ${botToken}`
      };
      return await axios.post(url, data, { ...config, headers: retryHeaders });
    }
    throw err;
  }
}

/**
 * Realiza una petición GET autenticada con re-intento único tras un error 401.
 */
export async function authGet(url, config = {}) {
  if (!botToken) {
    await botLogin();
  }
  const headers = {
    ...config.headers,
    'Authorization': `Bearer ${botToken}`
  };
  try {
    return await axios.get(url, { ...config, headers });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.warn('⚠️ Token de bot expirado o inválido (401). Intentando re-login...');
      await botLogin();
      const retryHeaders = {
        ...config.headers,
        'Authorization': `Bearer ${botToken}`
      };
      return await axios.get(url, { ...config, headers: retryHeaders });
    }
    throw err;
  }
}

/**
 * Retorna el objeto de headers con Authorization para fetch/axios (compatibilidad legada).
 */
export function getAuthHeaders() {
  if (!botToken) return {};
  return { Authorization: `Bearer ${botToken}` };
}

/**
 * Retorna true si hay un token en memoria (compatibilidad legada).
 */
export function isAuthenticated() {
  return !!botToken;
}

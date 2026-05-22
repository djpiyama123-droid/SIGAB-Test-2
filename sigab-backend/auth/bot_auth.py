"""Autenticación para el bot de WhatsApp (sigab-bot).

Flujo de seguridad
------------------
1. Cada hospital tiene una clave secreta única almacenada en la variable de
   entorno BOT_API_KEYS (JSON: slug→clave).
2. El bot llama a POST /api/openclaw/bot-login con su api_key.
3. Este módulo verifica la clave, resuelve el hospital_id desde la tabla
   ``hospitales`` y emite un JWT de corta duración (24 h) con tenant_id.
4. El bot incluye ese JWT en Authorization: Bearer <token> en todas sus
   llamadas subsecuentes a /api/openclaw/*.
5. get_current_tenant extrae tenant_id del JWT y el aislamiento multi-tenant
   funciona exactamente igual que para usuarios humanos.

Variables de entorno requeridas
--------------------------------
  BOT_API_KEYS  — JSON string con mapa slug→clave, p. ej.:
                  {"hgr1-tijuana": "clave-secreta-1", "hospital2": "clave-secreta-2"}

Seguridad por diseño
---------------------
* La comparación de claves usa secrets.compare_digest para prevenir timing
  attacks (aunque las claves no son contraseñas, es buena práctica).
* Los tokens bot llevan rol="bot" — se pueden distinguir de tokens de usuario
  en auditorías y se pueden revocar por clase de rol si es necesario.
* El token no trae ``sub`` numérico de usuario porque el bot no es un usuario;
  en su lugar ``sub`` es "bot:<hospital_id>" para trazabilidad en logs.
* Nunca loguear la api_key recibida; solo loguear el slug resuelto.
"""
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import aiomysql
from jose import jwt

from config import JWT_SECRET, JWT_ALG, DB_CONFIG

# Duración del token bot: 24 horas (más largo que el token de usuario de 60 min
# porque el bot no puede hacer refresh interactivo).
BOT_TOKEN_TTL_HOURS = 24


def get_bot_api_keys() -> dict[str, str]:
    """Carga el mapa hospital_slug → api_key desde la variable de entorno BOT_API_KEYS.

    Retorna un dict vacío si la variable no está definida o no es JSON válido.
    En producción esto significa que ninguna api_key será aceptada — fail-safe.
    """
    raw = os.getenv("BOT_API_KEYS", "")
    if not raw:
        return {}
    try:
        mapping = json.loads(raw)
        if not isinstance(mapping, dict):
            return {}
        # Normalizar: solo entradas donde slug y clave sean strings no vacíos
        return {
            str(slug).strip(): str(key).strip()
            for slug, key in mapping.items()
            if slug and key
        }
    except json.JSONDecodeError:
        return {}


async def _resolve_hospital_id(slug: str) -> Optional[int]:
    """Busca el hospital_id correspondiente al slug en la tabla hospitales.

    Abre una conexión directa (aiomysql) para no depender del ciclo de vida
    de FastAPI Depends — esta función se llama desde un endpoint sin sesión
    SQLModel disponible.

    Retorna None si el slug no existe en la base de datos.
    """
    try:
        conn = await aiomysql.connect(**DB_CONFIG)
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT id FROM hospitales WHERE slug = %s AND estado_suscripcion != 'cancelado'",
                    (slug,),
                )
                row = await cur.fetchone()
                return int(row["id"]) if row else None
        finally:
            conn.close()
    except Exception:
        # No propagar detalles de error al caller; el endpoint lanzará 401 genérico
        return None


async def verify_bot_api_key(api_key: str) -> Optional[int]:
    """Verifica la API key del bot y retorna el hospital_id asociado.

    Returns
    -------
    int
        hospital_id si la clave es válida y el hospital existe en la DB.
    None
        Si la clave es inválida, no está en el mapa o el hospital no existe.

    La comparación usa secrets.compare_digest para evitar timing attacks.
    """
    if not api_key or not api_key.strip():
        return None

    keys_map = get_bot_api_keys()
    if not keys_map:
        # BOT_API_KEYS no configurado — rechazar siempre (fail-safe)
        return None

    # Iterar el mapa y comparar con tiempo constante
    matched_slug: Optional[str] = None
    for slug, expected_key in keys_map.items():
        # Comparación en tiempo constante para TODOS los slugs (no hacer short-circuit)
        if secrets.compare_digest(api_key.strip(), expected_key):
            matched_slug = slug

    if matched_slug is None:
        return None

    # Verificar que el hospital existe en la base de datos y no está cancelado
    hospital_id = await _resolve_hospital_id(matched_slug)
    return hospital_id


def create_bot_token(hospital_id: int) -> str:
    """Emite un JWT de corta duración (24 h) para el bot de un hospital.

    El token incluye tenant_id para que get_current_tenant funcione sin
    modificaciones. El rol "bot" permite distinguirlo de tokens de usuario
    en auditorías y aplicar políticas de autorización diferenciadas.

    Parameters
    ----------
    hospital_id : int
        ID del hospital (tenant) al que pertenece el bot.

    Returns
    -------
    str
        JWT firmado con el secreto compartido (HS256).
    """
    now = datetime.now(timezone.utc)
    payload = {
        # sub NO es un user_id numérico — el bot no es un usuario.
        # Formato "bot:<id>" es reconocible en logs de auditoría.
        "sub": f"bot:{hospital_id}",
        "tenant_id": hospital_id,
        "rol": "bot",
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=BOT_TOKEN_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

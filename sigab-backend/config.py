"""
config.py — Variables de configuración centralizadas del backend SIGAH.

Todas las configuraciones se leen de variables de entorno con prefijo SIGAH_*.
Se proporcionan valores por defecto para desarrollo local.

Secciones:
  - DB_CONFIG:         Conexión MySQL (host, port, user, pass, db)
  - JWT:               Secreto, algoritmo, TTL de acceso y refresh
  - PUBLIC_BASE_URL:   URL embebida en QRs (IP LAN en producción)
  - CORS_EXTRA:        Orígenes adicionales para celulares en LAN
  - OLLAMA/GEMMA:      IA local vía Ollama (Gemma 4B / Qwen 7B)
  - OCR:               Umbral de confianza y API key de Gemini
"""
import aiomysql
import os

# ── Entorno ───────────────────────────────────────────────────────
# SIGAH_ENV controla el comportamiento fail-fast de los secretos.
# En producción (production/prod) los secretos son OBLIGATORIOS: si
# faltan, el backend se niega a arrancar en lugar de caer a un valor
# por defecto conocido (que sería una credencial pública).
SIGAH_ENV = os.getenv("SIGAH_ENV", "development").strip().lower()
IS_PRODUCTION = SIGAH_ENV in ("production", "prod", "prd")

# Defaults SOLO para desarrollo local. Nunca se usan en producción.
_DEV_DB_PASS = "sigah_dev_local_only"
_DEV_JWT_SECRET = "dev-secret-CAMBIAR-EN-PRODUCCION-usa-secrets.token_urlsafe-48"


def _require_secret(env_name: str, dev_default: str) -> str:
    """Lee un secreto del entorno.

    - Si está definido, se usa tal cual.
    - Si falta y SIGAH_ENV=production → aborta el arranque (fail-fast).
    - Si falta en desarrollo → usa el default de dev (no apto para prod).
    """
    val = os.getenv(env_name)
    if val:
        return val
    if IS_PRODUCTION:
        raise RuntimeError(
            f"{env_name} es obligatorio cuando SIGAH_ENV=production. "
            f"Defínelo en el .env del contenedor o en el entorno. "
            f"Genera uno con: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    return dev_default


DB_CONFIG = {
    "host": os.getenv("SIGAH_DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("SIGAH_DB_PORT", 3306)),
    "user": os.getenv("SIGAH_DB_USER", "sigah_user"),
    "password": _require_secret("SIGAH_DB_PASS", _DEV_DB_PASS),
    "db": os.getenv("SIGAH_DB_NAME", "sigah"),
    "autocommit": True,
    "charset": "utf8mb4",
}

UPLOAD_DIR = os.getenv("SIGAH_UPLOAD_DIR", "./static/uploads")
MAX_UPLOAD_MB = 10

# ── Autenticación JWT ─────────────────────────────────────────────
# SIGAH_JWT_SECRET es OBLIGATORIO en producción (fail-fast). En dev cae
# a un valor fijo (no aleatorio) para no invalidar sesiones al reiniciar.
JWT_SECRET = _require_secret("SIGAH_JWT_SECRET", _DEV_JWT_SECRET)
JWT_ALG = os.getenv("SIGAH_JWT_ALG", "HS256")
ACCESS_TTL_MIN = int(os.getenv("SIGAH_ACCESS_TTL_MIN", "60"))
REFRESH_TTL_DAYS = int(os.getenv("SIGAH_REFRESH_TTL_DAYS", "7"))

# URL base pública para embeber en QR. Puede ser IP LAN, hostname o dominio.
PUBLIC_BASE_URL = os.getenv("SIGAH_PUBLIC_BASE_URL", "http://localhost:5173")

# CORS extra (separados por coma) para permitir escaneo desde celulares LAN.
# Las IPs LAN se configuran vía SIGAH_CORS_EXTRA en el .env, NO se hardcodean,
# para que un cambio de topología de red no deje orígenes obsoletos permitidos.
# Ej: SIGAH_CORS_EXTRA=http://192.168.1.125:5173,http://192.168.1.125:5174
_cors_env = os.getenv("SIGAH_CORS_EXTRA", "")
CORS_EXTRA = [o.strip() for o in _cors_env.split(",") if o.strip()]

# ── IA Local (Qwen / Gemma via Ollama) ────────────────────────────
# Ollama se instala en el mismo servidor (Lenovo ThinkCentre) y expone :11434
OLLAMA_HOST = os.getenv("SIGAH_OLLAMA_HOST", "http://localhost:11434")
GEMMA_MODEL = os.getenv("SIGAH_GEMMA_MODEL", "gemma3:4b")
QWEN_MODEL  = os.getenv("SIGAH_QWEN_MODEL",  "qwen2.5:7b")
DISABLE_COPILOT = os.getenv("SIGAH_DISABLE_COPILOT", "0").strip() in ("1", "true", "yes")

# ── OCR Pipeline Config ──────────────────────────────────────────
OCR_CONFIDENCE_THRESHOLD = float(os.getenv("SIGAH_OCR_CONFIDENCE", "0.85"))
OCR_MIN_WORDS_THRESHOLD = int(os.getenv("SIGAH_OCR_MIN_WORDS", "5"))
GEMINI_API_KEY = os.getenv("SIGAH_GEMINI_API_KEY", "")


async def get_db():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()

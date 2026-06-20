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
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

_db_pass = os.environ.get("SIGAH_DB_PASS", "")
if not _db_pass:
    raise RuntimeError("SIGAH_DB_PASS requerido: define la variable de entorno antes de iniciar.")

DB_CONFIG = {
    "host": os.getenv("SIGAH_DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("SIGAH_DB_PORT", 3306)),
    "user": os.getenv("SIGAH_DB_USER", "sigah_user"),
    "password": _db_pass,
    "db": os.getenv("SIGAH_DB_NAME", "sigah"),
    "autocommit": True,
    "charset": "utf8mb4",
}

UPLOAD_DIR = os.getenv("SIGAH_UPLOAD_DIR", "./static/uploads")
MAX_UPLOAD_MB = 10

# ── Autenticación JWT ─────────────────────────────────────────────
# SIGAH_JWT_SECRET es OBLIGATORIO. El proceso aborta si falta o está vacío.
_jwt_secret = os.environ.get("SIGAH_JWT_SECRET", "")
if not _jwt_secret:
    raise RuntimeError("SIGAH_JWT_SECRET requerido: define la variable de entorno antes de iniciar.")
JWT_SECRET = _jwt_secret
JWT_ALG = os.getenv("SIGAH_JWT_ALG", "HS256")
ACCESS_TTL_MIN = int(os.getenv("SIGAH_ACCESS_TTL_MIN", "60"))
REFRESH_TTL_DAYS = int(os.getenv("SIGAH_REFRESH_TTL_DAYS", "7"))

# URL base pública para embeber en QR. Puede ser IP LAN, hostname o dominio.
PUBLIC_BASE_URL = os.getenv("SIGAH_PUBLIC_BASE_URL", "http://localhost:5173")

# CORS extra (separados por coma) para permitir escaneo desde celulares LAN
_cors_env = os.getenv("SIGAH_CORS_EXTRA", "")
_cors_lan = ["http://192.168.1.125:5173", "http://192.168.1.125:5174"]
CORS_EXTRA = [*_cors_lan, *[o.strip() for o in _cors_env.split(",") if o.strip()]]

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

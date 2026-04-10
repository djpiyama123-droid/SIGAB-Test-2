import aiomysql
import os

DB_CONFIG = {
    "host": os.getenv("SIGAB_DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("SIGAB_DB_PORT", 3306)),
    "user": os.getenv("SIGAB_DB_USER", "sigab_user"),
    "password": os.getenv("SIGAB_DB_PASS", "sigab_pass_2026"),
    "db": os.getenv("SIGAB_DB_NAME", "sigab"),
    "autocommit": True,
}

UPLOAD_DIR = os.getenv("SIGAB_UPLOAD_DIR", "./static/uploads")
MAX_UPLOAD_MB = 10

# ── Autenticación JWT ─────────────────────────────────────────────
# SIGAB_JWT_SECRET es OBLIGATORIO en producción. En dev cae a un valor
# fijo (no aleatorio) para no invalidar sesiones al reiniciar.
JWT_SECRET = os.getenv(
    "SIGAB_JWT_SECRET",
    "dev-secret-CAMBIAR-EN-PRODUCCION-usa-secrets.token_urlsafe-48",
)
JWT_ALG = os.getenv("SIGAB_JWT_ALG", "HS256")
ACCESS_TTL_MIN = int(os.getenv("SIGAB_ACCESS_TTL_MIN", "60"))
REFRESH_TTL_DAYS = int(os.getenv("SIGAB_REFRESH_TTL_DAYS", "7"))

# URL base pública para embeber en QR. Puede ser IP LAN, hostname o dominio.
PUBLIC_BASE_URL = os.getenv("SIGAB_PUBLIC_BASE_URL", "http://localhost:5173")

# CORS extra (separados por coma) para permitir escaneo desde celulares LAN
CORS_EXTRA = [o.strip() for o in os.getenv("SIGAB_CORS_EXTRA", "").split(",") if o.strip()]

# ── IA Local (Gemma via Ollama) ───────────────────────────────────
# Ollama se instala en el mismo servidor (Lenovo ThinkCentre) y expone :11434
OLLAMA_HOST = os.getenv("SIGAB_OLLAMA_HOST", "http://localhost:11434")
# Modelo por defecto: gemma3:4b (4B params, ~3.3 GB RAM, ~10 tok/s en CPU)
# Opciones: gemma3:4b | gemma3:12b | gemma3:27b | gemma4 (cuando esté en Ollama)
GEMMA_MODEL = os.getenv("SIGAB_GEMMA_MODEL", "gemma3:4b")


async def get_db():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()

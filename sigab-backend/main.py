"""
main.py — Punto de entrada del backend SIGAH.

Configura la aplicación FastAPI con:
- Middleware CORS para comunicación con el frontend (puertos 5173/5174/3000)
- Montaje de archivos estáticos (uploads, imágenes de equipos)
- Registro de 20 routers organizados por módulo funcional
- Endpoint de health check para monitoreo

Ejecutar con: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Autor: Equipo SIGAH — Bioingeniería Xochicalco
Versión: 2.0.0
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import uvicorn

from config import UPLOAD_DIR, CORS_EXTRA
from auth.dependencies import get_current_user, require_roles
from middleware.rate_limit import RateLimitMiddleware
# Registrar todos los modelos en SQLAlchemy/SQLModel metadata
import models
from routes import (
    equipos, ordenes, trazabilidad, reservas,
    alertas, preventivos, dashboard, openclaw, reportes,
    tecnovigilancia, auditoria, checklists,
    almacen, metrologia, capacitaciones,
    auth as auth_routes,
    ocr, events, casillas, formatos,
    admin as admin_routes,
    twilio_whatsapp,
    monitor, tokens, cerebro,
)
_COPILOT_ON = os.getenv("SIGAH_DISABLE_COPILOT", "0") != "1"
if _COPILOT_ON:
    from routes import copilot


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs("static/uploads", exist_ok=True)
    print("SIGAH Backend iniciado — 100% Local")
    yield
    print("SIGAH Backend detenido")


# Swagger/OpenAPI exponen toda la superficie de la API a cualquiera.
# En producción deben ir apagados: SIGAH_ENABLE_DOCS=0 (default seguro).
# En local, ponlo a 1 en tu .env para tener /docs.
_DOCS_ON = os.getenv("SIGAH_ENABLE_DOCS", "0").strip() in ("1", "true", "yes")

app = FastAPI(
    title="SIGAH API",
    description="Sistema Integral de Gestión de Activos Biomédicos — HGR No.1 IMSS",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ON else None,
    redoc_url="/redoc" if _DOCS_ON else None,
    openapi_url="/openapi.json" if _DOCS_ON else None,
)

_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://panel.129-121-100-147.sslip.io",
    "https://sigab.129-121-100-147.sslip.io",
    "https://sigah.129-121-100-147.sslip.io",
    *CORS_EXTRA,
]
# Rate limiting (Capa 2). En Starlette el ÚLTIMO add_middleware queda más
# externo; por eso lo registramos ANTES de CORS, para que CORS sea la capa
# externa y envuelva también las respuestas 429 (el navegador necesita las
# cabeceras CORS para leer el 429 y respetar Retry-After).
# Ver DISENO_RATE_LIMITING.md y middleware/rate_limit.py.
app.add_middleware(RateLimitMiddleware)

# Guarda CORS: con allow_credentials=True los navegadores rechazan '*' como
# origin (RFC 6454 / Fetch spec). Si SIGAH_CORS_EXTRA trae un comodín por
# error de configuración, fallamos en arranque en lugar de silenciar el bug.
# Nota: allow_methods=["*"] y allow_headers=["*"] son válidos junto con
# origins explícitos; solo allow_origins='*' es incompatible con credentials.
_wildcard_origins = [o for o in _origins if o == "*"]
if _wildcard_origins:
    raise RuntimeError(
        "CORS mal configurado: allow_credentials=True es incompatible con "
        "el origin '*'. Revisa SIGAH_CORS_EXTRA y elimina cualquier comodín."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR Inteligente (Local + Cloud)"])
app.include_router(equipos.router, prefix="/api/equipos", tags=["Equipos"])
app.include_router(ordenes.router, prefix="/api/ordenes", tags=["Órdenes de Servicio"])
app.include_router(trazabilidad.router, prefix="/api/trazabilidad", tags=["Trazabilidad"])
app.include_router(reservas.router, prefix="/api/reservas", tags=["Reservas"])
app.include_router(alertas.router, prefix="/api/alertas", tags=["Alertas"])
app.include_router(preventivos.router, prefix="/api/preventivos", tags=["Preventivos"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(openclaw.router, prefix="/api/openclaw", tags=["OpenClaw"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["Reportes"])
app.include_router(auditoria.router, prefix="/api/auditoria", tags=["Auditoría NOM-016"])
app.include_router(checklists.router, prefix="/api/checklists", tags=["Checklists NOM-016"])
app.include_router(tecnovigilancia.router, prefix="/api/tecnovigilancia", tags=["Tecnovigilancia NOM-240"])
if _COPILOT_ON:
    app.include_router(copilot.router, prefix="/api/copilot", tags=["SIGAH Copilot (IA Local)"])
app.include_router(almacen.router, prefix="/api/almacen", tags=["Gestión de Almacén"])
app.include_router(metrologia.router, prefix="/api/metrologia", tags=["Metrología y Calibración"])
app.include_router(capacitaciones.router, prefix="/api/capacitaciones", tags=["Capacitación de Personal"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Eventos"])
app.include_router(casillas.router, tags=["Casillas CENEVAL (Conservación)"])
app.include_router(admin_routes.router, prefix="/api", tags=["SuperAdmin"])
app.include_router(formatos.router, prefix="/api/formatos", tags=["Formatos Oficiales IMSS"])
app.include_router(twilio_whatsapp.router, prefix="/api/twilio", tags=["WhatsApp OCR (Twilio)"])
app.include_router(monitor.router,   prefix="/api/monitor",  tags=["Monitor SIGAB WebPanel"])
app.include_router(tokens.router,    prefix="/api/tokens",   tags=["Tokens API (WebPanel)"])
app.include_router(cerebro.router,   prefix="/api/cerebro",  tags=["Cerebro / Sesiones Claude Code"])


@app.get("/health")
def health():
    return {"status": "ok", "sistema": "SIGAH", "modo": "on-premise"}


@app.get("/api/cache/stats", tags=["Observabilidad"])
def cache_stats(user: dict = Depends(get_current_user)):
    """Estadísticas del caché en memoria — útil para monitoreo y tuning.

    Requiere sesión: antes era público y filtraba internals (hit/miss, claves).
    """
    from services.cache_service import cache_service
    return cache_service.stats()


@app.delete("/api/cache/flush", tags=["Observabilidad"])
def cache_flush(user: dict = Depends(require_roles("admin", "jefe_biomedica"))):
    """Vacía todo el caché en memoria — usar solo en mantenimiento.

    Solo admin/jefe_biomedica: antes era público y permitía vaciar el caché a
    voluntad (cache stampede contra MySQL → mini-DoS).
    """
    from services.cache_service import cache_service
    cache_service.clear()
    return {"ok": True, "mensaje": "Caché vaciado"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

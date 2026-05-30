"""
routes/monitor.py — Estado de servicios en tiempo real para el SIGAB WebPanel.

GET /monitor/status → cpu, ram, disco, latencia de servicios internos.
"""
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user
from datetime import datetime, timezone
import asyncio
import time

router = APIRouter()

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False


async def _ping(name: str, url: str) -> dict:
    latency_ms = 0
    status = "error"
    try:
        import httpx
        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(url)
        latency_ms = int((time.monotonic() - t0) * 1000)
        status = "ok" if r.status_code < 400 else "warning"
    except Exception:
        pass
    return {"name": name, "status": status, "uptime": "—", "latency_ms": latency_ms}


@router.get("/status")
async def monitor_status(user: dict = Depends(get_current_user)):
    """Retorna salud de servicios + métricas de servidor."""
    services = await asyncio.gather(
        _ping("FastAPI Backend",  "http://localhost:8000/health"),
        _ping("Bot WhatsApp",     "http://localhost:3000/health"),
        _ping("Ollama IA local",  "http://localhost:11434/api/version"),
    )

    cpu  = round(psutil.cpu_percent(interval=0.1), 1) if _HAS_PSUTIL else 0.0
    ram  = round(psutil.virtual_memory().percent, 1)  if _HAS_PSUTIL else 0.0
    disk = round(psutil.disk_usage("/").percent, 1)   if _HAS_PSUTIL else 0.0

    return {
        "services": list(services),
        "cpu":  cpu,
        "ram":  ram,
        "disk": disk,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    }

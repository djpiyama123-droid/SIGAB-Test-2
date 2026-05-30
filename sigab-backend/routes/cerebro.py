"""
routes/cerebro.py — Sesiones de Claude Code para el SIGAB WebPanel (Cerebro / Obsidian).

GET /cerebro/sesiones → lista de sesiones JSONL del directorio ~/.claude/projects/
                        del equipo donde corre el backend (VPS Bluehost en producción).
"""
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user
from datetime import datetime, timezone
from pathlib import Path
import json
import os

router = APIRouter()


def _get_hostname() -> str:
    try:
        return os.uname().nodename  # type: ignore
    except Exception:
        return "VPS Bluehost"


def _leer_titulo(path: Path) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                datos = json.loads(line)
                msg = datos.get("message", {})
                content = msg.get("content", "") if isinstance(msg, dict) else ""
                if isinstance(content, str) and content:
                    return content[:80]
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get("type") == "text":
                            return c.get("text", "")[:80]
    except Exception:
        pass
    return "Sesión de trabajo"


@router.get("/sesiones")
async def listar_sesiones(user: dict = Depends(get_current_user)):
    """Lista sesiones de Claude Code del equipo donde corre el backend."""
    claude_dir = Path.home() / ".claude" / "projects"

    if not claude_dir.exists():
        return {"equipo": _get_hostname(), "sesiones": []}

    sesiones = []
    for proj_dir in sorted(claude_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not proj_dir.is_dir():
            continue
        proyecto = proj_dir.name.replace("-", " ").strip()[:30]
        for f in sorted(proj_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if f.suffix != ".jsonl":
                continue
            try:
                stat = f.stat()
                sesiones.append({
                    "id": f.stem[:12],
                    "proyecto": proyecto,
                    "titulo": _leer_titulo(f),
                    "fecha": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    "size_kb": round(stat.st_size / 1024, 1),
                })
            except Exception:
                pass

    return {"equipo": _get_hostname(), "sesiones": sesiones[:50]}

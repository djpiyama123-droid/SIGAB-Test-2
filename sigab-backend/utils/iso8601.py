"""
Utilidades para manejo de timestamps ISO 8601.
Todos los timestamps en SIGAB deben ser inmutables y en formato ISO.
"""

from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_datetime(dt) -> str:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def serialize_row(row: dict) -> dict:
    """Convierte un row de MySQL con datetimes a un dict JSON-serializable."""
    if row is None:
        return None
    result = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result

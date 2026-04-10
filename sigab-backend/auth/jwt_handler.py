"""Generación y validación de JWT (access + refresh) con python-jose HS256."""
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError

from config import JWT_SECRET, JWT_ALG, ACCESS_TTL_MIN, REFRESH_TTL_DAYS


def create_access_token(user: dict[str, Any]) -> str:
    """user debe tener al menos id, rol, matricula."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "rol": user.get("rol"),
        "matricula": user.get("matricula"),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TTL_MIN)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=REFRESH_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict[str, Any]:
    """Lanza JWTError si el token es inválido o está expirado."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

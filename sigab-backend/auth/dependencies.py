"""FastAPI dependencies para extraer y validar el usuario actual."""
from typing import Optional
import aiomysql
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError

from config import get_db
from auth.jwt_handler import decode_token


async def _read_user(conn, user_id: int) -> Optional[dict]:
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT id, nombre, matricula, rol, email, activo "
            "FROM usuarios WHERE id = %s",
            (user_id,),
        )
        return await cur.fetchone()


async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    conn=Depends(get_db),
) -> Optional[dict]:
    """Devuelve el user si hay token válido, None si no hay header.

    Útil para endpoints híbridos (público vs privado en el mismo path).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_token(authorization[7:])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    try:
        uid = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None
    user = await _read_user(conn, uid)
    if not user or not user.get("activo"):
        return None
    return user


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    conn=Depends(get_db),
) -> dict:
    """Igual que el optional pero lanza 401 si no hay user válido."""
    user = await get_current_user_optional(authorization=authorization, conn=conn)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas o expiradas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str):
    """Factory: devuelve una dependencia que exige que el user tenga uno de los roles."""

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("rol") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Roles permitidos: {', '.join(roles)}",
            )
        return user

    return _checker


def require_action(action: str):
    """Factory: exige que el rol del user tenga permiso para `action`."""
    from auth.permissions import can

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if not can(user, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tu rol no tiene permiso para: {action}",
            )
        return user

    return _checker

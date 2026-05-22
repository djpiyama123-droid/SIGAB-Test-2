"""FastAPI dependencies para extraer y validar el usuario actual."""
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_async_session
from auth.jwt_handler import decode_token
from models.usuario import Usuario

async def _read_user(session: AsyncSession, user_id: int) -> Optional[dict]:
    stmt = select(Usuario).where(Usuario.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        # Devolvemos un dict para mantener compatibilidad con el resto del código que espera dicts
        return user.model_dump()
    return None


def _build_bot_principal(payload: dict) -> Optional[dict]:
    """Construye un dict de "usuario bot" a partir de un JWT de rol=bot.

    Los tokens bot no pertenecen a ningún usuario de la tabla usuarios — su
    identidad es el hospital al que representan. Devolvemos un dict sintético
    que cumple la interfaz esperada por get_current_tenant (necesita tenant_id
    y rol) pero sin id ni activo (campos solo aplicables a usuarios humanos).

    Retorna None si el payload no es un token bot válido.
    """
    if payload.get("rol") != "bot":
        return None
    tenant_id = payload.get("tenant_id")
    if tenant_id is None:
        return None
    try:
        tenant_id = int(tenant_id)
    except (TypeError, ValueError):
        return None
    return {
        "id": None,
        "sub": payload.get("sub", f"bot:{tenant_id}"),
        "rol": "bot",
        "tenant_id": tenant_id,
        # activo=True para que get_current_user no rechace la identidad bot
        "activo": True,
    }


async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> Optional[dict]:
    """Devuelve el user si hay token válido, None si no hay header.

    Útil para endpoints híbridos (público vs privado en el mismo path).
    Soporta tanto tokens de usuario humano como tokens de bot (rol=bot).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_token(authorization[7:])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None

    # ── Tokens bot (sub = "bot:<hospital_id>") ────────────────────────────────
    # Los tokens bot no tienen un user_id numérico en sub; se identifican por
    # rol=bot y llevan tenant_id directamente en el payload.
    if payload.get("rol") == "bot":
        return _build_bot_principal(payload)

    # ── Tokens de usuario humano ───────────────────────────────────────────────
    try:
        uid = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None

    user = await _read_user(session, uid)
    if not user or not user.get("activo"):
        return None
    return user


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Igual que el optional pero lanza 401 si no hay user válido."""
    user = await get_current_user_optional(authorization=authorization, session=session)
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

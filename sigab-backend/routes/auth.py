"""Endpoints de autenticación: login, refresh, me, change-password."""
from datetime import datetime
from typing import Optional
import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError

from config import get_db
from auth.password import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token, decode_token
from auth.dependencies import get_current_user

router = APIRouter()


from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_async_session
from auth.password import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token, decode_token
from auth.dependencies import get_current_user
from models.usuario import Usuario

router = APIRouter()


@router.post("/login")
async def login(data: dict, session: AsyncSession = Depends(get_async_session)):
    """Login con matrícula IMSS + contraseña."""
    matricula = (data.get("matricula") or "").strip()
    password = data.get("password") or ""

    if not matricula or not password:
        raise HTTPException(status_code=400, detail="Matrícula y contraseña son obligatorias")

    stmt = select(Usuario).where(Usuario.matricula == matricula)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Matrícula o contraseña incorrecta")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado. Contacta al administrador.")
    if not user.password_hash:
        raise HTTPException(
            status_code=426,
            detail="El usuario no tiene contraseña configurada. Contacta al administrador.",
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Matrícula o contraseña incorrecta")

    # Update last_login
    user.last_login = datetime.utcnow()
    await session.commit()
    await session.refresh(user)

    user_data = user.model_dump()
    access = create_access_token(user_data)
    refresh = create_refresh_token(user.id)

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "matricula": user.matricula,
            "rol": user.rol,
            "email": user.email,
            "must_change_password": bool(user.must_change_password),
        },
    }


@router.post("/refresh")
async def refresh_token(data: dict, session: AsyncSession = Depends(get_async_session)):
    """Intercambia un refresh token por un nuevo access token."""
    token = data.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token requerido")
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token no es de tipo refresh")

    try:
        uid = int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Payload inválido")

    stmt = select(Usuario).where(Usuario.id == uid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario inválido o desactivado")

    return {
        "access_token": create_access_token(user.model_dump()),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Devuelve el perfil del usuario autenticado."""
    return {
        "id": user["id"],
        "nombre": user["nombre"],
        "matricula": user["matricula"],
        "rol": user["rol"],
        "email": user.get("email"),
    }


@router.post("/change-password")
async def change_password(
    data: dict,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Cambia la contraseña del usuario actual (requiere contraseña actual)."""
    actual = data.get("password_actual") or ""
    nueva = data.get("password_nueva") or ""

    if not nueva or len(nueva) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    stmt = select(Usuario).where(Usuario.id == user["id"])
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if db_user and db_user.password_hash:
        if not verify_password(actual, db_user.password_hash):
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

    nuevo_hash = hash_password(nueva)
    db_user.password_hash = nuevo_hash
    db_user.must_change_password = False
    
    await session.commit()
    return {"ok": True, "mensaje": "Contraseña actualizada"}

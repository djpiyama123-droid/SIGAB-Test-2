"""
routes/_examples_tenant_pattern.py — Ejemplos canónicos de refactor multi-tenant.

ESTE ARCHIVO NO SE REGISTRA EN main.py NI EXPONE ENDPOINTS.

Sirve como referencia única y consistente para refactorizar los 20 archivos
de routes existentes en Fase 2. Cada ejemplo tiene:
    1. El patrón "ANTES" (legacy, mono-tenant).
    2. El patrón "DESPUÉS" (multi-tenant, post-Fase 1).
    3. Notas sobre por qué cambia y qué NO debe pasar.

Reglas de oro
=============
1. ``tenant_id`` SIEMPRE viene de ``get_current_tenant``. NUNCA del body,
   query string ni cabecera HTTP.
2. Todo SELECT sobre tablas con tenant_id agrega ``.where(M.tenant_id == tenant_id)``.
3. Todo INSERT asigna ``tenant_id=tenant_id`` al modelo antes de guardar.
4. UPDATE/DELETE filtra por tenant_id antes de modificar — nunca por sólo el id.
5. Rutas públicas (sin auth) que reciben un id opaco (qr_token, uuid)
   no filtran por tenant porque el id es único globalmente, pero igual
   nunca devuelven datos cruzados — el modelo ya lo garantiza por id.
6. Rutas globales del SuperAdmin de SIGAH no usan get_current_tenant;
   usan require_superadmin y operan sobre todos los tenants explícitamente.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.dependencies import get_current_user
from auth.tenancy import (
    get_current_tenant,
    get_current_tenant_optional,
    require_superadmin,
)
from database import get_async_session
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio


router = APIRouter()


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 1 — LISTAR (GET colección)
# ──────────────────────────────────────────────────────────────────────
#
# ANTES (mono-tenant):
#     stmt = select(Equipo).where(Equipo.estado == "operativo")
#
# DESPUÉS (multi-tenant):
#     stmt = select(Equipo).where(
#         Equipo.tenant_id == tenant_id,
#         Equipo.estado == "operativo",
#     )

@router.get("/equipos")
async def listar_equipos_ejemplo(
    estado: Optional[str] = None,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(Equipo.tenant_id == tenant_id)
    if estado:
        stmt = stmt.where(Equipo.estado == estado)
    result = await session.execute(stmt)
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 2 — OBTENER UNO (GET por id)
# ──────────────────────────────────────────────────────────────────────
#
# CRÍTICO: el filtrado por tenant_id debe acompañar al id. Devolver 404
# (no 403) cuando el equipo no es del tenant — así no se revela existencia
# cross-tenant.

@router.get("/equipos/{equipo_id}")
async def obtener_equipo_ejemplo(
    equipo_id: int,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(
        Equipo.id == equipo_id,
        Equipo.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    equipo = result.scalar_one_or_none()
    if equipo is None:
        # 404, NUNCA 403. Privacidad: no revelar que el id existe en otro tenant.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipo no encontrado")
    return equipo


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 3 — CREAR (POST)
# ──────────────────────────────────────────────────────────────────────
#
# El tenant_id se asigna por la dependencia, NUNCA por el body.
# Si el payload trae un tenant_id, se IGNORA silenciosamente.

@router.post("/equipos")
async def crear_equipo_ejemplo(
    payload: dict,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Defensivo: descartar cualquier tenant_id que venga del cliente.
    payload.pop("tenant_id", None)
    equipo = Equipo(**payload, tenant_id=tenant_id)
    session.add(equipo)
    await session.commit()
    await session.refresh(equipo)
    return equipo


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 4 — ACTUALIZAR (PUT / PATCH)
# ──────────────────────────────────────────────────────────────────────
#
# Verificar pertenencia ANTES de modificar. El filtro WHERE id=... AND
# tenant_id=... evita que un payload malicioso modifique cosas ajenas.

@router.put("/equipos/{equipo_id}")
async def actualizar_equipo_ejemplo(
    equipo_id: int,
    payload: dict,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(
        Equipo.id == equipo_id,
        Equipo.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    equipo = result.scalar_one_or_none()
    if equipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipo no encontrado")

    # Defensivo: no permitir mover el equipo a otro tenant vía PATCH.
    payload.pop("tenant_id", None)
    for key, value in payload.items():
        setattr(equipo, key, value)
    await session.commit()
    await session.refresh(equipo)
    return equipo


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 5 — ELIMINAR (DELETE)
# ──────────────────────────────────────────────────────────────────────
#
# Mismo principio: filtrar por id + tenant_id en el WHERE.

@router.delete("/equipos/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_equipo_ejemplo(
    equipo_id: int,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(
        Equipo.id == equipo_id,
        Equipo.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    equipo = result.scalar_one_or_none()
    if equipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipo no encontrado")
    await session.delete(equipo)
    await session.commit()


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 6 — DASHBOARD / agregaciones (KPIs por hospital)
# ──────────────────────────────────────────────────────────────────────
#
# Todas las queries de COUNT, SUM, GROUP BY agregan tenant_id.
# Lo que la jefatura del Hospital A ve nunca incluye al Hospital B.

@router.get("/dashboard/equipos/resumen")
async def dashboard_resumen_ejemplo(
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(Equipo.estado, func.count(Equipo.id))
        .where(Equipo.tenant_id == tenant_id)
        .group_by(Equipo.estado)
    )
    result = await session.execute(stmt)
    return {estado: total for estado, total in result.all()}


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 7 — RUTA PÚBLICA (sin auth, escaneo QR)
# ──────────────────────────────────────────────────────────────────────
#
# El qr_token es opaco y globalmente único. No requiere filtro de tenant,
# pero el modelo ya garantiza una sola fila. La respuesta NUNCA debe
# enumerar otros equipos del mismo o de otro tenant.

@router.get("/public/{qr_token}")
async def equipo_publico_ejemplo(
    qr_token: str,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(Equipo.qr_token == qr_token)
    result = await session.execute(stmt)
    equipo = result.scalar_one_or_none()
    if equipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR inválido")
    # Filtrar campos antes de devolver — el público no debe ver costos,
    # contratos ni historial completo.
    return {
        "nombre": equipo.nombre,
        "marca": equipo.marca,
        "modelo": equipo.modelo,
        "ubicacion": equipo.ubicacion,
        "estado": equipo.estado,
    }


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 8 — RUTA SUPERADMIN GLOBAL (panel /admin-global de SIGAH)
# ──────────────────────────────────────────────────────────────────────
#
# El SuperAdmin opera sobre todos los tenants. NO usa get_current_tenant.
# Usa require_superadmin y selecciona explícitamente sin filtro de tenant.

@router.get("/admin-global/equipos/totales")
async def superadmin_equipos_totales_ejemplo(
    _admin: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo.tenant_id, func.count(Equipo.id)).group_by(Equipo.tenant_id)
    result = await session.execute(stmt)
    return {f"tenant_{tid}": total for tid, total in result.all()}


# ──────────────────────────────────────────────────────────────────────
# Ejemplo 9 — RELACIÓN PADRE-HIJO (orden de servicio de un equipo)
# ──────────────────────────────────────────────────────────────────────
#
# Aunque el modelo hijo (OrdenServicio) ya tiene tenant_id por
# denormalización, conviene incluirlo TAMBIÉN en el filtro — defensa en
# profundidad. No confiar en que el FK al padre ya filtra.

@router.get("/equipos/{equipo_id}/ordenes")
async def ordenes_de_equipo_ejemplo(
    equipo_id: int,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(OrdenServicio)
        .where(
            OrdenServicio.equipo_id == equipo_id,
            OrdenServicio.tenant_id == tenant_id,  # defensa en profundidad
        )
        .order_by(OrdenServicio.id.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────────
# Anti-patrones (NO HACER NUNCA)
# ──────────────────────────────────────────────────────────────────────
#
# ❌ MAL — confiar en filtro del cliente:
#     stmt = select(Equipo).where(Equipo.tenant_id == request.query_params["tenant"])
#
# ❌ MAL — leer tenant_id del body:
#     equipo = Equipo(**payload)  # payload trae tenant_id manipulado
#
# ❌ MAL — devolver 403 cross-tenant (revela existencia):
#     if equipo.tenant_id != tenant_id:
#         raise HTTPException(403, "No es tuyo")  # filtra info!
#
# ❌ MAL — usar aiomysql con SQL crudo sin parametrizar tenant_id:
#     await cursor.execute("SELECT * FROM equipos WHERE estado = %s", (estado,))
#     # OLVIDÓ tenant_id → leak masivo.
#
# ❌ MAL — refactorizar UN endpoint y olvidar los demás:
#     # Cada archivo de routes/ debe revisarse completo o el aislamiento
#     # tiene huecos.

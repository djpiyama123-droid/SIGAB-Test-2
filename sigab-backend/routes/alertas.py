from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant

router = APIRouter()


from sqlmodel import select, or_, func, update
from sqlmodel.ext.asyncio.session import AsyncSession
import sqlalchemy as sa
from database import get_async_session
from models.alerta import Alerta
from models.equipo import Equipo


# Nota de arquitectura — Alerta.tenant_id pendiente (Fase 1 migration).
# Mientras no exista la columna, filtramos por JOIN con Equipo cuando la
# alerta tiene equipo_id. Alertas sin equipo_id (sistema/globales) son
# ignoradas en listados tenant — se expondrán en el panel SuperAdmin.


@router.get("/")
async def listar_alertas(
    leida: Optional[bool] = None,
    tipo: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # JOIN con Equipo para filtrar por tenant — Alerta aún no tiene tenant_id.
    # outerjoin → inner join explícito para que sólo retornemos alertas
    # asociadas a un equipo del tenant; alertas huérfanas (sin equipo) quedan
    # fuera del listado del tenant hasta que se añada tenant_id a la tabla.
    query = (
        select(Alerta, Equipo.nombre.label("equipo_nombre"), Equipo.serie.label("equipo_serie"))
        .join(Equipo, Alerta.equipo_id == Equipo.id)
        .where(Equipo.tenant_id == tenant_id)
    )

    if leida is not None:
        query = query.where(Alerta.leida == leida)
    if tipo:
        query = query.where(Alerta.tipo == tipo)

    # Ordenar por prioridad (critica > alta > media > baja) y fecha
    query = query.order_by(
        sa.case(
            (Alerta.prioridad == "critica", 1),
            (Alerta.prioridad == "alta", 2),
            (Alerta.prioridad == "media", 3),
            default=4
        ),
        Alerta.created_at.desc()
    ).limit(limit)

    result = await session.execute(query)
    rows = result.all()

    alertas_list = []
    for alerta, eq_nombre, eq_serie in rows:
        d = alerta.model_dump()
        d["equipo_nombre"] = eq_nombre
        d["equipo_serie"] = eq_serie
        alertas_list.append(d)

    return {"alertas": alertas_list, "total": len(alertas_list)}


@router.get("/pendientes")
async def alertas_pendientes(
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Filtrar alertas pendientes del tenant via JOIN con Equipo.
    stmt = (
        select(Alerta)
        .join(Equipo, Alerta.equipo_id == Equipo.id)
        .where(Alerta.leida == False, Equipo.tenant_id == tenant_id)
        .limit(50)
    )
    res = await session.execute(stmt)
    alertas = res.scalars().all()
    return {"alertas": alertas, "total": len(alertas)}


@router.put("/{alerta_id}/leer")
async def marcar_leida(
    alerta_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Verificar que la alerta pertenece al tenant antes de mutar.
    # Retornamos 404 (nunca 403) para no revelar existencia cross-tenant.
    stmt = (
        select(Alerta)
        .join(Equipo, Alerta.equipo_id == Equipo.id)
        .where(Alerta.id == alerta_id, Equipo.tenant_id == tenant_id)
    )
    alerta = (await session.execute(stmt)).scalar_one_or_none()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.leida = True
    await session.commit()
    return {"ok": True}


@router.put("/leer-todas")
async def marcar_todas_leidas(
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # UPDATE masivo sólo sobre alertas del tenant — via subquery de equipos.
    # Alerta.equipo_id → Equipo.tenant_id para acotar el UPDATE.
    equipo_ids_stmt = select(Equipo.id).where(Equipo.tenant_id == tenant_id)
    equipo_ids = (await session.execute(equipo_ids_stmt)).scalars().all()

    if equipo_ids:
        stmt = (
            update(Alerta)
            .where(Alerta.leida == False, Alerta.equipo_id.in_(equipo_ids))
            .values(leida=True)
        )
        await session.execute(stmt)
        await session.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


from sqlmodel import select, or_, func, update
from sqlmodel.ext.asyncio.session import AsyncSession
import sqlalchemy as sa
from database import get_async_session
from models.alerta import Alerta
from models.equipo import Equipo


@router.get("/")
async def listar_alertas(
    leida: Optional[bool] = None,
    tipo: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    query = select(Alerta, Equipo.nombre.label("equipo_nombre"), Equipo.serie.label("equipo_serie")).outerjoin(Equipo, Alerta.equipo_id == Equipo.id)
    
    if leida is not None:
        query = query.where(Alerta.leida == leida)
    if tipo:
        query = query.where(Alerta.tipo == tipo)

    # Ordenar por prioridad (critica > alta > media > baja) y fecha
    # Usamos case para replicar el orden específico
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
    session: AsyncSession = Depends(get_async_session)
):
    # Nota: v_alertas_pendientes es una vista. Podemos seleccionarla directamente vía raw SQL o mapearla.
    # Por ahora usamos select(Alerta) filtrando por leida=False.
    stmt = select(Alerta).where(Alerta.leida == False).limit(50)
    res = await session.execute(stmt)
    alertas = res.scalars().all()
    return {"alertas": alertas, "total": len(alertas)}


@router.put("/{alerta_id}/leer")
async def marcar_leida(
    alerta_id: int, 
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_async_session)
):
    alerta = await session.get(Alerta, alerta_id)
    if alerta:
        alerta.leida = True
        await session.commit()
    return {"ok": True}


@router.put("/leer-todas")
async def marcar_todas_leidas(
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_async_session)
):
    stmt = update(Alerta).where(Alerta.leida == False).values(leida=True)
    await session.execute(stmt)
    await session.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


from sqlmodel import select, or_, func
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_async_session
from models.trazabilidad import Trazabilidad
from models.equipo import Equipo
from models.usuario import Usuario

router = APIRouter()


@router.get("/")
async def listar_trazabilidad(
    equipo_id: Optional[int] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    query = select(Trazabilidad, Equipo.nombre.label("equipo_nombre"), Equipo.serie.label("equipo_serie")).join(Equipo, Trazabilidad.equipo_id == Equipo.id)
    
    if equipo_id:
        query = query.where(Trazabilidad.equipo_id == equipo_id)

    query = query.order_by(Trazabilidad.fecha_movimiento.desc()).limit(limit)
    
    result = await session.execute(query)
    rows = result.all()
    
    movimientos_list = []
    for mov, eq_nombre, eq_serie in rows:
        d = mov.model_dump()
        d["equipo_nombre"] = eq_nombre
        d["equipo_serie"] = eq_serie
        movimientos_list.append(d)

    return {"movimientos": movimientos_list, "total": len(movimientos_list)}


@router.get("/equipo/{equipo_id}")
async def trazabilidad_equipo(
    equipo_id: int, 
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_async_session)
):
    query = select(Trazabilidad, Usuario.nombre.label("usuario_nombre")).outerjoin(Usuario, Trazabilidad.usuario_id == Usuario.id).where(Trazabilidad.equipo_id == equipo_id).order_by(Trazabilidad.fecha_movimiento.desc())
    
    result = await session.execute(query)
    rows = result.all()
    
    movimientos_list = []
    for mov, user_nombre in rows:
        d = mov.model_dump()
        d["usuario_nombre"] = user_nombre
        movimientos_list.append(d)
        
    return {"movimientos": movimientos_list}


@router.post("/")
async def registrar_movimiento(
    data: dict, 
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_async_session)
):
    # Obtener equipo
    equipo = await session.get(Equipo, data["equipo_id"])
    if not equipo:
        return {"ok": False, "mensaje": "Equipo no encontrado"}

    # Crear registro de trazabilidad
    nuevo_mov = Trazabilidad(
        equipo_id=data["equipo_id"],
        area_origen=equipo.area,
        piso_origen=equipo.piso,
        area_destino=data.get("area_destino"),
        piso_destino=data.get("piso_destino"),
        motivo=data.get("motivo"),
        usuario_id=data.get("usuario_id") or user["id"],
        notas=data.get("notas")
    )
    
    session.add(nuevo_mov)

    # Actualizar ubicación del equipo
    equipo.area = data.get("area_destino")
    equipo.piso = data.get("piso_destino") or equipo.piso
    
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar movimiento: {str(e)}")

    return {"ok": True, "mensaje": "Movimiento registrado"}

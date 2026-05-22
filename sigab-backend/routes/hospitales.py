"""
routes/hospitales.py — API del panel SuperAdmin SIGAH.

Operaciones:
  GET  /hospitales/           — Lista todos los hospitales con estadísticas (solo superadmin)
  GET  /hospitales/{id}       — Detalle de un hospital
  POST /hospitales/           — Crear nuevo hospital tenant
  PUT  /hospitales/{id}       — Actualizar hospital
  PATCH /hospitales/{id}/activo — Activar/desactivar hospital
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
import sqlalchemy as sa

from database import get_async_session
from auth.dependencies import require_superadmin
from models.hospital import Hospital
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio
from models.alerta import Alerta
from models.usuario import Usuario

router = APIRouter()


@router.get("/")
async def listar_hospitales(
    _user: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Hospital).order_by(Hospital.id)
    res = await session.execute(stmt)
    hospitales = res.scalars().all()

    resultado = []
    for h in hospitales:
        h_dict = h.model_dump()

        # Estadísticas por tenant
        total_equipos = (await session.execute(
            select(func.count(Equipo.id)).where(Equipo.tenant_id == h.id)
        )).scalar() or 0

        tickets_abiertos = (await session.execute(
            select(func.count(OrdenServicio.id)).where(
                OrdenServicio.tenant_id == h.id,
                OrdenServicio.estado.in_(('abierta', 'en_progreso')),
            )
        )).scalar() or 0

        alertas_pendientes = (await session.execute(
            select(func.count(Alerta.id)).where(
                Alerta.tenant_id == h.id,
                Alerta.leida == False,
            )
        )).scalar() or 0

        total_usuarios = (await session.execute(
            select(func.count(Usuario.id)).where(
                Usuario.hospital_id == h.id,
                Usuario.activo == True,
            )
        )).scalar() or 0

        h_dict["stats"] = {
            "total_equipos": total_equipos,
            "tickets_abiertos": tickets_abiertos,
            "alertas_pendientes": alertas_pendientes,
            "total_usuarios": total_usuarios,
        }
        resultado.append(h_dict)

    return {"hospitales": resultado, "total": len(resultado)}


@router.get("/{hospital_id}")
async def obtener_hospital(
    hospital_id: int,
    _user: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    hospital = await session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital no encontrado")
    return hospital


@router.post("/")
async def crear_hospital(
    data: dict,
    _user: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    if not data.get("nombre"):
        raise HTTPException(status_code=400, detail="nombre es obligatorio")
    hospital = Hospital(**data)
    session.add(hospital)
    await session.commit()
    await session.refresh(hospital)
    return {"ok": True, "id": hospital.id, "nombre": hospital.nombre}


@router.put("/{hospital_id}")
async def actualizar_hospital(
    hospital_id: int,
    data: dict,
    _user: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    hospital = await session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital no encontrado")
    campos = {"nombre", "clave_imss", "ciudad", "estado", "pais", "plan"}
    for k, v in data.items():
        if k in campos:
            setattr(hospital, k, v)
    await session.commit()
    return {"ok": True}


@router.patch("/{hospital_id}/activo")
async def toggle_activo(
    hospital_id: int,
    data: dict,
    _user: dict = Depends(require_superadmin),
    session: AsyncSession = Depends(get_async_session),
):
    hospital = await session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital no encontrado")
    hospital.activo = bool(data.get("activo", True))
    await session.commit()
    return {"ok": True, "activo": hospital.activo}

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant

router = APIRouter()


from sqlmodel import select, or_, func, update
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_async_session
from models.preventivo import PreventivoProgramado
from models.equipo import Equipo
from models.usuario import Usuario
from datetime import date, timedelta
from services.cache_service import cache_service, WARM

router = APIRouter()


@router.get("/")
async def listar_preventivos(
    vencidos: Optional[bool] = None,
    equipo_id: Optional[int] = None,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # PreventivoProgramado aún no tiene tenant_id (Fase 1 pendiente).
    # Filtramos por JOIN con Equipo (que sí lo tiene) para acotar al hospital.
    query = select(
        PreventivoProgramado,
        Equipo.nombre.label("equipo_nombre"),
        Equipo.serie.label("equipo_serie"),
        Equipo.marca.label("equipo_marca"),
        Equipo.area.label("equipo_area"),
        Usuario.nombre.label("tecnico_nombre")
    ).join(Equipo, PreventivoProgramado.equipo_id == Equipo.id)\
     .outerjoin(Usuario, PreventivoProgramado.tecnico_asignado_id == Usuario.id)\
     .where(
         PreventivoProgramado.activo == True,
         Equipo.tenant_id == tenant_id,
     )

    if vencidos is True:
        query = query.where(PreventivoProgramado.proxima_ejecucion <= date.today())
    if equipo_id:
        # Verificar que el equipo pertenece al tenant antes de filtrar por él.
        query = query.where(PreventivoProgramado.equipo_id == equipo_id)

    query = query.order_by(PreventivoProgramado.proxima_ejecucion.asc())
    
    result = await session.execute(query)
    rows = result.all()
    
    preventivos_list = []
    for pp, eq_nom, eq_ser, eq_mar, eq_area, tech_nom in rows:
        d = pp.model_dump()
        d["equipo_nombre"] = eq_nom
        d["equipo_serie"] = eq_ser
        d["equipo_marca"] = eq_mar
        d["equipo_area"] = eq_area
        d["tecnico_nombre"] = tech_nom
        preventivos_list.append(d)

    return {"preventivos": preventivos_list, "total": len(preventivos_list)}


@router.post("/")
async def crear_preventivo(
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Verificar que el equipo referenciado pertenece al tenant antes de crear.
    # Esto previene que un usuario de Hospital A cree preventivos sobre
    # equipos de Hospital B pasando un equipo_id ajeno en el payload.
    equipo_id = data.get("equipo_id")
    if not equipo_id:
        raise HTTPException(status_code=400, detail="equipo_id es obligatorio")

    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        # 404, nunca 403 — no revelar si el equipo existe en otro tenant.
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Defensivo: descartar tenant_id si el cliente lo hubiera enviado en el payload.
    data.pop("tenant_id", None)

    nuevo_pp = PreventivoProgramado(**data)
    if not nuevo_pp.frecuencia_dias:
        nuevo_pp.frecuencia_dias = 90

    session.add(nuevo_pp)
    await session.commit()
    await session.refresh(nuevo_pp)

    return {"ok": True, "id": nuevo_pp.id}


@router.get("/proximos")
async def mantenimientos_proximos(
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Calendario de mantenimientos y señales predictivas para el SIGAB WebPanel."""
    cache_key = f"preventivos_proximos_{tenant_id}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    from models.orden_servicio import OrdenServicio
    hoy = date.today()

    stmt_eq = (
        select(Equipo)
        .where(Equipo.tenant_id == tenant_id)
        .order_by(Equipo.fecha_proximo_mantenimiento.asc().nullslast())
        .limit(100)
    )
    equipos = (await session.execute(stmt_eq)).scalars().all()

    equipos_list = []
    for e in equipos:
        if e.fecha_proximo_mantenimiento is None:
            situacion = "sin fecha"
            dias = None
        else:
            dias = (e.fecha_proximo_mantenimiento - hoy).days
            if dias < 0:
                situacion = "vencido"
            elif dias <= 30:
                situacion = "proximo"
            else:
                situacion = "al dia"
        equipos_list.append({
            "id": str(e.id),
            "nombre": e.nombre,
            "marca": e.marca,
            "modelo": e.modelo,
            "area": e.area or "—",
            "criticidad": e.criticidad,
            "proximo_mant": str(e.fecha_proximo_mantenimiento) if e.fecha_proximo_mantenimiento else "—",
            "dias_restantes": dias,
            "situacion": situacion,
        })

    stmt_pred = (
        select(OrdenServicio, Equipo.nombre.label("eq_nombre"), Equipo.area.label("eq_area"))
        .join(Equipo, OrdenServicio.equipo_id == Equipo.id)
        .where(
            OrdenServicio.tenant_id == tenant_id,
            OrdenServicio.indice_salud.is_not(None),
        )
        .order_by(OrdenServicio.fecha.desc())
        .limit(20)
    )
    res_pred = await session.execute(stmt_pred)

    predictivo = []
    for os_row, eq_nom, eq_area in res_pred.all():
        predictivo.append({
            "orden": getattr(os_row, 'numero_orden', None) or str(os_row.id),
            "equipo": eq_nom,
            "area": eq_area or "—",
            "indice_salud": getattr(os_row, 'indice_salud', None),
            "probabilidad_falla": getattr(os_row, 'probabilidad_falla', None),
            "componente_riesgo": getattr(os_row, 'componente_riesgo', None) or "—",
            "ventana_dias": getattr(os_row, 'ventana_falla_dias', None),
        })

    result = {"equipos": equipos_list, "predictivo": predictivo}
    cache_service.set(cache_key, result, ttl_seconds=WARM)
    return result


@router.put("/{prev_id}/ejecutar")
async def marcar_ejecutado(
    prev_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Cargar el preventivo y verificar que su equipo pertenece al tenant.
    # PreventivoProgramado no tiene tenant_id directo, así que hacemos JOIN con Equipo.
    # Retornamos 404 (nunca 403) para no revelar existencia cross-tenant.
    stmt_pp = (
        select(PreventivoProgramado)
        .join(Equipo, PreventivoProgramado.equipo_id == Equipo.id)
        .where(PreventivoProgramado.id == prev_id, Equipo.tenant_id == tenant_id)
    )
    pp = (await session.execute(stmt_pp)).scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=404, detail="Preventivo no encontrado")

    nueva_fecha = date.today() + timedelta(days=pp.frecuencia_dias)

    # Actualizar preventivo
    pp.ultima_ejecucion = date.today()
    pp.proxima_ejecucion = nueva_fecha

    # Actualizar fecha en equipo — el equipo ya está verificado por el JOIN de arriba.
    equipo = await session.get(Equipo, pp.equipo_id)
    if equipo:
        equipo.fecha_ultimo_mantenimiento = date.today()
        equipo.fecha_proximo_mantenimiento = nueva_fecha

    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al ejecutar preventivo: {str(e)}")

    return {"ok": True, "proxima_ejecucion": str(nueva_fecha)}

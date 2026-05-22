"""
routes/dashboard.py — Endpoints del panel principal de KPIs.

Operaciones:
  GET /dashboard/resumen    — Resumen ejecutivo: equipos por estado, tickets, alertas,
                              preventivos vencidos, movimientos y tendencia mensual.
                              Cacheo de 30s vía cache_service (AG-11).
  GET /dashboard/equipos    — Listado con filtros y orden por criticidad (fuera_servicio → operativo)
  GET /dashboard/mapa       — Zonas del hospital con conteo de equipos por estado
  GET /dashboard/fiabilidad — MTBF/MTTR (delegado a reliability_service, endpoint deprecated aquí)
"""
from fastapi import APIRouter, Depends, HTTPException
import logging
from datetime import datetime, timezone, date, timedelta
from typing import Optional
import sqlalchemy as sa
from sqlmodel import select, func, text
from sqlmodel.ext.asyncio.session import AsyncSession

from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant
from database import get_async_session
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio
from models.alerta import Alerta
from models.preventivo import PreventivoProgramado
from models.trazabilidad import Trazabilidad
from models.mapa import ZonasMapa
from services.cache_service import cache_service

router = APIRouter()

@router.get("/mapa")
async def get_mapa_equipos(
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna zonas activas con sus equipos para el mapa hospitalario."""
    try:
        # Zonas con agregados — filtradas por tenant para no mezclar hospitales.
        stmt_zonas = select(
            ZonasMapa,
            func.count(Equipo.id).label("total_equipos"),
            func.sum(sa.case((Equipo.estado == 'operativo', 1), else_=0)).label("operativos"),
            func.sum(sa.case((Equipo.estado == 'en_mantenimiento', 1), else_=0)).label("en_mantenimiento"),
            func.sum(sa.case((Equipo.estado == 'fuera_servicio', 1), else_=0)).label("fuera_servicio")
        ).outerjoin(Equipo, (Equipo.zona_id == ZonasMapa.id) & (Equipo.tenant_id == tenant_id))\
         .where(ZonasMapa.activa == True, ZonasMapa.tenant_id == tenant_id)\
         .group_by(ZonasMapa.id)\
         .order_by(ZonasMapa.orden)

        res_zonas = await session.execute(stmt_zonas)
        rows_zonas = res_zonas.all()

        # Equipos en zonas — sólo los del tenant actual.
        stmt_equipos = select(Equipo).where(
            Equipo.zona_id != None,
            Equipo.tenant_id == tenant_id,
        ).order_by(Equipo.zona_id, Equipo.id)
        res_equipos = await session.execute(stmt_equipos)
        equipos = res_equipos.scalars().all()

        # Agrupar equipos por zona
        equipos_por_zona = {}
        for eq in equipos:
            zid = eq.zona_id
            if zid not in equipos_por_zona:
                equipos_por_zona[zid] = []
            equipos_por_zona[zid].append(eq.model_dump())

        resultado = []
        for zona, total, op, maint, out in rows_zonas:
            z_dict = zona.model_dump()
            z_dict.update({
                "total_equipos": int(total or 0),
                "operativos": int(op or 0),
                "en_mantenimiento": int(maint or 0),
                "fuera_servicio": int(out or 0),
                "equipos": equipos_por_zona.get(zona.id, [])
            })
            resultado.append(z_dict)

        return {"zonas": resultado, "timestamp": datetime.now(timezone.utc).isoformat()}

    except Exception as e:
        logging.error(f"Error en get_mapa_equipos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resumen")
async def dashboard_resumen(
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Cache key incluye tenant_id para no mezclar datos entre hospitales (AG-11).
    cache_key = f"dashboard_resumen_{tenant_id}"
    cached_data = cache_service.get(cache_key)
    if cached_data:
        return cached_data

    # 1. Equipos por estado — filtrados por tenant.
    stmt_estados = (
        select(Equipo.estado, func.count(Equipo.id).label("total"))
        .where(Equipo.tenant_id == tenant_id)
        .group_by(Equipo.estado)
    )
    res_estados = await session.execute(stmt_estados)
    estados = [{"estado": r[0], "total": r[1]} for r in res_estados.all()]

    # Derivados
    total_equipos = sum(e['total'] for e in estados)
    operativos = next((e['total'] for e in estados if e['estado'] == 'operativo'), 0)

    # 2. Tickets abiertos — OrdenServicio tiene tenant_id (Fase 1 migration).
    stmt_tickets = select(func.count(OrdenServicio.id)).where(
        OrdenServicio.tenant_id == tenant_id,
        OrdenServicio.estado.in_(('abierta', 'en_progreso')),
    )
    tickets_total = (await session.execute(stmt_tickets)).scalar() or 0

    # 3. Alertas pendientes — Alerta aún no tiene tenant_id (Fase 1 pendiente).
    # Filtramos por JOIN con Equipo para restringir al tenant actual.
    stmt_alertas = (
        select(func.count(Alerta.id))
        .join(Equipo, Alerta.equipo_id == Equipo.id)
        .where(Alerta.leida == False, Equipo.tenant_id == tenant_id)
    )
    alertas_total = (await session.execute(stmt_alertas)).scalar() or 0

    # 4. Preventivos vencidos — PreventivoProgramado aún no tiene tenant_id (Fase 1 pendiente).
    # Filtramos via JOIN con Equipo.
    stmt_prev = (
        select(func.count(PreventivoProgramado.id))
        .join(Equipo, PreventivoProgramado.equipo_id == Equipo.id)
        .where(
            PreventivoProgramado.proxima_ejecucion <= date.today(),
            PreventivoProgramado.activo == True,
            Equipo.tenant_id == tenant_id,
        )
    )
    vencidos_total = (await session.execute(stmt_prev)).scalar() or 0

    # 5. Últimos movimientos — Trazabilidad aún no tiene tenant_id (Fase 1 pendiente).
    # El JOIN con Equipo ya garantiza que sólo veamos movimientos del tenant.
    stmt_movs = (
        select(Trazabilidad, Equipo.nombre.label("equipo_nombre"), Equipo.serie)
        .join(Equipo, Trazabilidad.equipo_id == Equipo.id)
        .where(Equipo.tenant_id == tenant_id)
        .order_by(Trazabilidad.fecha_movimiento.desc())
        .limit(10)
    )
    res_movs = await session.execute(stmt_movs)
    movimientos = []
    for m, eq_nom, eq_ser in res_movs.all():
        d = m.model_dump()
        d["equipo_nombre"] = eq_nom
        d["serie"] = eq_ser
        movimientos.append(d)

    # 6. Ordenes por mes (últimos 6 meses) — filtradas por tenant.
    stmt_mes = (
        select(text("DATE_FORMAT(fecha, '%Y-%m') as mes"), func.count(OrdenServicio.id))
        .where(
            OrdenServicio.tenant_id == tenant_id,
            OrdenServicio.fecha >= date.today() - timedelta(days=180),
        )
        .group_by(text("mes"))
        .order_by(text("mes"))
    )
    res_mes = await session.execute(stmt_mes)
    ordenes_mes = [{"mes": r[0], "total": r[1]} for r in res_mes.all()]

    res_data = {
        "total": total_equipos,
        "operativos": operativos,
        "equipos_por_estado": estados,
        "tickets_abiertos": tickets_total,
        "alertas_pendientes": alertas_total,
        "preventivos_vencidos": vencidos_total,
        "ultimos_movimientos": movimientos,
        "ordenes_por_mes": ordenes_mes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    cache_service.set(cache_key, res_data, ttl_seconds=30)
    return res_data


@router.get("/equipos")
async def dashboard_equipos(
    estado: str = None,
    area: str = None,
    piso: str = None,
    buscar: str = None,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Filtro de tenant SIEMPRE primero — nunca cruzar datos entre hospitales.
    query = select(Equipo).where(Equipo.tenant_id == tenant_id)

    if estado:
        query = query.where(Equipo.estado == estado)
    if area:
        query = query.where(Equipo.area == area)
    if piso:
        query = query.where(Equipo.piso == piso)
    if buscar:
        query = query.where(
            sa.or_(
                Equipo.nombre.contains(buscar),
                Equipo.serie.contains(buscar),
                Equipo.marca.contains(buscar),
                Equipo.modelo.contains(buscar)
            )
        )

    # Orden personalizado de estados (AG-05 Responsive optimization)
    order_case = sa.case(
        (Equipo.estado == 'fuera_servicio', 1),
        (Equipo.estado == 'en_mantenimiento', 2),
        (Equipo.estado == 'en_traslado', 3),
        (Equipo.estado == 'operativo', 4),
        else_=5
    )
    query = query.order_by(order_case)

    res = await session.execute(query)
    equipos = res.scalars().all()

    return {
        "equipos": [e.model_dump() for e in equipos],
        "total": len(equipos),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/stream")
async def dashboard_sse_deprecated():
    """DEPRECATED: Use /api/v1/events/subscribe instead."""
    raise HTTPException(status_code=410, detail="SSE migrate to /api/v1/events/subscribe")

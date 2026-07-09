"""
routes/formatos.py — Datos de órdenes para templates de impresión IMSS.

GET /api/formatos/{tipo}              — Template vacío (preview sin datos)
GET /api/formatos/{tipo}/{orden_id}   — Datos reales de la orden pre-rellenados,
                                        enriquecidos con datos de casillas CENEVAL si existen

Tipos válidos: reporte_falla | correctivo | preventivo | predictivo

Caché:
  - Templates vacíos   → STATIC (300 s): estáticos en runtime
  - Datos de orden     → sin caché: mutan al cerrar/actualizar la OS
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_async_session
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant
from models.orden_servicio import OrdenServicio, EVIDENCIA_OS
from models.equipo import Equipo
from models.orden_casillas import OrdenCasillas
from services.cache_service import cache_service, STATIC

router = APIRouter()

TIPOS_VALIDOS = {"reporte_falla", "correctivo", "preventivo", "predictivo"}


@router.get("/{tipo}")
async def formato_vacio(
    tipo: str,
    _u=Depends(get_current_user),
):
    """Template vacío para preview — sin datos de orden."""
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo de formato no válido: {tipo}")

    cache_key = f"formato_vacio_{tipo}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    result = {"tipo": tipo, "orden": None, "casillas": None}
    cache_service.set(cache_key, result, ttl_seconds=STATIC)
    return result


@router.get("/{tipo}/{orden_id}")
async def formato_con_datos(
    tipo: str,
    orden_id: int,
    tenant_id: int = Depends(get_current_tenant),
    _u=Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Datos reales de una orden para pre-llenar el template de impresión.
    
    Incluye datos de casillas CENEVAL si la OS tiene casillas asociadas.
    """
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo de formato no válido: {tipo}")

    # Orden filtrada por tenant — nunca cruzar datos entre hospitales.
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id,
        OrdenServicio.tenant_id == tenant_id,
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden_dict = orden.model_dump()

    # Enriquecer con datos del equipo
    if orden.equipo_id:
        stmt_eq = select(Equipo).where(
            Equipo.id == orden.equipo_id,
            Equipo.tenant_id == tenant_id,
        )
        equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
        if equipo:
            orden_dict["equipo_marca"]      = equipo.marca
            orden_dict["equipo_modelo"]     = equipo.modelo
            orden_dict["equipo_inventario"] = equipo.no_inventario
            orden_dict["ubicacion_fisica"]  = equipo.ubicacion_fisica

    # Evidencias fotográficas → o.fotos para la sección "Evidencia
    # Fotográfica del Proceso" de los formatos largos (v4.0.22). Solo
    # imágenes: los PDF se quedan fuera de la galería (mismo criterio de
    # extensión que usa OrdenDetalleModal.jsx para decidir ícono vs <img>).
    stmt_ev = (
        select(EVIDENCIA_OS)
        .where(EVIDENCIA_OS.orden_id == orden_id)
        .order_by(EVIDENCIA_OS.id)
    )
    evidencias = (await session.execute(stmt_ev)).scalars().all()
    orden_dict["fotos"] = [
        {"url": e.ruta_archivo, "descripcion": e.descripcion or ""}
        for e in evidencias
        if e.ruta_archivo and not e.ruta_archivo.lower().endswith(".pdf")
    ]

    # Normalizar estado → estado_final para el template
    estado = orden_dict.get("estado", "")
    if estado == "cerrada":
        orden_dict.setdefault("estado_final", "operativo")
    elif estado == "en_progreso":
        orden_dict.setdefault("estado_final", "en_observacion")

    # Enriquecer con datos de casillas CENEVAL si existen
    stmt_cas = select(OrdenCasillas).where(
        OrdenCasillas.orden_id == orden_id,
        OrdenCasillas.tenant_id == tenant_id,
    )
    casillas = (await session.execute(stmt_cas)).scalar_one_or_none()
    casillas_dict = casillas.model_dump() if casillas else None

    if casillas_dict:
        orden_dict["casillas"] = casillas_dict
        # Propagar tipo_servicio de casillas como tipo_mantenimiento si no está definido
        if not orden_dict.get("tipo_mantenimiento") and casillas_dict.get("tipo_servicio"):
            orden_dict["tipo_mantenimiento"] = casillas_dict["tipo_servicio"]

    return {"tipo": tipo, "orden": orden_dict, "casillas": casillas_dict}

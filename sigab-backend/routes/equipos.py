"""
routes/equipos.py — Endpoints CRUD para gestión de equipos biomédicos.

Operaciones:
  GET    /equipos/              — Listado paginado con filtros (estado, área, piso, búsqueda)
  GET    /equipos/{id}          — Detalle con últimas órdenes y traslados
  POST   /equipos/              — Alta con token QR opaco generado automáticamente
  PUT    /equipos/{id}          — Actualización con campos filtrados por rol
  DELETE /equipos/{id}          — Baja (cascade a órdenes y trazabilidad)
  GET    /equipos/public/{qr}   — Consulta pública vía escaneo QR (sin auth)
  GET    /equipos/{id}/qr       — Generar QR PNG (Segno, nivel H, 30% recuperación)
  GET    /equipos/{id}/qr/label — Etiqueta A6 imprimible (PDF)
  POST   /equipos/validar       — Triple Validación Poka-Yoke (QR + Inventario + Serie)
  PATCH  /equipos/{id}/posicion — Drag & drop en mapa interactivo

Normativas: NOM-016-SSA3-2012 (audit trail), ISO 13485 (trazabilidad)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from typing import Optional
import aiomysql
import os
import secrets
import uuid
import csv
import io
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from config import get_db, UPLOAD_DIR, MAX_UPLOAD_MB, PUBLIC_BASE_URL
from auth.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_action,
)
from auth.tenancy import get_current_tenant
from auth.permissions import (
    can,
    filter_equipo_publico,
    allowed_update_fields,
    CAMPOS_EDITABLES_TODOS,
)
from services.qr_service import generate_qr_png, generate_qr_label_a6_pdf
from services.audit_service import AuditService

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import sqlalchemy as sa
from database import get_async_session
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio
from models.preventivo import PreventivoProgramado

router = APIRouter()

# ... rutas ...

@router.get("/public/{qr_token}")
async def equipo_por_qr(qr_token: str, session: AsyncSession = Depends(get_async_session)):
    """Endpoint PÚBLICO (sin auth) para escaneo QR.
    Devuelve datos básicos del equipo identificado por su qr_token opaco."""
    
    # Buscar equipo por token
    statement = select(Equipo).where(Equipo.qr_token == qr_token)
    result = await session.execute(statement)
    equipo = result.scalar_one_or_none()

    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado o QR inválido")

    # Historial resumido (últimas 5 órdenes, público)
    stmt_ordenes = select(OrdenServicio).where(OrdenServicio.equipo_id == equipo.id).order_by(OrdenServicio.fecha.desc()).limit(5)
    res_ordenes = await session.execute(stmt_ordenes)
    ordenes = res_ordenes.scalars().all()

    stmt_prev = select(PreventivoProgramado).where(
        PreventivoProgramado.equipo_id == equipo.id, 
        PreventivoProgramado.activo == True
    ).order_by(PreventivoProgramado.proxima_ejecucion.asc()).limit(3)
    res_prev = await session.execute(stmt_prev)
    preventivos = res_prev.scalars().all()

    return {
        "equipo": equipo,
        "ordenes_recientes": ordenes,
        "preventivos": preventivos,
    }


from models.mapa import ZonasMapa
from sqlmodel import func
from services.cache_service import cache_service, STATIC

@router.get("/areas/catalogo")
async def catalogo_areas(
    session: AsyncSession = Depends(get_async_session),
    tenant_id: int = Depends(get_current_tenant),
):
    cache_key = f"areas_catalogo_{tenant_id}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    stmt_areas = (
        select(Equipo.area)
        .where(Equipo.tenant_id == tenant_id, Equipo.area != None)
        .distinct()
        .order_by(Equipo.area)
    )
    res_areas = await session.execute(stmt_areas)
    areas = res_areas.scalars().all()

    stmt_pisos = (
        select(Equipo.piso)
        .where(Equipo.tenant_id == tenant_id, Equipo.piso != None)
        .distinct()
        .order_by(Equipo.piso)
    )
    res_pisos = await session.execute(stmt_pisos)
    pisos = res_pisos.scalars().all()

    result = {"areas": list(areas), "pisos": list(pisos)}
    cache_service.set(cache_key, result, ttl_seconds=STATIC)
    return result


@router.get("/zonas/catalogo")
async def catalogo_zonas(
    session: AsyncSession = Depends(get_async_session),
    tenant_id: int = Depends(get_current_tenant),
):
    """Lista las zonas del mapa para el formulario de alta/edición de equipos."""
    cache_key = f"zonas_catalogo_{tenant_id}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    stmt = (
        select(ZonasMapa)
        .where(ZonasMapa.tenant_id == tenant_id, ZonasMapa.activa == True)
        .order_by(ZonasMapa.orden, ZonasMapa.nombre)
    )
    res = await session.execute(stmt)
    zonas = res.scalars().all()
    result = {"zonas": [z.model_dump() for z in zonas]}
    cache_service.set(cache_key, result, ttl_seconds=STATIC)
    return result


@router.post("/")
async def crear_equipo(
    data: dict,
    user: dict = Depends(require_action("create_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Crea un nuevo equipo biomédico en el inventario."""
    if not data.get("nombre") or not data.get("serie"):
        raise HTTPException(status_code=400, detail="Nombre y serie son obligatorios")

    # Defensivo: ignorar cualquier tenant_id que venga del cliente.
    data.pop("tenant_id", None)

    # Crear instancia del modelo
    nuevo_equipo = Equipo(**data, tenant_id=tenant_id)

    # Valores por defecto y token
    if not nuevo_equipo.estado:
        nuevo_equipo.estado = "operativo"
    if not nuevo_equipo.criticidad:
        nuevo_equipo.criticidad = "media"
    if nuevo_equipo.pos_x is None:
        nuevo_equipo.pos_x = 50.0
    if nuevo_equipo.pos_y is None:
        nuevo_equipo.pos_y = 50.0

    nuevo_equipo.qr_token = secrets.token_urlsafe(12)[:16]

    try:
        session.add(nuevo_equipo)
        await session.commit()
        await session.refresh(nuevo_equipo)

        # Auditoría NOM-016
        await AuditService.log_event(
            usuario_id=user["id"],
            accion="CREATE_EQUIPO",
            entidad="equipos",
            entidad_id=nuevo_equipo.id,
            datos=data,
            session=session
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=409, detail=f"Error al crear: {str(e)}")

    return {"ok": True, "id": nuevo_equipo.id, "qr_token": nuevo_equipo.qr_token, "mensaje": f"Equipo '{nuevo_equipo.nombre}' creado"}


from models.trazabilidad import Trazabilidad

@router.delete("/{equipo_id}")
async def eliminar_equipo(
    equipo_id: int,
    user: dict = Depends(require_action("delete_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Elimina un equipo del inventario (cascade a trazabilidad)."""
    # Buscar equipo verificando ownership por tenant (404, nunca 403 — no revelar existencia cross-tenant)
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    nombre_equipo = equipo.nombre
    imagen_url = equipo.imagen_url

    # Pre-flight: detectar relaciones bloqueantes ANTES de tocar la transacción.
    # `trazabilidad` es histórico (NOM-016) y NO se borra. Si existe, 409.
    # Preventivos/reservas activas: igual, mejor que el operador los cierre primero.
    from models.reserva import Reserva
    from models.alerta import Alerta
    bloqueantes = []
    n_traz = (await session.execute(
        sa.select(sa.func.count()).select_from(Trazabilidad).where(Trazabilidad.equipo_id == equipo_id)
    )).scalar() or 0
    if n_traz:
        bloqueantes.append(f"{n_traz} registro(s) de trazabilidad (NOM-016, no se eliminan)")
    n_prev = (await session.execute(
        sa.select(sa.func.count()).select_from(PreventivoProgramado).where(
            PreventivoProgramado.equipo_id == equipo_id, PreventivoProgramado.activo == True
        )
    )).scalar() or 0
    if n_prev:
        bloqueantes.append(f"{n_prev} preventivo(s) programado(s) activo(s)")
    n_res = (await session.execute(
        sa.select(sa.func.count()).select_from(Reserva).where(Reserva.equipo_id == equipo_id)
    )).scalar() or 0
    if n_res:
        bloqueantes.append(f"{n_res} reserva(s) registrada(s)")
    if bloqueantes:
        raise HTTPException(
            status_code=409,
            detail=("No se puede eliminar el equipo porque tiene relaciones activas: "
                    + "; ".join(bloqueantes)
                    + ". Considere cambiar el estado a 'baja' en lugar de eliminar."),
        )

    try:
        # Liberar referencias en órdenes para no romper FK (si no es ON DELETE CASCADE)
        stmt_cleanup = sa.update(OrdenServicio).where(OrdenServicio.equipo_id == equipo_id).values(equipo_id=None)
        await session.execute(stmt_cleanup)
        # Alertas referencian equipo con FK Optional (sin CASCADE) — nullificar.
        stmt_alert = sa.update(Alerta).where(Alerta.equipo_id == equipo_id).values(equipo_id=None)
        await session.execute(stmt_alert)

        await session.delete(equipo)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar el equipo: existe(n) referencia(s) que no permiten la baja física. ({e.orig.args[0] if hasattr(e, 'orig') else 'FK constraint'})",
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")

    # Auditoría NOM-016 — fuera del try/commit para no enmascarar el éxito
    try:
        await AuditService.log_event(
            usuario_id=user["id"],
            accion="DELETE_EQUIPO",
            entidad="equipos",
            entidad_id=equipo_id,
            datos={"nombre": nombre_equipo}
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Audit log falló para DELETE_EQUIPO %s", equipo_id)

    # Borrar imagen física si existía
    if imagen_url:
        try:
            ruta = imagen_url.lstrip("/")
            if os.path.isfile(ruta):
                os.remove(ruta)
        except Exception:
            pass

    return {"ok": True, "mensaje": f"Equipo '{nombre_equipo}' eliminado"}


@router.post("/{equipo_id}/imagen")
async def subir_imagen_equipo(
    equipo_id: int,
    file: UploadFile = File(...),
    user: dict = Depends(require_action("edit_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Sube una imagen PNG/JPG y la asocia al equipo."""
    extensiones_validas = {".png", ".jpg", ".jpeg", ".webp"}
    nombre_original = file.filename or "imagen.png"
    ext = os.path.splitext(nombre_original)[1].lower()

    if ext not in extensiones_validas:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no soportado. Usa: {', '.join(extensiones_validas)}",
        )

    contenido = await file.read()
    if len(contenido) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Archivo excede {MAX_UPLOAD_MB} MB")

    try:
        from PIL import Image as _PILImage
        _PILImage.open(io.BytesIO(contenido)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Archivo no es una imagen valida")

    # Guardar bajo static/uploads/equipos/
    carpeta = os.path.join("static", "uploads", "equipos")
    os.makedirs(carpeta, exist_ok=True)
    nombre_archivo = f"eq_{equipo_id}_{uuid.uuid4().hex[:8]}{ext}"
    ruta_disco = os.path.join(carpeta, nombre_archivo)

    with open(ruta_disco, "wb") as f:
        f.write(contenido)

    # URL servida vía /static
    url_publica = f"/static/uploads/equipos/{nombre_archivo}"

    # Buscar equipo verificando ownership por tenant
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        os.remove(ruta_disco)
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Borrar imagen anterior si existe
    if equipo.imagen_url:
        try:
            anterior = equipo.imagen_url.lstrip("/")
            if os.path.isfile(anterior):
                os.remove(anterior)
        except Exception:
            pass

    equipo.imagen_url = url_publica
    await session.commit()

    return {"ok": True, "imagen_url": url_publica}


@router.get("/{equipo_id}/historial")
async def historial_equipo(
    equipo_id: int,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Devuelve historial completo de órdenes y traslados para el panel de Ficha Técnica."""
    from models.orden_servicio import EVIDENCIA_OS

    # Verificar ownership antes de devolver historial
    stmt_owner = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    if not (await session.execute(stmt_owner)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    stmt_ordenes = (
        select(OrdenServicio)
        .where(OrdenServicio.equipo_id == equipo_id, OrdenServicio.tenant_id == tenant_id)
        .order_by(OrdenServicio.fecha.desc(), OrdenServicio.id.desc())
        .limit(50)
    )
    res_ordenes = await session.execute(stmt_ordenes)
    ordenes = res_ordenes.scalars().all()

    orden_ids = [o.id for o in ordenes]
    evidencias_map = {}
    if orden_ids:
        stmt_ev = select(EVIDENCIA_OS).where(EVIDENCIA_OS.orden_id.in_(orden_ids), EVIDENCIA_OS.tipo == 'documento')
        res_ev = await session.execute(stmt_ev)
        for ev in res_ev.scalars().all():
            evidencias_map[ev.orden_id] = ev.ruta_archivo

    ordenes_list = []
    for o in ordenes:
        od = o.model_dump()
        od["pdf_url"] = evidencias_map.get(o.id)
        ordenes_list.append(od)

    # Trazabilidad y PreventivoProgramado aún no tienen tenant_id en el modelo Python
    # (se añadirá en Fase 1 migration). El filtro por equipo_id es suficiente aquí
    # porque el ownership del equipo ya fue verificado arriba contra tenant_id.
    stmt_traslados = (
        select(Trazabilidad)
        .where(Trazabilidad.equipo_id == equipo_id)
        .order_by(Trazabilidad.fecha_movimiento.desc())
        .limit(50)
    )
    res_traslados = await session.execute(stmt_traslados)
    traslados = res_traslados.scalars().all()

    stmt_preventivos = (
        select(PreventivoProgramado)
        .where(PreventivoProgramado.equipo_id == equipo_id, PreventivoProgramado.activo == True)
        .order_by(PreventivoProgramado.proxima_ejecucion.asc())
    )
    res_preventivos = await session.execute(stmt_preventivos)
    preventivos = res_preventivos.scalars().all()

    return {
        "equipo_id": equipo_id,
        "ordenes": ordenes_list,
        "traslados": [t.model_dump() for t in traslados],
        "preventivos": [p.model_dump() for p in preventivos],
    }


@router.get("/exportar/csv")
async def exportar_equipos_csv(
    estado: Optional[str] = None,
    area: Optional[str] = None,
    piso: Optional[str] = None,
    buscar: Optional[str] = None,
    criticidad: Optional[str] = None,
    tipo_adquisicion: Optional[str] = None,
    tipo_equipo: Optional[str] = None,
    marca: Optional[str] = None,
    zona_id: Optional[int] = None,
    clase_cofepris: Optional[str] = None,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Exportar listado de equipos a CSV con los filtros aplicados."""
    query = select(Equipo)

    # Filtro de tenant SIEMPRE primero — nunca exportar datos cruzados.
    conditions = [Equipo.tenant_id == tenant_id]
    if estado:
        conditions.append(Equipo.estado == estado)
    if area:
        conditions.append(Equipo.area.contains(area))
    if piso:
        conditions.append(Equipo.piso == piso)
    if criticidad:
        conditions.append(Equipo.criticidad == criticidad)
    if tipo_adquisicion:
        conditions.append(Equipo.tipo_adquisicion == tipo_adquisicion)
    if tipo_equipo:
        conditions.append(Equipo.tipo_equipo == tipo_equipo)
    if marca:
        conditions.append(Equipo.marca.contains(marca))
    if zona_id is not None:
        conditions.append(Equipo.zona_id == zona_id)
    if clase_cofepris:
        conditions.append(Equipo.clase_cofepris == clase_cofepris)

    if buscar:
        buscar = buscar.strip()
        search_filter = sa.or_(
            Equipo.nombre.contains(buscar),
            Equipo.serie.contains(buscar),
            Equipo.inventario.contains(buscar),
            Equipo.marca.contains(buscar),
            Equipo.modelo.contains(buscar),
            Equipo.qr_token.contains(buscar),
            Equipo.id.cast(sa.String).contains(buscar)
        )
        conditions.append(search_filter)

    query = query.where(sa.and_(*conditions))
    query = query.order_by(Equipo.nombre)
    res = await session.execute(query)
    equipos = res.scalars().all()

    async def iter_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'nombre', 'marca', 'modelo', 'serie', 'area', 'piso', 'ubicacion', 'estado', 'riesgo', 'proxima_calibracion'])
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)
        
        chunk_size = 100
        for i in range(0, len(equipos), chunk_size):
            for eq in equipos[i:i+chunk_size]:
                calibracion = eq.proxima_calibracion.strftime("%Y-%m-%d") if hasattr(eq, 'proxima_calibracion') and eq.proxima_calibracion else ''
                writer.writerow([
                    eq.id, 
                    eq.nombre or '', 
                    eq.marca or '', 
                    eq.modelo or '', 
                    eq.serie or '', 
                    eq.area or '', 
                    eq.piso or '', 
                    eq.ubicacion or '', 
                    eq.estado or '', 
                    eq.riesgo or '', 
                    calibracion
                ])
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)

    fecha_str = datetime.now().strftime("%Y%m%d")
    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inventario_sigah_{fecha_str}.csv"}
    )


@router.get("/")
async def listar_equipos(
    estado: Optional[str] = None,
    area: Optional[str] = None,
    piso: Optional[str] = None,
    buscar: Optional[str] = None,
    criticidad: Optional[str] = None,
    tipo_equipo: Optional[str] = None,
    marca: Optional[str] = None,
    zona_id: Optional[int] = None,
    clase_cofepris: Optional[str] = None,
    orden: Optional[str] = "nombre",
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    query = select(Equipo)
    count_query = select(func.count()).select_from(Equipo)

    # Filtro de tenant SIEMPRE primero — base inamovible de todo listado.
    conditions = [Equipo.tenant_id == tenant_id]
    if estado:
        conditions.append(Equipo.estado == estado)
    if area:
        conditions.append(Equipo.area.contains(area))
    if piso:
        conditions.append(Equipo.piso == piso)
    if criticidad:
        conditions.append(Equipo.criticidad == criticidad)
    if tipo_equipo:
        conditions.append(Equipo.tipo_equipo == tipo_equipo)
    if marca:
        conditions.append(Equipo.marca.contains(marca))
    if zona_id:
        conditions.append(Equipo.zona_id == zona_id)
    if clase_cofepris:
        conditions.append(Equipo.clase_cofepris == clase_cofepris)
    if buscar:
        conditions.append(
            sa.or_(
                Equipo.nombre.contains(buscar),
                Equipo.serie.contains(buscar),
                Equipo.marca.contains(buscar),
                Equipo.modelo.contains(buscar),
                Equipo.inventario.contains(buscar),
                Equipo.ubicacion.contains(buscar),
            )
        )

    for cond in conditions:
        query = query.where(cond)
        count_query = count_query.where(cond)

    # Ordenamiento
    order_map = {
        "nombre": Equipo.nombre.asc(),
        "nombre_desc": Equipo.nombre.desc(),
        "marca": Equipo.marca.asc(),
        "estado": sa.case(
            (Equipo.estado == 'fuera_servicio', 1),
            (Equipo.estado == 'en_mantenimiento', 2),
            (Equipo.estado == 'en_traslado', 3),
            (Equipo.estado == 'operativo', 4),
            else_=5
        ),
        "criticidad": sa.case(
            (Equipo.criticidad == 'alta', 1),
            (Equipo.criticidad == 'media', 2),
            (Equipo.criticidad == 'baja', 3),
            else_=4
        ),
        "serie": Equipo.serie.asc(),
        "area": Equipo.area.asc(),
        "reciente": Equipo.created_at.desc(),
    }
    query = query.order_by(order_map.get(orden, Equipo.nombre.asc()))
    query = query.limit(limit).offset(offset)
    
    res = await session.execute(query)
    equipos = res.scalars().all()

    # Total count con los mismos filtros
    total = (await session.execute(count_query)).scalar()

    # Catálogos únicos para filtros del frontend — siempre restringidos al tenant.
    stmt_marcas = (
        select(Equipo.marca)
        .where(Equipo.tenant_id == tenant_id)
        .distinct()
        .order_by(Equipo.marca)
    )
    marcas_disponibles = (await session.execute(stmt_marcas)).scalars().all()

    stmt_tipos = (
        select(Equipo.tipo_equipo)
        .where(Equipo.tenant_id == tenant_id)
        .distinct()
        .order_by(Equipo.tipo_equipo)
    )
    tipos_disponibles = (await session.execute(stmt_tipos)).scalars().all()

    # Convert to dict and filter confidential
    equipos_list = [e.model_dump() for e in equipos]
    if not can(user, "view_confidential"):
        equipos_list = [filter_equipo_publico(e) for e in equipos_list]

    # Inyectar conteo de tickets abiertos (órdenes abiertas/en_progreso) por equipo.
    # Doble filtro: equipo_ids (ya del tenant) + tenant_id explícito en ordenes (defensa en profundidad).
    if equipos_list:
        equipo_ids = [e["id"] for e in equipos_list]
        stmt_tickets = (
            select(OrdenServicio.equipo_id, func.count(OrdenServicio.id).label("cnt"))
            .where(
                OrdenServicio.tenant_id == tenant_id,
                OrdenServicio.equipo_id.in_(equipo_ids),
                OrdenServicio.estado.in_(["abierta", "en_progreso"]),
            )
            .group_by(OrdenServicio.equipo_id)
        )
        res_tickets = await session.execute(stmt_tickets)
        tickets_map = {r[0]: r[1] for r in res_tickets.all()}
        for eq in equipos_list:
            eq["tickets_abiertos"] = tickets_map.get(eq["id"], 0)

    return {
        "equipos": equipos_list,
        "total": total,
        "limit": limit,
        "offset": offset,
        "catalogos": {
            "marcas": marcas_disponibles,
            "tipos": tipos_disponibles,
        }
    }


@router.get("/{equipo_id}")
async def obtener_equipo(
    equipo_id: int,
    user: Optional[dict] = Depends(get_current_user_optional),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Buscar equipo filtrando por tenant_id — 404 si no pertenece a este hospital.
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()

    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    equipo_dict = equipo.model_dump()
    if can(user, "view_confidential"):
        stmt_ordenes = (
            select(OrdenServicio)
            .where(OrdenServicio.equipo_id == equipo_id, OrdenServicio.tenant_id == tenant_id)
            .order_by(OrdenServicio.fecha.desc())
            .limit(10)
        )
        res_ordenes = await session.execute(stmt_ordenes)
        ordenes = res_ordenes.scalars().all()

        # Trazabilidad filtrada por equipo_id (ownership ya verificado arriba).
        stmt_traslados = (
            select(Trazabilidad)
            .where(Trazabilidad.equipo_id == equipo_id)
            .order_by(Trazabilidad.fecha_movimiento.desc())
            .limit(5)
        )
        res_traslados = await session.execute(stmt_traslados)
        traslados = res_traslados.scalars().all()
    else:
        equipo_dict = filter_equipo_publico(equipo_dict)
        ordenes = []
        traslados = []

    return {
        "equipo": equipo_dict,
        "ordenes": [o.model_dump() for o in ordenes],
        "traslados": [t.model_dump() for t in traslados]
    }


@router.patch("/{equipo_id}/posicion")
async def actualizar_posicion(
    equipo_id: int,
    body: dict,
    user: dict = Depends(require_action("edit_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Guarda nueva posición X/Y después de drag & drop en el mapa."""
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    equipo.pos_x = float(body.get("pos_x", 50))
    equipo.pos_y = float(body.get("pos_y", 50))
    equipo.zona_id = body.get("zona_id")

    await session.commit()
    return {"ok": True}

from models.modulos_extra import PokaYokeLog

@router.put("/{equipo_id}")
async def actualizar_equipo(
    equipo_id: int,
    data: dict,
    user: dict = Depends(require_action("edit_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Actualiza campos del equipo. Los campos permitidos dependen del rol."""
    import logging
    logger = logging.getLogger(__name__)

    # Verificar ownership por tenant antes de modificar.
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Defensivo: nunca permitir que el cliente mueva el equipo a otro tenant.
    data.pop("tenant_id", None)
    # Limpiar campos de solo-lectura que el frontend puede enviar por accidente.
    for readonly_key in ("id", "created_at", "updated_at", "qr_token", "qr_code_path"):
        data.pop(readonly_key, None)

    campos_permitidos = allowed_update_fields(user)
    updates = {k: v for k, v in data.items() if k in campos_permitidos}

    # ── Null-guard para columnas NOT NULL en la BD ─────────────────────
    # Si el frontend manda null para un campo NOT NULL, eliminamos la
    # clave para que se conserve el valor existente en lugar de crashear.
    NOT_NULL_COLUMNS = {"nombre", "serie", "marca", "modelo", "estado",
                        "criticidad", "tipo_equipo", "clase_cofepris"}
    for col in NOT_NULL_COLUMNS:
        if col in updates and updates[col] is None:
            del updates[col]

    # ── Coerción zona_id: string vacía → None (FK nullable) ───────────
    if "zona_id" in updates:
        val = updates["zona_id"]
        if val in (None, "", "null"):
            updates["zona_id"] = None
        else:
            try:
                updates["zona_id"] = int(val)
            except (ValueError, TypeError):
                del updates["zona_id"]

    # ── BUGFIX UBICACION (NOT NULL) ────────────────────────────────────
    if "ubicacion" in updates and updates["ubicacion"] in (None, ""):
        area_in = updates.get("area", equipo.area)
        piso_in = updates.get("piso", equipo.piso)
        partes = [p for p in (area_in, piso_in) if p]
        if partes:
            updates["ubicacion"] = " · ".join(partes)
        else:
            del updates["ubicacion"]

    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar con tu rol")

    for k, v in updates.items():
        setattr(equipo, k, v)

    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        msg = e.orig.args[1] if (hasattr(e, "orig") and len(getattr(e.orig, "args", [])) > 1) else str(e)
        raise HTTPException(status_code=400, detail=f"Datos inválidos para actualizar el equipo: {msg}")
    except Exception as e:
        await session.rollback()
        logger.exception("Error al actualizar equipo %s", equipo_id)
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {str(e)}")

    # Auditoría NOM-016 — fuera del try/commit para no enmascarar el éxito
    # del UPDATE con un posible fallo del log de auditoría.
    try:
        await AuditService.log_event(
            usuario_id=user["id"],
            accion="UPDATE_EQUIPO",
            entidad="equipos",
            entidad_id=equipo_id,
            datos=updates,
        )
    except Exception as audit_err:
        logger.warning("Audit log falló para UPDATE_EQUIPO %s: %s", equipo_id, audit_err)

    return {"ok": True, "mensaje": f"Equipo {equipo_id} actualizado"}


@router.get("/{equipo_id}/qr/info")
async def obtener_info_qr(
    equipo_id: int,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Devuelve el token y la URL canónica embebida en el QR del equipo.
    Usado por el frontend para mostrar exactamente la misma URL que se codifica
    en el PNG, sin divergencias basadas en window.location.origin."""
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Lazy-create token si el equipo antiguo no lo tiene
    token = equipo.qr_token
    if not token:
        token = secrets.token_urlsafe(12)[:16]
        equipo.qr_token = token
        await session.commit()

    url = f"{PUBLIC_BASE_URL}/equipo/{token}"
    return {
        "equipo_id": equipo.id,
        "qr_token": token,
        "url": url,
        "public_base_url": PUBLIC_BASE_URL,
    }


@router.get("/{equipo_id}/qr")
async def generar_qr(
    equipo_id: int,
    user: dict = Depends(require_action("regenerar_qr")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera un QR PNG para el equipo con token opaco."""
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    token = equipo.qr_token
    if not token:
        token = secrets.token_urlsafe(12)[:16]
        equipo.qr_token = token
        await session.commit()

    url = f"{PUBLIC_BASE_URL}/equipo/{token}"
    png_bytes = generate_qr_png(url)

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=qr_equipo_{equipo_id}.png"},
    )


@router.get("/{equipo_id}/qr/label")
async def generar_etiqueta_qr(
    equipo_id: int,
    user: dict = Depends(require_action("regenerar_qr")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera una etiqueta A6 imprimible (PDF) con QR + datos del equipo."""
    stmt_eq = select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
    equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    token = equipo.qr_token
    if not token:
        token = secrets.token_urlsafe(12)[:16]
        equipo.qr_token = token
        await session.commit()

    url = f"{PUBLIC_BASE_URL}/equipo/{token}"
    pdf_bytes = generate_qr_label_a6_pdf(equipo.model_dump(), url)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=etiqueta_equipo_{equipo_id}.pdf"},
    )


@router.post("/validar")
async def validar_poka_yoke(
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Implementa Triple Validación (Poka-Yoke): QR + Inventario + Serie."""
    qr_token = data.get("qr_token")
    inventario = (data.get("inventario") or "").strip()
    serie = (data.get("serie") or "").strip()

    if not qr_token or not inventario or not serie:
        raise HTTPException(status_code=400, detail="Faltan datos para la triple validación")

    # Buscar equipo por QR y verificar que pertenece al tenant actual.
    # El qr_token es globalmente único; el filtro por tenant_id es defensa adicional
    # para evitar que un técnico de Hospital A valide equipos de Hospital B.
    stmt = select(Equipo).where(Equipo.qr_token == qr_token, Equipo.tenant_id == tenant_id)
    res = await session.execute(stmt)
    equipo = res.scalar_one_or_none()

    es_valido = False
    match_inventario = False
    match_serie = False
    error_msg = ""

    if equipo:
        match_inventario = (equipo.inventario == inventario)
        match_serie = (equipo.serie == serie)
        es_valido = match_inventario and match_serie

        if not es_valido:
            error_msg = f"Inconsistencia: Inventario={match_inventario}, Serie={match_serie}"
    else:
        error_msg = "Token QR no reconocido"

    # Registrar el intento (Log Poka-Yoke)
    log = PokaYokeLog(
        equipo_id=equipo.id if equipo else None,
        tecnico_id=user["id"],
        qr_escaneado=qr_token,
        inventario_leido=inventario,
        serie_leida=serie,
        es_valido=es_valido,
        error_detalle=error_msg
    )
    session.add(log)
    await session.commit()

    return {
        "ok": es_valido,
        "equipo": equipo.model_dump() if (es_valido and equipo) else None,
        "detail": error_msg if not es_valido else "Validación triple exitosa",
        "matches": {
            "inventario": match_inventario,
            "serie": match_serie
        }
    }

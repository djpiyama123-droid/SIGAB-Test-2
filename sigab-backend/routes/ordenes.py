"""
routes/ordenes.py — Endpoints para gestión de Órdenes de Servicio (OS).

Operaciones:
  GET    /ordenes/                  — Listado con filtros (estado, tipo, equipo, fechas)
  GET    /ordenes/{id}              — Detalle con materiales y evidencias
  POST   /ordenes/                  — Crear OS con folio auto-generado (OS-YYYYMMDD-XXXX)
  PUT    /ordenes/{id}/cerrar       — Cerrar orden
  PUT    /ordenes/{id}/estado       — Transición de estado (abierta → en_progreso → cerrada)
  PUT    /ordenes/{id}/finalizar    — Cierre con condiciones finales y conformidad
  POST   /ordenes/{id}/evidencia    — Subir evidencia fotográfica (antes/después)
  POST   /ordenes/ocr-scan          — Escanear formato físico con IA (Gemini Vision)
  GET    /ordenes/{id}/pdf          — Descargar PDF de la OS

Formatos soportados: correctivo_corto, correctivo_largo, orden_entrega, reporte_externo
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import Optional
import asyncio
import aiomysql
import os
import secrets
from datetime import datetime, date
import sqlalchemy as sa
from config import get_db, UPLOAD_DIR
from auth.dependencies import get_current_user, require_action
from auth.tenancy import get_current_tenant
from services.pdf_service import generar_pdf_orden, generar_pdf_orden_v2_poka_yoke
from services.cache_service import cache_service
try:
    from services.ocr_service import parsear_reporte_ocr
except ImportError:
    def parsear_reporte_ocr(_b):  # type: ignore
        raise HTTPException(status_code=503, detail="OCR deshabilitado en esta instancia")

try:
    from services.imss_os_extractor import extract_imss_os, map_to_orden_servicio
    _IMSS_EXTRACTOR_AVAILABLE = True
except Exception as _e:  # pragma: no cover
    _IMSS_EXTRACTOR_AVAILABLE = False
    async def extract_imss_os(_b):  # type: ignore
        raise HTTPException(status_code=503, detail="Extractor IMSS no disponible")
    def map_to_orden_servicio(_e):  # type: ignore
        return {}

router = APIRouter()


from sqlmodel import select, or_, func
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_async_session
from models.orden_servicio import OrdenServicio, MATERIAL_OS, EVIDENCIA_OS
from models.equipo import Equipo

@router.get("/")
async def listar_ordenes(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    equipo_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Filtro de tenant SIEMPRE en OrdenServicio y en el JOIN de Equipo — defensa en profundidad.
    query = (
        select(OrdenServicio, Equipo.nombre.label("equipo_nombre_rel"))
        .outerjoin(Equipo, (OrdenServicio.equipo_id == Equipo.id) & (Equipo.tenant_id == tenant_id))
        .where(OrdenServicio.tenant_id == tenant_id)
    )

    if estado:
        query = query.where(OrdenServicio.estado == estado)
    if tipo:
        query = query.where(OrdenServicio.tipo_mantenimiento == tipo)
    if equipo_id:
        query = query.where(OrdenServicio.equipo_id == equipo_id)
    if fecha_desde:
        query = query.where(OrdenServicio.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(OrdenServicio.fecha <= fecha_hasta)

    query = query.order_by(OrdenServicio.created_at.desc()).limit(limit).offset(offset)
    
    result = await session.execute(query)
    rows = result.all()
    
    ordenes_list = []
    for orden, eq_nombre in rows:
        d = orden.model_dump()
        d["equipo_nombre_rel"] = eq_nombre
        ordenes_list.append(d)

    return {"ordenes": ordenes_list, "total": len(ordenes_list)}


@router.get("/archivos-historicos")
async def listar_archivos_historicos(
    buscar: Optional[str] = None,
    page: int = 1,
    limit: int = 30,
    user: dict = Depends(get_current_user),
):
    """Lista los PDFs del directorio ORDENESIMSS (858 órdenes físicas escaneadas)."""
    folder = os.path.join(os.path.dirname(UPLOAD_DIR), "uploads", "ORDENESIMSS")
    if not os.path.isdir(folder):
        folder = os.path.join(UPLOAD_DIR, "ORDENESIMSS")
    if not os.path.isdir(folder):
        return {"archivos": [], "total": 0, "pagina": page, "limite": limit}

    archivos = sorted(
        [f for f in os.listdir(folder) if f.lower().endswith(".pdf")],
        reverse=True,
    )

    if buscar:
        q = buscar.lower()
        archivos = [f for f in archivos if q in f.lower()]

    total = len(archivos)
    offset = (page - 1) * limit
    page_files = archivos[offset : offset + limit]

    result = []
    for nombre in page_files:
        stem = nombre[:-4]
        parts = stem.split("_")
        result.append({
            "nombre": nombre,
            "url": f"/static/uploads/ORDENESIMSS/{nombre}",
            "folio": parts[0] if parts else stem,
            "tipo": parts[1] if len(parts) > 1 else "—",
            "anio": parts[2] if len(parts) > 2 else "—",
            "serie": "_".join(parts[3:]) if len(parts) > 3 else "—",
        })

    return {"archivos": result, "total": total, "pagina": page, "limite": limit}


@router.get("/{orden_id}")
async def obtener_orden(
    orden_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Verificar ownership por tenant — 404 si la orden no pertenece a este hospital.
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    stmt_mat = select(MATERIAL_OS).where(MATERIAL_OS.orden_id == orden_id)
    res_mat = await session.execute(stmt_mat)
    materiales = res_mat.scalars().all()

    stmt_ev = select(EVIDENCIA_OS).where(EVIDENCIA_OS.orden_id == orden_id)
    res_ev = await session.execute(stmt_ev)
    evidencias = res_ev.scalars().all()

    return {"orden": orden, "materiales": materiales, "evidencias": evidencias}


@router.post("/")
async def crear_orden(
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Generar número de orden: OS-YYYYMMDD-XXXX (contador por año, dentro del tenant).
    hoy = date.today()
    stmt_count = select(func.count()).select_from(OrdenServicio).where(
        OrdenServicio.tenant_id == tenant_id,
        sa.extract('year', OrdenServicio.fecha) == hoy.year,
    )
    res_count = await session.execute(stmt_count)
    n = res_count.scalar() + 1
    numero = f"OS-{hoy.strftime('%Y%m%d')}-{n:04d}"

    # Defensivo: ignorar tenant_id que pueda venir del cliente.
    data.pop("tenant_id", None)

    # Crear objeto Orden
    # Quitamos materiales de la data para no fallar en el constructor si no están en el modelo
    materiales_data = data.pop("materiales", [])

    orden = OrdenServicio(**data, tenant_id=tenant_id)
    orden.numero_orden = numero
    orden.fecha = hoy
    
    session.add(orden)
    await session.commit()
    await session.refresh(orden)

    # Agregar materiales
    for mat in materiales_data:
        desc = mat.get("descripcion", mat if isinstance(mat, str) else "")
        cant = mat.get("cantidad", 1) if isinstance(mat, dict) else 1
        nuevo_mat = MATERIAL_OS(orden_id=orden.id, descripcion=desc, cantidad=cant)
        session.add(nuevo_mat)
    
    await session.commit()
    cache_service.invalidate_prefix(f"dashboard_resumen_{tenant_id}")
    cache_service.invalidate_prefix(f"dashboard_mapa_{tenant_id}")

    return {"ok": True, "numero_orden": numero, "orden_id": orden.id}


@router.put("/{orden_id}/cerrar")
async def cerrar_orden(
    orden_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden.estado = 'cerrada'
    orden.closed_at = datetime.utcnow()
    await session.commit()
    return {"ok": True, "mensaje": f"Orden {orden_id} cerrada"}


@router.put("/{orden_id}/estado")
async def cambiar_estado_orden(
    orden_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    estado = data.get("estado")
    if estado not in ("abierta", "en_progreso", "cerrada", "cancelada"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden.estado = estado
    if estado == "cerrada":
        orden.closed_at = datetime.utcnow()
    
    await session.commit()
    return {"ok": True}


@router.post("/{orden_id}/evidencia")
async def subir_evidencia(
    orden_id: int,
    tipo: str,
    descripcion: str = "",
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Sube una foto (antes, despues, etc) como evidencia de la orden."""
    # Verificar ownership por tenant antes de aceptar el archivo.
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    if not (await session.execute(stmt_ord)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    ext = file.filename.split(".")[-1].lower()
    extensiones_validas = {"png", "jpg", "jpeg", "webp", "pdf"}
    if ext not in extensiones_validas:
        raise HTTPException(status_code=400, detail=f"Extensión no permitida: {ext}")

    filename = f"os_{orden_id}_{secrets.token_hex(6)}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(await file.read())

    file_url = f"/static/uploads/{filename}"

    nueva_evidencia = EVIDENCIA_OS(
        orden_id=orden_id,
        ruta_archivo=file_url,
        tipo=tipo,
        descripcion=descripcion
    )
    session.add(nueva_evidencia)
    await session.commit()
    await session.refresh(nueva_evidencia)

    return {"ok": True, "id": nueva_evidencia.id, "url": file_url}


@router.put("/{orden_id}/finalizar")
async def finalizar_orden(
    orden_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Cierra la orden añadiendo condiciones finales, reporte y conformidad."""
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden.condiciones_encontradas = data.get("condiciones_encontradas")
    orden.condicion_final = data.get("condicion_final")
    orden.observaciones = data.get("observaciones")
    # v.3.2.0 (porteo formato IMSS oficial, 2026-07-08): recibe_conformidad_nombre
    # y recibe_matricula ya son columnas reales del modelo — se acepta también
    # la llave legada "recibe_conformidad_matricula" por compatibilidad con
    # formularios que aún no migraron al nombre corto.
    if data.get("recibe_conformidad_nombre") is not None:
        orden.recibe_conformidad_nombre = data.get("recibe_conformidad_nombre")
    if data.get("recibe_matricula") is not None or data.get("recibe_conformidad_matricula") is not None:
        orden.recibe_matricula = data.get("recibe_matricula") or data.get("recibe_conformidad_matricula")

    orden.estado = 'cerrada'
    orden.closed_at = datetime.utcnow()
    
    await session.commit()
    return {"ok": True, "mensaje": "Orden finalizada y cerrada con éxito."}


@router.post("/ocr-scan")
async def escanear_reporte_físico(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """(Opción J) Escanea una hoja física usando IA (Tesseract OCR local) y extrae folio, costo, técnico."""
    try:
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["png", "jpg", "jpeg", "webp"]:
            raise HTTPException(status_code=400, detail="El motor OCR solo soporta imágenes (PNG/JPG)")

        b = await file.read()
        resultado = parsear_reporte_ocr(b)

        if "error" in resultado:
            return {"ok": False, "mensaje": resultado["error"]}

        return {"ok": True, "datos": resultado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-imss")
async def escanear_os_imss(
    file: UploadFile = File(...),
    auto_create: bool = False,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Escanea una hoja física en formato SIGAH-IMSS-OS-V3 usando Gemma 3:4b
    (local) con fallback a Gemini 1.5 Flash. Extrae los campos y opcionalmente
    crea la Orden de Servicio en estado 'pendiente_validacion'.

    auto_create=false → solo retorna campos extraídos para revisión humana.
    auto_create=true  → crea la OS y guarda la imagen como evidencia.
    """
    if not _IMSS_EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor IMSS no disponible en esta instancia")

    ext = (file.filename or "img").split(".")[-1].lower()
    if ext not in ["png", "jpg", "jpeg", "webp"]:
        raise HTTPException(status_code=400, detail="Sólo PNG/JPG/WEBP")

    img_bytes = await file.read()
    if len(img_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen excede 15 MB")

    # Cargar catálogo de series del tenant para fuzzy match (corrección de caracteres OCR).
    series_catalogo: list[str] = []
    try:
        series_q = await session.execute(
            select(Equipo.serie).where(Equipo.tenant_id == tenant_id, Equipo.serie.isnot(None))
        )
        series_catalogo = [s for s in series_q.scalars().all() if s]
    except Exception:
        pass

    extracted = await extract_imss_os(img_bytes, series_catalogo=series_catalogo)

    if extracted.get("error") == "no_es_formato_imss":
        raise HTTPException(
            status_code=422,
            detail="La imagen no es un formato OS IMSS válido (cabecera no coincide)",
        )
    if extracted.get("error") == "extraction_failed":
        return {"ok": False, "campos_identificados": None, "detalle": extracted}

    if not auto_create:
        return {"ok": True, "campos_identificados": extracted}

    # ── Crear OS en estado 'pendiente_validacion' ──────────────────
    mapped = map_to_orden_servicio(extracted)

    # Folio: usar el extraído si parece válido (OS-YYYYMMDD-XXXX), si no auto-generar.
    # Contador de folios es por año, dentro del tenant.
    numero = mapped.get("numero_orden")
    if not numero or not (isinstance(numero, str) and numero.startswith("OS-") and len(numero) >= 12):
        hoy = date.today()
        stmt_count = select(func.count()).select_from(OrdenServicio).where(
            OrdenServicio.tenant_id == tenant_id,
            sa.extract('year', OrdenServicio.fecha) == hoy.year,
        )
        n = (await session.execute(stmt_count)).scalar() + 1
        numero = f"OS-{hoy.strftime('%Y%m%d')}-{n:04d}"
    mapped["numero_orden"] = numero

    # Defensivo: ignorar tenant_id del payload extraído.
    mapped.pop("tenant_id", None)

    # Convertir tiempo_real_min → tiempo_real_hrs (Decimal)
    if "tiempo_real_min" in mapped:
        try:
            from decimal import Decimal as _D
            mapped["tiempo_real_hrs"] = _D(mapped.pop("tiempo_real_min")) / _D(60)
        except Exception:
            mapped.pop("tiempo_real_min", None)

    # Hora_inicio / hora_termino → time
    from datetime import time as _t
    for k in ("hora_inicio", "hora_termino"):
        if k in mapped and isinstance(mapped[k], str) and ":" in mapped[k]:
            try:
                hh, mm = mapped[k].split(":")[:2]
                mapped[k] = _t(int(hh), int(mm))
            except Exception:
                mapped.pop(k, None)

    # fecha → date
    if "fecha" in mapped and isinstance(mapped["fecha"], str):
        try:
            mapped["fecha"] = datetime.strptime(mapped["fecha"], "%Y-%m-%d").date()
        except Exception:
            mapped["fecha"] = date.today()
    else:
        mapped["fecha"] = date.today()

    mapped["estado"] = "pendiente_validacion"
    mapped["origen"] = "scan_imss"

    # Resolver equipo_id a partir de equipo_serie — filtrado por tenant para no cruzar hospitales.
    if mapped.get("equipo_serie"):
        eq_stmt = select(Equipo.id).where(
            Equipo.serie == mapped["equipo_serie"], Equipo.tenant_id == tenant_id
        )
        eq_id = (await session.execute(eq_stmt)).scalar_one_or_none()
        if eq_id:
            mapped["equipo_id"] = eq_id

    orden = OrdenServicio(**mapped, tenant_id=tenant_id)
    session.add(orden)
    await session.commit()
    await session.refresh(orden)

    # Guardar refacciones extraídas
    for ref in (extracted.get("refacciones") or []):
        try:
            desc = ref.get("descripcion") or ""
            cant = int(ref.get("cantidad") or 1)
            if desc:
                session.add(MATERIAL_OS(orden_id=orden.id, descripcion=desc, cantidad=cant))
        except Exception:
            continue
    await session.commit()

    # Guardar imagen original como evidencia
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        fname = f"scan_imss_{orden.id}_{secrets.token_hex(4)}.{ext}"
        fpath = os.path.join(UPLOAD_DIR, fname)
        with open(fpath, "wb") as f:
            f.write(img_bytes)
        ev = EVIDENCIA_OS(
            orden_id=orden.id,
            ruta_archivo=f"/static/uploads/{fname}",
            tipo="documento",
            descripcion=f"Escaneo IMSS v3 (engine={extracted.get('engine')}, conf={extracted.get('confianza_global')})",
        )
        session.add(ev)
        await session.commit()
    except Exception as e:
        # No abortar si falla guardar evidencia
        pass

    return {
        "ok": True,
        "orden_id": orden.id,
        "numero_orden": orden.numero_orden,
        "estado": orden.estado,
        "campos_identificados": extracted,
    }


@router.get("/{orden_id}/pdf")
async def descargar_pdf_orden(
    orden_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera y descarga el PDF de la Orden de Servicio."""
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    stmt_mat = select(MATERIAL_OS).where(MATERIAL_OS.orden_id == orden_id)
    res_mat = await session.execute(stmt_mat)
    materiales = res_mat.scalars().all()

    stmt_ev = select(EVIDENCIA_OS).where(EVIDENCIA_OS.orden_id == orden_id)
    res_ev = await session.execute(stmt_ev)
    evidencias = res_ev.scalars().all()

    # ── Datos extra para que el PDF llene la mitad inferior ────────
    # (a) Tipo de equipo desde la tabla equipos — filtrado por tenant.
    tipo_equipo = None
    if orden.equipo_id:
        eq_row = await session.execute(
            select(Equipo.tipo_equipo).where(
                Equipo.id == orden.equipo_id, Equipo.tenant_id == tenant_id
            )
        )
        tipo_equipo = eq_row.scalar_one_or_none()

    # (b) Historial breve: últimas 5 OS del mismo equipo, dentro del tenant.
    historial_breve = []
    if orden.equipo_id:
        stmt_hist = (
            select(OrdenServicio)
            .where(
                OrdenServicio.tenant_id == tenant_id,
                OrdenServicio.equipo_id == orden.equipo_id,
                OrdenServicio.id != orden_id,
            )
            .order_by(OrdenServicio.fecha.desc())
            .limit(5)
        )
        res_hist = await session.execute(stmt_hist)
        historial_breve = [h.model_dump() for h in res_hist.scalars().all()]

    # (c) Próximo preventivo programado (si la tabla existe).
    # El equipo_id ya está verificado en el tenant actual — la query no cruza tenants.
    proximo_preventivo = None
    if orden.equipo_id:
        try:
            from sqlalchemy import text as sa_text
            r = await session.execute(
                sa_text(
                    "SELECT tipo_preventivo, proxima_ejecucion FROM preventivos_programados "
                    "WHERE equipo_id = :eq AND tenant_id = :tid AND activo = 1 "
                    "ORDER BY proxima_ejecucion ASC LIMIT 1"
                ),
                {"eq": orden.equipo_id, "tid": tenant_id},
            )
            row = r.mappings().first()
            if row:
                proximo_preventivo = dict(row)
        except Exception:
            pass

    # Convertir a dict para el service (que espera dicts)
    orden_dict = orden.model_dump()
    if tipo_equipo:
        orden_dict["tipo_equipo"] = tipo_equipo
    materiales_dict = [m.model_dump() for m in materiales]
    evidencias_dict = [e.model_dump() for e in evidencias]

    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(
        None,
        lambda: generar_pdf_orden(
            orden_dict,
            materiales_dict,
            evidencias_dict,
            historial_breve=historial_breve,
            proximo_preventivo=proximo_preventivo,
        ),
    )

    numero = orden.numero_orden or str(orden_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=OS_{numero}.pdf"}
    )


@router.get("/{orden_id}/pdf-fisico")
async def descargar_pdf_fisico_poka_yoke(
    orden_id: int,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera el PDF de la OS en formato físico Poka-Yoke v2.0 imprimible.

    A diferencia del PDF post-cierre tradicional, este formato:
    - Marca campos obligatorios con asterisco rojo y caja amarilla en la serie.
    - Pre-imprime checkboxes para tipo de mantenimiento, prioridad y condición final.
    - Reserva una zona QR de 35mm cuadrados para pegar la etiqueta del equipo.
    - Incluye bloque rojo "Validación Poka-Yoke" con 5 verificaciones obligatorias.

    Es útil tanto para imprimir en blanco (técnico llena a mano en campo) como
    para regenerar con datos finales pre-rellenados sobre el formato.
    """
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Datos del equipo — filtrado por tenant para no exponer datos cruzados.
    equipo_dict = {}
    if orden.equipo_id:
        stmt_eq = select(Equipo).where(
            Equipo.id == orden.equipo_id, Equipo.tenant_id == tenant_id
        )
        equipo = (await session.execute(stmt_eq)).scalar_one_or_none()
        if equipo:
            equipo_dict = equipo.model_dump()

    # Materiales asociados
    stmt_mat = select(MATERIAL_OS).where(MATERIAL_OS.orden_id == orden_id)
    res_mat = await session.execute(stmt_mat)
    materiales = res_mat.scalars().all()
    materiales_dict = [m.model_dump() for m in materiales]

    orden_dict = orden.model_dump()

    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(
        None,
        lambda: generar_pdf_orden_v2_poka_yoke(orden_dict, equipo_dict, materiales_dict),
    )

    numero = orden.numero_orden or str(orden_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=OS-Fisica_{numero}.pdf"}
    )


@router.put("/{orden_id}")
async def actualizar_orden(
    orden_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Actualiza campos específicos de una Orden de Servicio de manera genérica (para edición inline)."""
    stmt_ord = select(OrdenServicio).where(
        OrdenServicio.id == orden_id, OrdenServicio.tenant_id == tenant_id
    )
    orden = (await session.execute(stmt_ord)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    campos_permitidos = {
        "equipo_nombre", "equipo_marca", "equipo_modelo", "equipo_serie",
        "ubicacion_fisica", "piso", "area", "localizacion_completa",
        "falla_reportada", "descripcion_servicio", "condiciones_encontradas",
        "condicion_final", "observaciones", "recomendaciones",
        "tecnico_nombre", "empresa_externa", "folio_externo", "no_contrato",
        "reporta_nombre", "estado", "prioridad",
        "horas_uso_acumuladas", "antiguedad_equipo", "indice_salud", "probabilidad_falla",
        "ventana_recomendada", "confianza_modelo", "componente_riesgo", "indicadores_monitoreados",
        "validacion_ia", "justificacion_validacion",
        # v.3.2.0 — porteo formato IMSS oficial (2026-07-08)
        "tiempo_estimado_hrs", "tiempo_real_hrs",
        "recibe_conformidad_nombre", "recibe_matricula",
    }

    for k, v in data.items():
        if k in campos_permitidos:
            setattr(orden, k, v)
            
    # Parsear horas
    from datetime import time as _t
    for k in ("hora_inicio", "hora_termino"):
        if k in data and isinstance(data[k], str) and ":" in data[k]:
            try:
                hh, mm = data[k].split(":")[:2]
                setattr(orden, k, _t(int(hh), int(mm)))
            except Exception:
                pass

    # Parsear fecha
    if "fecha" in data and isinstance(data["fecha"], str):
        try:
            orden.fecha = datetime.strptime(data["fecha"], "%Y-%m-%d").date()
        except Exception:
            pass

    session.add(orden)
    await session.commit()
    
    # Actualizar materiales/refacciones si se especifican
    if "materiales" in data:
        # Eliminar materiales anteriores
        stmt_del = sa.delete(MATERIAL_OS).where(MATERIAL_OS.orden_id == orden_id)
        await session.execute(stmt_del)
        
        # Insertar nuevos
        for mat in data["materiales"]:
            if isinstance(mat, dict):
                desc = mat.get("descripcion", "")
                cant = mat.get("cantidad", 1)
            else:
                desc = str(mat)
                cant = 1
            if desc:
                session.add(MATERIAL_OS(orden_id=orden_id, descripcion=desc, cantidad=cant))
                
        await session.commit()

    return {"ok": True, "mensaje": "Orden actualizada con éxito"}


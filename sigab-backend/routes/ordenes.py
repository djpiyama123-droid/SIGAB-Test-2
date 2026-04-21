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
import aiomysql
import os
import secrets
from datetime import datetime, date
import sqlalchemy as sa
from config import get_db, UPLOAD_DIR
from auth.dependencies import get_current_user, require_action
from services.pdf_service import generar_pdf_orden
try:
    from services.ocr_service import parsear_reporte_ocr
except ImportError:
    def parsear_reporte_ocr(_b):  # type: ignore
        raise HTTPException(status_code=503, detail="OCR deshabilitado en esta instancia")

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
    session: AsyncSession = Depends(get_async_session),
):
    query = select(OrdenServicio, Equipo.nombre.label("equipo_nombre_rel")).outerjoin(Equipo, OrdenServicio.equipo_id == Equipo.id)
    
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
    session: AsyncSession = Depends(get_async_session)
):
    orden = await session.get(OrdenServicio, orden_id)
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
    session: AsyncSession = Depends(get_async_session)
):
    # Generar número de orden: OS-YYYYMMDD-XXXX
    hoy = date.today()
    stmt_count = select(func.count()).select_from(OrdenServicio).where(
        sa.extract('year', OrdenServicio.fecha) == hoy.year
    )
    res_count = await session.execute(stmt_count)
    n = res_count.scalar() + 1
    numero = f"OS-{hoy.strftime('%Y%m%d')}-{n:04d}"

    # Crear objeto Orden
    # Quitamos materiales de la data para no fallar en el constructor si no están en el modelo
    materiales_data = data.pop("materiales", [])
    
    orden = OrdenServicio(**data)
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

    return {"ok": True, "numero_orden": numero, "orden_id": orden.id}


@router.put("/{orden_id}/cerrar")
async def cerrar_orden(
    orden_id: int, 
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_async_session)
):
    orden = await session.get(OrdenServicio, orden_id)
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
    session: AsyncSession = Depends(get_async_session)
):
    estado = data.get("estado")
    if estado not in ("abierta", "en_progreso", "cerrada", "cancelada"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    orden = await session.get(OrdenServicio, orden_id)
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
    session: AsyncSession = Depends(get_async_session),
):
    """Sube una foto (antes, despues, etc) como evidencia de la orden."""
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
    session: AsyncSession = Depends(get_async_session),
):
    """Cierra la orden añadiendo condiciones finales, reporte y conformidad."""
    orden = await session.get(OrdenServicio, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden.condiciones_encontradas = data.get("condiciones_encontradas")
    orden.condicion_final = data.get("condicion_final")
    orden.observaciones = data.get("observaciones")
    # Nota: Los campos de recibo/matricula deben estar en el modelo
    # Los agregamos dinámicamente o aseguramos que el modelo los tenga
    orden.reporta_nombre = data.get("recibe_conformidad_nombre") # Mapeo sugerido
    
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


@router.get("/{orden_id}/pdf")
async def descargar_pdf_orden(
    orden_id: int,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera y descarga el PDF de la Orden de Servicio."""
    orden = await session.get(OrdenServicio, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    stmt_mat = select(MATERIAL_OS).where(MATERIAL_OS.orden_id == orden_id)
    res_mat = await session.execute(stmt_mat)
    materiales = res_mat.scalars().all()

    stmt_ev = select(EVIDENCIA_OS).where(EVIDENCIA_OS.orden_id == orden_id)
    res_ev = await session.execute(stmt_ev)
    evidencias = res_ev.scalars().all()

    # Convertir a dict para el service (que espera dicts)
    orden_dict = orden.model_dump()
    materiales_dict = [m.model_dump() for m in materiales]
    evidencias_dict = [e.model_dump() for e in evidencias]

    pdf_bytes = generar_pdf_orden(orden_dict, materiales_dict, evidencias_dict)
    
    numero = orden.numero_orden or str(orden_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=OS_{numero}.pdf"}
    )

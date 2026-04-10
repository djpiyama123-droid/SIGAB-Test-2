from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import Optional
import aiomysql
import os
import secrets
from datetime import datetime
from config import get_db, UPLOAD_DIR
from auth.dependencies import get_current_user, require_action
from services.pdf_service import generar_pdf_orden
from services.ocr_service import parsear_reporte_ocr

router = APIRouter()


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
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT os.*, e.nombre as equipo_nombre_rel
            FROM ordenes_servicio os
            LEFT JOIN equipos e ON os.equipo_id = e.id
            WHERE 1=1
        """
        params = []

        if estado:
            query += " AND os.estado = %s"
            params.append(estado)
        if tipo:
            query += " AND os.tipo_mantenimiento = %s"
            params.append(tipo)
        if equipo_id:
            query += " AND os.equipo_id = %s"
            params.append(equipo_id)
        if fecha_desde:
            query += " AND os.fecha >= %s"
            params.append(fecha_desde)
        if fecha_hasta:
            query += " AND os.fecha <= %s"
            params.append(fecha_hasta)

        query += " ORDER BY os.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        await cur.execute(query, params)
        ordenes = await cur.fetchall()

    return {"ordenes": ordenes, "total": len(ordenes)}


@router.get("/{orden_id}")
async def obtener_orden(orden_id: int, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM ordenes_servicio WHERE id = %s", (orden_id,))
        orden = await cur.fetchone()

        if not orden:
            raise HTTPException(status_code=404, detail="Orden no encontrada")

        await cur.execute(
            "SELECT * FROM os_materiales WHERE orden_id = %s", (orden_id,)
        )
        materiales = await cur.fetchall()

        await cur.execute(
            "SELECT * FROM os_evidencias WHERE orden_id = %s", (orden_id,)
        )
        evidencias = await cur.fetchall()

    return {"orden": orden, "materiales": materiales, "evidencias": evidencias}


@router.post("/")
async def crear_orden(data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Generar número de orden
        await cur.execute(
            "SELECT COUNT(*)+1 as n FROM ordenes_servicio WHERE YEAR(fecha) = YEAR(CURDATE())"
        )
        n = (await cur.fetchone())["n"]
        numero = f"OS-{datetime.now().strftime('%Y%m%d')}-{n:04d}"

        await cur.execute(
            """INSERT INTO ordenes_servicio
            (numero_orden, tipo_formato, equipo_id, equipo_nombre, equipo_marca,
             equipo_modelo, equipo_serie, ubicacion_fisica, piso, area,
             tipo_mantenimiento, tipo_atencion, falla_reportada, descripcion_servicio,
             observaciones, tecnico_nombre, fecha, prioridad, origen)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURDATE(),%s,%s)""",
            (
                numero,
                data.get("tipo_formato", "correctivo_corto"),
                data.get("equipo_id"),
                data.get("equipo_nombre"),
                data.get("equipo_marca"),
                data.get("equipo_modelo"),
                data.get("equipo_serie"),
                data.get("ubicacion_fisica"),
                data.get("piso"),
                data.get("area"),
                data.get("tipo_mantenimiento", "correctivo"),
                data.get("tipo_atencion", "interno"),
                data.get("falla_reportada"),
                data.get("descripcion_servicio"),
                data.get("observaciones"),
                data.get("tecnico_nombre"),
                data.get("prioridad", "media"),
                data.get("origen", "dashboard"),
            ),
        )
        orden_id = cur.lastrowid

        # Materiales
        for mat in data.get("materiales", []):
            await cur.execute(
                "INSERT INTO os_materiales (orden_id, descripcion, cantidad) VALUES (%s, %s, %s)",
                (orden_id, mat.get("descripcion", mat if isinstance(mat, str) else ""), mat.get("cantidad", 1) if isinstance(mat, dict) else 1),
            )

    return {"ok": True, "numero_orden": numero, "orden_id": orden_id}


@router.put("/{orden_id}/cerrar")
async def cerrar_orden(orden_id: int, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE ordenes_servicio SET estado = 'cerrada', closed_at = NOW() WHERE id = %s",
            (orden_id,),
        )
    return {"ok": True, "mensaje": f"Orden {orden_id} cerrada"}


@router.put("/{orden_id}/estado")
async def cambiar_estado_orden(orden_id: int, data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    estado = data.get("estado")
    if estado not in ("abierta", "en_progreso", "cerrada", "cancelada"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    async with conn.cursor() as cur:
        if estado == "cerrada":
            await cur.execute(
                "UPDATE ordenes_servicio SET estado = %s, closed_at = NOW() WHERE id = %s",
                (estado, orden_id),
            )
        else:
            await cur.execute(
                "UPDATE ordenes_servicio SET estado = %s WHERE id = %s",
                (estado, orden_id),
            )
    return {"ok": True}


@router.post("/{orden_id}/evidencia")
async def subir_evidencia(
    orden_id: int,
    tipo: str,
    descripcion: str = "",
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
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

    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO os_evidencias (orden_id, ruta_archivo, tipo, descripcion)
               VALUES (%s, %s, %s, %s)""",
            (orden_id, file_url, tipo, descripcion),
        )
        evidencia_id = cur.lastrowid
    return {"ok": True, "id": evidencia_id, "url": file_url}


@router.put("/{orden_id}/finalizar")
async def finalizar_orden(
    orden_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Cierra la orden añadiendo condiciones finales, reporte y conformidad."""
    async with conn.cursor() as cur:
        await cur.execute(
            """UPDATE ordenes_servicio 
               SET condiciones_encontradas = %s,
                   condicion_final = %s,
                   observaciones = %s,
                   recibe_conformidad_nombre = %s,
                   recibe_conformidad_matricula = %s,
                   estado = 'cerrada',
                   closed_at = NOW()
               WHERE id = %s""",
            (
                data.get("condiciones_encontradas"),
                data.get("condicion_final"),
                data.get("observaciones"),
                data.get("recibe_conformidad_nombre"),
                data.get("recibe_conformidad_matricula"),
                orden_id
            ),
        )
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
    conn=Depends(get_db),
):
    """Genera y descarga el PDF de la Orden de Servicio."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM ordenes_servicio WHERE id = %s", (orden_id,))
        orden = await cur.fetchone()
        
        if not orden:
            raise HTTPException(status_code=404, detail="Orden no encontrada")

        await cur.execute("SELECT * FROM os_materiales WHERE orden_id = %s", (orden_id,))
        materiales = await cur.fetchall()

        await cur.execute("SELECT * FROM os_evidencias WHERE orden_id = %s", (orden_id,))
        evidencias = await cur.fetchall()

    pdf_bytes = generar_pdf_orden(orden, materiales, evidencias)
    
    numero = orden.get("numero_orden", str(orden_id))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=OS_{numero}.pdf"}
    )

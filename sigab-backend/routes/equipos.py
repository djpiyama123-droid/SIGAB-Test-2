from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import Optional
import aiomysql
import os
import secrets
import uuid
from datetime import datetime
from config import get_db, UPLOAD_DIR, MAX_UPLOAD_MB, PUBLIC_BASE_URL
from auth.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_action,
)
from auth.permissions import (
    can,
    filter_equipo_publico,
    allowed_update_fields,
    CAMPOS_EDITABLES_TODOS,
)
from services.qr_service import generate_qr_png, generate_qr_label_a6_pdf
from services.audit_service import AuditService

router = APIRouter()


# IMPORTANTE: rutas estáticas ANTES de /{equipo_id} para evitar colisión

@router.get("/public/{qr_token}")
async def equipo_por_qr(qr_token: str, conn=Depends(get_db)):
    """Endpoint PÚBLICO (sin auth) para escaneo QR.
    Devuelve datos básicos del equipo identificado por su qr_token opaco."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT id, nombre, marca, modelo, serie, estado, criticidad,
                      area, piso, imagen_url, tipo_equipo, clase_cofepris,
                      fecha_proximo_mantenimiento, fecha_ultimo_mantenimiento,
                      fecha_compra, proveedor_servicio, numero_contrato_servicio,
                      manual_url, video_url
               FROM equipos WHERE qr_token = %s""",
            (qr_token,),
        )
        equipo = await cur.fetchone()

    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado o QR inválido")

    # Serializar fechas
    for campo in ['fecha_proximo_mantenimiento', 'fecha_ultimo_mantenimiento', 'fecha_compra']:
        if equipo.get(campo) and hasattr(equipo[campo], 'isoformat'):
            equipo[campo] = equipo[campo].isoformat()

    # Historial resumido (últimas 5 órdenes, público)
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT numero_orden, tipo_mantenimiento, estado, fecha, tecnico_nombre
               FROM ordenes_servicio WHERE equipo_id = %s
               ORDER BY fecha DESC LIMIT 5""",
            (equipo["id"],),
        )
        ordenes = await cur.fetchall()
        for o in ordenes:
            for k, v in list(o.items()):
                if hasattr(v, 'isoformat'):
                    o[k] = v.isoformat()

        await cur.execute(
            """SELECT tipo_preventivo, proxima_ejecucion, ultima_ejecucion, frecuencia_dias
               FROM preventivos_programados
               WHERE equipo_id = %s AND activo = TRUE
               ORDER BY proxima_ejecucion ASC LIMIT 3""",
            (equipo["id"],),
        )
        preventivos = await cur.fetchall()
        for p in preventivos:
            for k, v in list(p.items()):
                if hasattr(v, 'isoformat'):
                    p[k] = v.isoformat()

    return {
        "equipo": equipo,
        "ordenes_recientes": ordenes,
        "preventivos": preventivos,
    }


@router.get("/areas/catalogo")
async def catalogo_areas(conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT DISTINCT area FROM equipos WHERE area IS NOT NULL ORDER BY area")
        areas = await cur.fetchall()
        await cur.execute("SELECT DISTINCT piso FROM equipos WHERE piso IS NOT NULL ORDER BY piso")
        pisos = await cur.fetchall()
    return {"areas": [a["area"] for a in areas], "pisos": [p["piso"] for p in pisos]}


@router.get("/zonas/catalogo")
async def catalogo_zonas(conn=Depends(get_db)):
    """Lista las zonas del mapa para el formulario de alta/edición de equipos."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT id, nombre, codigo, piso FROM zonas_mapa WHERE activa = TRUE ORDER BY orden, nombre"
        )
        zonas = await cur.fetchall()
    return {"zonas": zonas}


@router.post("/")
async def crear_equipo(
    data: dict,
    user: dict = Depends(require_action("create_equipo")),
    conn=Depends(get_db),
):
    """Crea un nuevo equipo biomédico en el inventario."""
    if not data.get("nombre") or not data.get("serie"):
        raise HTTPException(status_code=400, detail="Nombre y serie son obligatorios")

    campos = [
        "serie", "inventario", "nombre", "marca", "modelo", "ubicacion", "piso", "area",
        "estado", "criticidad", "fecha_instalacion", "fecha_ultimo_mantenimiento",
        "fecha_proximo_mantenimiento", "vida_util_anios", "numero_contrato",
        "proveedor_servicio", "tipo_equipo", "clase_cofepris", "fecha_compra",
        "numero_contrato_servicio", "zona_id", "pos_x", "pos_y", "imagen_url",
        "manual_url", "video_url",
    ]
    valores = {k: data.get(k) for k in campos if data.get(k) is not None and data.get(k) != ""}

    if not valores.get("estado"):
        valores["estado"] = "operativo"
    if not valores.get("criticidad"):
        valores["criticidad"] = "media"
    if "pos_x" not in valores:
        valores["pos_x"] = 50.0
    if "pos_y" not in valores:
        valores["pos_y"] = 50.0

    # Generar token QR opaco al crear
    valores["qr_token"] = secrets.token_urlsafe(12)[:16]

    cols = ", ".join(valores.keys())
    placeholders = ", ".join(["%s"] * len(valores))

    async with conn.cursor() as cur:
        try:
            await cur.execute(
                f"INSERT INTO equipos ({cols}) VALUES ({placeholders})",
                list(valores.values()),
            )
            equipo_id = cur.lastrowid
            
            # Auditoría NOM-016
            await AuditService.log_event(
                usuario_id=user["id"],
                accion="CREATE_EQUIPO",
                entidad="equipos",
                entidad_id=equipo_id,
                datos=valores
            )
        except aiomysql.IntegrityError as e:
            raise HTTPException(status_code=409, detail=f"Conflicto al crear: {e}")

    return {"ok": True, "id": equipo_id, "qr_token": valores["qr_token"], "mensaje": f"Equipo '{valores['nombre']}' creado"}


@router.delete("/{equipo_id}")
async def eliminar_equipo(
    equipo_id: int,
    user: dict = Depends(require_action("delete_equipo")),
    conn=Depends(get_db),
):
    """Elimina un equipo del inventario (cascade a trazabilidad)."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT id, nombre, imagen_url FROM equipos WHERE id = %s", (equipo_id,))
        equipo = await cur.fetchone()

        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Liberar referencias en órdenes para no romper FK
        await cur.execute("UPDATE ordenes_servicio SET equipo_id = NULL WHERE equipo_id = %s", (equipo_id,))
        await cur.execute("DELETE FROM equipos WHERE id = %s", (equipo_id,))

        # Auditoría NOM-016
        await AuditService.log_event(
            usuario_id=user["id"],
            accion="DELETE_EQUIPO",
            entidad="equipos",
            entidad_id=equipo_id,
            datos={"nombre": equipo["nombre"]}
        )

    # Borrar imagen física si existía
    if equipo.get("imagen_url"):
        try:
            ruta = equipo["imagen_url"].lstrip("/")
            if os.path.isfile(ruta):
                os.remove(ruta)
        except Exception:
            pass

    return {"ok": True, "mensaje": f"Equipo '{equipo['nombre']}' eliminado"}


@router.post("/{equipo_id}/imagen")
async def subir_imagen_equipo(
    equipo_id: int,
    file: UploadFile = File(...),
    user: dict = Depends(require_action("edit_equipo")),
    conn=Depends(get_db),
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

    # Guardar bajo static/uploads/equipos/
    carpeta = os.path.join("static", "uploads", "equipos")
    os.makedirs(carpeta, exist_ok=True)
    nombre_archivo = f"eq_{equipo_id}_{uuid.uuid4().hex[:8]}{ext}"
    ruta_disco = os.path.join(carpeta, nombre_archivo)

    with open(ruta_disco, "wb") as f:
        f.write(contenido)

    # URL servida vía /static
    url_publica = f"/static/uploads/equipos/{nombre_archivo}"

    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT imagen_url FROM equipos WHERE id = %s", (equipo_id,)
        )
        existente = await cur.fetchone()
        if not existente:
            os.remove(ruta_disco)
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Borrar imagen anterior
        if existente.get("imagen_url"):
            try:
                anterior = existente["imagen_url"].lstrip("/")
                if os.path.isfile(anterior):
                    os.remove(anterior)
            except Exception:
                pass

        await cur.execute(
            "UPDATE equipos SET imagen_url = %s WHERE id = %s",
            (url_publica, equipo_id),
        )

    return {"ok": True, "imagen_url": url_publica}


@router.get("/{equipo_id}/historial")
async def historial_equipo(equipo_id: int, conn=Depends(get_db)):
    """Devuelve historial completo de órdenes y traslados para el panel de Ficha Técnica."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT id, numero_orden, tipo_mantenimiento, estado, fecha,
                      falla_reportada, tecnico_nombre, prioridad, descripcion_servicio
               FROM ordenes_servicio
               WHERE equipo_id = %s
               ORDER BY fecha DESC, id DESC LIMIT 50""",
            (equipo_id,),
        )
        ordenes = await cur.fetchall()

        await cur.execute(
            """SELECT id, area_origen, area_destino, piso_origen, piso_destino,
                      motivo, fecha_movimiento
               FROM trazabilidad
               WHERE equipo_id = %s
               ORDER BY fecha_movimiento DESC LIMIT 50""",
            (equipo_id,),
        )
        traslados = await cur.fetchall()

        await cur.execute(
            """SELECT pp.id, pp.tipo_preventivo, pp.proxima_ejecucion,
                      pp.ultima_ejecucion, pp.frecuencia_dias
               FROM preventivos_programados pp
               WHERE pp.equipo_id = %s AND pp.activo = TRUE
               ORDER BY pp.proxima_ejecucion ASC""",
            (equipo_id,),
        )
        preventivos = await cur.fetchall()

    # Serializar fechas
    for col in (ordenes, traslados, preventivos):
        for fila in col:
            for k, v in list(fila.items()):
                if hasattr(v, "isoformat"):
                    fila[k] = v.isoformat()

    return {
        "equipo_id": equipo_id,
        "ordenes": ordenes,
        "traslados": traslados,
        "preventivos": preventivos,
    }


@router.get("/")
async def listar_equipos(
    estado: Optional[str] = None,
    area: Optional[str] = None,
    piso: Optional[str] = None,
    buscar: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = "SELECT * FROM equipos WHERE 1=1"
        params = []

        if estado:
            query += " AND estado = %s"
            params.append(estado)
        if area:
            query += " AND area LIKE %s"
            params.append(f"%{area}%")
        if piso:
            query += " AND piso = %s"
            params.append(piso)
        if buscar:
            query += " AND (nombre LIKE %s OR serie LIKE %s OR marca LIKE %s OR modelo LIKE %s)"
            b = f"%{buscar}%"
            params.extend([b, b, b, b])

        query += " ORDER BY nombre LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        await cur.execute(query, params)
        equipos = await cur.fetchall()

        await cur.execute("SELECT COUNT(*) as total FROM equipos")
        total = (await cur.fetchone())["total"]

    # Filtrar campos confidenciales si el rol no tiene view_confidential
    if not can(user, "view_confidential"):
        equipos = [filter_equipo_publico(e) for e in equipos]

    return {"equipos": equipos, "total": total}


@router.get("/{equipo_id}")
async def obtener_equipo(
    equipo_id: int,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM v_dashboard_equipos WHERE id = %s", (equipo_id,))
        equipo = await cur.fetchone()

        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        await cur.execute(
            """SELECT id, numero_orden, tipo_mantenimiento, estado, fecha, falla_reportada, tecnico_nombre
               FROM ordenes_servicio WHERE equipo_id = %s ORDER BY fecha DESC LIMIT 10""",
            (equipo_id,),
        )
        ordenes = await cur.fetchall()

        await cur.execute(
            """SELECT area_origen, area_destino, piso_origen, piso_destino, fecha_movimiento, motivo
               FROM trazabilidad WHERE equipo_id = %s ORDER BY fecha_movimiento DESC LIMIT 5""",
            (equipo_id,),
        )
        traslados = await cur.fetchall()

    if not can(user, "view_confidential"):
        equipo = filter_equipo_publico(equipo)
        # Si no es confidencial, también ocultar historial sensible
        ordenes = []
        traslados = []

    return {"equipo": equipo, "ordenes": ordenes, "traslados": traslados}


@router.patch("/{equipo_id}/posicion")
async def actualizar_posicion(
    equipo_id: int,
    body: dict,
    user: dict = Depends(require_action("edit_equipo")),
    conn=Depends(get_db),
):
    """Guarda nueva posición X/Y después de drag & drop en el mapa."""
    pos_x = float(body.get("pos_x", 50))
    pos_y = float(body.get("pos_y", 50))
    zona_id = body.get("zona_id")

    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE equipos SET pos_x = %s, pos_y = %s, zona_id = %s WHERE id = %s",
            (pos_x, pos_y, zona_id, equipo_id),
        )
    return {"ok": True}


@router.put("/{equipo_id}")
async def actualizar_equipo(
    equipo_id: int,
    data: dict,
    user: dict = Depends(require_action("edit_equipo")),
    conn=Depends(get_db),
):
    """Actualiza campos del equipo. Los campos permitidos dependen del rol."""
    campos_permitidos = allowed_update_fields(user)
    updates = {k: v for k, v in data.items() if k in campos_permitidos}

    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar con tu rol")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [equipo_id]

    async with conn.cursor() as cur:
        await cur.execute(f"UPDATE equipos SET {set_clause} WHERE id = %s", values)
        
        # Auditoría NOM-016
        await AuditService.log_event(
            usuario_id=user["id"],
            accion="UPDATE_EQUIPO",
            entidad="equipos",
            entidad_id=equipo_id,
            datos=updates
        )

    return {"ok": True, "mensaje": f"Equipo {equipo_id} actualizado"}


@router.get("/{equipo_id}/qr")
async def generar_qr(
    equipo_id: int,
    user: dict = Depends(require_action("regenerar_qr")),
    conn=Depends(get_db),
):
    """Genera un QR PNG para el equipo con token opaco."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT id, nombre, qr_token FROM equipos WHERE id = %s", (equipo_id,)
        )
        equipo = await cur.fetchone()

    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    token = equipo.get("qr_token")
    if not token:
        token = secrets.token_urlsafe(12)[:16]
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE equipos SET qr_token = %s WHERE id = %s", (token, equipo_id)
            )

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
    conn=Depends(get_db),
):
    """Genera una etiqueta A6 imprimible (PDF) con QR + datos del equipo."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM equipos WHERE id = %s", (equipo_id,))
        equipo = await cur.fetchone()

    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    token = equipo.get("qr_token")
    if not token:
        token = secrets.token_urlsafe(12)[:16]
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE equipos SET qr_token = %s WHERE id = %s", (token, equipo_id)
            )
        equipo["qr_token"] = token

    url = f"{PUBLIC_BASE_URL}/equipo/{token}"
    pdf_bytes = generate_qr_label_a6_pdf(equipo, url)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=etiqueta_equipo_{equipo_id}.pdf"},
    )


@router.post("/validar")
async def validar_poka_yoke(
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Implementa Triple Validación (Poka-Yoke): QR + Inventario + Serie."""
    qr_token = data.get("qr_token")
    inventario = (data.get("inventario") or "").strip()
    serie = (data.get("serie") or "").strip()

    if not qr_token or not inventario or not serie:
        raise HTTPException(status_code=400, detail="Faltan datos para la triple validación")

    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Buscar equipo que coincida con el QR
        await cur.execute(
            "SELECT id, nombre, inventario, serie FROM equipos WHERE qr_token = %s",
            (qr_token,)
        )
        equipo = await cur.fetchone()

        es_valido = False
        match_inventario = False
        match_serie = False
        error_msg = ""

        if equipo:
            match_inventario = (equipo["inventario"] == inventario)
            match_serie = (equipo["serie"] == serie)
            es_valido = match_inventario and match_serie
            
            if not es_valido:
                error_msg = f"Inconsistencia: Invenario={match_inventario}, Serie={match_serie}"
        else:
            error_msg = "Token QR no reconocido"

        # Registrar el intento (Log Poka-Yoke)
        await cur.execute(
            """INSERT INTO validaciones_pokayoke 
               (equipo_id, usuario_id, qr_escaneado, inventario_leido, serie_leida, es_valido, observaciones)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                equipo["id"] if equipo else None,
                user["id"],
                qr_token,
                inventario,
                serie,
                es_valido,
                error_msg
            )
        )
        
        # Integración con Auditoría NOM-016 (Habilidad 4)
        # Se registrará el log en la tabla de auditoría mediante un trigger o llamada directa.
        # Por ahora lo dejamos como el log dedicado de validación.

    return {
        "ok": es_valido,
        "equipo": equipo if es_valido else None,
        "detail": error_msg if not es_valido else "Validación triple exitosa",
        "matches": {
            "inventario": match_inventario,
            "serie": match_serie
        }
    }

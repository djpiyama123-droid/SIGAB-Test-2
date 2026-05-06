from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional
import aiomysql
import json
import os
import shutil
import secrets
from decimal import Decimal
from datetime import datetime, date, time
from config import get_db, UPLOAD_DIR
from services.pdf_service import generar_pdf_orden
from services.reporte_pdf_service import generar_pdf_reporte_diario
from services.mail_service import enviar_reporte_email
from services import gemma_service
from fastapi.responses import Response, JSONResponse

try:
    from services.imss_os_extractor import extract_imss_os, map_to_orden_servicio
    _IMSS_EXTRACTOR_AVAILABLE = True
except Exception:
    _IMSS_EXTRACTOR_AVAILABLE = False

router = APIRouter()


@router.post("/ticket")
async def crear_ticket_whatsapp(
    equipo_serie: str = Form(None),
    equipo_nombre: str = Form(None),
    equipo_marca: str = Form(None),
    equipo_modelo: str = Form(None),
    tipo_mantenimiento: str = Form("correctivo"),
    falla_reportada: str = Form(None),
    descripcion: str = Form(None),
    tecnico_nombre: str = Form(None),
    ubicacion: str = Form(None),
    piso: str = Form(None),
    area: str = Form(None),
    materiales: str = Form(None),
    observaciones: str = Form(None),
    prioridad: str = Form("media"),
    foto: UploadFile = File(None),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        equipo_id = None
        if equipo_serie:
            await cur.execute("SELECT id FROM equipos WHERE serie = %s", (equipo_serie,))
            row = await cur.fetchone()
            if row:
                equipo_id = row["id"]

        await cur.execute(
            "SELECT COUNT(*)+1 as next_num FROM ordenes_servicio WHERE YEAR(fecha) = YEAR(CURDATE())"
        )
        next_num = (await cur.fetchone())["next_num"]
        numero_orden = f"OS-{datetime.now().strftime('%Y%m%d')}-{next_num:04d}"

        await cur.execute(
            """INSERT INTO ordenes_servicio
            (numero_orden, tipo_formato, equipo_id, equipo_nombre, equipo_marca, equipo_modelo, equipo_serie,
             ubicacion_fisica, piso, area, tipo_mantenimiento, falla_reportada, descripcion_servicio,
             observaciones, tecnico_nombre, fecha, estado, prioridad, origen)
            VALUES (%s, 'correctivo_corto', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURDATE(), 'abierta', %s, 'whatsapp')""",
            (
                numero_orden, equipo_id, equipo_nombre, equipo_marca, equipo_modelo,
                equipo_serie, ubicacion, piso, area, tipo_mantenimiento, falla_reportada,
                descripcion, observaciones, tecnico_nombre, prioridad,
            ),
        )
        orden_id = cur.lastrowid

        if materiales:
            try:
                mats = json.loads(materiales)
                for mat in mats:
                    await cur.execute(
                        "INSERT INTO os_materiales (orden_id, descripcion) VALUES (%s, %s)",
                        (orden_id, mat),
                    )
            except json.JSONDecodeError:
                pass

        foto_path = None
        if foto:
            ext = foto.filename.split('.')[-1].lower() if foto.filename and '.' in foto.filename else 'png'
            if ext not in {'png', 'jpg', 'jpeg', 'webp'}:
                ext = 'png'  # Fallback to prevent execution of malicious file types
            
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            import uuid
            secure_name = f"os_wapp_{orden_id}_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}.{ext}"
            foto_path = os.path.join(UPLOAD_DIR, secure_name)
            with open(foto_path, "wb") as f:
                shutil.copyfileobj(foto.file, f)
            await cur.execute(
                "INSERT INTO os_evidencias (orden_id, ruta_archivo, tipo) VALUES (%s, %s, 'documento')",
                (orden_id, f"/static/uploads/{secure_name}"),
            )

        await cur.execute(
            """INSERT INTO alertas (tipo, equipo_id, orden_id, mensaje, prioridad)
               VALUES ('ticket_abierto_mucho_tiempo', %s, %s, %s, %s)""",
            (
                equipo_id, orden_id,
                f"Nuevo ticket WhatsApp: {falla_reportada or equipo_nombre or 'Sin descripción'}",
                prioridad,
            ),
        )

    return {
        "ok": True,
        "numero_orden": numero_orden,
        "orden_id": orden_id,
        "mensaje": f"Ticket {numero_orden} creado exitosamente desde WhatsApp",
    }


@router.get("/buscar-equipo")
async def buscar_equipo(q: str, conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT id, serie, nombre, marca, modelo, ubicacion, piso, area, estado,
                      fecha_ultimo_mantenimiento, fecha_proximo_mantenimiento
               FROM equipos
               WHERE serie LIKE %s OR nombre LIKE %s OR modelo LIKE %s OR marca LIKE %s
               LIMIT 5""",
            (f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"),
        )
        resultados = await cur.fetchall()

    if not resultados:
        return {"ok": False, "mensaje": f"No se encontró equipo con: {q}", "resultados": []}

    return {"ok": True, "total": len(resultados), "resultados": resultados}


@router.get("/estado-equipo/{serie}")
async def estado_equipo(serie: str, conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM v_dashboard_equipos WHERE serie = %s", (serie,))
        equipo = await cur.fetchone()

        if not equipo:
            return {"ok": False, "mensaje": f"Equipo con serie {serie} no encontrado"}

        await cur.execute(
            """SELECT numero_orden, tipo_mantenimiento, estado, fecha, falla_reportada
               FROM ordenes_servicio WHERE equipo_id = %s
               ORDER BY fecha DESC LIMIT 5""",
            (equipo["id"],),
        )
        historial = await cur.fetchall()

        await cur.execute(
            """SELECT area_origen, area_destino, piso_origen, piso_destino, fecha_movimiento, motivo
               FROM trazabilidad WHERE equipo_id = %s
               ORDER BY fecha_movimiento DESC LIMIT 3""",
            (equipo["id"],),
        )
        traslados = await cur.fetchall()

    return {
        "ok": True,
        "equipo": equipo,
        "historial_ordenes": historial,
        "traslados_recientes": traslados,
    }


@router.post("/traslado")
async def registrar_traslado(
    equipo_serie: str = Form(...),
    area_destino: str = Form(...),
    piso_destino: str = Form(None),
    motivo: str = Form(None),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT id, area, piso FROM equipos WHERE serie = %s", (equipo_serie,))
        equipo = await cur.fetchone()

        if not equipo:
            return {"ok": False, "mensaje": f"Equipo {equipo_serie} no encontrado"}

        await cur.execute(
            """INSERT INTO trazabilidad (equipo_id, area_origen, piso_origen, area_destino, piso_destino, motivo)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (equipo["id"], equipo["area"], equipo["piso"], area_destino, piso_destino, motivo),
        )

        await cur.execute(
            "UPDATE equipos SET area = %s, piso = %s, estado = 'en_traslado' WHERE id = %s",
            (area_destino, piso_destino or equipo["piso"], equipo["id"]),
        )
        await cur.execute(
            "UPDATE equipos SET estado = 'operativo' WHERE id = %s", (equipo["id"],)
        )

    return {
        "ok": True,
        "mensaje": f"Equipo {equipo_serie} trasladado de {equipo['area']} a {area_destino}",
    }


@router.get("/alertas-pendientes")
async def alertas_pendientes(conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM v_alertas_pendientes LIMIT 20")
        alertas = await cur.fetchall()
    return {"ok": True, "total": len(alertas), "alertas": alertas}


@router.get("/reporte-diario")
async def reporte_diario(conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE DATE(created_at) = CURDATE() AND estado = 'abierta'"
        )
        nuevas_hoy = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE DATE(closed_at) = CURDATE()"
        )
        cerradas_hoy = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT nombre, serie, area FROM equipos WHERE estado = 'fuera_servicio'"
        )
        fuera_servicio = await cur.fetchall()

        await cur.execute(
            """SELECT pp.tipo_preventivo, pp.proxima_ejecucion, e.nombre, e.serie
               FROM preventivos_programados pp
               JOIN equipos e ON pp.equipo_id = e.id
               WHERE pp.proxima_ejecucion <= CURDATE() AND pp.activo = TRUE"""
        )
        prev_vencidos = await cur.fetchall()

    return {
        "ok": True,
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "ordenes_nuevas_hoy": nuevas_hoy,
        "ordenes_cerradas_hoy": cerradas_hoy,
        "equipos_fuera_servicio": fuera_servicio,
        "preventivos_vencidos": prev_vencidos,
    }


@router.post("/cambiar-estado")
async def cambiar_estado_equipo(
    equipo_serie: str = Form(...),
    nuevo_estado: str = Form(...),
    conn=Depends(get_db),
):
    """Cambia el estado de un equipo por serie (sin JWT, para bot WhatsApp)."""
    estados_validos = ['operativo', 'en_mantenimiento', 'fuera_servicio', 'en_traslado', 'baja']
    if nuevo_estado not in estados_validos:
        return {"ok": False, "mensaje": f"Estado inválido. Usa: {', '.join(estados_validos)}"}

    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT id, nombre, estado FROM equipos WHERE serie = %s", (equipo_serie,))
        equipo = await cur.fetchone()

        if not equipo:
            return {"ok": False, "mensaje": f"Equipo con serie {equipo_serie} no encontrado"}

        estado_anterior = equipo["estado"]
        await cur.execute(
            "UPDATE equipos SET estado = %s WHERE id = %s",
            (nuevo_estado, equipo["id"]),
        )

        # Registrar alerta del cambio
        await cur.execute(
            """INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad)
               VALUES ('cambio_estado_bot', %s, %s, %s)""",
            (
                equipo["id"],
                f"WhatsApp Bot: {equipo['nombre']} cambió de {estado_anterior} → {nuevo_estado}",
                "alta" if nuevo_estado == "fuera_servicio" else "media",
            ),
        )

    return {
        "ok": True,
        "mensaje": f"Equipo {equipo['nombre']} ({equipo_serie}): {estado_anterior} → {nuevo_estado}",
    }


@router.get("/equipo-pdf/{serie}")
async def get_equipo_pdf(serie: str, conn=Depends(get_db)):
    """Genera un reporte PDF rápido de un equipo para envío por WhatsApp/Correo."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT id, nombre, serie, marca, modelo, area, piso FROM equipos WHERE serie = %s", (serie,))
        equipo = await cur.fetchone()
        if not equipo:
            return {"ok": False, "mensaje": "Equipo no encontrado"}

        # Obtenemos la última orden de servicio para este equipo
        await cur.execute("SELECT * FROM ordenes_servicio WHERE equipo_id = %s ORDER BY fecha DESC LIMIT 1", (equipo["id"],))
        orden = await cur.fetchone()
        
        if not orden:
             # Formato básico si no hay orden
             orden = {
                 "numero_orden": "CONSULTA-RAPIDA",
                 "equipo_nombre": equipo["nombre"],
                 "equipo_serie": equipo["serie"],
                 "equipo_marca": equipo["marca"],
                 "equipo_modelo": equipo["modelo"],
                 "area": equipo["area"],
                 "piso": equipo["piso"],
                 "tipo_mantenimiento": "CONSULTA",
                 "falla_reportada": "Consulta de estatus vía WhatsApp Bot",
                 "descripcion_servicio": "Reporte generado automáticamente por SIGAB Copilot.",
                 "tecnico_nombre": "SIGAB Bot",
                 "fecha": datetime.now().strftime("%Y-%m-%d")
             }
             materiales = []
        else:
             await cur.execute("SELECT * FROM os_materiales WHERE orden_id = %s", (orden["id"],))
             materiales = await cur.fetchall()
        
        pdf_bytes = generar_pdf_orden(orden, materiales, [])
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=Reporte_{serie}.pdf"}
        )


@router.post("/enviar-reporte")
async def api_enviar_reporte(
    serie: str = Form(...),
    email: str = Form(...),
    conn=Depends(get_db)
):
    """Genera y envía por correo el reporte de un equipo."""
    # Reutilizamos la lógica del PDF
    res = await get_equipo_pdf(serie, conn)
    if isinstance(res, dict) and not res.get("ok"):
        return res
    
    pdf_bytes = res.body
    
    asunto = f"Reporte Técnico SIGAB - Equipo {serie}"
    cuerpo = f"Se adjunta el reporte técnico solicitado del equipo con serie {serie}.\nGenerado automáticamente por SIGAB."
    
    exito = enviar_reporte_email(email, asunto, cuerpo, f"Reporte_{serie}.pdf", pdf_bytes)
    
    if exito:
        return {"ok": True, "mensaje": f"Reporte enviado a {email}"}
    else:
        return {"ok": False, "mensaje": "Error al enviar el correo"}


@router.post("/chat")
async def ai_chat_bot(data: dict):
    """Interfaz de chat para el Bot (no streaming, respuesta rápida)."""
    mensaje = data.get("mensaje")
    if not mensaje:
        return {"ok": False, "mensaje": "Falta mensaje"}
    
    # Prompt simplificado para el bot
    prompt = f"Actúa como SIGAB Assistant, un experto en bioingeniería en el IMSS. Responde de forma concisa al siguiente mensaje: {mensaje}"
    
    try:
        respuesta = await gemma_service.consultar_gemma_no_streaming(prompt)
        return {"ok": True, "respuesta": respuesta}
    except Exception as e:
        return {"ok": False, "mensaje": str(e)}


@router.get("/check-calibraciones")
async def check_calibraciones(conn=Depends(get_db)):
    """Resumen de calibraciones próximas a vencer para el Bot."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("""
            SELECT m.*, e.nombre, e.serie
            FROM metrologia_calibracion m
            JOIN equipos e ON m.equipo_id = e.id
            WHERE m.proxima_calibracion <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        """)
        vencidas = await cur.fetchall()
        return {"ok": True, "vencidas": vencidas}


@router.post("/scan-os")
async def escanear_os_whatsapp(
    foto: UploadFile = File(...),
    auto_create: bool = Form(True),
    remitente: str = Form(None),
    conn=Depends(get_db),
):
    """
    Recibe una foto de OS IMSS (formato SIGAB-IMSS-OS-V3) desde el bot OpenClaw
    de WhatsApp. Ejecuta el extractor IMSS y, por defecto (auto_create=true),
    crea la Orden de Servicio en estado 'pendiente_validacion'.

    Sin JWT (es endpoint del bot, autenticado por red interna).
    """
    if not _IMSS_EXTRACTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Extractor IMSS no disponible")

    ext = (foto.filename or "img").split(".")[-1].lower() if foto.filename else "jpg"
    if ext not in {"png", "jpg", "jpeg", "webp"}:
        ext = "jpg"

    img_bytes = await foto.read()
    if len(img_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen excede 15 MB")

    extracted = await extract_imss_os(img_bytes)

    if extracted.get("error") == "no_es_formato_imss":
        return {
            "ok": False,
            "mensaje": "La foto no parece una OS IMSS. Asegúrate que el formato tenga la cabecera del IMSS y el código SIGAB-IMSS-OS-V3 al pie.",
        }
    if extracted.get("error") == "extraction_failed":
        return {
            "ok": False,
            "mensaje": "No pude extraer datos legibles de la foto. ¿Puedes tomarla con mejor iluminación y enfocada?",
            "campos_identificados": extracted,
        }

    if not auto_create:
        return {"ok": True, "campos_identificados": extracted}

    # ── Crear OS ───────────────────────────────────────────────────
    mapped = map_to_orden_servicio(extracted)

    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Folio
        numero = mapped.get("numero_orden")
        if not numero or not (isinstance(numero, str) and numero.startswith("OS-") and len(numero) >= 12):
            await cur.execute(
                "SELECT COUNT(*)+1 as next_num FROM ordenes_servicio WHERE YEAR(fecha) = YEAR(CURDATE())"
            )
            n = (await cur.fetchone())["next_num"]
            numero = f"OS-{datetime.now().strftime('%Y%m%d')}-{n:04d}"

        # Resolver equipo_id por serie
        equipo_id = None
        if mapped.get("equipo_serie"):
            await cur.execute("SELECT id FROM equipos WHERE serie = %s", (mapped["equipo_serie"],))
            row = await cur.fetchone()
            if row:
                equipo_id = row["id"]

        # tiempo_real_min → hrs
        tiempo_real_hrs = None
        if "tiempo_real_min" in mapped:
            try:
                tiempo_real_hrs = float(mapped.pop("tiempo_real_min")) / 60.0
            except Exception:
                mapped.pop("tiempo_real_min", None)

        # fecha
        fecha_orden = mapped.get("fecha")
        if not fecha_orden:
            fecha_orden = date.today()
        elif isinstance(fecha_orden, str):
            try:
                fecha_orden = datetime.strptime(fecha_orden, "%Y-%m-%d").date()
            except Exception:
                fecha_orden = date.today()

        await cur.execute(
            """INSERT INTO ordenes_servicio
            (numero_orden, tipo_formato, equipo_id, equipo_nombre, equipo_marca, equipo_modelo, equipo_serie,
             ubicacion_fisica, piso, area, tipo_mantenimiento, falla_reportada, descripcion_servicio,
             observaciones, tecnico_nombre, fecha, tiempo_real_hrs, estado, prioridad, origen)
            VALUES (%s, 'correctivo_corto', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    'pendiente_validacion', %s, 'scan_whatsapp')""",
            (
                numero, equipo_id,
                mapped.get("equipo_nombre"), mapped.get("equipo_marca"),
                mapped.get("equipo_modelo"), mapped.get("equipo_serie"),
                mapped.get("ubicacion_fisica"), mapped.get("piso"), mapped.get("area"),
                mapped.get("tipo_mantenimiento", "correctivo"),
                mapped.get("falla_reportada"), mapped.get("descripcion_servicio"),
                mapped.get("observaciones"), mapped.get("tecnico_nombre"),
                fecha_orden, tiempo_real_hrs, mapped.get("prioridad", "media"),
            ),
        )
        orden_id = cur.lastrowid

        # Refacciones extraídas
        for ref in (extracted.get("refacciones") or []):
            try:
                desc = ref.get("descripcion") or ""
                cant = int(ref.get("cantidad") or 1)
                if desc:
                    await cur.execute(
                        "INSERT INTO os_materiales (orden_id, descripcion, cantidad) VALUES (%s, %s, %s)",
                        (orden_id, desc, cant),
                    )
            except Exception:
                continue

        # Guardar foto original como evidencia
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        secure_name = f"scan_wapp_{orden_id}_{datetime.now().strftime('%Y%m%d')}_{secrets.token_hex(3)}.{ext}"
        foto_path = os.path.join(UPLOAD_DIR, secure_name)
        with open(foto_path, "wb") as f:
            f.write(img_bytes)
        await cur.execute(
            "INSERT INTO os_evidencias (orden_id, ruta_archivo, tipo, descripcion) VALUES (%s, %s, 'documento', %s)",
            (
                orden_id,
                f"/static/uploads/{secure_name}",
                f"Escaneo IMSS via WhatsApp (engine={extracted.get('engine')}, conf={extracted.get('confianza_global')}, remitente={remitente or 'desconocido'})",
            ),
        )

        # Alerta para validación
        await cur.execute(
            """INSERT INTO alertas (tipo, equipo_id, orden_id, mensaje, prioridad)
               VALUES ('os_pendiente_validacion', %s, %s, %s, %s)""",
            (
                equipo_id, orden_id,
                f"OS {numero} creada por escaneo WhatsApp — requiere validación",
                "media",
            ),
        )

    return {
        "ok": True,
        "numero_orden": numero,
        "orden_id": orden_id,
        "estado": "pendiente_validacion",
        "engine": extracted.get("engine"),
        "confianza": extracted.get("confianza_global"),
        "mensaje": f"OS {numero} creada. Confianza extracción: {(extracted.get('confianza_global') or 0)*100:.0f}%. Requiere validación en SIGAB.",
    }


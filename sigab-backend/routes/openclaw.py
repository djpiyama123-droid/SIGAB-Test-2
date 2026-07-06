"""
routes/openclaw.py — Endpoints del Bot WhatsApp (OpenClaw/sigah-bot)

SEGURIDAD: Estos endpoints son exclusivos para sigah-bot (red interna Docker).
==============================================================================
Antes de Fase 4 (Hetzner): asegurarse de que nginx NO exponga /openclaw/
externamente. El único endpoint público de este módulo es /bot-login.

FLUJO DE AUTENTICACIÓN BOT (implementado):
  1. El bot llama a POST /api/openclaw/bot-login con su BOT_API_KEY por hospital.
  2. El servidor verifica la clave contra BOT_API_KEYS (env var JSON) y emite
     un JWT efímero (24 h) con tenant_id del hospital y rol=bot.
  3. El bot usa ese JWT en Authorization: Bearer <token> para todas sus llamadas
     subsecuentes a /api/openclaw/*.
  4. get_current_tenant extrae tenant_id del JWT y aísla los datos por hospital.

ESTADO DE MIGRACIÓN A JWT (Fase 3 en curso):
  Los endpoints marcados "EXENTO-BOT" aún usan Depends(get_db) sin JWT — son
  seguros hoy porque están bloqueados por nginx en red interna. La migración
  completa a Depends(get_current_tenant) se realiza en la Fase 3 del roadmap.

BOT_API_KEYS debe definirse en .env con una clave única por hospital:
  BOT_API_KEYS={"hgr1-tijuana": "CAMBIAR_POR_CLAVE_SEGURA"}
"""
from fastapi import APIRouter, Body, Depends, UploadFile, File, Form, HTTPException
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
from auth.bot_auth import verify_bot_api_key, create_bot_token, BOT_TOKEN_TTL_HOURS

try:
    from services.imss_os_extractor import extract_imss_os, map_to_orden_servicio
    _IMSS_EXTRACTOR_AVAILABLE = True
except Exception:
    _IMSS_EXTRACTOR_AVAILABLE = False

router = APIRouter()


@router.post("/bot-login", tags=["OpenClaw"])
async def bot_login(api_key: str = Body(..., embed=True)):
    """Autentica al bot de WhatsApp con su API key de hospital y devuelve un JWT efímero.

    El JWT resultante tiene tenant_id del hospital y rol=bot. Debe enviarse en
    Authorization: Bearer <token> en todas las llamadas subsecuentes al bot.

    La clave se configura por hospital en la variable de entorno BOT_API_KEYS
    (JSON string: {"slug-hospital": "clave-secreta"}).

    Devuelve 401 si la clave no es válida o el hospital no existe en la DB.
    No revela qué parte de la validación falló (slug o clave) para evitar
    enumeración.
    """
    hospital_id = await verify_bot_api_key(api_key)
    if not hospital_id:
        raise HTTPException(
            status_code=401,
            detail="API key inválida o hospital no autorizado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_bot_token(hospital_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": BOT_TOKEN_TTL_HOURS * 3600,
    }


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
                 "descripcion_servicio": "Reporte generado automáticamente por SIGAH Copilot.",
                 "tecnico_nombre": "SIGAH Bot",
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


@router.get("/orden-pdf/{orden_id}")
async def get_orden_pdf(orden_id: int, conn=Depends(get_db)):
    """PDF de una orden por id — usado para reenviarlo por WhatsApp justo
    despues de crearla via /intake-group, donde no siempre hay equipo_serie
    (a diferencia de /equipo-pdf/{serie})."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM ordenes_servicio WHERE id = %s", (orden_id,))
        orden = await cur.fetchone()
        if not orden:
            return {"ok": False, "mensaje": "Orden no encontrada"}
        await cur.execute("SELECT * FROM os_materiales WHERE orden_id = %s", (orden_id,))
        materiales = await cur.fetchall()

    pdf_bytes = generar_pdf_orden(orden, materiales, [])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={orden['numero_orden']}.pdf"}
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
    
    asunto = f"Reporte Técnico SIGAH - Equipo {serie}"
    cuerpo = f"Se adjunta el reporte técnico solicitado del equipo con serie {serie}.\nGenerado automáticamente por SIGAH."
    
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
    prompt = f"Actúa como SIGAH Assistant, un experto en bioingeniería en el IMSS. Responde de forma concisa al siguiente mensaje: {mensaje}"
    
    try:
        respuesta = await gemma_service.analizar_no_stream(prompt)
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
    Recibe una foto de OS IMSS (formato SIGAH-IMSS-OS-V3) desde el bot OpenClaw
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

    # Cargar catálogo de series para fuzzy match
    series_catalogo: list[str] = []
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur_cat:
            await cur_cat.execute("SELECT serie FROM equipos WHERE serie IS NOT NULL AND serie != ''")
            series_catalogo = [r["serie"] for r in await cur_cat.fetchall()]
    except Exception:
        pass

    extracted = await extract_imss_os(img_bytes, series_catalogo=series_catalogo)

    if extracted.get("error") == "no_es_formato_imss":
        return {
            "ok": False,
            "mensaje": "La foto no parece una OS IMSS. Asegúrate que el formato tenga la cabecera del IMSS y el código SIGAH-IMSS-OS-V3 al pie.",
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
        "mensaje": f"OS {numero} creada. Confianza extracción: {(extracted.get('confianza_global') or 0)*100:.0f}%. Requiere validación en SIGAH.",
    }


@router.post("/intake-group")
async def intake_group_message(
    mensaje: str = Form(None),
    sender_name: str = Form(None),
    sender_jid: str = Form(None),
    foto: UploadFile = File(None),
    tipo: str = Form("texto"),  # texto | imagen | audio_transcripcion
    conn=Depends(get_db),
):
    """
    Procesa mensajes del grupo de técnicos de WhatsApp (texto libre o imagen).
    Usa Gemma para extraer datos estructurados y crea la OS en SIGAH.

    Flujo:
      1. Recibe mensaje del grupo (texto o imagen)
      2. Llama a Gemma para extraer: equipo, falla, área, prioridad
      3. Crea OS en estado 'abierta'
      4. Devuelve número de OS + confirmación para el bot

    Este endpoint es interno (llamado solo desde sigah-bot, red Docker).
    """
    if not mensaje and not foto:
        return {"ok": False, "mensaje": "Se requiere mensaje o imagen"}

    # ── Extraer datos con Gemma ──────────────────────────────────
    if foto and tipo == "imagen":
        img_bytes = await foto.read()
        if len(img_bytes) > 15 * 1024 * 1024:
            return {"ok": False, "mensaje": "Imagen excede 15 MB"}

        # Intentar con extractor IMSS primero
        if _IMSS_EXTRACTOR_AVAILABLE:
            try:
                extracted = await extract_imss_os(img_bytes)
                if extracted and not extracted.get("error"):
                    mapped = map_to_orden_servicio(extracted)
                    falla = mapped.get("falla_reportada") or "Falla reportada por imagen"
                    equipo_nombre = mapped.get("equipo_nombre") or "Sin identificar"
                    equipo_serie = mapped.get("equipo_serie") or ""
                    area = mapped.get("area") or ""
                    prioridad = mapped.get("prioridad") or "media"
                    tipo_mant = mapped.get("tipo_mantenimiento") or "correctivo"
                    origen = "grupo_wa_imagen_imss"
                else:
                    raise ValueError("no es formato IMSS")
            except Exception:
                # No es formato IMSS — tratar como foto de equipo
                prompt = (
                    f"Eres el asistente de bioingeniería del HGR No.1 IMSS Tijuana.\n"
                    f"El técnico {sender_name or 'desconocido'} envió una foto al grupo de WhatsApp.\n"
                    f"Extrae en JSON plano (sin markdown): equipo_nombre, falla_reportada, area, prioridad (critica/alta/media/baja).\n"
                    f"Si no puedes extraer algún campo, usa null.\n"
                    f"Responde SOLO el JSON."
                )
                try:
                    rsp = await gemma_service.analizar_no_stream(prompt)
                    import json as _json
                    datos = _json.loads(rsp.strip().strip("```json").strip("```").strip())
                except Exception:
                    datos = {}
                falla = datos.get("falla_reportada") or f"Reporte por imagen de {sender_name or 'técnico'}"
                equipo_nombre = datos.get("equipo_nombre") or "Sin identificar"
                equipo_serie = ""
                area = datos.get("area") or ""
                prioridad = datos.get("prioridad") or "media"
                tipo_mant = "correctivo"
                origen = "grupo_wa_imagen"
        else:
            falla = f"Reporte por imagen de {sender_name or 'técnico'}"
            equipo_nombre = "Sin identificar"
            equipo_serie = ""
            area = ""
            prioridad = "media"
            tipo_mant = "correctivo"
            origen = "grupo_wa_imagen"
    else:
        # Texto libre — usar Gemma para extraer campos
        texto = mensaje or ""
        prompt = (
            f"Eres el asistente de bioingeniería del HGR No.1 IMSS Tijuana.\n"
            f"El técnico '{sender_name or 'desconocido'}' envió este mensaje al grupo de WhatsApp:\n"
            f"\"{texto}\"\n\n"
            f"Extrae en JSON plano (sin markdown ni bloques de código):\n"
            f"  equipo_nombre: nombre del equipo o aparato mencionado\n"
            f"  falla_reportada: descripción breve de la falla o trabajo\n"
            f"  area: área o servicio del hospital (Urgencias, Quirófano, UCIN, etc.)\n"
            f"  prioridad: critica|alta|media|baja según urgencia\n"
            f"  tipo_mantenimiento: correctivo|preventivo|instalacion\n"
            f"Si no puedes extraer algún campo con certeza, usa null.\n"
            f"Responde SOLO el JSON, sin explicaciones."
        )
        try:
            rsp = await gemma_service.analizar_no_stream(prompt)
            import json as _json
            # Limpiar posible markdown de Gemma
            clean = rsp.strip()
            if "```" in clean:
                clean = clean.split("```")[1].lstrip("json").strip()
            datos = _json.loads(clean)
        except Exception:
            datos = {}

        falla = datos.get("falla_reportada") or texto[:200]
        equipo_nombre = datos.get("equipo_nombre") or "Sin identificar"
        equipo_serie = ""
        area = datos.get("area") or ""
        prioridad = datos.get("prioridad") or "media"
        tipo_mant = datos.get("tipo_mantenimiento") or "correctivo"
        origen = "grupo_wa_texto"

        # Si Gemma no extrajo nada útil, no crear OS de basura
        if not falla or falla.lower() in ("null", "none", ""):
            return {
                "ok": False,
                "mensaje": "No se pudo extraer una falla o tarea del mensaje. No se creó OS.",
                "requiere_os": False,
            }

    # ── Crear OS ─────────────────────────────────────────────────
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT COUNT(*)+1 as next_num FROM ordenes_servicio WHERE YEAR(fecha) = YEAR(CURDATE())"
        )
        n = (await cur.fetchone())["next_num"]
        numero = f"OS-{datetime.now().strftime('%Y%m%d')}-{n:04d}"

        equipo_id = None
        if equipo_serie:
            await cur.execute("SELECT id FROM equipos WHERE serie = %s", (equipo_serie,))
            row = await cur.fetchone()
            if row:
                equipo_id = row["id"]

        await cur.execute(
            """INSERT INTO ordenes_servicio
            (numero_orden, tipo_formato, equipo_id, equipo_nombre, equipo_serie,
             area, tipo_mantenimiento, falla_reportada, tecnico_nombre,
             fecha, estado, prioridad, origen)
            VALUES (%s, 'correctivo_corto', %s, %s, %s, %s, %s, %s, %s, CURDATE(), 'abierta', %s, %s)""",
            (
                numero, equipo_id, equipo_nombre, equipo_serie,
                area, tipo_mant, falla, sender_name or "WhatsApp Bot",
                prioridad, origen,
            ),
        )
        orden_id = cur.lastrowid

        # Guardar imagen como evidencia si viene foto
        if foto and tipo == "imagen":
            ext = (foto.filename or "img").split(".")[-1].lower() if foto.filename else "jpg"
            if ext not in {"png", "jpg", "jpeg", "webp"}:
                ext = "jpg"
            secure_name = f"grp_wa_{orden_id}_{datetime.now().strftime('%Y%m%d')}_{secrets.token_hex(3)}.{ext}"
            ruta = os.path.join(UPLOAD_DIR, secure_name)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(ruta, "wb") as f:
                f.write(img_bytes)
            await cur.execute(
                "INSERT INTO os_evidencias (orden_id, ruta_archivo, tipo, descripcion) VALUES (%s, %s, 'imagen', %s)",
                (orden_id, f"/static/uploads/{secure_name}", f"Foto grupo WA — {sender_name or 'desconocido'}"),
            )

        await cur.execute(
            """INSERT INTO alertas (tipo, equipo_id, orden_id, mensaje, prioridad)
               VALUES ('ticket_abierto_mucho_tiempo', %s, %s, %s, %s)""",
            (equipo_id, orden_id, f"OS creada desde grupo WhatsApp por {sender_name or 'desconocido'}: {falla[:80]}", prioridad),
        )

    return {
        "ok": True,
        "numero_orden": numero,
        "orden_id": orden_id,
        "equipo": equipo_nombre,
        "falla": falla[:100],
        "prioridad": prioridad,
        "area": area,
        "tipo": tipo_mant,
        "mensaje": f"✅ OS *{numero}* registrada en SIGAH\n🔧 {equipo_nombre}: {falla[:80]}\n📍 {area or 'Sin área'} · Prioridad: {prioridad}",
    }


# ── /accion-qr — DEMO 2026-07-06 ────────────────────────────────────
# Recibe una foto con QR + texto desde WhatsApp, decodifica el QR,
# resuelve el equipo por qr_token, clasifica la acción por keywords,
# ejecuta el cambio de estado, crea una OS, y devuelve el PDF.

import re
import cv2
import numpy as np

QR_TOKEN_RE = re.compile(r"/equipo/([A-Za-z0-9_\-]+)")


def _decodificar_qr(img_bytes: bytes) -> str:
    """Decodifica el primer QR encontrado en la imagen."""
    try:
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return ""
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(img)
        if data:
            return data.strip()
    except Exception as e:
        print(f"[accion-qr] cv2 decode error: {e}")
    return ""


def _clasificar_accion(texto: str):
    """Devuelve (accion, estado_nuevo). Acciones: mantenimiento, baja, traslado,
    fuera_servicio, operativo, consulta."""
    t = (texto or "").lower()
    if any(k in t for k in ["dar de baja", "baja definitiva", "dar baja", "baja del equipo", "baja"]):
        return ("baja", "baja")
    if any(k in t for k in ["traslad", "mover a", "cambiar de area", "cambiar de área"]):
        return ("traslado", "en_traslado")
    if any(k in t for k in ["fuera de servicio", "fuera servicio", "descompost", "no sirve", "roto"]):
        return ("fuera_servicio", "fuera_servicio")
    if any(k in t for k in ["mantenimiento", "revisar", "preventivo", "correctivo", "calibrar", "mantener"]):
        return ("mantenimiento", "en_mantenimiento")
    if any(k in t for k in ["operativo", "funciona", "reactivar", "activar", "dar de alta"]):
        return ("operativo", "operativo")
    return ("consulta", "")


@router.post("/accion-qr")
async def accion_qr(
    foto: UploadFile = File(...),
    texto: str = Form(""),
    sender_name: str = Form("WhatsApp Demo"),
    conn=Depends(get_db),
):
    """Endpoint DEMO 2026-07-06: foto con QR + texto de acción.
    Decodifica QR -> resuelve equipo -> clasifica -> ejecuta -> crea OS -> devuelve PDF.
    """
    img_bytes = await foto.read()
    qr_data = _decodificar_qr(img_bytes)
    if not qr_data:
        return {"ok": False, "mensaje": "❌ No pude leer un QR en la foto. Asegúrate que se vea claro y bien iluminado."}

    m = QR_TOKEN_RE.search(qr_data)
    if m:
        qr_token = m.group(1)
    else:
        qr_token = qr_data.strip().split("?")[0].split("#")[0]

    accion, estado_nuevo = _clasificar_accion(texto)

    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT id, nombre, serie, estado, area, marca, modelo, piso,
                      inventario, criticidad
               FROM equipos WHERE qr_token = %s""",
            (qr_token,),
        )
        equipo = await cur.fetchone()
        if not equipo:
            return {"ok": False, "mensaje": f"❌ QR con token {qr_token[:8]}... no encontrado en el inventario."}

        equipo_id = equipo["id"]
        estado_anterior = equipo["estado"] or "sin_estado"

        if accion == "consulta":
            return {
                "ok": True,
                "accion": "consulta",
                "equipo": equipo["nombre"],
                "serie": equipo["serie"],
                "estado_actual": estado_anterior,
                "area": equipo.get("area") or "",
                "marca": equipo.get("marca") or "",
                "modelo": equipo.get("modelo") or "",
                "qr_token": qr_token,
                "mensaje": (
                    f"📋 *FICHA TÉCNICA — HGR1 IMSS TIJUANA*\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"🔧 *{equipo['nombre']}*\n"
                    f"🏷️  Marca/Modelo: {equipo.get('marca') or 'N/D'} {equipo.get('modelo') or ''}\n"
                    f"🔢 N° Serie: *{equipo['serie']}*\n"
                    f"📦 N° Inventario IMSS: *{equipo.get('inventario') or 'N/D'}*\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"📍 Piso: {equipo.get('piso') or 'N/D'} · Área: {equipo.get('area') or 'N/D'}\n"
                    f"🏥 Área: {equipo.get('area') or 'N/D'}\n"
                    f"⚠️  Criticidad: {equipo.get('criticidad') or 'N/D'}\n"
                    f"🔘 Estado actual: *{estado_anterior}*\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"_QR único: {qr_token}_"
                ),
            }

        # DEMO 2026-07-06: hardcoded tenant_id=1 (HGR1 IMSS TIJ) porque este endpoint
        # aun no migra a JWT (Fase 3 pendiente). Solo hay 1 hospital en prod.
        TENANT_ID = 1

        # Ejecutar cambio de estado
        await cur.execute(
            "UPDATE equipos SET estado = %s WHERE id = %s",
            (estado_nuevo, equipo_id),
        )

        # Generar numero de OS
        await cur.execute("SELECT COUNT(*)+1 as next_num FROM ordenes_servicio WHERE YEAR(fecha) = YEAR(CURDATE())")
        n = (await cur.fetchone())["next_num"]
        numero = f"OS-{datetime.now().strftime('%Y%m%d')}-{n:04d}"

        falla_texto = texto or f"Accion solicitada via WhatsApp QR: {accion}"
        # DEMO 2026-07-06: created_at/updated_at son NOT NULL sin default
        # (schema issue global, no solo de este endpoint). Se setean con NOW().
        await cur.execute(
            """INSERT INTO ordenes_servicio
            (tenant_id, numero_orden, tipo_formato, equipo_id, equipo_nombre, equipo_serie,
             area, tipo_mantenimiento, tipo_atencion, falla_reportada, tecnico_nombre,
             fecha, estado, prioridad, origen, created_at, updated_at)
            VALUES (%s, %s, 'correctivo_corto', %s, %s, %s, %s, %s, %s, %s, %s, CURDATE(),
                    'cerrada', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
            (
                TENANT_ID, numero, equipo_id, equipo["nombre"], equipo["serie"],
                equipo.get("area") or "", "correctivo" if accion == "fuera_servicio" else "preventivo",
                "correctivo" if accion in ("fuera_servicio", "baja") else "preventivo",
                falla_texto, sender_name,
                "alta" if estado_nuevo in ("fuera_servicio", "baja") else "media",
                f"whatsapp_qr_{accion}",
            ),
        )
        orden_id = cur.lastrowid

        # Guardar la foto como evidencia
        ext = "jpg"
        if foto.filename and "." in foto.filename:
            cand = foto.filename.rsplit(".", 1)[-1].lower()
            if cand in {"png", "jpg", "jpeg", "webp"}:
                ext = cand
        secure_name = f"qr_wa_{orden_id}_{datetime.now().strftime('%Y%m%d')}_{secrets.token_hex(3)}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, secure_name)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(ruta, "wb") as f:
            f.write(img_bytes)
        await cur.execute(
            "INSERT INTO os_evidencias (tenant_id, orden_id, ruta_archivo, tipo, descripcion, created_at) VALUES (%s, %s, %s, 'imagen', %s, CURRENT_TIMESTAMP)",
            (TENANT_ID, orden_id, f"/static/uploads/{secure_name}", f"QR foto WhatsApp - {sender_name}"),
        )

        # Alerta
        await cur.execute(
            """INSERT INTO alertas (tenant_id, tipo, equipo_id, orden_id, mensaje, prioridad,
                                   leida, enviada_whatsapp, created_at)
               VALUES (%s, 'cambio_estado_qr_bot', %s, %s, %s, %s, 0, 0, CURRENT_TIMESTAMP)""",
            (
                TENANT_ID, equipo_id, orden_id,
                f"WhatsApp QR: {equipo['nombre']} {estado_anterior} -> {estado_nuevo} (accion: {accion})",
                "alta" if estado_nuevo in ("fuera_servicio", "baja") else "media",
            ),
        )

    # Generar PDF fuera del cursor
    pdf_path = None
    try:
        from services.pdf_service import generar_pdf_orden
        try:
            pdf_path = generar_pdf_orden(orden_id)
        except TypeError:
            pdf_path = generar_pdf_orden(numero)
    except Exception as e:
        print(f"[accion-qr] PDF generation error: {e}")

    return {
        "ok": True,
        "accion": accion,
        "estado_anterior": estado_anterior,
        "estado_nuevo": estado_nuevo,
        "equipo": equipo["nombre"],
        "serie": equipo["serie"],
        "qr_token": qr_token,
        "numero_orden": numero,
        "orden_id": orden_id,
        "pdf_path": pdf_path,
        "mensaje": (
            f"✅ *ACCIÓN EJECUTADA — HGR1 IMSS TIJUANA*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🔧 *{equipo['nombre']}*\n"
            f"🏷️  {equipo.get('marca') or 'N/D'} {equipo.get('modelo') or ''}\n"
            f"🔢 Serie: *{equipo['serie']}* · Inv: *{equipo.get('inventario') or 'N/D'}*\n"
            f"📍 Piso: {equipo.get('piso') or 'N/D'} · Área: {equipo.get('area') or 'N/D'}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚙️  Acción: *{accion.upper()}*\n"
            f"🔘 Estado: {estado_anterior} → *{estado_nuevo}*\n"
            f"📋 Orden de Servicio: *{numero}*\n"
            f"👤 Técnico: {sender_name}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📄 PDF de la OS adjunto ↓"
        ),
    }


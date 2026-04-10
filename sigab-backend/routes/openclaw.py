from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Optional
import aiomysql
import json
import os
import shutil
from datetime import datetime
from config import get_db, UPLOAD_DIR

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


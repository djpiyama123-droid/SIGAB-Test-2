from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import Optional
import aiomysql
import os
import json
import secrets
from datetime import datetime
from config import get_db, UPLOAD_DIR
from auth.dependencies import get_current_user
from services.tecnovigilancia_pdf_service import generar_pdf_nom240

router = APIRouter()

# ── Transiciones válidas del state machine ───────────────────────
TRANSICIONES = {
    "reportado":          ["en_investigacion", "cancelado"],
    "en_investigacion":   ["documentado", "cancelado"],
    "documentado":        ["escalado_cofepris", "cerrado"],
    "escalado_cofepris":  ["cerrado"],
    "cerrado":            [],
    "cancelado":          [],
}


async def _log_actividad(cur, tabla, registro_id, accion, usuario_id, antes, despues):
    await cur.execute(
        """INSERT INTO log_actividad
           (tabla_afectada, registro_id, accion, usuario_id, origen,
            datos_anteriores, datos_nuevos)
           VALUES (%s, %s, %s, %s, 'dashboard', %s, %s)""",
        (
            tabla, registro_id, accion, usuario_id,
            json.dumps(antes, default=str) if antes else None,
            json.dumps(despues, default=str) if despues else None,
        ),
    )


@router.get("/")
async def listar_eventos(
    estado: Optional[str] = None,
    severidad: Optional[str] = None,
    tipo_evento: Optional[str] = None,
    equipo_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    busqueda: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT te.*, u.nombre as reportante_nombre
            FROM tecnovigilancia_eventos te
            LEFT JOIN usuarios u ON te.reportado_por_id = u.id
            WHERE 1=1
        """
        params = []

        if estado:
            query += " AND te.estado = %s"
            params.append(estado)
        if severidad:
            query += " AND te.severidad = %s"
            params.append(severidad)
        if tipo_evento:
            query += " AND te.tipo_evento = %s"
            params.append(tipo_evento)
        if equipo_id:
            query += " AND te.equipo_id = %s"
            params.append(equipo_id)
        if fecha_desde:
            query += " AND te.fecha_evento >= %s"
            params.append(fecha_desde)
        if fecha_hasta:
            query += " AND te.fecha_evento <= %s"
            params.append(fecha_hasta)
        if busqueda:
            query += " AND (te.numero_reporte LIKE %s OR te.dispositivo_nombre LIKE %s)"
            params.extend([f"%{busqueda}%", f"%{busqueda}%"])

        query += " ORDER BY te.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        await cur.execute(query, params)
        eventos = await cur.fetchall()

    return {"eventos": eventos, "total": len(eventos)}


@router.get("/{evento_id}")
async def obtener_evento(
    evento_id: int,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT te.*,
                      rep.nombre as reportante_nombre,
                      inv.nombre as investigador_nombre
               FROM tecnovigilancia_eventos te
               LEFT JOIN usuarios rep ON te.reportado_por_id = rep.id
               LEFT JOIN usuarios inv ON te.investigador_id = inv.id
               WHERE te.id = %s""",
            (evento_id,),
        )
        evento = await cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        await cur.execute(
            """SELECT ev.*, u.nombre as subido_por_nombre
               FROM tecnovigilancia_evidencias ev
               LEFT JOIN usuarios u ON ev.subido_por_id = u.id
               WHERE ev.evento_id = %s
               ORDER BY ev.created_at""",
            (evento_id,),
        )
        evidencias = await cur.fetchall()

    return {"evento": evento, "evidencias": evidencias}


@router.post("/")
async def crear_evento(
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    equipo_id = data.get("equipo_id")
    if not equipo_id:
        raise HTTPException(status_code=400, detail="equipo_id es obligatorio")
    if not data.get("descripcion_evento"):
        raise HTTPException(status_code=400, detail="descripcion_evento es obligatorio")
    if not data.get("tipo_evento"):
        raise HTTPException(status_code=400, detail="tipo_evento es obligatorio")
    if not data.get("severidad"):
        raise HTTPException(status_code=400, detail="severidad es obligatorio")

    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Snapshot del dispositivo
        await cur.execute("SELECT * FROM equipos WHERE id = %s", (equipo_id,))
        equipo = await cur.fetchone()
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Generar numero_reporte: TV-HGR1-YYYYMMDD-NNNN
        hoy = datetime.now().strftime("%Y%m%d")
        await cur.execute(
            "SELECT COUNT(*)+1 as n FROM tecnovigilancia_eventos WHERE DATE(created_at) = CURDATE()"
        )
        n = (await cur.fetchone())["n"]
        numero_reporte = f"TV-HGR1-{hoy}-{n:04d}"

        await cur.execute(
            """INSERT INTO tecnovigilancia_eventos
               (numero_reporte, equipo_id,
                dispositivo_nombre, dispositivo_marca, dispositivo_modelo,
                dispositivo_serie, dispositivo_lote, dispositivo_registro_sanitario,
                tipo_evento, severidad, fecha_evento, lugar_evento,
                descripcion_evento, consecuencia_clinica, accion_correctiva,
                paciente_sexo, paciente_edad, dispositivo_estado_post,
                reportado_por_id)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                numero_reporte,
                equipo_id,
                equipo["nombre"],
                equipo["marca"],
                equipo["modelo"],
                equipo["serie"],
                data.get("dispositivo_lote"),
                data.get("dispositivo_registro_sanitario"),
                data["tipo_evento"],
                data["severidad"],
                data.get("fecha_evento", datetime.now().isoformat()),
                data.get("lugar_evento"),
                data["descripcion_evento"],
                data.get("consecuencia_clinica"),
                data.get("accion_correctiva"),
                data.get("paciente_sexo", "no_aplica"),
                data.get("paciente_edad"),
                data.get("dispositivo_estado_post"),
                user["id"],
            ),
        )
        evento_id = cur.lastrowid

        await _log_actividad(
            cur, "tecnovigilancia_eventos", evento_id, "INSERT",
            user["id"], None,
            {"numero_reporte": numero_reporte, "equipo_id": equipo_id,
             "tipo_evento": data["tipo_evento"], "severidad": data["severidad"]},
        )

    return {"ok": True, "numero_reporte": numero_reporte, "evento_id": evento_id}


@router.put("/{evento_id}/estado")
async def cambiar_estado(
    evento_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    nuevo_estado = data.get("estado")
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT estado FROM tecnovigilancia_eventos WHERE id = %s", (evento_id,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        actual = row["estado"]
        permitidos = TRANSICIONES.get(actual, [])
        if nuevo_estado not in permitidos:
            raise HTTPException(
                status_code=400,
                detail=f"Transici\u00f3n inv\u00e1lida: {actual} \u2192 {nuevo_estado}. Permitidos: {permitidos}",
            )

        await cur.execute(
            "UPDATE tecnovigilancia_eventos SET estado = %s WHERE id = %s",
            (nuevo_estado, evento_id),
        )
        await _log_actividad(
            cur, "tecnovigilancia_eventos", evento_id, "UPDATE",
            user["id"], {"estado": actual}, {"estado": nuevo_estado},
        )

    return {"ok": True, "estado_anterior": actual, "estado_nuevo": nuevo_estado}


@router.put("/{evento_id}/investigar")
async def investigar_evento(
    evento_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM tecnovigilancia_eventos WHERE id = %s", (evento_id,))
        evento = await cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento["estado"] not in ("reportado", "en_investigacion"):
            raise HTTPException(
                status_code=400,
                detail=f"No se puede investigar en estado '{evento['estado']}'",
            )

        nuevo_estado = data.get("estado", "en_investigacion")
        if nuevo_estado not in ("en_investigacion", "documentado"):
            raise HTTPException(status_code=400, detail="Estado de investigaci\u00f3n inv\u00e1lido")

        await cur.execute(
            """UPDATE tecnovigilancia_eventos
               SET hallazgos = %s, causa_raiz = %s,
                   investigador_id = %s, fecha_investigacion = NOW(),
                   estado = %s
               WHERE id = %s""",
            (
                data.get("hallazgos"),
                data.get("causa_raiz"),
                user["id"],
                nuevo_estado,
                evento_id,
            ),
        )
        await _log_actividad(
            cur, "tecnovigilancia_eventos", evento_id, "UPDATE",
            user["id"],
            {"estado": evento["estado"], "hallazgos": evento.get("hallazgos")},
            {"estado": nuevo_estado, "hallazgos": data.get("hallazgos"),
             "causa_raiz": data.get("causa_raiz")},
        )

    return {"ok": True, "estado": nuevo_estado}


@router.post("/{evento_id}/escalar")
async def escalar_cofepris(
    evento_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT estado FROM tecnovigilancia_eventos WHERE id = %s", (evento_id,))
        evento = await cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento["estado"] != "documentado":
            raise HTTPException(
                status_code=400,
                detail="Solo se puede escalar desde estado 'documentado'",
            )

        folio = data.get("folio_cofepris", "")
        await cur.execute(
            """UPDATE tecnovigilancia_eventos
               SET estado = 'escalado_cofepris',
                   enviado_cofepris = TRUE,
                   fecha_envio_cofepris = NOW(),
                   folio_cofepris = %s
               WHERE id = %s""",
            (folio, evento_id),
        )
        await _log_actividad(
            cur, "tecnovigilancia_eventos", evento_id, "UPDATE",
            user["id"],
            {"estado": "documentado"},
            {"estado": "escalado_cofepris", "folio_cofepris": folio},
        )

    return {"ok": True, "estado": "escalado_cofepris", "folio_cofepris": folio}


@router.put("/{evento_id}/cerrar")
async def cerrar_evento(
    evento_id: int,
    data: dict,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT estado FROM tecnovigilancia_eventos WHERE id = %s", (evento_id,))
        evento = await cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        permitidos = TRANSICIONES.get(evento["estado"], [])
        if "cerrado" not in permitidos:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede cerrar desde estado '{evento['estado']}'",
            )

        conclusion = data.get("conclusion", "")
        await cur.execute(
            """UPDATE tecnovigilancia_eventos
               SET estado = 'cerrado', conclusion = %s, fecha_cierre = NOW()
               WHERE id = %s""",
            (conclusion, evento_id),
        )
        await _log_actividad(
            cur, "tecnovigilancia_eventos", evento_id, "UPDATE",
            user["id"],
            {"estado": evento["estado"]},
            {"estado": "cerrado", "conclusion": conclusion},
        )

    return {"ok": True, "estado": "cerrado"}


@router.post("/{evento_id}/evidencia")
async def subir_evidencia(
    evento_id: int,
    tipo: str = "otro",
    descripcion: str = "",
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    ext = file.filename.split(".")[-1].lower()
    extensiones_validas = {"png", "jpg", "jpeg", "webp", "pdf", "doc", "docx"}
    if ext not in extensiones_validas:
        raise HTTPException(status_code=400, detail=f"Extensi\u00f3n no permitida: {ext}")

    filename = f"tv_{evento_id}_{secrets.token_hex(6)}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(await file.read())

    file_url = f"/static/uploads/{filename}"

    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO tecnovigilancia_evidencias
               (evento_id, ruta_archivo, tipo, descripcion, subido_por_id)
               VALUES (%s, %s, %s, %s, %s)""",
            (evento_id, file_url, tipo, descripcion, user["id"]),
        )
        evidencia_id = cur.lastrowid

    return {"ok": True, "id": evidencia_id, "url": file_url}


@router.get("/{evento_id}/pdf")
async def descargar_pdf_nom240(
    evento_id: int,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT te.*,
                      rep.nombre as reportante_nombre, rep.matricula as reportante_matricula,
                      inv.nombre as investigador_nombre, inv.matricula as investigador_matricula
               FROM tecnovigilancia_eventos te
               LEFT JOIN usuarios rep ON te.reportado_por_id = rep.id
               LEFT JOIN usuarios inv ON te.investigador_id = inv.id
               WHERE te.id = %s""",
            (evento_id,),
        )
        evento = await cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        await cur.execute(
            "SELECT * FROM tecnovigilancia_evidencias WHERE evento_id = %s",
            (evento_id,),
        )
        evidencias = await cur.fetchall()

    pdf_bytes = generar_pdf_nom240(evento, evidencias)

    numero = evento.get("numero_reporte", str(evento_id))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=TV_{numero}.pdf"},
    )

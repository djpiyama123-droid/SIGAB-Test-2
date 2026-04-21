"""
routes/reportes.py — Generación de reportes diarios y mensuales.

Operaciones:
  GET /reportes/diario           — Resumen del día (JSON): OS hoy, pendientes, equipos por estado
  GET /reportes/equipos-criticos — Equipos fuera_servicio + mantenimiento + criticidad alta
  GET /reportes/historial        — Historial de OS por mes/año
  GET /reportes/diario/pdf       — Exportar reporte diario como PDF
  GET /reportes/diario/excel     — Exportar reporte diario como Excel (.xlsx)
  GET /reportes/historial/pdf    — Exportar historial mensual como PDF
  GET /reportes/historial/excel  — Exportar historial mensual como Excel (.xlsx)

Servicios utilizados: reporte_pdf_service, reporte_excel_service
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, Response
import aiomysql
from datetime import datetime
from io import BytesIO
from config import get_db
from auth.dependencies import get_current_user
from services.reporte_pdf_service import generar_pdf_reporte_diario, generar_pdf_historial
from services.reporte_excel_service import generar_excel_reporte_diario, generar_excel_historial

router = APIRouter()


@router.get("/diario")
async def reporte_diario(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE DATE(created_at) = CURDATE()"
        )
        os_hoy = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE estado IN ('abierta','en_progreso')"
        )
        os_abiertas = (await cur.fetchone())["total"]

        await cur.execute("SELECT estado, COUNT(*) as total FROM equipos GROUP BY estado")
        equipos_estado = await cur.fetchall()

        await cur.execute(
            """SELECT pp.tipo_preventivo, pp.proxima_ejecucion, e.nombre, e.serie
               FROM preventivos_programados pp
               JOIN equipos e ON pp.equipo_id = e.id
               WHERE pp.proxima_ejecucion <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND pp.activo = TRUE
               ORDER BY pp.proxima_ejecucion ASC"""
        )
        preventivos_semana = await cur.fetchall()

    return {
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "ordenes_hoy": os_hoy,
        "ordenes_abiertas": os_abiertas,
        "equipos_por_estado": equipos_estado,
        "preventivos_proxima_semana": preventivos_semana,
    }


@router.get("/equipos-criticos")
async def equipos_criticos(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT e.*,
                      (SELECT COUNT(*) FROM ordenes_servicio os WHERE os.equipo_id = e.id AND os.estado IN ('abierta','en_progreso')) as tickets_abiertos
               FROM equipos e
               WHERE e.estado IN ('fuera_servicio','en_mantenimiento') OR e.criticidad = 'alta'
               ORDER BY FIELD(e.estado,'fuera_servicio','en_mantenimiento','operativo'), e.nombre"""
        )
        equipos = await cur.fetchall()

    return {"equipos_criticos": equipos, "total": len(equipos)}


@router.get("/historial")
async def historial_ordenes(
    mes: int = None,
    anio: int = None,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        if not mes:
            mes = datetime.now().month
        if not anio:
            anio = datetime.now().year

        await cur.execute(
            """SELECT os.*, e.nombre as equipo_nombre_rel
               FROM ordenes_servicio os
               LEFT JOIN equipos e ON os.equipo_id = e.id
               WHERE MONTH(os.fecha) = %s AND YEAR(os.fecha) = %s
               ORDER BY os.fecha DESC""",
            (mes, anio),
        )
        ordenes = await cur.fetchall()

        await cur.execute(
            """SELECT tipo_mantenimiento, COUNT(*) as total
               FROM ordenes_servicio
               WHERE MONTH(fecha) = %s AND YEAR(fecha) = %s
               GROUP BY tipo_mantenimiento""",
            (mes, anio),
        )
        resumen = await cur.fetchall()

    return {"mes": mes, "anio": anio, "ordenes": ordenes, "resumen_tipos": resumen}


# ── Exportación PDF ───────────────────────────────────────────

async def _get_datos_diario(conn):
    """Reutiliza las mismas queries que /diario."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE DATE(created_at) = CURDATE()"
        )
        os_hoy = (await cur.fetchone())["total"]
        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE estado IN ('abierta','en_progreso')"
        )
        os_abiertas = (await cur.fetchone())["total"]
        await cur.execute("SELECT estado, COUNT(*) as total FROM equipos GROUP BY estado")
        equipos_estado = await cur.fetchall()
        await cur.execute(
            """SELECT pp.tipo_preventivo, pp.proxima_ejecucion, e.nombre, e.serie
               FROM preventivos_programados pp
               JOIN equipos e ON pp.equipo_id = e.id
               WHERE pp.proxima_ejecucion <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND pp.activo = TRUE
               ORDER BY pp.proxima_ejecucion ASC"""
        )
        preventivos = await cur.fetchall()
        await cur.execute(
            """SELECT e.*,
                      (SELECT COUNT(*) FROM ordenes_servicio os WHERE os.equipo_id = e.id AND os.estado IN ('abierta','en_progreso')) as tickets_abiertos
               FROM equipos e
               WHERE e.estado IN ('fuera_servicio','en_mantenimiento') OR e.criticidad = 'alta'
               ORDER BY FIELD(e.estado,'fuera_servicio','en_mantenimiento','operativo'), e.nombre"""
        )
        criticos = await cur.fetchall()
    datos = {
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "ordenes_hoy": os_hoy,
        "ordenes_abiertas": os_abiertas,
        "equipos_por_estado": equipos_estado,
        "preventivos_proxima_semana": preventivos,
    }
    return datos, criticos


async def _get_datos_historial(mes, anio, conn):
    """Reutiliza las mismas queries que /historial."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT os.*, e.nombre as equipo_nombre_rel
               FROM ordenes_servicio os
               LEFT JOIN equipos e ON os.equipo_id = e.id
               WHERE MONTH(os.fecha) = %s AND YEAR(os.fecha) = %s
               ORDER BY os.fecha DESC""",
            (mes, anio),
        )
        ordenes = await cur.fetchall()
        await cur.execute(
            """SELECT tipo_mantenimiento, COUNT(*) as total
               FROM ordenes_servicio
               WHERE MONTH(fecha) = %s AND YEAR(fecha) = %s
               GROUP BY tipo_mantenimiento""",
            (mes, anio),
        )
        resumen = await cur.fetchall()
    return ordenes, resumen


@router.get("/diario/pdf")
async def reporte_diario_pdf(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    datos, criticos = await _get_datos_diario(conn)
    pdf_bytes = generar_pdf_reporte_diario(datos, criticos)
    fecha = datos["fecha"]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="reporte-diario-{fecha}.pdf"'},
    )


@router.get("/diario/excel")
async def reporte_diario_excel(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    datos, criticos = await _get_datos_diario(conn)
    xlsx_bytes = generar_excel_reporte_diario(datos, criticos)
    fecha = datos["fecha"]
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="reporte-diario-{fecha}.xlsx"'},
    )


@router.get("/historial/pdf")
async def historial_pdf(
    mes: int = None,
    anio: int = None,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not mes:
        mes = datetime.now().month
    if not anio:
        anio = datetime.now().year
    ordenes, resumen = await _get_datos_historial(mes, anio, conn)
    pdf_bytes = generar_pdf_historial(mes, anio, ordenes, resumen)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="historial-{anio}-{mes:02d}.pdf"'},
    )


@router.get("/historial/excel")
async def historial_excel(
    mes: int = None,
    anio: int = None,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not mes:
        mes = datetime.now().month
    if not anio:
        anio = datetime.now().year
    ordenes, _ = await _get_datos_historial(mes, anio, conn)
    xlsx_bytes = generar_excel_historial(mes, anio, ordenes)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="historial-{anio}-{mes:02d}.xlsx"'},
    )

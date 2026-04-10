from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import aiomysql
import asyncio
import json
from datetime import datetime
from config import get_db, DB_CONFIG
from auth.dependencies import get_current_user, require_roles
from services.reliability_service import obtener_metricas_fiabilidad

router = APIRouter()


@router.get("/mapa")
async def get_mapa_equipos(conn=Depends(get_db)):
    """Retorna zonas activas con sus equipos para el mapa hospitalario."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("""
            SELECT
                z.id, z.nombre, z.codigo, z.piso,
                z.color_bg, z.color_borde, z.orden,
                COUNT(e.id) AS total_equipos,
                SUM(e.estado = 'operativo') AS operativos,
                SUM(e.estado = 'en_mantenimiento') AS en_mantenimiento,
                SUM(e.estado = 'fuera_servicio') AS fuera_servicio
            FROM zonas_mapa z
            LEFT JOIN equipos e ON e.zona_id = z.id
            WHERE z.activa = TRUE
            GROUP BY z.id
            ORDER BY z.orden
        """)
        zonas = await cur.fetchall()

        await cur.execute("""
            SELECT
                e.id, e.serie, e.inventario, e.nombre,
                e.marca, e.modelo, e.estado, e.criticidad,
                e.tipo_equipo, e.clase_cofepris,
                e.pos_x, e.pos_y, e.zona_id,
                e.imagen_url,
                e.area, e.piso,
                e.fecha_ultimo_mantenimiento,
                e.fecha_proximo_mantenimiento,
                e.fecha_compra,
                e.numero_contrato_servicio,
                e.proveedor_servicio
            FROM equipos e
            WHERE e.zona_id IS NOT NULL
            ORDER BY e.zona_id, e.id
        """)
        equipos = await cur.fetchall()

    # Serializar fechas y Decimals
    for eq in equipos:
        for campo in ['fecha_ultimo_mantenimiento', 'fecha_proximo_mantenimiento', 'fecha_compra']:
            if eq.get(campo):
                eq[campo] = eq[campo].isoformat()
        for campo in ['pos_x', 'pos_y']:
            if eq.get(campo) is not None:
                eq[campo] = float(eq[campo])

    # Convertir Decimal counts en zonas
    for zona in zonas:
        for campo in ['total_equipos', 'operativos', 'en_mantenimiento', 'fuera_servicio']:
            zona[campo] = int(zona[campo] or 0)

    # Agrupar equipos por zona
    equipos_por_zona = {}
    for eq in equipos:
        zid = eq['zona_id']
        if zid not in equipos_por_zona:
            equipos_por_zona[zid] = []
        equipos_por_zona[zid].append(eq)

    resultado = []
    for zona in zonas:
        zona_data = dict(zona)
        zona_data['equipos'] = equipos_por_zona.get(zona['id'], [])
        resultado.append(zona_data)

    return {"zonas": resultado, "timestamp": datetime.now().isoformat()}


@router.get("/resumen")
async def dashboard_resumen(conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT estado, COUNT(*) as total FROM equipos GROUP BY estado")
        estados = await cur.fetchall()

        await cur.execute(
            "SELECT COUNT(*) as total FROM ordenes_servicio WHERE estado IN ('abierta','en_progreso')"
        )
        tickets = await cur.fetchone()

        await cur.execute("SELECT COUNT(*) as total FROM alertas WHERE leida = FALSE")
        alertas = await cur.fetchone()

        await cur.execute(
            """SELECT COUNT(*) as total FROM preventivos_programados
               WHERE proxima_ejecucion <= CURDATE() AND activo = TRUE"""
        )
        vencidos = await cur.fetchone()

        await cur.execute(
            """SELECT t.*, e.nombre as equipo_nombre, e.serie
               FROM trazabilidad t
               JOIN equipos e ON t.equipo_id = e.id
               ORDER BY t.fecha_movimiento DESC LIMIT 10"""
        )
        movimientos = await cur.fetchall()

        await cur.execute(
            """SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, COUNT(*) as total
               FROM ordenes_servicio
               WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
               GROUP BY mes
               ORDER BY mes ASC"""
        )
        ordenes_mes = await cur.fetchall()

    return {
        "equipos_por_estado": estados,
        "tickets_abiertos": tickets["total"],
        "alertas_pendientes": alertas["total"],
        "preventivos_vencidos": vencidos["total"],
        "ultimos_movimientos": movimientos,
        "ordenes_por_mes": ordenes_mes,
    }


@router.get("/equipos")
async def dashboard_equipos(
    estado: str = None,
    area: str = None,
    piso: str = None,
    buscar: str = None,
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = "SELECT * FROM v_dashboard_equipos WHERE 1=1"
        params = []

        if estado:
            query += " AND estado = %s"
            params.append(estado)
        if area:
            query += " AND area = %s"
            params.append(area)
        if piso:
            query += " AND piso = %s"
            params.append(piso)
        if buscar:
            query += " AND (nombre LIKE %s OR serie LIKE %s OR marca LIKE %s OR modelo LIKE %s)"
            b = f"%{buscar}%"
            params.extend([b, b, b, b])

        query += " ORDER BY FIELD(estado,'fuera_servicio','en_mantenimiento','en_traslado','operativo','baja')"

        await cur.execute(query, params)
        equipos = await cur.fetchall()

    return {"equipos": equipos, "total": len(equipos)}


@router.get("/stream")
async def dashboard_sse():
    async def event_generator():
        while True:
            conn = await aiomysql.connect(**DB_CONFIG)
            try:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute("""
                        SELECT 'equipo_update' as tipo, id, nombre, estado, updated_at
                        FROM equipos
                        WHERE updated_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
                        UNION ALL
                        SELECT 'nueva_orden' as tipo, id, equipo_nombre as nombre, estado, created_at
                        FROM ordenes_servicio
                        WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
                        UNION ALL
                        SELECT 'nueva_alerta' as tipo, id, mensaje as nombre, prioridad as estado, created_at
                        FROM alertas
                        WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND) AND leida = FALSE
                    """)
                    cambios = await cur.fetchall()

                    if cambios:
                        for cambio in cambios:
                            for k, v in cambio.items():
                                if hasattr(v, "isoformat"):
                                    cambio[k] = v.isoformat()
                            data = json.dumps(cambio, ensure_ascii=False)
                            yield f"event: {cambio['tipo']}\ndata: {data}\n\n"
                    else:
                        yield "event: heartbeat\ndata: {}\n\n"
            finally:
                conn.close()

            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

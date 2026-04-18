"""
Servicio de generación automática de alertas.
"""

import aiomysql
from config import DB_CONFIG


class AlertaService:
    @staticmethod
    async def generar_alertas_preventivos():
        conn = await aiomysql.connect(**DB_CONFIG)
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad)
                    SELECT
                        'mantenimiento_proximo',
                        pp.equipo_id,
                        CONCAT('Mantenimiento "', pp.tipo_preventivo, '" vence el ', pp.proxima_ejecucion,
                               ' para equipo ', e.nombre, ' (', e.serie, ')'),
                        IF(pp.proxima_ejecucion <= CURDATE(), 'critica', 'alta')
                    FROM preventivos_programados pp
                    JOIN equipos e ON pp.equipo_id = e.id
                    WHERE pp.activo = TRUE
                      AND pp.proxima_ejecucion <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
                      AND NOT EXISTS (
                        SELECT 1 FROM alertas a
                        WHERE a.equipo_id = pp.equipo_id
                          AND a.tipo = 'mantenimiento_proximo'
                          AND DATE(a.created_at) = CURDATE()
                      )
                """)
        finally:
            conn.close()

    @staticmethod
    async def generar_alerta_equipo_fuera_servicio():
        conn = await aiomysql.connect(**DB_CONFIG)
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad)
                    SELECT
                        'equipo_fuera_servicio',
                        e.id,
                        CONCAT('Equipo "', e.nombre, '" (', e.serie, ') marcado como fuera de servicio'),
                        'alta'
                    FROM equipos e
                    WHERE e.estado = 'fuera_servicio'
                      AND NOT EXISTS (
                        SELECT 1 FROM alertas a
                        WHERE a.equipo_id = e.id
                          AND a.tipo = 'equipo_fuera_servicio'
                          AND DATE(a.created_at) = CURDATE()
                      )
                """)
        finally:
            conn.close()

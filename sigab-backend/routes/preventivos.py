from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def listar_preventivos(
    vencidos: Optional[bool] = None,
    equipo_id: Optional[int] = None,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT pp.*, e.nombre as equipo_nombre, e.serie as equipo_serie,
                   e.marca as equipo_marca, e.area as equipo_area,
                   u.nombre as tecnico_nombre
            FROM preventivos_programados pp
            JOIN equipos e ON pp.equipo_id = e.id
            LEFT JOIN usuarios u ON pp.tecnico_asignado_id = u.id
            WHERE pp.activo = TRUE
        """
        params = []

        if vencidos is True:
            query += " AND pp.proxima_ejecucion <= CURDATE()"
        if equipo_id:
            query += " AND pp.equipo_id = %s"
            params.append(equipo_id)

        query += " ORDER BY pp.proxima_ejecucion ASC"
        await cur.execute(query, params)
        preventivos = await cur.fetchall()

    return {"preventivos": preventivos, "total": len(preventivos)}


@router.post("/")
async def crear_preventivo(data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO preventivos_programados
            (equipo_id, tipo_preventivo, frecuencia_dias, proxima_ejecucion,
             tecnico_asignado_id, descripcion_procedimiento)
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                data["equipo_id"],
                data["tipo_preventivo"],
                data.get("frecuencia_dias", 90),
                data["proxima_ejecucion"],
                data.get("tecnico_asignado_id"),
                data.get("descripcion_procedimiento"),
            ),
        )
    return {"ok": True, "id": cur.lastrowid}


@router.put("/{prev_id}/ejecutar")
async def marcar_ejecutado(prev_id: int, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM preventivos_programados WHERE id = %s", (prev_id,))
        pp = await cur.fetchone()

        if not pp:
            raise HTTPException(status_code=404, detail="Preventivo no encontrado")

        from datetime import date, timedelta

        nueva_fecha = date.today() + timedelta(days=pp["frecuencia_dias"])
        await cur.execute(
            """UPDATE preventivos_programados
               SET ultima_ejecucion = CURDATE(), proxima_ejecucion = %s
               WHERE id = %s""",
            (nueva_fecha, prev_id),
        )

        # Actualizar fecha en equipo
        await cur.execute(
            "UPDATE equipos SET fecha_ultimo_mantenimiento = CURDATE() WHERE id = %s",
            (pp["equipo_id"],),
        )

    return {"ok": True, "proxima_ejecucion": str(nueva_fecha)}

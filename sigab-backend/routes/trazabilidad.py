from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def listar_trazabilidad(
    equipo_id: Optional[int] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT t.*, e.nombre as equipo_nombre, e.serie as equipo_serie
            FROM trazabilidad t
            JOIN equipos e ON t.equipo_id = e.id
        """
        params = []

        if equipo_id:
            query += " WHERE t.equipo_id = %s"
            params.append(equipo_id)

        query += " ORDER BY t.fecha_movimiento DESC LIMIT %s"
        params.append(limit)

        await cur.execute(query, params)
        movimientos = await cur.fetchall()

    return {"movimientos": movimientos, "total": len(movimientos)}


@router.get("/equipo/{equipo_id}")
async def trazabilidad_equipo(equipo_id: int, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT t.*, u.nombre as usuario_nombre
               FROM trazabilidad t
               LEFT JOIN usuarios u ON t.usuario_id = u.id
               WHERE t.equipo_id = %s
               ORDER BY t.fecha_movimiento DESC""",
            (equipo_id,),
        )
        movimientos = await cur.fetchall()
    return {"movimientos": movimientos}


@router.post("/")
async def registrar_movimiento(data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Obtener ubicación actual
        await cur.execute(
            "SELECT id, area, piso FROM equipos WHERE id = %s", (data["equipo_id"],)
        )
        equipo = await cur.fetchone()

        if not equipo:
            return {"ok": False, "mensaje": "Equipo no encontrado"}

        await cur.execute(
            """INSERT INTO trazabilidad
            (equipo_id, area_origen, piso_origen, area_destino, piso_destino, motivo, usuario_id, notas)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data["equipo_id"],
                equipo["area"],
                equipo["piso"],
                data.get("area_destino"),
                data.get("piso_destino"),
                data.get("motivo"),
                data.get("usuario_id"),
                data.get("notas"),
            ),
        )

        # Actualizar ubicación del equipo
        await cur.execute(
            "UPDATE equipos SET area = %s, piso = %s WHERE id = %s",
            (data.get("area_destino"), data.get("piso_destino", equipo["piso"]), data["equipo_id"]),
        )

    return {"ok": True, "mensaje": "Movimiento registrado"}

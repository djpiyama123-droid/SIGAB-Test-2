from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def listar_reservas(
    estado: Optional[str] = None,
    equipo_id: Optional[int] = None,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT r.*, e.nombre as equipo_nombre, e.serie as equipo_serie,
                   u.nombre as solicitante_nombre
            FROM reservas r
            JOIN equipos e ON r.equipo_id = e.id
            LEFT JOIN usuarios u ON r.solicitante_id = u.id
            WHERE 1=1
        """
        params = []

        if estado:
            query += " AND r.estado = %s"
            params.append(estado)
        if equipo_id:
            query += " AND r.equipo_id = %s"
            params.append(equipo_id)

        query += " ORDER BY r.fecha_inicio DESC"
        await cur.execute(query, params)
        reservas = await cur.fetchall()

    return {"reservas": reservas}


@router.post("/")
async def crear_reserva(data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Verificar conflictos
        await cur.execute(
            """SELECT id FROM reservas
               WHERE equipo_id = %s AND estado IN ('pendiente','activa')
               AND fecha_inicio < %s AND (fecha_fin IS NULL OR fecha_fin > %s)""",
            (data["equipo_id"], data.get("fecha_fin"), data["fecha_inicio"]),
        )
        conflicto = await cur.fetchone()

        if conflicto:
            raise HTTPException(status_code=409, detail="Conflicto de reserva existente")

        await cur.execute(
            """INSERT INTO reservas
            (equipo_id, area_reserva, piso_reserva, solicitante_id, fecha_inicio, fecha_fin, motivo)
            VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                data["equipo_id"],
                data["area_reserva"],
                data.get("piso_reserva"),
                data.get("solicitante_id"),
                data["fecha_inicio"],
                data.get("fecha_fin"),
                data.get("motivo"),
            ),
        )
        reserva_id = cur.lastrowid

    return {"ok": True, "reserva_id": reserva_id}


@router.put("/{reserva_id}/estado")
async def cambiar_estado_reserva(reserva_id: int, data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    estado = data.get("estado")
    if estado not in ("pendiente", "activa", "completada", "cancelada"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE reservas SET estado = %s WHERE id = %s", (estado, reserva_id)
        )
    return {"ok": True}

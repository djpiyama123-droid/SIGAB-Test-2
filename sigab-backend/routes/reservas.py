from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant

router = APIRouter()


@router.get("/")
async def listar_reservas(
    estado: Optional[str] = None,
    equipo_id: Optional[int] = None,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Lista reservas del hospital del usuario autenticado.

    La tabla `reservas` no tiene columna tenant_id — se ancla vía JOIN
    con `equipos` que sí tiene tenant_id (patrón padre-hijo).
    """
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # El JOIN equipos garantiza que solo se devuelven reservas del tenant.
        query = """
            SELECT r.*, e.nombre as equipo_nombre, e.serie as equipo_serie,
                   u.nombre as solicitante_nombre
            FROM reservas r
            JOIN equipos e ON r.equipo_id = e.id
            LEFT JOIN usuarios u ON r.solicitante_id = u.id
            WHERE e.tenant_id = %s
        """
        params = [tenant_id]

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
async def crear_reserva(
    data: dict,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Crea una reserva. Verifica que el equipo objetivo pertenezca al tenant."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Verificar ownership del equipo antes de crear la reserva.
        # 404 (nunca 403) para no revelar existencia cross-tenant.
        await cur.execute(
            "SELECT id FROM equipos WHERE id = %s AND tenant_id = %s",
            (data.get("equipo_id"), tenant_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Verificar conflictos dentro del mismo tenant (el equipo ya está validado).
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
async def cambiar_estado_reserva(
    reserva_id: int,
    data: dict,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Cambia el estado de una reserva. Verifica ownership vía equipo."""
    estado = data.get("estado")
    if estado not in ("pendiente", "activa", "completada", "cancelada"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Verificar que la reserva pertenece a un equipo del tenant antes de mutar.
        await cur.execute(
            """SELECT r.id FROM reservas r
               JOIN equipos e ON r.equipo_id = e.id
               WHERE r.id = %s AND e.tenant_id = %s""",
            (reserva_id, tenant_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE reservas SET estado = %s WHERE id = %s", (estado, reserva_id)
        )
    return {"ok": True}

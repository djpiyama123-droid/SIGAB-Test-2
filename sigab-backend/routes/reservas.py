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
        # Nota: si la reserva nueva es abierta (fecha_fin=None), "fecha_inicio < NULL"
        # evalúa a NULL en SQL y la fila se excluye del WHERE — antes eso hacía que
        # el chequeo de solapamiento se saltara por completo para reservas abiertas,
        # permitiendo doble-reservar el equipo. Se trata NULL como "sin límite superior".
        await cur.execute(
            """SELECT id FROM reservas
               WHERE equipo_id = %s AND estado IN ('pendiente','activa')
               AND (%s IS NULL OR fecha_inicio < %s) AND (fecha_fin IS NULL OR fecha_fin > %s)""",
            (data["equipo_id"], data.get("fecha_fin"), data.get("fecha_fin"), data["fecha_inicio"]),
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


@router.put("/{reserva_id}")
async def editar_reserva(
    reserva_id: int,
    data: dict,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Edita una reserva. Verifica ownership vía equipo, valida fechas y
    solapamiento (excluyendo la propia reserva). Campos no enviados se conservan."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Ownership: la reserva debe colgar de un equipo del tenant. 404, nunca 403.
        await cur.execute(
            """SELECT r.* FROM reservas r
               JOIN equipos e ON r.equipo_id = e.id
               WHERE r.id = %s AND e.tenant_id = %s""",
            (reserva_id, tenant_id),
        )
        actual = await cur.fetchone()
        if not actual:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Merge: usar el valor nuevo si vino en el body, si no conservar el actual.
        equipo_id = data.get("equipo_id", actual["equipo_id"])
        fecha_inicio = data.get("fecha_inicio", actual["fecha_inicio"])
        fecha_fin = data.get("fecha_fin", actual["fecha_fin"])
        area_reserva = data.get("area_reserva", actual["area_reserva"])
        piso_reserva = data.get("piso_reserva", actual["piso_reserva"])
        motivo = data.get("motivo", actual["motivo"])

        # Si cambia el equipo, validar que el nuevo también sea del tenant.
        if equipo_id != actual["equipo_id"]:
            await cur.execute(
                "SELECT id FROM equipos WHERE id = %s AND tenant_id = %s",
                (equipo_id, tenant_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Validación: si hay fecha_fin, debe ser posterior al inicio.
        if fecha_fin and str(fecha_fin) <= str(fecha_inicio):
            raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior al inicio")

        # Solapamiento con otra reserva activa del mismo equipo (excluye la propia).
        # Mismo fix que en crear_reserva: fecha_fin=None (reserva abierta) no debe
        # anular el chequeo de solapamiento.
        await cur.execute(
            """SELECT id FROM reservas
               WHERE equipo_id = %s AND id != %s AND estado IN ('pendiente','activa')
               AND (%s IS NULL OR fecha_inicio < %s) AND (fecha_fin IS NULL OR fecha_fin > %s)""",
            (equipo_id, reserva_id, fecha_fin, fecha_fin, fecha_inicio),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Conflicto de reserva existente")

    async with conn.cursor() as cur:
        await cur.execute(
            """UPDATE reservas
               SET equipo_id = %s, area_reserva = %s, piso_reserva = %s,
                   fecha_inicio = %s, fecha_fin = %s, motivo = %s
               WHERE id = %s""",
            (equipo_id, area_reserva, piso_reserva, fecha_inicio, fecha_fin, motivo, reserva_id),
        )
    return {"ok": True}


@router.delete("/{reserva_id}")
async def eliminar_reserva(
    reserva_id: int,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Elimina una reserva. Verifica ownership vía equipo antes de borrar."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT r.id FROM reservas r
               JOIN equipos e ON r.equipo_id = e.id
               WHERE r.id = %s AND e.tenant_id = %s""",
            (reserva_id, tenant_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM reservas WHERE id = %s", (reserva_id,))
    return {"ok": True}

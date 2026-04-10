from fastapi import APIRouter, Depends
from typing import Optional
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def listar_alertas(
    leida: Optional[bool] = None,
    tipo: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT a.*, e.nombre as equipo_nombre, e.serie as equipo_serie
            FROM alertas a
            LEFT JOIN equipos e ON a.equipo_id = e.id
            WHERE 1=1
        """
        params = []

        if leida is not None:
            query += " AND a.leida = %s"
            params.append(leida)
        if tipo:
            query += " AND a.tipo = %s"
            params.append(tipo)

        query += " ORDER BY FIELD(a.prioridad,'critica','alta','media','baja'), a.created_at DESC LIMIT %s"
        params.append(limit)

        await cur.execute(query, params)
        alertas = await cur.fetchall()

    return {"alertas": alertas, "total": len(alertas)}


@router.get("/pendientes")
async def alertas_pendientes(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT * FROM v_alertas_pendientes LIMIT 50")
        alertas = await cur.fetchall()
    return {"alertas": alertas, "total": len(alertas)}


@router.put("/{alerta_id}/leer")
async def marcar_leida(alerta_id: int, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute("UPDATE alertas SET leida = TRUE WHERE id = %s", (alerta_id,))
    return {"ok": True}


@router.put("/leer-todas")
async def marcar_todas_leidas(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute("UPDATE alertas SET leida = TRUE WHERE leida = FALSE")
    return {"ok": True}

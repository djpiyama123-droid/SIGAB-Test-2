from fastapi import APIRouter, Depends, HTTPException, Form
import aiomysql
from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant

router = APIRouter()

@router.get("/")
async def listar_capacitaciones(
    equipo_id: int = None,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db)
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Filtrar siempre por tenant_id del equipo referenciado (JOIN obligatorio).
        # La tabla capacitaciones también tiene tenant_id propio (Phase 1 migration)
        # — doble filtro como defensa en profundidad.
        query = """
            SELECT c.*, e.nombre as equipo_nombre, e.serie as equipo_serie
            FROM capacitaciones c
            JOIN equipos e ON c.equipo_id = e.id
            WHERE c.tenant_id = %s AND e.tenant_id = %s
        """
        params = [tenant_id, tenant_id]
        if equipo_id:
            query += " AND c.equipo_id = %s"
            params.append(equipo_id)

        query += " ORDER BY c.fecha_capacitacion DESC"
        await cur.execute(query, params)
        return await cur.fetchall()

from models.schemas import CapacitacionSchema

@router.post("/")
async def registrar_capacitacion(
    data: CapacitacionSchema,
    user: dict = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db)
):
    async with conn.cursor() as cur:
        # Verificar que el equipo al que se asocia la capacitación pertenece al tenant.
        # 404 si el equipo no existe o es de otro hospital — no revelar existencia cross-tenant.
        await cur.execute(
            "SELECT id FROM equipos WHERE id = %s AND tenant_id = %s",
            (data.equipo_id, tenant_id)
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        await cur.execute(
            """INSERT INTO capacitaciones
               (equipo_id, tema, fecha_capacitacion, instructor, personal_capacitado, tenant_id)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (data.equipo_id, data.tema, data.fecha_capacitacion,
             data.instructor, data.personal_capacitado, tenant_id)
        )
        return {"ok": True, "id": cur.lastrowid}

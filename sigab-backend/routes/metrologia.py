from fastapi import APIRouter, Depends, HTTPException, Form
import aiomysql
from datetime import datetime, timedelta
from config import get_db
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant

router = APIRouter()

@router.get("/")
async def listar_calibraciones(
    equipo_id: int = None,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Lista calibraciones del hospital del usuario autenticado."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # JOIN con equipos para filtrar por tenant_id — metrologia_calibracion
        # no tiene columna tenant_id propia; Equipo es el ancla de tenancia.
        if equipo_id:
            query = """
                SELECT m.*, e.nombre as equipo_nombre, e.serie as equipo_serie
                FROM metrologia_calibracion m
                JOIN equipos e ON m.equipo_id = e.id
                WHERE e.tenant_id = %s AND m.equipo_id = %s
                ORDER BY m.proxima_calibracion ASC
            """
            params = [tenant_id, equipo_id]
        else:
            query = """
                SELECT m.*, e.nombre as equipo_nombre, e.serie as equipo_serie
                FROM metrologia_calibracion m
                JOIN equipos e ON m.equipo_id = e.id
                WHERE e.tenant_id = %s
                ORDER BY m.proxima_calibracion ASC
            """
            params = [tenant_id]

        await cur.execute(query, params)
        return await cur.fetchall()

from models.schemas import CalibracionSchema

@router.post("/")
async def registrar_calibracion(
    data: CalibracionSchema,
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Registra una calibración. Verifica que el equipo pertenezca al tenant."""
    fecha_dt = datetime.combine(data.fecha_calibracion, datetime.min.time())
    proxima_dt = fecha_dt + timedelta(days=30 * data.vigencia_meses)

    async with conn.cursor(aiomysql.DictCursor) as cur:
        # Verificar ownership del equipo antes de insertar.
        await cur.execute(
            "SELECT id FROM equipos WHERE id = %s AND tenant_id = %s",
            (data.equipo_id, tenant_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO metrologia_calibracion
               (equipo_id, tipo_medicion, fecha_calibracion, proxima_calibracion, certificado_numero, entidad_calibradora)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (data.equipo_id, data.tipo_medicion, data.fecha_calibracion, proxima_dt.date(), data.certificado_numero, data.entidad_calibradora)
        )
        return {"ok": True, "id": cur.lastrowid}

@router.get("/vencidas")
async def calibraciones_vencidas(
    tenant_id: int = Depends(get_current_tenant),
    conn=Depends(get_db),
):
    """Calibraciones vencidas del hospital del usuario autenticado."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("""
            SELECT m.*, e.nombre, e.serie
            FROM metrologia_calibracion m
            JOIN equipos e ON m.equipo_id = e.id
            WHERE e.tenant_id = %s AND m.proxima_calibracion <= CURDATE()
        """, (tenant_id,))
        return await cur.fetchall()

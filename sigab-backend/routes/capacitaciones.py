from fastapi import APIRouter, Depends, HTTPException, Form
import aiomysql
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def listar_capacitaciones(equipo_id: int = None, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = """
            SELECT c.*, e.nombre as equipo_nombre, e.serie as equipo_serie 
            FROM capacitaciones c 
            JOIN equipos e ON c.equipo_id = e.id 
        """
        params = []
        if equipo_id:
            query += " WHERE c.equipo_id = %s"
            params.append(equipo_id)
        
        query += " ORDER BY c.fecha_capacitacion DESC"
        await cur.execute(query, params)
        return await cur.fetchall()

from models.schemas import CapacitacionSchema

@router.post("/")
async def registrar_capacitacion(
    data: CapacitacionSchema,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db)
):
    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO capacitaciones 
               (equipo_id, tema, fecha_capacitacion, instructor, personal_capacitado) 
               VALUES (%s, %s, %s, %s, %s)""",
            (data.equipo_id, data.tema, data.fecha_capacitacion, data.instructor, data.personal_capacitado)
        )
        return {"ok": True, "id": cur.lastrowid}

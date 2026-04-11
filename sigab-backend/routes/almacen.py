from fastapi import APIRouter, Depends, HTTPException
import aiomysql
from typing import Optional
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def listar_refacciones(
    busqueda: Optional[str] = None,
    stock_bajo: bool = False,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db)
):
    async with conn.cursor(aiomysql.DictCursor) as cur:
        query = "SELECT * FROM refacciones_almacen WHERE 1=1"
        params = []
        if busqueda:
            query += " AND (nombre LIKE %s OR codigo_interno LIKE %s OR compatible_con_modelo LIKE %s)"
            params.extend([f"%{busqueda}%", f"%{busqueda}%", f"%{busqueda}%"])
        if stock_bajo:
            query += " AND cantidad_disponible <= cantidad_minima"
        
        query += " ORDER BY nombre ASC"
        await cur.execute(query, params)
        refacciones = await cur.fetchall()
        return {"refacciones": refacciones}

from models.schemas import RefaccionSchema

@router.post("/")
async def crear_refaccion(data: RefaccionSchema, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO refacciones_almacen 
               (nombre, codigo_interno, compatible_con_modelo, cantidad_disponible, cantidad_minima, ubicacion_almacen, proveedor)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (data.nombre, data.codigo_interno, data.compatible_con_modelo, 
             data.cantidad_disponible, data.cantidad_minima, data.ubicacion_almacen, data.proveedor)
        )
        return {"ok": True, "id": cur.lastrowid}

@router.put("/{id}/stock")
async def ajustar_stock(id: int, data: dict, user: dict = Depends(get_current_user), conn=Depends(get_db)):
    # data: { cantidad: 5, tipo: 'entrada' | 'salida' }
    async with conn.cursor() as cur:
        await cur.execute("SELECT cantidad_disponible FROM refacciones_almacen WHERE id = %s", (id,))
        row = await cur.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Refacción no encontrada")
        
        actual = row[0]
        ajuste = data['cantidad']
        nueva = actual + ajuste if data['tipo'] == 'entrada' else actual - ajuste
        if nueva < 0: raise HTTPException(status_code=400, detail="Stock insuficiente")
        
        await cur.execute("UPDATE refacciones_almacen SET cantidad_disponible = %s WHERE id = %s", (nueva, id))
        return {"ok": True, "nueva_cantidad": nueva}

"""
routes/formatos.py — Endpoint para obtener los datos de una orden en formato
estructurado para los templates de impresión del frontend.

GET /api/formatos/{tipo}              — Template vacío (preview)
GET /api/formatos/{tipo}/{orden_id}   — Datos reales de la orden para pre-llenar

Tipos válidos: reporte_falla | correctivo | preventivo | predictivo
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import sqlalchemy as sa
from config import get_db
from auth.dependencies import get_current_user

router = APIRouter()

TIPOS_VALIDOS = {"reporte_falla", "correctivo", "preventivo", "predictivo"}


@router.get("/{tipo}")
async def formato_vacio(tipo: str, _u=Depends(get_current_user)):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo de formato no válido: {tipo}")
    return {"tipo": tipo, "orden": None}


@router.get("/{tipo}/{orden_id}")
async def formato_con_datos(
    tipo: str,
    orden_id: int,
    db=Depends(get_db),
    _u=Depends(get_current_user),
):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo de formato no válido: {tipo}")

    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                o.id, o.numero_orden, o.tipo_mantenimiento, o.tipo_formato,
                o.equipo_nombre, o.equipo_serie, o.falla_reportada,
                o.descripcion_servicio, o.condiciones_encontradas,
                o.observaciones, o.recomendaciones, o.estado,
                o.tecnico_nombre, o.area, o.piso, o.prioridad,
                o.fecha_creacion, o.fecha_cierre,
                e.marca  AS equipo_marca,
                e.modelo AS equipo_modelo,
                e.no_inventario AS equipo_inventario,
                e.ubicacion_fisica
            FROM ordenes_servicio o
            LEFT JOIN equipos e ON o.equipo_id = e.id
            WHERE o.id = $1
            """,
            orden_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden = dict(row)
    # Normalizar estado → estado_final
    estado = orden.get("estado", "")
    if estado == "cerrada":
        orden.setdefault("estado_final", "operativo")
    elif estado == "en_progreso":
        orden.setdefault("estado_final", "en_observacion")

    return {"tipo": tipo, "orden": orden}

"""
routes/marcado_fisico.py — Servicio de marcado físico de activos biomédicos.

Endpoints:
  GET  /marcado-fisico/tiers              — Catálogo de tiers (Básico/Estándar/Premium)
  POST /marcado-fisico/cotizar            — Cotización con desglose IVA
  POST /marcado-fisico/batch-production   — ZIP con SVGs vectoriales + manifest + cover letter
  POST /marcado-fisico/marcar-instalado   — Marca equipos como placa_instalada=true
  GET  /marcado-fisico/preview-svg        — SVG individual de preview (sin ZIP)

Diseñado para enviar el ZIP directamente al fabricante (Labels and Plates ID,
Inventarios.com.mx, etc.) que opera grabador láser CO2 o fibra.
"""
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
import io

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_async_session
from auth.dependencies import get_current_user
from auth.permissions import can
from config import PUBLIC_BASE_URL
from models.equipo import Equipo
from services.placa_service import (
    TIER_SPECS,
    generar_zip_produccion,
    generar_placa_svg,
    calcular_cotizacion,
)


router = APIRouter()


class CotizarRequest(BaseModel):
    equipo_ids: List[int] = Field(..., min_length=1)
    tier: str = Field(..., description="basico | estandar | premium")


class BatchProductionRequest(BaseModel):
    equipo_ids: List[int] = Field(..., min_length=1)
    tier: str
    hospital_nombre: Optional[str] = None
    folio_prefix: str = "SIGAH"


class MarcarInstaladoRequest(BaseModel):
    equipo_ids: List[int] = Field(..., min_length=1)
    tier: str
    fecha_instalacion: Optional[datetime] = None


@router.get("/tiers")
async def listar_tiers(_user: dict = Depends(get_current_user)):
    """Catálogo de tiers de servicio con specs y precios."""
    return {
        "tiers": [
            {
                "id": tier_id,
                "label": spec["label"],
                "material": spec["material"],
                "dimensiones_mm": list(spec["dimensiones_mm"]),
                "costo_unitario_mxn": spec["costo_unitario_mxn"],
                "lead_time_dias": spec["lead_time_dias"],
                "color_fondo": spec["color_fondo"],
                "color_texto": spec["color_texto"],
                "color_accent": spec["color_accent"],
            }
            for tier_id, spec in TIER_SPECS.items()
        ]
    }


@router.post("/cotizar")
async def cotizar(
    payload: CotizarRequest,
    _user: dict = Depends(get_current_user),
):
    """Cotización del lote con desglose IVA. No requiere acceso a BD."""
    if payload.tier not in TIER_SPECS:
        raise HTTPException(status_code=400, detail=f"Tier inválido: {payload.tier}")

    cantidad = len(payload.equipo_ids)
    return calcular_cotizacion(cantidad, payload.tier)


@router.post("/batch-production")
async def generar_batch_production(
    payload: BatchProductionRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera ZIP con SVGs vectoriales para enviar al fabricante.

    Requiere permiso `view_confidential` o rol admin para evitar fugas de datos
    de activos (serie, inventario) a fabricantes no autorizados.
    """
    if not (can(user, "view_confidential") or user.get("role") in ("admin", "superadmin", "jefe_conservacion")):
        raise HTTPException(status_code=403, detail="Sin permiso para generar archivos de producción")

    if payload.tier not in TIER_SPECS:
        raise HTTPException(status_code=400, detail=f"Tier inválido: {payload.tier}")

    stmt = select(Equipo).where(Equipo.id.in_(payload.equipo_ids))
    res = await session.execute(stmt)
    equipos_db = res.scalars().all()

    if not equipos_db:
        raise HTTPException(status_code=404, detail="Ningún equipo encontrado con los IDs dados")

    equipos_dict = [
        {
            "id": e.id,
            "nombre": e.nombre,
            "serie": e.serie,
            "inventario": e.inventario,
            "marca": e.marca,
            "modelo": e.modelo,
            "qr_token": e.qr_token,
        }
        for e in equipos_db
    ]

    base_url = PUBLIC_BASE_URL or "https://sigah.mx"
    hospital = payload.hospital_nombre or "Hospital General Regional No. 1 IMSS Tijuana"

    zip_bytes = generar_zip_produccion(
        equipos=equipos_dict,
        tier=payload.tier,
        base_url=base_url,
        hospital_nombre=hospital,
        folio_prefix=payload.folio_prefix,
    )

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"sigah_placas_{payload.tier}_{len(equipos_dict)}eq_{timestamp}.zip"

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/preview-svg")
async def preview_svg(
    equipo_id: int = Query(...),
    tier: str = Query("estandar"),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Devuelve el SVG vectorial de un equipo individual para preview en UI."""
    if tier not in TIER_SPECS:
        raise HTTPException(status_code=400, detail=f"Tier inválido: {tier}")

    equipo = await session.get(Equipo, equipo_id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    equipo_dict = {
        "id": equipo.id,
        "nombre": equipo.nombre,
        "serie": equipo.serie,
        "inventario": equipo.inventario,
        "marca": equipo.marca,
        "modelo": equipo.modelo,
        "qr_token": equipo.qr_token,
    }
    base_url = PUBLIC_BASE_URL or "https://sigah.mx"
    qr_token = equipo.qr_token or equipo.serie or str(equipo.id)
    qr_url = f"{base_url.rstrip('/')}/equipo/{qr_token}"

    svg = generar_placa_svg(equipo_dict, qr_url, tier=tier)

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store"},
    )


@router.post("/marcar-instalado")
async def marcar_instalado(
    payload: MarcarInstaladoRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Marca los equipos como con placa física instalada."""
    if not (can(user, "edit_equipo") or user.get("role") in ("admin", "superadmin", "jefe_conservacion", "biomedico")):
        raise HTTPException(status_code=403, detail="Sin permiso para marcar placas")

    if payload.tier not in TIER_SPECS:
        raise HTTPException(status_code=400, detail=f"Tier inválido: {payload.tier}")

    fecha = payload.fecha_instalacion or datetime.now(timezone.utc)

    stmt = select(Equipo).where(Equipo.id.in_(payload.equipo_ids))
    res = await session.execute(stmt)
    equipos = res.scalars().all()

    actualizados = 0
    for eq in equipos:
        if hasattr(eq, "placa_instalada"):
            eq.placa_instalada = True
            eq.placa_tipo = payload.tier
            eq.placa_fecha_instalacion = fecha
            session.add(eq)
            actualizados += 1

    await session.commit()
    return {
        "actualizados": actualizados,
        "tier": payload.tier,
        "fecha_instalacion": fecha.isoformat(),
    }

"""
routes/equipo_documentos.py — Expediente del Equipo.

GET /api/equipos/{equipo_id}/expediente
  Devuelve, para un equipo, sus documentos anexos (contrato/orden/dictamen…)
  ligados por serie/inventario IMSS, más sus órdenes de servicio históricas
  matcheadas por equipo_id O por serie (incluye el archivo histórico que solo
  trae equipo_serie). Read-only. Ownership por tenant_id.

Normativas: NOM-016-SSA3-2012 (audit trail), ISO 13485 (trazabilidad).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from config import PUBLIC_BASE_URL
from database import get_async_session
from auth.dependencies import get_current_user
from auth.tenancy import get_current_tenant
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio

router = APIRouter(prefix="/api/equipos", tags=["expediente"])


@router.get("/{equipo_id}/expediente")
async def expediente_equipo(
    equipo_id: int,
    user=Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # Ownership: el equipo debe pertenecer a este hospital (tenant).
    equipo = (
        await session.execute(
            select(Equipo).where(Equipo.id == equipo_id, Equipo.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # --- Documentos anexos (tabla equipo_documentos; defensivo si aún no migró) ---
    documentos = []
    try:
        rows = (
            await session.execute(
                text(
                    "SELECT id, clase, formato, nombre_archivo, ruta_archivo, "
                    "numero_contrato, fecha FROM equipo_documentos "
                    "WHERE tenant_id = :t AND (equipo_id = :id OR serie = :serie) "
                    "ORDER BY FIELD(clase,'contrato','dictamen','orden','bitacora','penalizacion','otro'), fecha DESC"
                ),
                {"t": tenant_id, "id": equipo_id, "serie": equipo.serie},
            )
        ).mappings().all()
        base = (PUBLIC_BASE_URL or "").rstrip("/")
        for r in rows:
            ruta = r["ruta_archivo"]
            url = ruta if ruta.startswith("http") else f"{base}/static/uploads/{ruta.lstrip('/')}"
            documentos.append({
                "id": r["id"], "clase": r["clase"], "formato": r["formato"],
                "nombre": r["nombre_archivo"], "numero_contrato": r["numero_contrato"],
                "url": url, "fecha": r["fecha"].isoformat() if r["fecha"] else None,
            })
    except Exception:
        documentos = []  # tabla aún no existe (pre-migración): expediente sin docs

    # --- Órdenes por equipo_id O por serie (incluye archivo histórico) ---
    ordenes = (
        await session.execute(
            select(OrdenServicio)
            .where(
                or_(
                    OrdenServicio.equipo_id == equipo_id,
                    OrdenServicio.equipo_serie == equipo.serie,
                ),
                OrdenServicio.tenant_id == tenant_id,
            )
            .order_by(OrdenServicio.fecha.desc(), OrdenServicio.id.desc())
            .limit(100)
        )
    ).scalars().all()

    return {
        "equipo_id": equipo_id,
        "serie": equipo.serie,
        "inventario": equipo.inventario,
        "numero_contrato": equipo.numero_contrato,
        "documentos": documentos,
        "ordenes": [o.model_dump() for o in ordenes],
    }

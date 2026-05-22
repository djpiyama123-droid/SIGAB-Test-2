"""routes/admin.py — Panel SuperAdmin de SIGAH.

Expone KPIs globales, lista de hospitales/tenants y actividad reciente del
sistema. Todos los endpoints exigen rol ``superadmin_sigah`` — cualquier otro
rol recibe 403.

Estos endpoints NO filtran por tenant_id: operan sobre la totalidad de la
plataforma. Por eso usan ``require_superadmin`` (de auth.tenancy) en lugar de
``get_current_tenant``.

Prefijo registrado en main.py: /api/admin
Tags: SuperAdmin
"""
import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from auth.tenancy import require_superadmin
from config import get_db

router = APIRouter(prefix="/admin", tags=["SuperAdmin"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _serialize_row(row: dict) -> dict:
    """Convierte tipos no-JSON-serializables (Decimal, date, datetime) a primitivos."""
    from decimal import Decimal
    from datetime import date, datetime
    result = {}
    for key, value in row.items():
        if isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_global_stats(
    _: dict = Depends(require_superadmin),
    conn=Depends(get_db),
):
    """KPIs globales de la plataforma SIGAH.

    Devuelve:
    - total_hospitales: número de tenants registrados (cualquier estado)
    - hospitales_activos: tenants con estado_suscripcion = 'activo'
    - total_equipos: suma de equipos en todas las instancias
    - total_usuarios: usuarios activos en toda la plataforma
    - total_ordenes: órdenes de servicio totales
    - ordenes_abiertas: órdenes en estado 'abierta' o 'en_proceso'
    - mrr_estimado_mxn: estimación de MRR basada en hospitales activos
      (placeholder — se reemplazará con tabla de suscripciones en Fase 6)
    """
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT COUNT(*) AS total FROM hospitales")
        total_hospitales = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT COUNT(*) AS total FROM hospitales WHERE estado_suscripcion = 'activo'"
        )
        hospitales_activos = (await cur.fetchone())["total"]

        await cur.execute("SELECT COUNT(*) AS total FROM equipos")
        total_equipos = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT COUNT(*) AS total FROM usuarios WHERE activo = TRUE"
        )
        total_usuarios = (await cur.fetchone())["total"]

        await cur.execute("SELECT COUNT(*) AS total FROM ordenes_servicio")
        total_ordenes = (await cur.fetchone())["total"]

        await cur.execute(
            "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE estado IN ('abierta', 'en_proceso')"
        )
        ordenes_abiertas = (await cur.fetchone())["total"]

    # MRR placeholder: $2,500 MXN/mes por hospital activo (Fase 6 lo calcula desde DB)
    SETUP_FEE_MXN = 2500
    mrr_estimado = hospitales_activos * SETUP_FEE_MXN

    return {
        "ok": True,
        "stats": {
            "total_hospitales": total_hospitales,
            "hospitales_activos": hospitales_activos,
            "total_equipos": total_equipos,
            "total_usuarios": total_usuarios,
            "total_ordenes": total_ordenes,
            "ordenes_abiertas": ordenes_abiertas,
            "mrr_estimado_mxn": mrr_estimado,
            "nota_mrr": "Estimación placeholder ($2,500 MXN × hospitales activos). Fase 6 usa tabla suscripciones.",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/hospitales
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/hospitales")
async def list_hospitales(
    _: dict = Depends(require_superadmin),
    conn=Depends(get_db),
):
    """Lista todos los hospitales/tenants registrados en la plataforma.

    Incluye métricas básicas por hospital (equipos, usuarios, órdenes abiertas)
    para el panel de gestión del SuperAdmin.
    """
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT
                h.id,
                h.slug,
                h.nombre_corto,
                h.razon_social,
                h.delegacion,
                h.unidad_medica,
                h.estado_suscripcion,
                h.zona_horaria,
                h.created_at,
                COUNT(DISTINCT e.id)   AS total_equipos,
                COUNT(DISTINCT u.id)   AS total_usuarios,
                COUNT(DISTINCT o.id)   AS total_ordenes
            FROM hospitales h
            LEFT JOIN equipos e       ON e.tenant_id = h.id
            LEFT JOIN usuarios u      ON u.tenant_id = h.id AND u.activo = TRUE
            LEFT JOIN ordenes_servicio o ON o.tenant_id = h.id
            GROUP BY h.id
            ORDER BY h.created_at DESC
            """
        )
        rows = await cur.fetchall()

    return {
        "ok": True,
        "total": len(rows),
        "hospitales": [_serialize_row(r) for r in rows],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/actividad-reciente
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/actividad-reciente")
async def get_actividad_reciente(
    _: dict = Depends(require_superadmin),
    conn=Depends(get_db),
):
    """Últimas 20 entradas del log de actividad global (todas las instancias).

    Incluye el slug del hospital para identificar de qué tenant proviene cada
    acción. Útil para auditorías y detección de anomalías en tiempo real.
    """
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT
                la.id,
                la.tenant_id,
                h.slug          AS hospital_slug,
                h.nombre_corto  AS hospital_nombre,
                la.usuario_id,
                la.accion,
                la.entidad,
                la.entidad_id,
                la.detalle,
                la.ip_origen,
                la.created_at
            FROM log_actividad la
            LEFT JOIN hospitales h ON h.id = la.tenant_id
            ORDER BY la.created_at DESC
            LIMIT 20
            """
        )
        rows = await cur.fetchall()

    return {
        "ok": True,
        "total": len(rows),
        "actividad": [_serialize_row(r) for r in rows],
    }

from fastapi import APIRouter, Depends, HTTPException
import aiomysql
from config import get_db
from auth.dependencies import get_current_user, require_roles
from auth.tenancy import get_current_tenant
from services.audit_service import AuditService

router = APIRouter()

from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_async_session
from auth.dependencies import get_current_user, require_roles
from services.audit_service import AuditService
from models.soporte import AuditLog
from models.usuario import Usuario

router = APIRouter()

@router.get("/")
async def get_audit_log(
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(require_roles(["admin", "supervisor"])),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session)
):
    """Obtiene el log de auditoría NOM-016 del hospital actual."""
    stmt = select(AuditLog, Usuario.nombre.label("usuario_nombre"))\
           .outerjoin(Usuario, AuditLog.usuario_id == Usuario.id)\
           .where(AuditLog.tenant_id == tenant_id)\
           .order_by(desc(AuditLog.id))\
           .limit(limit).offset(offset)

    result = await session.execute(stmt)
    rows = result.all()

    logs_list = []
    for log, u_nombre in rows:
        d = log.model_dump()
        d["usuario_nombre"] = u_nombre
        logs_list.append(d)

    return {"logs": logs_list}

@router.get("/verificar")
async def verify_audit_chain(
    user: dict = Depends(require_roles(["admin"])),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session)
):
    """Verifica la integridad de la cadena de bloques del log de auditoría.

    NOTA: La verificación opera sobre el subconjunto del tenant actual.
    La cadena de hashes encadenada es por-tenant (cada hospital tiene su propia
    cadena independiente para cumplir NOM-016 de forma aislada).
    """
    # Filtrar registros al tenant antes de verificar la cadena
    import hashlib
    from sqlmodel import asc
    stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_id).order_by(asc(AuditLog.id))
    result = await session.execute(stmt)
    records = result.scalars().all()

    results_list = []
    last_hash = "0" * 64
    for rec in records:
        valid_prev = (rec.hash_previo == last_hash)
        payload = f"{rec.usuario_id}|{rec.accion}|{rec.entidad}|{rec.entidad_id}|{rec.datos_json}|{rec.hash_previo}"
        expected_hash = hashlib.sha256(payload.encode()).hexdigest()
        valid_curr = (rec.hash_registro == expected_hash)
        results_list.append({
            "id": rec.id,
            "valido": valid_prev and valid_curr,
            "timestamp": rec.timestamp.isoformat() if hasattr(rec.timestamp, "isoformat") else rec.timestamp,
        })
        last_hash = rec.hash_registro

    broken = [r for r in results_list if not r["valido"]]

    return {
        "integridad_ok": len(broken) == 0,
        "total_registros": len(results_list),
        "registros_corruptos": broken,
        "mensaje": "Cadena de bloque verificada exitosamente" if not broken else "Se detectaron inconsistencias en el log"
    }

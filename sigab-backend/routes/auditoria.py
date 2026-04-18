from fastapi import APIRouter, Depends, HTTPException
import aiomysql
from config import get_db
from auth.dependencies import get_current_user, require_roles
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
    session: AsyncSession = Depends(get_async_session)
):
    """Obtiene el log de auditoría NOM-016."""
    stmt = select(AuditLog, Usuario.nombre.label("usuario_nombre"))\
           .outerjoin(Usuario, AuditLog.usuario_id == Usuario.id)\
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
    session: AsyncSession = Depends(get_async_session)
):
    """Verifica la integridad de la cadena de bloques del log de auditoría."""
    results = await AuditService.verify_chain(session=session)
    broken = [r for r in results if not r["valido"]]
    
    return {
        "integridad_ok": len(broken) == 0,
        "total_registros": len(results),
        "registros_corruptos": broken,
        "mensaje": "Cadena de bloque verificada exitosamente" if not broken else "Se detectaron inconsistencias en el log"
    }

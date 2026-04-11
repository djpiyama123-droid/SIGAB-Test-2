from fastapi import APIRouter, Depends, HTTPException
import aiomysql
from config import get_db
from auth.dependencies import get_current_user, require_roles
from services.audit_service import AuditService

router = APIRouter()

@router.get("/")
async def get_audit_log(
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(require_roles(["admin", "supervisor"])),
    conn=Depends(get_db)
):
    """Obtiene el log de auditoría NOM-016."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """SELECT a.*, u.nombre as usuario_nombre 
               FROM log_auditoria_nom016 a
               LEFT JOIN usuarios u ON a.usuario_id = u.id
               ORDER BY a.id DESC LIMIT %s OFFSET %s""",
            (limit, offset)
        )
        logs = await cur.fetchall()
        
    for log in logs:
        if hasattr(log["timestamp"], "isoformat"):
            log["timestamp"] = log["timestamp"].isoformat()
            
    return {"logs": logs}

@router.get("/verificar")
async def verify_audit_chain(user: dict = Depends(require_roles(["admin"]))):
    """Verifica la integridad de la cadena de bloques del log de auditoría."""
    results = await AuditService.verify_chain()
    broken = [r for r in results if not r["valido"]]
    
    return {
        "integridad_ok": len(broken) == 0,
        "total_registros": len(results),
        "registros_corruptos": broken,
        "mensaje": "Cadena de bloque verificada exitosamente" if not broken else "Se detectaron inconsistencias en el log"
    }

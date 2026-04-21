import hashlib
import json
from datetime import datetime
from typing import Optional
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from database import async_session_maker as AsyncSessionLocal
from models.soporte import AuditLog

class AuditService:
    @staticmethod
    async def log_event(
        usuario_id: int,
        accion: str,
        entidad: str,
        entidad_id: int,
        datos: dict,
        session: Optional[AsyncSession] = None
    ):
        """Registra un evento en el log de auditoría inalterable con hashing encadenado."""
        if session is None:
            async with AsyncSessionLocal() as new_session:
                return await AuditService._execute_log(usuario_id, accion, entidad, entidad_id, datos, new_session)
        else:
            return await AuditService._execute_log(usuario_id, accion, entidad, entidad_id, datos, session)

    @staticmethod
    async def _execute_log(usuario_id, accion, entidad, entidad_id, datos, session: AsyncSession):
        # 1. Obtener el hash del último registro
        stmt = select(AuditLog.hash_registro).order_by(desc(AuditLog.id)).limit(1)
        result = await session.execute(stmt)
        hash_previo = result.scalar() or ("0" * 64)

        # 2. Preparar datos para el hash
        datos_json = json.dumps(datos, sort_keys=True, default=str)
        payload = f"{usuario_id}|{accion}|{entidad}|{entidad_id}|{datos_json}|{hash_previo}"
        
        # 3. Generar nuevo hash
        hash_registro = hashlib.sha256(payload.encode()).hexdigest()

        # 4. Insertar
        nuevo_log = AuditLog(
            usuario_id=usuario_id,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            hash_previo=hash_previo,
            hash_registro=hash_registro,
            datos_json=datos_json
        )
        session.add(nuevo_log)
        await session.commit()
        return hash_registro

    @staticmethod
    async def verify_chain(session: Optional[AsyncSession] = None):
        """Verifica que toda la cadena de auditoría sea válida (hashes encadenados)."""
        if session is None:
            async with AsyncSessionLocal() as new_session:
                return await AuditService._execute_verify(new_session)
        else:
            return await AuditService._execute_verify(session)

    @staticmethod
    async def _execute_verify(session: AsyncSession):
        stmt = select(AuditLog).order_by(AuditLog.id.asc())
        result = await session.execute(stmt)
        records = result.scalars().all()
        
        results = []
        last_hash = "0" * 64
        
        for rec in records:
            # Validar hash previo
            valid_prev = (rec.hash_previo == last_hash)
            
            # Validar hash actual
            # rec.datos_json es string (TEXT)
            payload = f"{rec.usuario_id}|{rec.accion}|{rec.entidad}|{rec.entidad_id}|{rec.datos_json}|{rec.hash_previo}"
            expected_hash = hashlib.sha256(payload.encode()).hexdigest()
            valid_curr = (rec.hash_registro == expected_hash)
            
            results.append({
                "id": rec.id,
                "valido": valid_prev and valid_curr,
                "timestamp": rec.timestamp.isoformat() if hasattr(rec.timestamp, "isoformat") else rec.timestamp
            })
            last_hash = rec.hash_registro
        
        return results

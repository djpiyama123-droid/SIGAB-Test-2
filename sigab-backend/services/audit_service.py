import hashlib
import json
import aiomysql
from datetime import datetime
from config import DB_CONFIG

class AuditService:
    @staticmethod
    async def log_event(
        usuario_id: int,
        accion: str,
        entidad: str,
        entidad_id: int,
        datos: dict
    ):
        """Registra un evento en el log de auditoría inalterable con hashing encadenado."""
        conn = await aiomysql.connect(**DB_CONFIG)
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                # 1. Obtener el hash del último registro
                await cur.execute(
                    "SELECT hash_registro FROM log_auditoria_nom016 ORDER BY id DESC LIMIT 1"
                )
                last_record = await cur.fetchone()
                hash_previo = last_record["hash_registro"] if last_record else "0" * 64

                # 2. Preparar datos para el hash
                datos_json = json.dumps(datos, sort_keys=True, default=str)
                payload = f"{usuario_id}|{accion}|{entidad}|{entidad_id}|{datos_json}|{hash_previo}"
                
                # 3. Generar nuevo hash
                hash_registro = hashlib.sha256(payload.encode()).hexdigest()

                # 4. Insertar
                await cur.execute(
                    """INSERT INTO log_auditoria_nom016 
                       (usuario_id, accion, entidad, entidad_id, hash_previo, hash_registro, datos_json)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (usuario_id, accion, entidad, entidad_id, hash_previo, hash_registro, datos_json)
                )
                await conn.commit()
                return hash_registro
        finally:
            conn.close()

    @staticmethod
    async def verify_chain():
        """Verifica que toda la cadena de auditoría sea válida (hashes encadenados)."""
        conn = await aiomysql.connect(**DB_CONFIG)
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM log_auditoria_nom016 ORDER BY id ASC")
                records = await cur.fetchall()
                
                results = []
                last_hash = "0" * 64
                
                for rec in records:
                    # Validar hash previo
                    valid_prev = (rec["hash_previo"] == last_hash)
                    
                    # Validar hash actual
                    datos_json = json.dumps(rec["datos_json"], sort_keys=True, default=str)
                    payload = f"{rec['usuario_id']}|{rec['accion']}|{rec['entidad']}|{rec['entidad_id']}|{datos_json}|{rec['hash_previo']}"
                    expected_hash = hashlib.sha256(payload.encode()).hexdigest()
                    valid_curr = (rec["hash_registro"] == expected_hash)
                    
                    results.append({
                        "id": rec["id"],
                        "valido": valid_prev and valid_curr,
                        "timestamp": rec["timestamp"].isoformat() if hasattr(rec["timestamp"], "isoformat") else rec["timestamp"]
                    })
                    last_hash = rec["hash_registro"]
                
                return results
        finally:
            conn.close()

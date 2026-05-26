"""Crea o actualiza el usuario admin inicial para SIGAH.

Uso (desde el directorio sigah-backend):
    ./venv/bin/python scripts/seed_admin.py
o con env vars:
    SIGAH_ADMIN_MATRICULA=ADMIN001 SIGAH_ADMIN_PASSWORD=mi_clave \
      ./venv/bin/python scripts/seed_admin.py
"""
import asyncio
import os
import sys

# Asegura que el paquete raíz esté en sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import aiomysql
from auth.password import hash_password
from config import DB_CONFIG


MATRICULA = os.getenv("SIGAH_ADMIN_MATRICULA", "ADMIN001")
PASSWORD = os.getenv("SIGAH_ADMIN_PASSWORD", "sigah_admin_2026")
NOMBRE = os.getenv("SIGAH_ADMIN_NOMBRE", "Administrador SIGAH")
EMAIL = os.getenv("SIGAH_ADMIN_EMAIL", "admin@hgr1.imss.gob.mx")


async def main():
    pwd_hash = hash_password(PASSWORD)
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT id FROM usuarios WHERE matricula = %s",
                (MATRICULA,),
            )
            existing = await cur.fetchone()

            if existing:
                await cur.execute(
                    "UPDATE usuarios SET password_hash=%s, rol=%s, activo=TRUE, "
                    "must_change_password=FALSE, nombre=%s, email=%s "
                    "WHERE matricula=%s",
                    (pwd_hash, "admin", NOMBRE, EMAIL, MATRICULA),
                )
                print(f"Admin actualizado: {MATRICULA}")
            else:
                await cur.execute(
                    "INSERT INTO usuarios (nombre, matricula, rol, email, password_hash, "
                    "must_change_password, activo) VALUES (%s, %s, %s, %s, %s, FALSE, TRUE)",
                    (NOMBRE, MATRICULA, "admin", EMAIL, pwd_hash),
                )
                print(f"Admin creado: {MATRICULA}")

        print(f"\n  Matrícula: {MATRICULA}")
        print(f"  Password : {PASSWORD}")
        print(f"  Rol      : admin")
    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(main())

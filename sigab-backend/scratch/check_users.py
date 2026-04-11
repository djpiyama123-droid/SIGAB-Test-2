import asyncio
import aiomysql
import sys
import os

# dynamic import config
sys.path.append(os.getcwd())
from config import DB_CONFIG

async def check():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT id, nombre, matricula, rol, activo, password FROM usuarios")
            users = await cur.fetchall()
            print("USUARIOS REGISTRADOS:")
            for u in users:
                print(f" - [{u['id']}] {u['nombre']} (Matrícula: {u['matricula']}) - Rol: {u['rol']} - PassHash: {u['password'][:20]}...")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(check())

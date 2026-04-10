import aiomysql
import asyncio
import os
import sys

# Asegura que el paquete raíz esté en sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import DB_CONFIG

async def test():
    print(f"Probando conexión a: {DB_CONFIG['host']}:{DB_CONFIG['port']} con usuario {DB_CONFIG['user']}...")
    try:
        conn = await aiomysql.connect(**DB_CONFIG)
        print("✅ CONEXIÓN EXITOSA A MYSQL")
        async with conn.cursor() as cur:
            await cur.execute("SHOW TABLES;")
            tables = await cur.fetchall()
            print(f"Tablas encontradas ({len(tables)}):")
            for t in tables:
                print(f" - {t[0]}")
        conn.close()
    except Exception as e:
        print(f"❌ ERROR DE CONEXIÓN: {e}")

if __name__ == "__main__":
    asyncio.run(test())

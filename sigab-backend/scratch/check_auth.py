import asyncio
import aiomysql
import sys
import os

sys.path.append(os.getcwd())
from config import DB_CONFIG

async def check():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT matricula, password_hash FROM usuarios")
            users = await cur.fetchall()
            if not users:
                print("NO HAY USUARIOS EN LA BASE DE DATOS.")
            for u in users:
                ph = u['password_hash'] if u['password_hash'] else "NULL"
                print(f"Matrícula: {u['matricula']} | Hash: {ph[:15]}...")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(check())

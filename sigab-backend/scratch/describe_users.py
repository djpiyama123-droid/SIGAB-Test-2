import asyncio
import aiomysql
import sys
import os

sys.path.append(os.getcwd())
from config import DB_CONFIG

async def check():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        async with conn.cursor() as cur:
            await cur.execute("DESCRIBE usuarios")
            cols = await cur.fetchall()
            for c in cols:
                print(c)
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(check())

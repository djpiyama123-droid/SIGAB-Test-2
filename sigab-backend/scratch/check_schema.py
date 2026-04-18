import asyncio
from sqlalchemy import text
from database import engine

async def check_schema():
    async with engine.connect() as conn:
        result = await conn.execute(text("DESCRIBE usuarios"))
        print("\nUSUARIOS TABLE:")
        for row in result:
            print(row)
        
        try:
            result = await conn.execute(text("DESCRIBE log_actividad"))
            print("\nLOG_ACTIVIDAD TABLE:")
            for row in result:
                print(row)
        except Exception as e:
            print(f"\nlog_actividad table does not exist or error: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())

import asyncio
from database import engine
from sqlmodel import select
from models.equipo import Equipo
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        query = select(Equipo).where(Equipo.imagen_url != None).limit(5)
        res = await session.execute(query)
        equipos = res.scalars().all()
        for e in equipos:
            print(f"ID: {e.id}, Nombre: {e.nombre}, Imagen URL: {e.imagen_url}")
        print(f"Total found: {len(equipos)}")

asyncio.run(main())

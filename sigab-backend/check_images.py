import asyncio
from database import engine
from sqlmodel import select
from models.equipo import Equipo
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        query = select(Equipo.id, Equipo.nombre, Equipo.fotos, Equipo.imagen_url).limit(20)
        res = await session.execute(query)
        equipos = res.all()
        for e in equipos:
            print(f"ID: {e.id}, Nombre: {e.nombre}, Fotos: {e.fotos}, Imagen URL: {e.imagen_url}")

asyncio.run(main())

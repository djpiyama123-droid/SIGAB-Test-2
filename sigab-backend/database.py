"""
database.py — Motor asíncrono SQLModel para MySQL 8.0.

Provee:
  engine              — AsyncEngine (mysql+asyncmy) con SSL opcional
  async_session_maker — Fábrica de sesiones (expire_on_commit=False)
  get_async_session   — Dependency de FastAPI para inyección de sesiones
  init_db             — Placeholder; las migraciones se manejan con Alembic/SQL
  
Control de SSL:
  SIGAH_SSL_DISABLED=true  → Sin SSL (desarrollo local / Docker)
  SIGAH_SSL_DISABLED=false → Con SSL (producción HGR No. 1)
"""
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from config import DB_CONFIG
import os

# Construir URL asíncrona para asyncmy
# mysql+asyncmy://user:pass@host:port/db
db_user = DB_CONFIG["user"]
db_pass = DB_CONFIG["password"]
db_host = DB_CONFIG["host"]
db_port = DB_CONFIG["port"]
db_name = DB_CONFIG["db"]

DATABASE_URL = f"mysql+asyncmy://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"

# HGR No. 1 IMSS: SSL/TLS es obligatorio en entornos sensibles
connect_args = {
    "ssl": {
        "fake_ssl_logic": os.getenv("SIGAH_SSL_DISABLED", "true") == "false"
    } 
}

# VPS-02: pool_recycle recicla conexiones proactivamente antes de que MySQL/
# Docker las cierre solas por inactividad, evitando el 500 "Lost connection to
# MySQL server during query" (2013).
# NOTA (2026-07-16): pool_pre_ping=True se probó y se REVIRTIÓ — con
# SQLAlchemy 2.0.36 + asyncmy 0.2.10 el ping de pre-chequeo revienta con
# `AsyncAdapt_asyncmy_connection.ping() missing 1 required positional
# argument: 'reconnect'` (bug de compatibilidad del dialecto asyncmy), lo que
# tumbaba CUALQUIER endpoint con 500 de forma intermitente — peor que el bug
# original. No reactivar sin antes confirmar el fix upstream de SQLAlchemy/asyncmy.
_POOL_KWARGS = {"pool_recycle": 1800}

# En modo desarrollo local, permitimos desactivar SSL si el contenedor MySQL no lo soporta
if os.getenv("SIGAH_SSL_DISABLED", "true") == "true":
    engine = create_async_engine(DATABASE_URL, echo=False, future=True, **_POOL_KWARGS)
else:
    engine = create_async_engine(DATABASE_URL, connect_args=connect_args, echo=False, future=True, **_POOL_KWARGS)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    # Alembic se encargará de las migraciones, pero para pruebas iniciales:
    # async with engine.begin() as conn:
    #    await conn.run_sync(SQLModel.metadata.create_all)
    pass

async def get_async_session() -> AsyncSession:
    async_session = async_session_maker()
    async with async_session as session:
        yield session

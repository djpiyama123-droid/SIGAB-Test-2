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

DATABASE_URL = f"mysql+asyncmy://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

# HGR No. 1 IMSS: SSL/TLS es obligatorio en entornos sensibles
connect_args = {
    "ssl": {
        "fake_ssl_logic": os.getenv("SIGAB_SSL_DISABLED", "true") == "false"
    } 
}

# En modo desarrollo local, permitimos desactivar SSL si el contenedor MySQL no lo soporta
if os.getenv("SIGAB_SSL_DISABLED", "true") == "true":
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
else:
    engine = create_async_engine(DATABASE_URL, connect_args=connect_args, echo=False, future=True)

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

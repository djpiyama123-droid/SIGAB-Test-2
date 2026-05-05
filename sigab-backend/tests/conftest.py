"""
sigab-backend/tests/conftest.py — fixtures mínimos para los tests 02/05/07.

Generado por la rutina sigab-pulido-vps-sem1-continuacion (5-may-2026, re-ejecución).
Bloqueante señalado por la sesión previa: sin este archivo los pytest del bundle martes
fallan con "fixture not found" en lugar de fallar por el bug.

Modelo de datos asumido (verificado contra el repo `djpiyama123-droid/SIGAB-Test-2` HEAD `10bfc43`):
  - FastAPI app inicializada en `sigab-backend/main.py` como `app`.
  - `database.get_async_session` es la dependency a sobre-escribir.
  - JWT vía `auth.jwt_handler.create_access_token({"id": int, "rol": str, "matricula": str})`.
  - Roles relevantes (auth/permissions.py):
      * biomedico       → edit_equipo, NO delete_equipo
      * jefe_biomedica  → edit_equipo + delete_equipo
  - Modelos: Equipo, Trazabilidad, PreventivoProgramado, Usuario.
  - El listado completo de columnas usa tipos MySQL (mysql.INTEGER unsigned, DATETIME, TEXT)
    por lo que estos tests REQUIEREN una BD MySQL de pruebas, no SQLite. En el VPS la base
    `sigab_test` ya existe (docker-compose la levanta junto con `sigab_dev`).

Variables de entorno relevantes:
  SIGAB_TEST_DATABASE_URL   default: mysql+asyncmy://sigab:sigab@127.0.0.1:3306/sigab_test
  SIGAB_SSL_DISABLED        forzar a "true" en CI/local

Aislamiento por test: usamos transacción + ROLLBACK al final de cada test.
Esto evita estado residual sin tener que recrear el schema entre tests.

Si alguna fixture choca con una existente en `sigab-backend/tests/conftest.py` (caso poco
probable porque el dir aún no existe), MERGEAR a mano respetando lo que ya esté ahí.
"""
from __future__ import annotations

import os
import asyncio
import uuid
from datetime import date, timedelta, datetime, timezone
from typing import AsyncIterator, Tuple

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

# Forzar SSL deshabilitado para entornos de prueba ANTES de importar database.py
os.environ.setdefault("SIGAB_SSL_DISABLED", "true")

# Imports del backend (asumiendo pytest se corre desde sigab-backend/ con rootdir ahí)
from main import app  # noqa: E402
from database import get_async_session  # noqa: E402
from auth.jwt_handler import create_access_token  # noqa: E402
from models.usuario import Usuario  # noqa: E402
from models.equipo import Equipo  # noqa: E402
from models.trazabilidad import Trazabilidad  # noqa: E402
from models.preventivo import PreventivoProgramado  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Engine + sesión de pruebas (MySQL `sigab_test`)
# ─────────────────────────────────────────────────────────────────────────────

TEST_DATABASE_URL = os.getenv(
    "SIGAB_TEST_DATABASE_URL",
    "mysql+asyncmy://sigab:sigab@127.0.0.1:3306/sigab_test",
)


@pytest.fixture(scope="session")
def event_loop():
    """Loop por sesión para que pytest-asyncio reuse conexiones."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True, pool_pre_ping=True)
    # Garantizar schema. En CI conviene apuntar a una BD vacía y dejar create_all aquí;
    # en VPS donde sigab_test ya existe esto es no-op.
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session(test_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Sesión transaccional con rollback al final del test."""
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        SessionLocal = sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
        async with SessionLocal() as s:
            try:
                yield s
            finally:
                await trans.rollback()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """httpx.AsyncClient con override de get_async_session inyectando la sesión transaccional."""
    async def _override():
        yield session

    app.dependency_overrides[get_async_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.pop(get_async_session, None)


# ─────────────────────────────────────────────────────────────────────────────
# Usuarios + tokens JWT
# ─────────────────────────────────────────────────────────────────────────────

async def _crear_usuario(session: AsyncSession, *, rol: str, matricula: str) -> Usuario:
    user = Usuario(
        nombre=f"Test {rol}",
        matricula=matricula,
        rol=rol,
        email=f"{matricula}@test.sigab",
        password_hash="not-used-in-tests",
        must_change_password=False,
        activo=True,
    )
    session.add(user)
    await session.flush()
    return user


def _bearer(user: Usuario) -> dict:
    token = create_access_token({
        "id": user.id,
        "rol": user.rol,
        "matricula": user.matricula,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def usuario_biomedico(session: AsyncSession) -> Usuario:
    return await _crear_usuario(session, rol="biomedico", matricula=f"BIO{uuid.uuid4().hex[:6]}")


@pytest_asyncio.fixture
async def usuario_jefe(session: AsyncSession) -> Usuario:
    return await _crear_usuario(session, rol="jefe_biomedica", matricula=f"JEFE{uuid.uuid4().hex[:6]}")


@pytest_asyncio.fixture
async def auth_headers_biomedico(usuario_biomedico: Usuario) -> dict:
    return _bearer(usuario_biomedico)


@pytest_asyncio.fixture
async def auth_headers_jefe(usuario_jefe: Usuario) -> dict:
    return _bearer(usuario_jefe)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers para construir equipos
# ─────────────────────────────────────────────────────────────────────────────

def _serie_unica(prefix: str = "TST") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


async def _nuevo_equipo(
    session: AsyncSession,
    *,
    serie: str | None = None,
    ubicacion: str = "Quirófano 1 · Planta baja",
    area: str | None = "Quirófano 1",
    piso: str | None = "Planta baja",
    estado: str = "operativo",
    qr_token: str | None = None,
) -> Equipo:
    eq = Equipo(
        serie=serie or _serie_unica(),
        nombre="Equipo de prueba",
        marca="ACME",
        modelo="X1",
        ubicacion=ubicacion,
        area=area,
        piso=piso,
        estado=estado,
        criticidad="media",
        qr_token=qr_token or uuid.uuid4().hex[:16],
    )
    session.add(eq)
    await session.flush()
    return eq


@pytest_asyncio.fixture
async def equipo_simple(session: AsyncSession) -> Equipo:
    """Equipo SIN relaciones bloqueantes — válido para DELETE limpio y PUT."""
    return await _nuevo_equipo(session)


@pytest_asyncio.fixture
async def equipo_existente(session: AsyncSession) -> Equipo:
    """Alias semántico para los tests que sólo necesitan un equipo cualquiera con qr_token."""
    return await _nuevo_equipo(session)


@pytest_asyncio.fixture
async def equipo_con_trazabilidad(session: AsyncSession, usuario_jefe: Usuario) -> Equipo:
    eq = await _nuevo_equipo(session, serie=_serie_unica("TRZ"))
    session.add(Trazabilidad(
        equipo_id=eq.id,
        piso_origen="Planta baja",
        area_origen="Quirófano 1",
        piso_destino="Planta baja",
        area_destino="Quirófano 2",
        motivo="prueba",
        usuario_id=usuario_jefe.id,
    ))
    await session.flush()
    return eq


@pytest_asyncio.fixture
async def equipo_con_preventivo_activo(session: AsyncSession) -> Equipo:
    eq = await _nuevo_equipo(session, serie=_serie_unica("PRV"))
    session.add(PreventivoProgramado(
        equipo_id=eq.id,
        tipo_preventivo="trimestral",
        frecuencia_dias=90,
        proxima_ejecucion=date.today() + timedelta(days=30),
        descripcion_procedimiento="Test fixture",
        activo=True,
    ))
    await session.flush()
    return eq


@pytest_asyncio.fixture
async def equipo_serie_duplicada_target(session: AsyncSession) -> Tuple[Equipo, str]:
    """
    Devuelve (target, serie_existente) donde:
      - target: equipo cuyo serie podemos intentar cambiar
      - serie_existente: serie de OTRO equipo en BD (PUT a target con esta serie debe fallar UNIQUE)
    """
    target = await _nuevo_equipo(session, serie=_serie_unica("TGT"))
    otro = await _nuevo_equipo(session, serie=_serie_unica("DUP"))
    return target, otro.serie


# ─────────────────────────────────────────────────────────────────────────────
# Marcadores asyncio
# ─────────────────────────────────────────────────────────────────────────────

def pytest_collection_modifyitems(config, items):
    """Auto-marcar funciones async como asyncio para no repetir @pytest.mark.asyncio en cada test."""
    for item in items:
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)

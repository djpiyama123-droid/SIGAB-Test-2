"""
sigah-backend/tests/conftest.py — fixtures mínimos para los tests 02/05/07.

Generado por la rutina sigah-pulido-vps-sem1-continuacion (5-may-2026, re-ejecución).
Bloqueante señalado por la sesión previa: sin este archivo los pytest del bundle martes
fallan con "fixture not found" en lugar de fallar por el bug.

Modelo de datos asumido (verificado contra el repo `djpiyama123-droid/SIGAH-Test-2` HEAD `10bfc43`):
  - FastAPI app inicializada en `sigah-backend/main.py` como `app`.
  - `database.get_async_session` es la dependency a sobre-escribir.
  - JWT vía `auth.jwt_handler.create_access_token({"id": int, "rol": str, "matricula": str})`.
  - Roles relevantes (auth/permissions.py):
      * biomedico       → edit_equipo, NO delete_equipo
      * jefe_biomedica  → edit_equipo + delete_equipo
  - Modelos: Equipo, Trazabilidad, PreventivoProgramado, Usuario.
  - El listado completo de columnas usa tipos MySQL (mysql.INTEGER unsigned, DATETIME, TEXT)
    por lo que estos tests REQUIEREN una BD MySQL de pruebas, no SQLite. En el VPS la base
    `sigah_test` ya existe (docker-compose la levanta junto con `sigah_dev`).

Variables de entorno relevantes:
  SIGAH_TEST_DATABASE_URL   default: mysql+asyncmy://sigah:sigah@127.0.0.1:3306/sigah_test
  SIGAH_SSL_DISABLED        forzar a "true" en CI/local

Aislamiento por test: usamos transacción + ROLLBACK al final de cada test.
Esto evita estado residual sin tener que recrear el schema entre tests.

Si alguna fixture choca con una existente en `sigah-backend/tests/conftest.py` (caso poco
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
os.environ.setdefault("SIGAH_SSL_DISABLED", "true")

# Imports del backend (asumiendo pytest se corre desde sigah-backend/ con rootdir ahí)
from main import app  # noqa: E402
from database import get_async_session  # noqa: E402
from auth.jwt_handler import create_access_token  # noqa: E402
from models.usuario import Usuario  # noqa: E402
from models.equipo import Equipo  # noqa: E402
from models.trazabilidad import Trazabilidad  # noqa: E402
from models.preventivo import PreventivoProgramado  # noqa: E402
# Imports adicionales para que SQLModel.metadata conozca TODAS las tablas antes de create_all.
# Sin estos, el sort de dependencias FK falla con NoReferencedTableError.
from models.ubicacion import Ubicacion  # noqa: E402, F401
from models.hospital import Hospital  # noqa: E402, F401
from models.orden_servicio import OrdenServicio  # noqa: E402, F401
from models.mapa import ZonasMapa  # noqa: E402, F401
from models.alerta import Alerta  # noqa: E402, F401
from models.reserva import Reserva  # noqa: E402, F401
from models.soporte import AuditLog, LogActividad  # noqa: E402, F401
from models.orden_casillas import OrdenCasillas  # noqa: E402, F401
from models.modulos_extra import Refaccion, MetrologiaCalibracion, Capacitacion, PokaYokeLog  # noqa: E402, F401


# ─────────────────────────────────────────────────────────────────────────────
# Engine + sesión de pruebas (MySQL `sigah_test`)
# ─────────────────────────────────────────────────────────────────────────────

TEST_DATABASE_URL = os.getenv(
    "SIGAH_TEST_DATABASE_URL",
    "mysql+asyncmy://sigah:sigah@127.0.0.1:3306/sigah_test",
)


@pytest.fixture(scope="session", autouse=True)
def create_test_schema():
    """Crea el schema en sigah_test una sola vez, en un loop propio (sync fixture)."""
    import asyncio as _asyncio
    from sqlalchemy.ext.asyncio import create_async_engine as _cae

    async def _create():
        _engine = _cae(TEST_DATABASE_URL, echo=False, future=True)
        async with _engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        await _engine.dispose()

    _asyncio.run(_create())


@pytest_asyncio.fixture
async def test_engine() -> AsyncIterator[AsyncEngine]:
    """Engine fresco por test — cada test tiene su propio loop y conexión asyncmy."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True, pool_pre_ping=True)
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
async def test_session(test_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Sesión transaccional para tests multi-tenant (fixture independiente de 'session')."""
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

async def _crear_usuario(session: AsyncSession, *, rol: str, matricula: str, tenant_id: int = 1) -> Usuario:
    user = Usuario(
        nombre=f"Test {rol}",
        matricula=matricula,
        rol=rol,
        email=f"{matricula}@test.sigah",
        password_hash="not-used-in-tests",
        must_change_password=False,
        activo=True,
        tenant_id=tenant_id,
    )
    session.add(user)
    await session.flush()
    return user


def _bearer(user: Usuario) -> dict:
    token = create_access_token({
        "id": user.id,
        "rol": user.rol,
        "matricula": user.matricula,
        "tenant_id": user.tenant_id,
    })
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# Tenant (Hospital) — requerido por el FK NOT NULL Equipo.tenant_id → hospitales.id
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def tenant(session: AsyncSession) -> Hospital:
    """Crea un Hospital (tenant) para el test. Equipos y usuarios del test se
    asocian a este tenant para satisfacer el FK y el aislamiento multi-tenant."""
    hosp = Hospital(
        slug=f"hgr-test-{uuid.uuid4().hex[:8]}",
        razon_social="Hospital de Pruebas SIGAH",
        nombre_corto="HGR Test",
    )
    session.add(hosp)
    await session.flush()
    return hosp


@pytest_asyncio.fixture
async def usuario_biomedico(session: AsyncSession, tenant: Hospital) -> Usuario:
    return await _crear_usuario(session, rol="biomedico", matricula=f"BIO{uuid.uuid4().hex[:6]}", tenant_id=tenant.id)


@pytest_asyncio.fixture
async def usuario_jefe(session: AsyncSession, tenant: Hospital) -> Usuario:
    return await _crear_usuario(session, rol="jefe_biomedica", matricula=f"JEFE{uuid.uuid4().hex[:6]}", tenant_id=tenant.id)


@pytest_asyncio.fixture
async def usuario_admin(session: AsyncSession, tenant: Hospital) -> Usuario:
    return await _crear_usuario(session, rol="admin", matricula=f"ADM{uuid.uuid4().hex[:6]}", tenant_id=tenant.id)


@pytest_asyncio.fixture
async def auth_headers_biomedico(usuario_biomedico: Usuario) -> dict:
    return _bearer(usuario_biomedico)


@pytest_asyncio.fixture
async def auth_headers_jefe(usuario_jefe: Usuario) -> dict:
    return _bearer(usuario_jefe)


@pytest_asyncio.fixture
async def auth_headers_admin(usuario_admin: Usuario) -> dict:
    return _bearer(usuario_admin)


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
    tenant_id: int = 1,
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
        tenant_id=tenant_id,
    )
    session.add(eq)
    await session.flush()
    return eq


@pytest_asyncio.fixture
async def equipo_simple(session: AsyncSession, tenant: Hospital) -> Equipo:
    """Equipo SIN relaciones bloqueantes — válido para DELETE limpio y PUT."""
    return await _nuevo_equipo(session, tenant_id=tenant.id)


@pytest_asyncio.fixture
async def equipo_existente(session: AsyncSession, tenant: Hospital) -> Equipo:
    """Alias semántico para los tests que sólo necesitan un equipo cualquiera con qr_token."""
    return await _nuevo_equipo(session, tenant_id=tenant.id)


@pytest_asyncio.fixture
async def equipo_existente_con_ubicacion(session: AsyncSession, tenant: Hospital) -> Equipo:
    """Equipo con ubicación/área/piso definidos — para tests de preservación de ubicación."""
    return await _nuevo_equipo(
        session,
        serie=_serie_unica("UBI"),
        ubicacion="Quirófano 3 · Segundo",
        area="Quirófano 3",
        piso="Segundo",
        tenant_id=tenant.id,
    )


@pytest_asyncio.fixture
async def equipo_con_trazabilidad(session: AsyncSession, tenant: Hospital, usuario_jefe: Usuario) -> Equipo:
    eq = await _nuevo_equipo(session, serie=_serie_unica("TRZ"), tenant_id=tenant.id)
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
async def equipo_con_preventivo_activo(session: AsyncSession, tenant: Hospital) -> Equipo:
    eq = await _nuevo_equipo(session, serie=_serie_unica("PRV"), tenant_id=tenant.id)
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
async def equipo_serie_duplicada_target(session: AsyncSession, tenant: Hospital) -> Tuple[Equipo, str]:
    """
    Devuelve (target, serie_existente) donde:
      - target: equipo cuyo serie podemos intentar cambiar
      - serie_existente: serie de OTRO equipo en BD (PUT a target con esta serie debe fallar UNIQUE)
    """
    target = await _nuevo_equipo(session, serie=_serie_unica("TGT"), tenant_id=tenant.id)
    otro = await _nuevo_equipo(session, serie=_serie_unica("DUP"), tenant_id=tenant.id)
    return target, otro.serie


# ─────────────────────────────────────────────────────────────────────────────
# Marcadores asyncio
# ─────────────────────────────────────────────────────────────────────────────

def pytest_collection_modifyitems(config, items):
    """Auto-marcar funciones async como asyncio para no repetir @pytest.mark.asyncio en cada test."""
    for item in items:
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)

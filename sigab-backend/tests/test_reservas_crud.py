"""
test_reservas_crud.py — PUT/DELETE de reservas (ownership, validación, solapamiento).

Usa un connection aiomysql propio a sigah_test con autocommit=False y rollback
al final (aislamiento), inyectado vía override de get_db. Auth/tenant se
sobreescriben para no depender del JWT real.
"""
import os
import uuid

import pytest
import pytest_asyncio
import aiomysql
from httpx import AsyncClient, ASGITransport

pytestmark = pytest.mark.asyncio

os.environ.setdefault("SIGAH_SSL_DISABLED", "true")

from main import app  # noqa: E402
from config import get_db  # noqa: E402
from auth.dependencies import get_current_user  # noqa: E402
from auth.tenancy import get_current_tenant  # noqa: E402

TEST_DSN = dict(host="127.0.0.1", port=3306, user="sigah", password="sigah", db="sigah_test", autocommit=False)
TENANT = 1
OTRO_TENANT = 999


@pytest_asyncio.fixture
async def conn():
    c = await aiomysql.connect(**TEST_DSN)
    try:
        yield c
    finally:
        await c.rollback()  # deshace todo lo del test
        c.close()


@pytest_asyncio.fixture
async def seeded(conn):
    """Equipo (tenant=TENANT) + una reserva pendiente."""
    async with conn.cursor() as cur:
        # Sin FK checks: no necesitamos sembrar el hospital del tenant (la tx se revierte).
        await cur.execute("SET FOREIGN_KEY_CHECKS=0")
        serie = "TST-" + uuid.uuid4().hex[:10].upper()
        await cur.execute(
            "INSERT INTO equipos (tenant_id, serie, nombre, marca, modelo, ubicacion, estado, criticidad, "
            "tipo_equipo, clase_cofepris, qr_token, pos_x, pos_y, created_at, updated_at) "
            "VALUES (%s,%s,'Equipo Test','ACME','X1','UCI','operativo','media','biomedico','II',%s,50,50,NOW(),NOW())",
            (TENANT, serie, uuid.uuid4().hex[:16]),
        )
        equipo_id = cur.lastrowid
        await cur.execute(
            "INSERT INTO reservas (equipo_id, area_reserva, piso_reserva, fecha_inicio, fecha_fin, motivo, estado, created_at) "
            "VALUES (%s,'UCI','PB','2026-07-01 09:00:00','2026-07-01 11:00:00','original','pendiente',NOW())",
            (equipo_id,),
        )
        reserva_id = cur.lastrowid
    return {"equipo_id": equipo_id, "reserva_id": reserva_id}


@pytest_asyncio.fixture
async def client(conn):
    async def _db():
        yield conn
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "rol": "jefe_biomedica", "tenant_id": TENANT, "matricula": "T"}
    app.dependency_overrides[get_current_tenant] = lambda: TENANT
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


async def test_editar_reserva_ok(client, conn, seeded):
    r = await client.put(f"/api/reservas/{seeded['reserva_id']}", json={"motivo": "editado", "area_reserva": "Quirófano 2"})
    assert r.status_code == 200, r.text
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT motivo, area_reserva FROM reservas WHERE id=%s", (seeded["reserva_id"],))
        row = await cur.fetchone()
    assert row["motivo"] == "editado"
    assert row["area_reserva"] == "Quirófano 2"


async def test_editar_valida_fecha_fin_antes_de_inicio(client, seeded):
    r = await client.put(
        f"/api/reservas/{seeded['reserva_id']}",
        json={"fecha_inicio": "2026-07-01 10:00:00", "fecha_fin": "2026-07-01 09:00:00"},
    )
    assert r.status_code == 400


async def test_editar_solapamiento_409(client, conn, seeded):
    # Segunda reserva del mismo equipo que solapa; editar la 1ª para chocar con ella.
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO reservas (equipo_id, area_reserva, fecha_inicio, fecha_fin, estado, created_at) "
            "VALUES (%s,'UCI','2026-07-05 09:00:00','2026-07-05 12:00:00','activa',NOW())",
            (seeded["equipo_id"],),
        )
    r = await client.put(
        f"/api/reservas/{seeded['reserva_id']}",
        json={"fecha_inicio": "2026-07-05 10:00:00", "fecha_fin": "2026-07-05 11:00:00"},
    )
    assert r.status_code == 409


async def test_editar_cross_tenant_404(client, seeded):
    app.dependency_overrides[get_current_tenant] = lambda: OTRO_TENANT
    r = await client.put(f"/api/reservas/{seeded['reserva_id']}", json={"motivo": "x"})
    assert r.status_code == 404


async def test_eliminar_reserva_ok(client, conn, seeded):
    r = await client.delete(f"/api/reservas/{seeded['reserva_id']}")
    assert r.status_code == 200, r.text
    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM reservas WHERE id=%s", (seeded["reserva_id"],))
        assert await cur.fetchone() is None


async def test_eliminar_inexistente_404(client):
    r = await client.delete("/api/reservas/99999999")
    assert r.status_code == 404

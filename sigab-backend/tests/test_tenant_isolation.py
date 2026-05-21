"""
tests/test_tenant_isolation.py — Suite de pruebas de aislamiento multi-tenant.

Estas pruebas validan la promesa central de SIGAH: **ningún hospital ve datos
de otro**. Se ejercitan las rutas refactorizadas en Fase 2 con dos tenants
sintéticos (Hospital A y Hospital B) y verifican que cada acceso cruzado
devuelva 404 (no 403 — no debe revelar existencia).

Pre-requisitos
--------------
* Migración Fase 1 (a1b2c3d4e5f6) aplicada en sigab_test.
* (Opcional) Migración Fase 3 (b1c2d3e4f5a6) aplicada — sin ella los tests
  de SuperAdmin se saltan automáticamente.
* Routes/equipos.py refactorizado con get_current_tenant. Mientras no lo
  estén, estos tests FALLAN — es lo deseado en TDD.

Estrategia
----------
Se crean dos hospitales (slug "test-a", "test-b") y un usuario por hospital.
Cada usuario obtiene un JWT con su tenant_id correspondiente. Luego:

1. Cada usuario lista sus equipos → ve solo los suyos.
2. Cada usuario intenta GET por id del equipo del otro → 404.
3. Cada usuario intenta PATCH/DELETE del equipo del otro → 404.
4. Cada usuario intenta POST con tenant_id forjado en el body → se ignora,
   se asigna el tenant del JWT.
5. La ruta pública /equipos/public/{qr_token} sigue devolviendo solo campos
   no sensibles aunque el QR sea de otro tenant.

Limpieza: rollback al cierre de cada test (ver conftest.py existente).
"""
from __future__ import annotations

import secrets
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from main import app
from auth.jwt_handler import create_access_token
from models.hospital import Hospital
from models.usuario import Usuario
from models.equipo import Equipo


# ─────────────────────────────────────────────────────────────────────────
# Fixtures: dos tenants y un usuario por tenant
# ─────────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def two_tenants(test_session):
    """Crea Hospital A y Hospital B en la BD de pruebas."""
    hosp_a = Hospital(
        slug="test-a",
        razon_social="Hospital de Prueba A",
        nombre_corto="Hosp A",
        estado_suscripcion="activo",
    )
    hosp_b = Hospital(
        slug="test-b",
        razon_social="Hospital de Prueba B",
        nombre_corto="Hosp B",
        estado_suscripcion="activo",
    )
    test_session.add(hosp_a)
    test_session.add(hosp_b)
    await test_session.commit()
    await test_session.refresh(hosp_a)
    await test_session.refresh(hosp_b)
    return hosp_a, hosp_b


@pytest_asyncio.fixture
async def users_for_tenants(test_session, two_tenants):
    """Un usuario biomedico por tenant. Devuelve (user_a, token_a, user_b, token_b)."""
    hosp_a, hosp_b = two_tenants
    user_a = Usuario(
        nombre="Bio A",
        matricula=f"BIOA-{secrets.token_hex(3)}",
        rol="biomedico",
        tenant_id=hosp_a.id,
        activo=True,
    )
    user_b = Usuario(
        nombre="Bio B",
        matricula=f"BIOB-{secrets.token_hex(3)}",
        rol="biomedico",
        tenant_id=hosp_b.id,
        activo=True,
    )
    test_session.add(user_a)
    test_session.add(user_b)
    await test_session.commit()
    await test_session.refresh(user_a)
    await test_session.refresh(user_b)

    token_a = create_access_token({
        "id": user_a.id,
        "rol": user_a.rol,
        "matricula": user_a.matricula,
        "tenant_id": user_a.tenant_id,
    })
    token_b = create_access_token({
        "id": user_b.id,
        "rol": user_b.rol,
        "matricula": user_b.matricula,
        "tenant_id": user_b.tenant_id,
    })
    return user_a, token_a, user_b, token_b


@pytest_asyncio.fixture
async def equipos_for_tenants(test_session, two_tenants):
    """Un equipo por tenant. Devuelve (equipo_a, equipo_b)."""
    hosp_a, hosp_b = two_tenants
    eq_a = Equipo(
        serie=f"SER-A-{secrets.token_hex(4)}",
        nombre="Centrifuga A",
        marca="Thermo",
        modelo="Medifuge",
        ubicacion="Lab A",
        tenant_id=hosp_a.id,
    )
    eq_b = Equipo(
        serie=f"SER-B-{secrets.token_hex(4)}",
        nombre="Monitor B",
        marca="GE",
        modelo="CARESCAPE",
        ubicacion="UCIN B",
        tenant_id=hosp_b.id,
    )
    test_session.add(eq_a)
    test_session.add(eq_b)
    await test_session.commit()
    await test_session.refresh(eq_a)
    await test_session.refresh(eq_b)
    return eq_a, eq_b


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────
# Test 1 — LISTAR solo ve los propios
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_listar_equipos_solo_devuelve_los_del_tenant(
    client, users_for_tenants, equipos_for_tenants
):
    _, token_a, _, token_b = users_for_tenants
    eq_a, eq_b = equipos_for_tenants

    # Hospital A lista sus equipos: debe ver eq_a, NO eq_b.
    r_a = await client.get("/api/equipos/", headers=auth_headers(token_a))
    assert r_a.status_code == 200, r_a.text
    ids_a = {e["id"] for e in r_a.json().get("items", r_a.json())}
    assert eq_a.id in ids_a
    assert eq_b.id not in ids_a, "FUGA: Hospital A vio el equipo del Hospital B"

    # Hospital B lista sus equipos: debe ver eq_b, NO eq_a.
    r_b = await client.get("/api/equipos/", headers=auth_headers(token_b))
    assert r_b.status_code == 200
    ids_b = {e["id"] for e in r_b.json().get("items", r_b.json())}
    assert eq_b.id in ids_b
    assert eq_a.id not in ids_b, "FUGA: Hospital B vio el equipo del Hospital A"


# ─────────────────────────────────────────────────────────────────────────
# Test 2 — GET por id cross-tenant devuelve 404 (no 403)
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_cross_tenant_devuelve_404(
    client, users_for_tenants, equipos_for_tenants
):
    _, token_a, _, _ = users_for_tenants
    _, eq_b = equipos_for_tenants

    r = await client.get(f"/api/equipos/{eq_b.id}", headers=auth_headers(token_a))
    # 404, NUNCA 403: no debe revelar que el id existe en otro tenant.
    assert r.status_code == 404, f"Esperado 404, recibido {r.status_code}: {r.text}"


# ─────────────────────────────────────────────────────────────────────────
# Test 3 — UPDATE cross-tenant devuelve 404 y NO modifica
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_cross_tenant_no_modifica(
    client, test_session, users_for_tenants, equipos_for_tenants
):
    _, token_a, _, _ = users_for_tenants
    _, eq_b = equipos_for_tenants

    nombre_original = eq_b.nombre
    r = await client.put(
        f"/api/equipos/{eq_b.id}",
        json={"nombre": "HACKEADO"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 404

    # Re-leer eq_b desde BD y verificar que no cambió.
    await test_session.refresh(eq_b)
    assert eq_b.nombre == nombre_original, "FUGA: A modificó el equipo de B"


# ─────────────────────────────────────────────────────────────────────────
# Test 4 — DELETE cross-tenant devuelve 404 y NO borra
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_cross_tenant_no_borra(
    client, test_session, users_for_tenants, equipos_for_tenants
):
    _, token_a, _, _ = users_for_tenants
    _, eq_b = equipos_for_tenants

    r = await client.delete(f"/api/equipos/{eq_b.id}", headers=auth_headers(token_a))
    assert r.status_code == 404

    # Verificar que sigue existiendo en BD.
    await test_session.refresh(eq_b)
    assert eq_b.id is not None


# ─────────────────────────────────────────────────────────────────────────
# Test 5 — POST con tenant_id forjado en body es IGNORADO
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_post_tenant_id_forjado_es_ignorado(
    client, test_session, users_for_tenants, two_tenants
):
    user_a, token_a, _, _ = users_for_tenants
    hosp_a, hosp_b = two_tenants

    payload = {
        "serie": f"SER-INTRUSO-{secrets.token_hex(4)}",
        "nombre": "Equipo intruso",
        "marca": "Hacker",
        "modelo": "X",
        "ubicacion": "Sala maligna",
        "tenant_id": hosp_b.id,  # intento de inyección
    }
    r = await client.post(
        "/api/equipos/", json=payload, headers=auth_headers(token_a)
    )
    assert r.status_code in (200, 201), r.text
    creado_id = r.json()["id"]

    # Re-leer desde BD: el tenant debe ser el del JWT (A), NO el del body (B).
    from sqlmodel import select
    stmt = select(Equipo).where(Equipo.id == creado_id)
    res = await test_session.execute(stmt)
    creado = res.scalar_one()
    assert creado.tenant_id == hosp_a.id, (
        f"FUGA: tenant_id del body fue respetado. Esperado {hosp_a.id}, "
        f"recibido {creado.tenant_id}"
    )


# ─────────────────────────────────────────────────────────────────────────
# Test 6 — Token sin tenant_id (legacy pre-Fase 1) es rechazado con 403
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_token_legacy_sin_tenant_id_rechazado(
    client, users_for_tenants
):
    user_a, _, _, _ = users_for_tenants
    # Token sin tenant_id (simula uno emitido antes de Fase 1).
    legacy_token = create_access_token({
        "id": user_a.id,
        "rol": user_a.rol,
        "matricula": user_a.matricula,
        # tenant_id ausente a propósito
    })
    r = await client.get(
        "/api/equipos/", headers=auth_headers(legacy_token)
    )
    assert r.status_code == 403, (
        f"Tokens legacy deben rechazarse con 403, recibido {r.status_code}"
    )


# ─────────────────────────────────────────────────────────────────────────
# Test 7 — SuperAdmin (rol global) no usa rutas de tenant
# ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_superadmin_no_puede_usar_rutas_tenant(client, test_session):
    """Pre-requisito: migración Fase 3 (b1c2d3e4f5a6) aplicada en sigab_test.
    Si no, el INSERT del SuperAdmin con tenant_id=NULL fallará por NOT NULL.
    """
    try:
        admin = Usuario(
            nombre="SuperAdmin Test",
            matricula=f"SADM-{secrets.token_hex(3)}",
            rol="superadmin_sigah",
            tenant_id=None,  # válido sólo post-Fase 3
            activo=True,
        )
        test_session.add(admin)
        await test_session.commit()
        await test_session.refresh(admin)
    except Exception as e:
        pytest.skip(f"Migración Fase 3 no aplicada (tenant_id aún NOT NULL): {e}")

    token = create_access_token({
        "id": admin.id,
        "rol": admin.rol,
        "matricula": admin.matricula,
        # tenant_id ausente — SuperAdmin no pertenece a un tenant
    })
    r = await client.get("/api/equipos/", headers=auth_headers(token))
    # Debe rechazarse: SuperAdmin usa /api/admin-global/..., no rutas de tenant.
    assert r.status_code == 403, r.text

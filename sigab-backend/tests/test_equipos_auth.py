"""Regresión P0-01 (security): el listado y catálogos de equipos exigen Bearer token.

Tests:
1. GET /api/equipos/ sin Authorization → 401
2. GET /api/equipos/ con token inválido → 401
3. GET /api/equipos/ con token válido (biomedico) → 200 y trae lista
4. GET /api/equipos/areas/catalogo sin token → 401
5. GET /api/equipos/zonas/catalogo sin token → 401
6. GET /api/equipos/public/{qr} SIGUE sin auth (regresión inversa: no rompemos QR público)

Asume fixtures en sigab-backend/tests/conftest.py:
- `client`            (TestClient o httpx.AsyncClient)
- `auth_headers_biomedico`  (dict con header Authorization válido)
- `equipo_existente`  (objeto Equipo con qr_token poblado)
"""
import pytest


@pytest.mark.asyncio
async def test_listar_equipos_requiere_auth(client):
    """P0-01: GET /api/equipos/ sin token debe rechazar."""
    resp = await client.get("/api/equipos/")
    assert resp.status_code == 401, (
        f"Esperado 401, recibido {resp.status_code}. "
        f"REGRESIÓN: el listado volvió a exponer datos sin token. Body={resp.text[:200]}"
    )


@pytest.mark.asyncio
async def test_listar_equipos_token_invalido_rechaza(client):
    """Cualquier token mal formado o expirado debe traducir a 401."""
    headers = {"Authorization": "Bearer not-a-real-jwt"}
    resp = await client.get("/api/equipos/", headers=headers)
    assert resp.status_code == 401, (
        f"Esperado 401 con token inválido, recibido {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_listar_equipos_con_biomedico_ok(client, auth_headers_biomedico):
    """Con token válido el endpoint sigue funcionando. No queremos romper UX."""
    resp = await client.get("/api/equipos/", headers=auth_headers_biomedico)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "equipos" in body, body
    assert isinstance(body["equipos"], list)


@pytest.mark.asyncio
async def test_areas_catalogo_requiere_auth(client):
    """P2-04: el catálogo de áreas/pisos no debería filtrarse a anónimos."""
    resp = await client.get("/api/equipos/areas/catalogo")
    assert resp.status_code == 401, (
        f"Esperado 401, recibido {resp.status_code}. "
        f"P2-04: catálogo expuesto sin token. Body={resp.text[:200]}"
    )


@pytest.mark.asyncio
async def test_zonas_catalogo_requiere_auth(client):
    """Mismo blindaje para zonas del mapa."""
    resp = await client.get("/api/equipos/zonas/catalogo")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_qr_publico_sigue_sin_auth(client, equipo_existente):
    """Regresión INVERSA: GET /api/equipos/public/{qr_token} es por diseño público.

    Si este test falla con 401 alguien rompió el escaneo QR para personal sin login
    (médicos/enfermeras escaneando con celular sin sesión).
    """
    resp = await client.get(f"/api/equipos/public/{equipo_existente.qr_token}")
    assert resp.status_code == 200, (
        f"REGRESIÓN: el endpoint público de QR ahora exige auth. status={resp.status_code}"
    )
    body = resp.json()
    assert "equipo" in body
    # No debe leakear campos confidenciales aunque tenga datos del equipo
    eq = body["equipo"]
    for confidencial in ("numero_contrato", "numero_contrato_servicio", "vida_util_anios"):
        assert confidencial not in eq or eq[confidencial] is None, (
            f"Campo confidencial '{confidencial}' expuesto vía QR público"
        )

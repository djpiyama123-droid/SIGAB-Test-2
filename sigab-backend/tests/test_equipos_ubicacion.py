"""
Test de regresión para el bug PUT/POST /equipos con ubicacion vacía/ausente.

Reproduce el escenario del log:
  UPDATE equipos SET ubicacion=%s, estado=%s, fecha_ultimo_mantenimiento=%s
  WHERE equipos.id=%s
  parameters (None, 'en_mantenimiento', '2026-02-23', 422)

Antes del patch quirúrgico → IntegrityError (1048: ubicacion no puede ser NULL).
Después del patch         → 200 OK, ubicacion derivada de area · piso.

VPS-01 (2026-07-15): el mismo 1048 podía ocurrir en el ALTA (POST /equipos/)
porque crear_equipo() no tenía ningún guard de consolidación — solo el PUT
lo tenía. Se agregó consolidar_ubicacion() en routes/equipos.py, cubierto
por los tests test_post_equipo_*.

Ubicación sugerida: sigah-backend/tests/test_equipos_ubicacion.py
Ejecutar con:        cd sigah-backend && pytest tests/test_equipos_ubicacion.py -v
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_none_se_deriva_de_area_y_piso(
    client: AsyncClient, auth_headers_jefe, equipo_existente
):
    """Si llega ubicacion=None pero hay area/piso, derivar la ubicación."""
    payload = {
        "estado": "en_mantenimiento",
        "fecha_ultimo_mantenimiento": "2026-02-23",
        "ubicacion": None,
        "area": "Quirófano 3",
        "piso": "Segundo",
    }
    r = await client.put(
        f"/api/equipos/{equipo_existente.id}",
        json=payload,
        headers=auth_headers_jefe,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True

    # Verificar el lado servidor leyendo el equipo
    r2 = await client.get(
        f"/api/equipos/{equipo_existente.id}", headers=auth_headers_jefe
    )
    eq = r2.json()["equipo"]
    assert eq["ubicacion"] == "Quirófano 3 · Segundo"
    assert eq["estado"] == "en_mantenimiento"


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_none_y_sin_area_piso_preserva_actual(
    client: AsyncClient, auth_headers_jefe, equipo_existente_con_ubicacion
):
    """Si llega ubicacion=None y NO hay area/piso para derivar,
    no se debe sobreescribir la ubicación existente con NULL."""
    ubicacion_previa = equipo_existente_con_ubicacion.ubicacion
    payload = {
        "estado": "operativo",
        "ubicacion": None,
    }
    r = await client.put(
        f"/api/equipos/{equipo_existente_con_ubicacion.id}",
        json=payload,
        headers=auth_headers_jefe,
    )
    assert r.status_code == 200, r.text

    r2 = await client.get(
        f"/api/equipos/{equipo_existente_con_ubicacion.id}",
        headers=auth_headers_jefe,
    )
    eq = r2.json()["equipo"]
    assert eq["ubicacion"] == ubicacion_previa  # se preservó


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_explicita_se_respeta(
    client: AsyncClient, auth_headers_jefe, equipo_existente
):
    """Si el usuario manda ubicacion explícita, se respeta tal cual."""
    payload = {
        "ubicacion": "Almacén central · Piso 1",
        "area": "Quirófano 3",  # ← este NO debe ganar
        "piso": "Segundo",
    }
    r = await client.put(
        f"/api/equipos/{equipo_existente.id}",
        json=payload,
        headers=auth_headers_jefe,
    )
    assert r.status_code == 200

    r2 = await client.get(
        f"/api/equipos/{equipo_existente.id}", headers=auth_headers_jefe
    )
    assert r2.json()["equipo"]["ubicacion"] == "Almacén central · Piso 1"


def _payload_alta(**overrides):
    import uuid
    base = {
        "nombre": "Equipo de prueba VPS-01",
        "serie": f"VPS01-{uuid.uuid4().hex[:10].upper()}",
        "marca": "ACME",
        "modelo": "X1",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_post_equipo_sin_ubicacion_ni_piso_area_usa_default(
    client: AsyncClient, auth_headers_jefe
):
    """Alta sin ubicacion/piso/area: no debe tronar con 1048, usa el default legible."""
    r = await client.post(
        "/api/equipos/", json=_payload_alta(), headers=auth_headers_jefe
    )
    assert r.status_code == 200, r.text
    eq_id = r.json()["id"]

    r2 = await client.get(f"/api/equipos/{eq_id}", headers=auth_headers_jefe)
    assert r2.json()["equipo"]["ubicacion"] == "H.G.R. 1 - Sin especificar"


@pytest.mark.asyncio
async def test_post_equipo_con_piso_area_consolida_ubicacion(
    client: AsyncClient, auth_headers_jefe
):
    """Alta con piso/área granulares (sin ubicacion): se consolida en un string legible."""
    r = await client.post(
        "/api/equipos/",
        json=_payload_alta(piso="3", area="Urgencias"),
        headers=auth_headers_jefe,
    )
    assert r.status_code == 200, r.text
    eq_id = r.json()["id"]

    r2 = await client.get(f"/api/equipos/{eq_id}", headers=auth_headers_jefe)
    assert r2.json()["equipo"]["ubicacion"] == "H.G.R. 1 - Piso 3 - Urgencias"


@pytest.mark.asyncio
async def test_post_equipo_ubicacion_explicita_se_respeta(
    client: AsyncClient, auth_headers_jefe
):
    """Si el cliente ya manda ubicacion armada, no se sobreescribe."""
    r = await client.post(
        "/api/equipos/",
        json=_payload_alta(ubicacion="Almacén central · Piso 1", area="Urgencias"),
        headers=auth_headers_jefe,
    )
    assert r.status_code == 200, r.text
    eq_id = r.json()["id"]

    r2 = await client.get(f"/api/equipos/{eq_id}", headers=auth_headers_jefe)
    assert r2.json()["equipo"]["ubicacion"] == "Almacén central · Piso 1"

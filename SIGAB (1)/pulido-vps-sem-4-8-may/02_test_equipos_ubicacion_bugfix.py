"""
Test de regresión para el bug PUT /equipos/{id} con ubicacion=None.

Reproduce el escenario del log:
  UPDATE equipos SET ubicacion=%s, estado=%s, fecha_ultimo_mantenimiento=%s
  WHERE equipos.id=%s
  parameters (None, 'en_mantenimiento', '2026-02-23', 422)

Antes del patch quirúrgico → IntegrityError (1048: ubicacion no puede ser NULL).
Después del patch         → 200 OK, ubicacion derivada de area · piso.

Ubicación sugerida: sigab-backend/tests/test_equipos_ubicacion.py
Ejecutar con:        cd sigab-backend && pytest tests/test_equipos_ubicacion.py -v
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_none_se_deriva_de_area_y_piso(
    client: AsyncClient, auth_headers_admin, equipo_existente
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
        headers=auth_headers_admin,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True

    # Verificar el lado servidor leyendo el equipo
    r2 = await client.get(
        f"/api/equipos/{equipo_existente.id}", headers=auth_headers_admin
    )
    eq = r2.json()
    assert eq["ubicacion"] == "Quirófano 3 · Segundo"
    assert eq["estado"] == "en_mantenimiento"


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_none_y_sin_area_piso_preserva_actual(
    client: AsyncClient, auth_headers_admin, equipo_existente_con_ubicacion
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
        headers=auth_headers_admin,
    )
    assert r.status_code == 200, r.text

    r2 = await client.get(
        f"/api/equipos/{equipo_existente_con_ubicacion.id}",
        headers=auth_headers_admin,
    )
    eq = r2.json()
    assert eq["ubicacion"] == ubicacion_previa  # se preservó


@pytest.mark.asyncio
async def test_put_equipo_ubicacion_explicita_se_respeta(
    client: AsyncClient, auth_headers_admin, equipo_existente
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
        headers=auth_headers_admin,
    )
    assert r.status_code == 200

    r2 = await client.get(
        f"/api/equipos/{equipo_existente.id}", headers=auth_headers_admin
    )
    assert r2.json()["ubicacion"] == "Almacén central · Piso 1"

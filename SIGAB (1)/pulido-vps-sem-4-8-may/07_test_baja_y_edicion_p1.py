"""Suite P1 martes 5-may: editar y dar de baja equipos sin IntegrityError opaco.

Cubre:
- P1-01 (refuerzo): PUT con ubicacion vacía + area/piso poblados → derivado, 200.
- P1-01 (negativo): PUT con SOLO ubicacion=null y sin area/piso → no nullifica.
- DELETE de equipo SIN relaciones bloqueantes → 200, registrado en auditoría.
- DELETE de equipo CON registros de trazabilidad → 409 con mensaje accionable.
- DELETE de equipo CON preventivo activo → 409.
- PUT que viola constraint de unicidad (serie duplicada) → 400 con detalle (P2-01).
- DELETE inexistente → 404.

Asume fixtures en conftest.py:
- `client`                          httpx.AsyncClient autenticado opcional
- `auth_headers_jefe`               headers con rol jefe_biomedica (puede delete)
- `auth_headers_biomedico`          headers con rol biomedico
- `equipo_simple`                   Equipo sin relaciones
- `equipo_con_trazabilidad`         Equipo con al menos 1 registro en trazabilidad
- `equipo_con_preventivo_activo`    Equipo con preventivo_programado activo
- `equipo_serie_duplicada_target`   Equipo cuyo PUT a serie='X' choca con UNIQUE
"""
import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Edición de ubicación — refuerzos sobre el patch del lunes
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_put_ubicacion_vacia_se_deriva_de_area_y_piso(client, auth_headers_biomedico, equipo_simple):
    """P1-01 happy path tras patch lunes: el backend deriva ubicacion."""
    payload = {"ubicacion": None, "area": "Quirófano 3", "piso": "2do piso"}
    resp = await client.put(f"/api/equipos/{equipo_simple.id}", json=payload, headers=auth_headers_biomedico)
    assert resp.status_code == 200, resp.text

    # Releer
    resp_get = await client.get(f"/api/equipos/{equipo_simple.id}", headers=auth_headers_biomedico)
    body = resp_get.json()
    assert body["ubicacion"] == "Quirófano 3 · 2do piso", body


@pytest.mark.asyncio
async def test_put_ubicacion_null_sin_area_ni_piso_no_nullifica(client, auth_headers_biomedico, equipo_simple):
    """Defensa: si llega ubicacion=null y no hay area/piso, NO debe nullificar la previa."""
    ubicacion_previa = equipo_simple.ubicacion
    payload = {"ubicacion": None}
    resp = await client.put(f"/api/equipos/{equipo_simple.id}", json=payload, headers=auth_headers_biomedico)
    # Aceptable: 200 (con drop silencioso) o 400 (rechazo explícito). Ambos > 500.
    assert resp.status_code in (200, 400), resp.text
    if resp.status_code == 200:
        resp_get = await client.get(f"/api/equipos/{equipo_simple.id}", headers=auth_headers_biomedico)
        assert resp_get.json()["ubicacion"] == ubicacion_previa, "Se nullificó la ubicación previa"


# ─────────────────────────────────────────────────────────────────────────────
# Baja física — relaciones bloqueantes
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_equipo_sin_relaciones_ok(client, auth_headers_jefe, equipo_simple):
    """DELETE limpio cuando no hay trazabilidad / preventivos / reservas."""
    resp = await client.delete(f"/api/equipos/{equipo_simple.id}", headers=auth_headers_jefe)
    assert resp.status_code == 200, resp.text
    assert resp.json().get("ok") is True


@pytest.mark.asyncio
async def test_delete_equipo_con_trazabilidad_devuelve_409(client, auth_headers_jefe, equipo_con_trazabilidad):
    """NOM-016: trazabilidad histórica no se borra; el DELETE devuelve 409 accionable."""
    resp = await client.delete(f"/api/equipos/{equipo_con_trazabilidad.id}", headers=auth_headers_jefe)
    assert resp.status_code == 409, f"Esperado 409, fue {resp.status_code}: {resp.text[:200]}"
    detail = resp.json().get("detail", "").lower()
    assert "trazabilidad" in detail, f"Mensaje no menciona trazabilidad: {detail}"
    # Sugerencia al usuario: cambiar a estado='baja' en lugar de eliminar.
    assert "baja" in detail


@pytest.mark.asyncio
async def test_delete_equipo_con_preventivo_activo_devuelve_409(client, auth_headers_jefe, equipo_con_preventivo_activo):
    """No borrar si tiene preventivo activo — pedir cancelarlo primero."""
    resp = await client.delete(f"/api/equipos/{equipo_con_preventivo_activo.id}", headers=auth_headers_jefe)
    assert resp.status_code == 409
    assert "preventivo" in resp.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_delete_equipo_inexistente_404(client, auth_headers_jefe):
    resp = await client.delete("/api/equipos/9999999", headers=auth_headers_jefe)
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Mapeo P2-01: IntegrityError → 400 accionable
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_put_serie_duplicada_devuelve_400(client, auth_headers_jefe, equipo_serie_duplicada_target):
    """Evitar 500 opaco. El frontend debe poder leer detail y mostrar 'Serie duplicada'."""
    target, conflict_serie = equipo_serie_duplicada_target  # tupla: (equipo, serie de OTRO equipo)
    payload = {"serie": conflict_serie}
    resp = await client.put(f"/api/equipos/{target.id}", json=payload, headers=auth_headers_jefe)
    assert resp.status_code == 400, f"Esperado 400 (no 500), fue {resp.status_code}: {resp.text[:200]}"
    detail = resp.json().get("detail", "").lower()
    # En MySQL "Duplicate entry ... for key 'equipos.serie'"
    assert any(t in detail for t in ("duplic", "serie")), detail


# ─────────────────────────────────────────────────────────────────────────────
# Permisos negativos (no rompimos delegación de roles)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_biomedico_no_puede_borrar(client, auth_headers_biomedico, equipo_simple):
    """biomedico tiene edit_equipo pero NO delete_equipo (ver permissions.py)."""
    resp = await client.delete(f"/api/equipos/{equipo_simple.id}", headers=auth_headers_biomedico)
    assert resp.status_code == 403, resp.text

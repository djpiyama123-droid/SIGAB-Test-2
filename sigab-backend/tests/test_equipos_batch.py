"""
test_equipos_batch.py — Tests TestClient para los 2 endpoints del piloto HGR1.

Endpoints bajo prueba:
  GET  /api/equipos/qr/labels-batch     → genera PDF con N etiquetas QR
  POST /api/equipos/importar-excel       → importa equipos nuevos desde Excel

Casos cubiertos (ver docstring del módulo en la rama original).
"""
from __future__ import annotations

import io
import uuid
import pytest

from models.equipo import Equipo
from models.soporte import AuditLog, LogActividad
from sqlalchemy import select


async def _crear_equipos_para_qr(session, n: int = 5) -> list[Equipo]:
    equipos = []
    for _ in range(n):
        eq = Equipo(
            serie=f"QR-{uuid.uuid4().hex[:10].upper()}",
            nombre="Monitor de prueba",
            marca="Mindray",
            modelo="N15",
            ubicacion="UCI · cama 1",
            area="UCI",
            piso="3",
            estado="operativo",
            criticidad="alta",
            qr_token=uuid.uuid4().hex[:16],
            tenant_id=1,
        )
        session.add(eq)
        equipos.append(eq)
    await session.flush()
    return equipos


def _payload_equipo_valido() -> dict:
    return {
        "serie": f"IMP-{uuid.uuid4().hex[:10].upper()}",
        "nombre": "Bomba de infusión",
        "marca": "Braun",
        "modelo": "Perfusor Space",
        "ubicacion": "Piso 4 · UCIN · cuna 3",
        "area": "UCIN",
        "piso": "4",
        "estado": "operativo",
        "criticidad": "alta",
        "tipo_equipo": "bomba_infusion",
        "clase_cofepris": "II",
    }


@pytest.mark.asyncio
async def test_labels_batch_a4_happy_path(client, session, auth_headers_jefe):
    equipos = await _crear_equipos_para_qr(session, n=3)
    ids = ",".join(str(eq.id) for eq in equipos)
    resp = await client.get(
        f"/api/equipos/qr/labels-batch?ids={ids}&formato=a4",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 1000, f"PDF demasiado pequeño: {len(resp.content)} bytes"
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_labels_batch_a6_concatenado(client, session, auth_headers_jefe):
    equipos = await _crear_equipos_para_qr(session, n=3)
    ids = ",".join(str(eq.id) for eq in equipos)
    resp = await client.get(
        f"/api/equipos/qr/labels-batch?ids={ids}&formato=a6",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    from PyPDF2 import PdfReader as _P2Reader
    reader = _P2Reader(io.BytesIO(resp.content))
    assert len(reader.pages) == 3


@pytest.mark.asyncio
async def test_labels_batch_por_hoja_fuera_de_rango(client, auth_headers_jefe):
    resp = await client.get(
        "/api/equipos/qr/labels-batch?ids=1&por_hoja=30",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_labels_batch_ids_vacio(client, auth_headers_jefe):
    resp = await client.get(
        "/api/equipos/qr/labels-batch?ids=",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_labels_batch_ids_no_enteros(client, auth_headers_jefe):
    resp = await client.get(
        "/api/equipos/qr/labels-batch?ids=abc,def",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_labels_batch_mas_de_500_ids(client, auth_headers_jefe):
    ids = ",".join(str(i) for i in range(1, 502))
    resp = await client.get(
        f"/api/equipos/qr/labels-batch?ids={ids}",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_labels_batch_ids_no_existen(client, auth_headers_jefe):
    resp = await client.get(
        "/api/equipos/qr/labels-batch?ids=999999,888888",
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_labels_batch_sin_jwt(client):
    resp = await client.get("/api/equipos/qr/labels-batch?ids=1")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_labels_biomedico_sin_permiso(client, auth_headers_biomedico):
    resp = await client.get(
        "/api/equipos/qr/labels-batch?ids=1",
        headers=auth_headers_biomedico,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_importar_excel_happy_path(client, session, auth_headers_jefe, usuario_jefe):
    payload = {"equipos": [_payload_equipo_valido() for _ in range(3)]}
    resp = await client.post(
        "/api/equipos/importar-excel",
        json=payload,
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert body["total_recibidos"] == 3
    assert body["creados"] == 3
    assert body["errores"] == 0
    for c in body["detalle_creados"]:
        assert "qr_token" in c
        assert len(c["qr_token"]) >= 12


@pytest.mark.asyncio
async def test_importar_excel_payload_sin_equipos(client, auth_headers_jefe):
    resp = await client.post("/api/equipos/importar-excel", json={}, headers=auth_headers_jefe)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_importar_excel_mas_de_200(client, auth_headers_jefe):
    payload = {"equipos": [_payload_equipo_valido() for _ in range(201)]}
    resp = await client.post("/api/equipos/importar-excel", json=payload, headers=auth_headers_jefe)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_importar_excel_sin_jwt(client):
    resp = await client.post(
        "/api/equipos/importar-excel",
        json={"equipos": [_payload_equipo_valido()]},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_importar_excel_biomedico_sin_permiso(client, auth_headers_biomedico):
    resp = await client.post(
        "/api/equipos/importar-excel",
        json={"equipos": [_payload_equipo_valido()]},
        headers=auth_headers_biomedico,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_importar_excel_campos_requeridos_faltantes(client, session, auth_headers_jefe):
    fila_invalida = {"nombre": "Sin serie", "marca": "X", "modelo": "Y"}
    fila_valida = _payload_equipo_valido()
    resp = await client.post(
        "/api/equipos/importar-excel",
        json={"equipos": [fila_invalida, fila_valida]},
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["creados"] == 1
    assert body["errores"] == 1
    assert body["detalle_errores"][0]["fila"] == 0
    assert "faltan campos" in body["detalle_errores"][0]["error"]


@pytest.mark.asyncio
async def test_importar_excel_serie_duplicada_continua_batch(client, session, auth_headers_jefe):
    """Misma serie 2 veces en el mismo batch: la 1ra se crea, la 2da va a errores."""
    serie_dup = f"DUP-{uuid.uuid4().hex[:10].upper()}"
    fila1 = _payload_equipo_valido()
    fila1["serie"] = serie_dup
    fila2 = _payload_equipo_valido()
    fila2["serie"] = serie_dup  # duplicada intencionalmente
    resp = await client.post(
        "/api/equipos/importar-excel",
        json={"equipos": [fila1, fila2]},
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # 1ra pasa, 2da falla por serie duplicada (mismo batch)
    assert body["creados"] == 1, f"Esperaba 1 creado, body={body}"
    assert body["errores"] == 1, f"Esperaba 1 error, body={body}"
    assert body["detalle_errores"][0]["fila"] == 1  # la 2da fila


@pytest.mark.asyncio
async def test_importar_excel_audit_log_nom016(client, session, auth_headers_jefe, usuario_jefe):
    payload = {"equipos": [_payload_equipo_valido()]}
    resp = await client.post(
        "/api/equipos/importar-excel",
        json=payload,
        headers=auth_headers_jefe,
    )
    assert resp.status_code == 200, resp.text
    stmt = select(AuditLog).where(
        AuditLog.accion == "CREATE_EQUIPO_VIA_IMPORT"
    ).order_by(AuditLog.id.desc()).limit(1)
    audit = (await session.execute(stmt)).scalar_one_or_none()
    if audit is None:
        stmt2 = select(LogActividad).where(
            LogActividad.accion == "CREATE_EQUIPO_VIA_IMPORT"
        ).order_by(LogActividad.id.desc()).limit(1)
        audit = (await session.execute(stmt2)).scalar_one_or_none()
    assert audit is not None, "No se encontró audit log CREATE_EQUIPO_VIA_IMPORT"
    assert audit.accion == "CREATE_EQUIPO_VIA_IMPORT"
    assert audit.entidad == "equipos"

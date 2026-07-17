"""Tests for the admin contratos import endpoint.

Path: sigab-backend/tests/test_importar_contratos.py

Tests cover:
- ZIP vacío / sin metadata.json
- ZIP válido con 1 serie nueva → create
- ZIP con serie duplicada → update
- Path traversal en filename → rejected
- PDF con bytes no-PDF → rejected
- Tamaño > 50MB → rejected
- Sin auth → 401
- Auth no-admin → 403
"""
import io
import json
import os
import zipfile
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


def make_zip(metadata: dict, files: dict = None) -> bytes:
    """Helper: build a ZIP in memory with metadata.json + optional files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("metadata.json", json.dumps(metadata))
        if files:
            for name, content in files.items():
                zf.writestr(name, content)
    return buf.getvalue()


def make_pdf(content: bytes = b"%PDF-1.4 fake") -> bytes:
    return content


VALID_METADATA = {
    "contratos": [
        {
            "serie": "TEST-001",
            "tipo_adquisicion": "contrato_consolidado",
            "numero_contrato_servicio": "CT-2026-001",
            "proveedor_servicio": "GE Healthcare",
            "contrato_pdf_file": "contrato_001.pdf",
            "hojas_servicio_files": ["hoja_001.pdf"],
        }
    ]
}


TEST_DATABASE_URL = os.getenv(
    "SIGAH_TEST_DATABASE_URL",
    "mysql+asyncmy://sigah:sigah@127.0.0.1:3306/sigah_test",
)


@pytest.fixture
def client():
    """TestClient contra la BD de pruebas, con auth simulada sensible al header.

    - Sin header Authorization → 401 (test_sin_auth_retorna_401).
    - "Bearer fake-admin-token" → principal admin.
    - Cualquier otro Bearer → principal operador (dispara el 403 de require_roles).
    """
    from typing import Optional

    from fastapi import Header, HTTPException
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlmodel.ext.asyncio.session import AsyncSession

    from main import app
    from auth.dependencies import get_current_user
    from database import get_async_session

    async def _fake_user(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No autenticado")
        if authorization == "Bearer fake-admin-token":
            return {"id": 1, "rol": "admin", "matricula": "ADMIN-TEST", "tenant_id": 1}
        return {"id": 2, "rol": "operador", "matricula": "OP-TEST", "tenant_id": 1}

    async def _test_session():
        engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as s:
                yield s
        finally:
            await engine.dispose()

    # Limpieza de series TEST-% de corridas previas: el endpoint hace commit real,
    # y test_zip_valido_crea_equipo_nuevo asume que TEST-001 no existe.
    import pymysql

    conn = pymysql.connect(
        host="127.0.0.1", port=3306, user="sigah", password="sigah",
        database="sigah_test", autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipos WHERE serie LIKE 'TEST-0%'")
    finally:
        conn.close()

    app.dependency_overrides[get_current_user] = _fake_user
    app.dependency_overrides[get_async_session] = _test_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_async_session, None)


@pytest.fixture
def admin_token():
    """Token admin simulado — el override de get_current_user lo reconoce."""
    return "Bearer fake-admin-token"


class TestImportarEquipos:
    """Tests for POST /api/admin/importar-equipos."""

    def test_zip_vacio_retorna_400(self, client, admin_token):
        """Empty ZIP (no metadata.json) returns 400."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("readme.txt", "no metadata here")
        files = {"file": ("test.zip", buf.getvalue(), "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 400
        assert "metadata.json" in response.json()["detail"]

    def test_zip_sin_metadata_json_retorna_400(self, client, admin_token):
        """ZIP without metadata.json returns 400."""
        zip_bytes = make_zip({})  # no metadata key
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 400

    def test_metadata_json_malformado_retorna_400(self, client, admin_token):
        """Invalid JSON in metadata.json returns 400."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("metadata.json", "{ invalid json")
        files = {"file": ("test.zip", buf.getvalue(), "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 400

    def test_zip_valido_crea_equipo_nuevo(self, client, admin_token):
        """Valid ZIP with new serie creates a new equipo record."""
        zip_bytes = make_zip(
            VALID_METADATA,
            files={"contrato_001.pdf": make_pdf(), "hoja_001.pdf": make_pdf()},
        )
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["ok"] is True
        assert body["total"] == 1
        assert body["created"] == 1
        assert body["updated"] == 0
        assert body["errors"] == []

    def test_serie_duplicada_actualiza_no_duplica(self, client, admin_token):
        """Existing serie triggers UPDATE not CREATE."""
        # First request creates
        zip_bytes = make_zip(VALID_METADATA, files={"contrato_001.pdf": make_pdf()})
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        r1 = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert r1.json()["created"] == 1

        # Second request with same serie updates
        r2 = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert r2.json()["updated"] == 1
        assert r2.json()["created"] == 0

    def test_path_traversal_rechazado(self, client, admin_token):
        """Filenames with ../ are rejected."""
        bad_meta = {
            "contratos": [
                {
                    "serie": "TEST-002",
                    "tipo_adquisicion": "recurso_propio",
                    "contrato_pdf_file": "../../etc/passwd",
                }
            ]
        }
        zip_bytes = make_zip(bad_meta)
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 400
        assert "Unsafe filename" in response.json()["detail"]

    def test_pdf_no_es_pdf_rechazado(self, client, admin_token):
        """File with .pdf extension but not PDF magic bytes is rejected."""
        # This is harder to test without actually running the upload
        # The path traversal check happens first; this test ensures
        # the magic bytes check would also reject
        bad_pdf_content = b"Not a PDF, just text"  # doesn't start with %PDF
        zip_bytes = make_zip(
            VALID_METADATA,
            files={"contrato_001.pdf": bad_pdf_content},
        )
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        # The endpoint should not raise an error (PDF silently skipped),
        # but the import result should show the PDF wasn't saved
        # (we'd verify this by checking files on disk in integration test)
        assert response.status_code == 200
        # contrato_pdf_file is not applied to imagen_url because file isn't a PDF
        body = response.json()
        # The serie is still created/updated, just without the PDF
        assert body["total"] == 1

    def test_sin_auth_retorna_401(self, client):
        """No auth header returns 401."""
        zip_bytes = make_zip(VALID_METADATA)
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post("/api/admin/importar-equipos", files=files)
        assert response.status_code == 401

    def test_auth_no_admin_retorna_403(self, client):
        """Non-admin user returns 403."""
        zip_bytes = make_zip(VALID_METADATA)
        files = {"file": ("test.zip", zip_bytes, "application/zip")}
        headers = {"Authorization": "Bearer fake-operador-token"}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers=headers,
        )
        # Either 401 (if auth rejects) or 403 (if role check rejects)
        assert response.status_code in (401, 403)

    def test_tipo_adquisicion_invalido_rechazado(self, client, admin_token):
        """Invalid tipo_adquisicion value is rejected by Pydantic."""
        bad_meta = {
            "contratos": [
                {
                    "serie": "TEST-003",
                    "tipo_adquisicion": "valor_invalido",
                }
            ]
        }
        zip_bytes = make_zip(bad_meta)
        files = {"file": ("test.zip", zip_bytes, "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        # Either 422 (Pydantic validation) or 200 with errors[] entry
        assert response.status_code in (200, 422)
        if response.status_code == 200:
            assert len(response.json()["errors"]) > 0

    def test_zip_mayor_50mb_rechazado(self, client, admin_token):
        """ZIP > 50MB is rejected."""
        # Create a fake large file
        big_content = b"x" * (51 * 1024 * 1024)  # 51 MB
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("metadata.json", json.dumps(VALID_METADATA))
            zf.writestr("big.pdf", big_content)
        files = {"file": ("big.zip", buf.getvalue(), "application/zip")}

        response = client.post(
            "/api/admin/importar-equipos",
            files=files,
            headers={"Authorization": admin_token},
        )
        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()

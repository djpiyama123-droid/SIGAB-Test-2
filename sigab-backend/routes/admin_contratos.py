"""Admin routes for SIGAB — import equipment from USB-extracted ZIP.

POST /api/admin/importar-equipos
- Accepts: multipart/form-data with field "file" (ZIP)
- Auth: JWT admin (role='admin')
- Validates: ZIP structure, metadata.json schema, file size, path traversal
- UPSERT on equipos table matching by serie (UNIQUE)
- Imports FULL equipment data + estatus (no longer only contract tagging)
- Saves PDFs to /opt/sigab/sigab-backend/static/uploads/contratos/
- Returns: {ok, total, created, updated, errors}

Path: sigab-backend/routes/admin_contratos.py
"""
import os
import json
import shutil
import zipfile
import tempfile
import time
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_session
from auth.dependencies import require_roles
from models.equipo import Equipo

router = APIRouter(prefix="/api/admin", tags=["admin"])

UPLOAD_DIR = Path("/opt/sigab/sigab-backend/static/uploads/contratos")
MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_PDF_MAGIC = b"%PDF"

# ponytail: single-tenant HGR No.1 (todos los equipos son tenant_id=1).
# Si algún día se importa otro hospital, leerlo del metadata.json o de env.
DEFAULT_TENANT_ID = int(os.environ.get("IMPORT_DEFAULT_TENANT_ID", "1"))

# Descriptivos: identidad/ubicación del equipo. Solo se escriben al CREAR — en UPDATE
# NO se tocan para no degradar datos detallados existentes (ej. ubicacion "Tococirugía - Primero"
# es mejor que la genérica "HGR No. 1" del maestro 2026).
_DESCRIPTIVE_FIELDS = (
    "nombre", "marca", "modelo", "ubicacion", "piso", "area",
    "tipo_equipo", "clase_cofepris",
)
# Enriquecimiento: clasificación / estatus / contrato. Se escriben en CREATE y UPDATE.
_ENRICH_FIELDS = (
    "inventario", "estado", "criticidad",
    "numero_contrato", "numero_contrato_servicio", "proveedor_servicio",
    "vida_util_anios",
)
_DATE_FIELDS = (
    "fecha_instalacion", "fecha_compra",
    "fecha_ultimo_mantenimiento", "fecha_proximo_mantenimiento",
)


class ContratoEntry(BaseModel):
    serie: str = Field(..., min_length=1, max_length=255)
    # Etiqueta de adquisición (único ENUM real en la BD).
    tipo_adquisicion: Optional[str] = Field(
        None,
        pattern="^(recurso_propio|contrato_consolidado|garantia|subrogado)$",
    )
    # Estatus operativo (varchar libre en BD, pero acotamos a valores conocidos).
    estado: Optional[str] = Field(
        None, pattern="^(operativo|inoperativo|baja|en_mantenimiento)$"
    )
    criticidad: Optional[str] = Field(
        None, pattern="^(alta|media|baja)$"
    )
    # Datos del equipo
    nombre: Optional[str] = Field(None, max_length=255)
    marca: Optional[str] = Field(None, max_length=255)
    modelo: Optional[str] = Field(None, max_length=255)
    ubicacion: Optional[str] = Field(None, max_length=255)
    inventario: Optional[str] = Field(None, max_length=255)
    piso: Optional[str] = Field(None, max_length=255)
    area: Optional[str] = Field(None, max_length=255)
    tipo_equipo: Optional[str] = Field(None, max_length=255)
    clase_cofepris: Optional[str] = Field(None, max_length=255)
    vida_util_anios: Optional[int] = Field(None, ge=0, le=100)
    # Contrato / proveedor
    numero_contrato: Optional[str] = Field(None, max_length=255)
    numero_contrato_servicio: Optional[str] = Field(None, max_length=255)
    proveedor_servicio: Optional[str] = Field(None, max_length=255)
    # Fechas (ISO YYYY-MM-DD)
    fecha_instalacion: Optional[str] = Field(None, max_length=10)
    fecha_compra: Optional[str] = Field(None, max_length=10)
    fecha_ultimo_mantenimiento: Optional[str] = Field(None, max_length=10)
    fecha_proximo_mantenimiento: Optional[str] = Field(None, max_length=10)
    # PDFs (formatos)
    contrato_pdf_file: Optional[str] = Field(None, max_length=255)
    hojas_servicio_files: Optional[List[str]] = Field(default_factory=list)


class ImportResult(BaseModel):
    ok: bool
    total: int
    created: int
    updated: int
    errors: List[dict] = Field(default_factory=list)


def _is_safe_filename(name: str) -> bool:
    """Reject path traversal: ../, absolute paths, suspicious chars."""
    if not name:
        return False
    if ".." in name or name.startswith("/") or "\\" in name or name.startswith("\\"):
        return False
    if "/" in name:
        return False
    return True


def _is_valid_pdf(path: Path) -> bool:
    """Check magic bytes to ensure file is actually a PDF."""
    try:
        with open(path, "rb") as f:
            header = f.read(4)
        return header == ALLOWED_PDF_MAGIC
    except OSError:
        return False


def _parse_date(value: Optional[str]) -> Optional[date]:
    """Parse an ISO YYYY-MM-DD string into a date, or None if blank/invalid."""
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except (ValueError, AttributeError):
        return None


def _apply_fields(eq: Equipo, contrato: ContratoEntry, is_create: bool) -> None:
    """Escribe los campos provistos (no-None) sobre el Equipo, nunca pisando con None.
    En CREATE escribe descriptivos + enriquecimiento; en UPDATE solo enriquecimiento."""
    if contrato.tipo_adquisicion:
        eq.tipo_adquisicion = contrato.tipo_adquisicion
    fields = _ENRICH_FIELDS + (_DESCRIPTIVE_FIELDS if is_create else ())
    for fname in fields:
        val = getattr(contrato, fname)
        if val is not None and val != "":
            setattr(eq, fname, val)
    for fname in _DATE_FIELDS:
        d = _parse_date(getattr(contrato, fname))
        if d is not None:
            setattr(eq, fname, d)


@router.post("/importar-equipos", response_model=ImportResult)
async def importar_equipos(
    file: UploadFile = File(..., description="ZIP generado por el extractor de la carpeta 2026"),
    session: AsyncSession = Depends(get_async_session),
    current_user = Depends(require_roles("admin")),
):
    """Import equipment data (full + estatus) from a ZIP with metadata.json + PDFs."""
    if file.content_type not in (
        "application/zip", "application/x-zip-compressed", "application/octet-stream"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected ZIP file, got content_type={file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_ZIP_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ZIP too large: {len(content)} bytes (max {MAX_ZIP_SIZE})",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ZIP file is empty",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        try:
            zip_path = tmppath / "upload.zip"
            with open(zip_path, "wb") as f:
                f.write(content)
            with zipfile.ZipFile(zip_path, "r") as zf:
                names = zf.namelist()
                if "metadata.json" not in names:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="ZIP must contain metadata.json",
                    )
                for name in names:
                    if not _is_safe_filename(name):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Unsafe filename in ZIP: {name}",
                        )
                zf.extractall(tmppath / "extracted")
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ZIP file",
            )

        meta_path = tmppath / "extracted" / "metadata.json"
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid metadata.json: {e}",
            )

        contratos = meta.get("contratos", [])
        if not isinstance(contratos, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="metadata.json 'contratos' must be a list",
            )

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        result = ImportResult(ok=True, total=len(contratos), created=0, updated=0, errors=[])

        for idx, entry in enumerate(contratos):
            try:
                contrato = ContratoEntry(**entry)
            except Exception as e:
                result.errors.append({
                    "index": idx,
                    "serie": entry.get("serie", "?"),
                    "reason": f"Validation error: {e}",
                })
                continue

            stmt = select(Equipo).where(Equipo.serie == contrato.serie)
            existing = (await session.execute(stmt)).scalar_one_or_none()

            if existing:
                _apply_fields(existing, contrato, is_create=False)
                _maybe_save_pdf(existing, contrato, tmppath)
                session.add(existing)
                result.updated += 1
            else:
                # CREATE — garantiza columnas NOT NULL (tenant_id era el bug previo).
                new_eq = Equipo(
                    tenant_id=DEFAULT_TENANT_ID,
                    serie=contrato.serie,
                    nombre=contrato.nombre or contrato.serie,
                    marca=contrato.marca or "DESCONOCIDA",
                    modelo=contrato.modelo or "DESCONOCIDO",
                    ubicacion=contrato.ubicacion or "POR UBICAR",
                )
                # estado/criticidad/tipo_equipo/clase_cofepris usan default del modelo
                # salvo que vengan en el ZIP (vía _apply_fields).
                _apply_fields(new_eq, contrato, is_create=True)
                _maybe_save_pdf(new_eq, contrato, tmppath)
                session.add(new_eq)
                result.created += 1

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during import: {e}",
            )

        if result.errors and (result.created + result.updated) == 0:
            result.ok = False
        return result


def _maybe_save_pdf(eq: Equipo, contrato: ContratoEntry, tmppath: Path) -> None:
    """Copy the contract PDF into UPLOAD_DIR (collision-safe) and link it on the equipo."""
    if not (contrato.contrato_pdf_file and _is_safe_filename(contrato.contrato_pdf_file)):
        return
    pdf_src = tmppath / "extracted" / contrato.contrato_pdf_file
    if not (pdf_src.exists() and _is_valid_pdf(pdf_src)):
        return
    pdf_dst = UPLOAD_DIR / contrato.contrato_pdf_file
    if pdf_dst.exists():
        pdf_dst = UPLOAD_DIR / f"{pdf_dst.stem}_{int(time.time())}{pdf_dst.suffix}"
    shutil.copy2(pdf_src, pdf_dst)
    eq.imagen_url = f"contratos/{pdf_dst.name}"

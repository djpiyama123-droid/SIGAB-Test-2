"""Validación de archivos subidos: tamaño y magic bytes (no solo extensión).

Validar únicamente por extensión es frágil: un archivo arbitrario renombrado
a .pdf pasaría el filtro. Aquí comprobamos además que el contenido real del
archivo corresponda a su extensión (firma/magic bytes) y un tamaño máximo.
"""
from __future__ import annotations

from fastapi import HTTPException, status

# Tamaño máximo por archivo (MB). Reutiliza config.MAX_UPLOAD_MB si está disponible.
try:
    from config import MAX_UPLOAD_MB
except Exception:  # pragma: no cover - fallback defensivo
    MAX_UPLOAD_MB = 10

MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Firmas (magic bytes) por extensión lógica.
_SIGNATURES = {
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "pdf": [b"%PDF"],
    "doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],  # OLE2 (Office legacy)
    "docx": [b"PK\x03\x04"],  # ZIP (OOXML)
}


def _matches_webp(content: bytes) -> bool:
    # WEBP: 'RIFF' .... 'WEBP'
    return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"


def validate_upload(content: bytes, ext: str) -> None:
    """Valida tamaño y que el contenido real corresponda a la extensión.

    Lanza HTTPException 400 (contenido/extensión) o 413 (tamaño) si no cumple.
    """
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el máximo de {MAX_UPLOAD_MB} MB",
        )

    ext = (ext or "").lower()
    if ext == "webp":
        ok = _matches_webp(content)
    else:
        sigs = _SIGNATURES.get(ext)
        if sigs is None:
            raise HTTPException(status_code=400, detail=f"Extensión no permitida: {ext}")
        ok = any(content.startswith(sig) for sig in sigs)

    if not ok:
        raise HTTPException(
            status_code=400,
            detail="El contenido del archivo no coincide con su extensión.",
        )

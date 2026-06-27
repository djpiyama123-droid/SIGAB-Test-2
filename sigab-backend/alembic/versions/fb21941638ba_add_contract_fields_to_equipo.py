"""add contract fields to equipo (IDEMPOTENTE — fix S3b sprint 2026-06-27)

Revision ID: fb21941638ba
Revises: b1c2d3e4f5a6
Create Date: 2026-06-26 11:22:04.798301

Modificado por Hermes el 2026-06-27 11:05 PDT:
- Cada add_column ahora chequea INFORMATION_SCHEMA.COLUMNS antes.
- tipo_adquisicion: nullable=True (antes nullable=False). En prod ya existe
  como ENUM NULL desde la migracion SQL 009 (aplicada a mano el 26-jun).
- contrato_pdf_url y hojas_servicio_urls: VARCHAR(255) y TEXT, ambos NULL.
- downgrade tambien chequea antes de dropear.

El SQL aditivo equivalente (aplicado a prod el 27-jun 11:05) vive en
~/.hermes/notes/hermes-s3b-migrate.sql del lado de Hermes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlmodel.sql.sqltypes import AutoString


# revision identifiers, used by Alembic.
revision: str = 'fb21941638ba'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_exists(conn, col: str) -> bool:
    """Chequea si la columna existe en equipos."""
    return bool(conn.execute(text("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'equipos'
          AND COLUMN_NAME = :col
    """), {"col": col}).scalar())


def upgrade() -> None:
    """Idempotente: aplica solo lo que falta."""
    conn = op.get_bind()

    # tipo_adquisicion: ya existe en prod (ENUM NULL desde migracion SQL 009).
    # La creamos por si es un entorno limpio (staging, dev, CI), con default
    # NULL para no romper inserts existentes.
    if not _col_exists(conn, 'tipo_adquisicion'):
        op.add_column('equipos', sa.Column(
            'tipo_adquisicion',
            AutoString(length=32),
            nullable=True,
        ))

    # contrato_pdf_url: URL del PDF/imagen del contrato de apertura.
    if not _col_exists(conn, 'contrato_pdf_url'):
        op.add_column('equipos', sa.Column(
            'contrato_pdf_url',
            AutoString(length=255),
            nullable=True,
        ))

    # hojas_servicio_urls: JSON array de URLs de hojas de servicio / OS del equipo.
    # TEXT (no VARCHAR 255) porque el JSON array puede ser largo.
    if not _col_exists(conn, 'hojas_servicio_urls'):
        op.add_column('equipos', sa.Column(
            'hojas_servicio_urls',
            sa.Text(),
            nullable=True,
        ))


def downgrade() -> None:
    """Idempotente: dropea solo lo que existe. NO toca tipo_adquisicion
    (vino de una migracion externa 009, responsabilidad de esa migracion)."""
    conn = op.get_bind()
    for col in ('hojas_servicio_urls', 'contrato_pdf_url'):
        if _col_exists(conn, col):
            op.drop_column('equipos', col)
    # tipo_adquisicion NO se dropea: pertenece a la migracion 009 externa.

"""add recibe_conformidad_nombre/recibe_matricula/localizacion_completa a ordenes_servicio (porteo formato IMSS oficial v.3.2.0)

Revision ID: d3e4f5a6b7c8
Revises: c7d8e9f0a1b2
Create Date: 2026-07-08 19:30:00.000000

Porteo del refactor "Órdenes de Servicio formato IMSS oficial"
(rama feat/orden-servicio-imss-oficial-2026-07-07, commit 63c849e) a v4.

Estas 3 columnas YA fueron aplicadas a mano en producción el 2026-07-08
(ALTER TABLE directo, con backup previo `ordenes_pre_alter_2026-07-08.sql`)
— junto con hora_inicio/hora_termino/tiempo_estimado_hrs/tiempo_real_hrs que
ya existían desde antes. Esta migración es idempotente (igual que
fb21941638ba) para que un entorno limpio (staging/dev/CI) quede en el mismo
esquema que producción sin duplicar columnas si ya existen.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, Sequence[str], None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_exists(conn, col: str) -> bool:
    """Chequea si la columna existe en ordenes_servicio."""
    return bool(conn.execute(text("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ordenes_servicio'
          AND COLUMN_NAME = :col
    """), {"col": col}).scalar())


def upgrade() -> None:
    """Idempotente: aplica solo lo que falta (prod ya lo tiene desde el
    ALTER manual del 2026-07-08)."""
    conn = op.get_bind()

    if not _col_exists(conn, 'localizacion_completa'):
        op.add_column('ordenes_servicio', sa.Column(
            'localizacion_completa',
            sa.Text(),
            nullable=True,
        ))

    if not _col_exists(conn, 'recibe_conformidad_nombre'):
        op.add_column('ordenes_servicio', sa.Column(
            'recibe_conformidad_nombre',
            sa.String(length=255),
            nullable=True,
        ))

    if not _col_exists(conn, 'recibe_matricula'):
        op.add_column('ordenes_servicio', sa.Column(
            'recibe_matricula',
            sa.String(length=255),
            nullable=True,
        ))


def downgrade() -> None:
    """Idempotente: dropea solo lo que existe."""
    conn = op.get_bind()
    for col in ('recibe_matricula', 'recibe_conformidad_nombre', 'localizacion_completa'):
        if _col_exists(conn, col):
            op.drop_column('ordenes_servicio', col)

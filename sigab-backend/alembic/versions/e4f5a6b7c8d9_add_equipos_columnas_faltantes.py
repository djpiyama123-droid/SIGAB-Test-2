"""add missing equipo columns (imagen_referencial + contract fields) — Bug 2

`models/equipo.py` ya define `imagen_referencial`, `numero_contrato`,
`proveedor_servicio` y `numero_contrato_servicio`, pero solo
`imagen_referencial` (c7d8e9f0a1b2) tenía migración alembic; las otras tres
se aplicaron a mano en prod (nota en fb21941638ba: "migración SQL 009
externa", archivo no presente en este repo). Sin este historial, un entorno
limpio (CI, staging, dev) no tiene esas columnas y el alta/lectura de
`equipos` revienta con "Unknown column".

Idempotente (chequea INFORMATION_SCHEMA antes de cada ADD COLUMN, mismo
patrón que fb21941638ba) — correrla en prod (donde puede que ya existan)
no falla ni duplica. Ver también el .sql equivalente en
database/migrations/012_equipos_columnas_faltantes.sql (NO aplicar a prod
sin verificar el esquema real y sin Gustavo presente).

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-07-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlmodel.sql.sqltypes import AutoString


revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_exists(conn, col: str) -> bool:
    return bool(conn.execute(text("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'equipos'
          AND COLUMN_NAME = :col
    """), {"col": col}).scalar())


def upgrade() -> None:
    conn = op.get_bind()

    if not _col_exists(conn, 'imagen_referencial'):
        op.add_column('equipos', sa.Column(
            'imagen_referencial', sa.Boolean(), nullable=False, server_default=sa.text('0'),
        ))

    if not _col_exists(conn, 'numero_contrato'):
        op.add_column('equipos', sa.Column('numero_contrato', AutoString(length=255), nullable=True))

    if not _col_exists(conn, 'proveedor_servicio'):
        op.add_column('equipos', sa.Column('proveedor_servicio', AutoString(length=255), nullable=True))

    if not _col_exists(conn, 'numero_contrato_servicio'):
        op.add_column('equipos', sa.Column('numero_contrato_servicio', AutoString(length=255), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    for col in ('numero_contrato_servicio', 'proveedor_servicio', 'numero_contrato', 'imagen_referencial'):
        if _col_exists(conn, col):
            op.drop_column('equipos', col)

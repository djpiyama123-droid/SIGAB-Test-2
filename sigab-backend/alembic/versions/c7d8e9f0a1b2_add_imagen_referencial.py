"""add imagen_referencial to equipo

Bandera para distinguir fotos referenciales (de internet, con watermark) de
fotos reales del equipo. Aditiva: default False, no afecta filas existentes.

Revision ID: c7d8e9f0a1b2
Revises: fb21941638ba
Create Date: 2026-06-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, Sequence[str], None] = 'fb21941638ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('equipos', sa.Column('imagen_referencial', sa.Boolean(),
                                       nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('equipos', 'imagen_referencial')

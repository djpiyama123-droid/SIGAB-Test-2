"""Phase 2: UTC Migration and Poka-Yoke Logs

Revision ID: b2c3d4e5f6g7
Revises: fc59a6b78c4f
Create Date: 2026-04-12 00:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'fc59a6b78c4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Crear tabla poka_yoke_logs
    op.create_table(
        'poka_yoke_logs',
        sa.Column('id', mysql.INTEGER(unsigned=True), autoincrement=True, primary_key=True),
        sa.Column('equipo_id', mysql.INTEGER(unsigned=True), sa.ForeignKey('equipos.id'), nullable=True),
        sa.Column('qr_escaneado', sa.String(length=255), nullable=False),
        sa.Column('inventario_leido', sa.String(length=255), nullable=True),
        sa.Column('serie_leida', sa.String(length=255), nullable=True),
        sa.Column('es_valido', sa.Boolean(), nullable=False),
        sa.Column('error_detalle', sa.Text(), nullable=True),
        sa.Column('tecnico_id', mysql.INTEGER(unsigned=True), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    op.create_index(op.f('ix_poka_yoke_logs_qr_escaneado'), 'poka_yoke_logs', ['qr_escaneado'], unique=False)

    # 2. Migración de Datos: Convertir a UTC (+7 horas basado en el offset del servidor -07:00)
    # Tablas Principales
    tables_to_migrate = {
        'equipos': ['created_at', 'updated_at'],
        'usuarios': ['created_at', 'last_login'],
        'ordenes_servicio': ['created_at', 'updated_at', 'closed_at'],
        'os_evidencias': ['created_at'],
        'alertas': ['created_at'],
        'trazabilidad': ['fecha_movimiento'],
        'refacciones_almacen': ['created_at', 'updated_at'],
        'metrologia_calibracion': ['created_at'],
        'capacitaciones': ['created_at'],
        'log_auditoria_nom016': ['timestamp'],
        'log_actividad': ['created_at']
    }

    for table, columns in tables_to_migrate.items():
        for col in columns:
            op.execute(f"UPDATE {table} SET {col} = DATE_ADD({col}, INTERVAL 7 HOUR) WHERE {col} IS NOT NULL")

def downgrade() -> None:
    # 1. Revertir migración de datos (-7 horas)
    tables_to_migrate = {
        'equipos': ['created_at', 'updated_at'],
        'usuarios': ['created_at', 'last_login'],
        'ordenes_servicio': ['created_at', 'updated_at', 'closed_at'],
        'os_evidencias': ['created_at'],
        'alertas': ['created_at'],
        'trazabilidad': ['fecha_movimiento'],
        'refacciones_almacen': ['created_at', 'updated_at'],
        'metrologia_calibracion': ['created_at'],
        'capacitaciones': ['created_at'],
        'log_auditoria_nom016': ['timestamp'],
        'log_actividad': ['created_at']
    }

    for table, columns in tables_to_migrate.items():
        for col in columns:
            op.execute(f"UPDATE {table} SET {col} = DATE_SUB({col}, INTERVAL 7 HOUR) WHERE {col} IS NOT NULL")

    # 2. Eliminar tabla
    op.drop_index(op.f('ix_poka_yoke_logs_qr_escaneado'), table_name='poka_yoke_logs')
    op.drop_table('poka_yoke_logs')

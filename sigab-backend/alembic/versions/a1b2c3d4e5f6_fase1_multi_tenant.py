"""Fase 1: Multi-Tenant — tabla hospitales + tenant_id en todas las tablas

Revision ID: a1b2c3d4e5f6
Revises: b2c3d4e5f6g7
Create Date: 2026-05-24

PRECONDICIÓN: BD de staging accesible (VPS Bluehost o Hetzner).
TIEMPO ESTIMADO: 5-10 min en BD de ~2K registros.
ROLLBACK SEGURO: downgrade() revierte todo sin pérdida de datos.
BACKFILL: todos los registros existentes → tenant_id=1 (HGR No.1 IMSS Tijuana).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = 'a1b2c3d4e5f6'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None

TENANT_TABLES = [
    'equipos', 'usuarios', 'ordenes_servicio', 'os_materiales',
    'os_evidencias', 'trazabilidad', 'preventivos_programados',
    'alertas', 'refacciones_almacen', 'metrologia_calibracion',
    'capacitaciones', 'poka_yoke_logs', 'audit_logs', 'log_actividad',
    'reservas', 'zonas_mapa', 'orden_casillas', 'ubicaciones',
]


def upgrade() -> None:
    # 1. Tabla hospitales (tenants)
    op.create_table(
        'hospitales',
        sa.Column('id', mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('clave_imss', sa.String(50), nullable=True),
        sa.Column('ciudad', sa.String(100), nullable=False, server_default='Tijuana'),
        sa.Column('estado', sa.String(50), nullable=False, server_default='Baja California'),
        sa.Column('pais', sa.String(50), nullable=False, server_default='México'),
        sa.Column('plan', sa.String(20), nullable=False, server_default='standard'),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_hospitales_activo', 'hospitales', ['activo'])

    # 2. Seed: HGR No.1 siempre será tenant_id=1
    op.execute(
        "INSERT INTO hospitales (id, nombre, clave_imss, ciudad, plan) "
        "VALUES (1, 'HGR No.1 IMSS Tijuana', 'HGR-001-TIJ', 'Tijuana', 'standard')"
    )

    # 3. tenant_id en cada tabla: añadir nullable → backfill → NOT NULL → índice
    for table in TENANT_TABLES:
        op.add_column(table, sa.Column(
            'tenant_id', mysql.INTEGER(unsigned=True), nullable=True
        ))
        op.execute(f"UPDATE {table} SET tenant_id = 1 WHERE tenant_id IS NULL")
        op.alter_column(table, 'tenant_id',
                        existing_type=mysql.INTEGER(unsigned=True),
                        nullable=False)
        op.create_index(f'idx_{table}_tenant', table, ['tenant_id'])


def downgrade() -> None:
    for table in reversed(TENANT_TABLES):
        try:
            op.drop_index(f'idx_{table}_tenant', table_name=table)
        except Exception:
            pass
        op.drop_column(table, 'tenant_id')
    op.drop_table('hospitales')

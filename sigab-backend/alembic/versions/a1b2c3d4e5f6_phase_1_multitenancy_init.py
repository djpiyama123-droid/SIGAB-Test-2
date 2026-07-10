"""Phase 1: Multi-tenancy init — tabla hospitales + tenant_id en todas las tablas

Revision ID: a1b2c3d4e5f6
Revises: b2c3d4e5f6g7
Create Date: 2026-05-17 00:00:00.000000

Propósito
---------
Inicia la migración del proyecto a SaaS multi-tenant (SIGAH).

1. Crea la tabla `hospitales` (tenants) con la información institucional
   parametrizable que reemplaza el marco hardcodeado IMSS/HGR No. 1.
2. Inserta el tenant por defecto (id=1) con los datos del HGR No. 1 IMSS
   Tijuana, para que la instancia actual siga funcionando sin cambios.
3. Agrega la columna `tenant_id` (NOT NULL, FK a hospitales.id) a todas las
   tablas principales del dominio.
4. Hace backfill de todos los registros existentes con tenant_id=1.
5. Crea índices compuestos (tenant_id + columna típica) para que el filtrado
   por hospital sea rápido.

IMPORTANTE
----------
- Esta migración modifica TODAS las tablas principales. Sacar snapshot del
  servidor (Hetzner Console → Snapshots → Take Snapshot) ANTES de correrla
  en staging y producción.
- Probar primero en `staging` con un backup completo de la base.
- Verificación post-migración: ver `docs/SIGAH/Fase_1_README.md`.

Tablas afectadas (19)
---------------------
equipos, usuarios, ubicaciones, zonas_mapa, alertas, capacitaciones,
ordenes_servicio, os_casillas, os_evidencias, os_materiales,
preventivos_programados, metrologia_calibracion, refacciones_almacen,
reservas, tecnovigilancia_eventos, tecnovigilancia_evidencias, trazabilidad,
poka_yoke_logs, log_actividad, log_auditoria_nom016.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Listado central — todas las tablas del dominio que requieren tenant_id.
# Si en el futuro se agrega una nueva tabla, añadirla aquí.
TENANT_TABLES: list[str] = [
    "equipos",
    "usuarios",
    "ubicaciones",
    "zonas_mapa",
    "alertas",
    "capacitaciones",
    "ordenes_servicio",
    "os_casillas",
    "os_evidencias",
    "os_materiales",
    "preventivos_programados",
    "metrologia_calibracion",
    "refacciones_almacen",
    "reservas",
    "tecnovigilancia_eventos",
    "tecnovigilancia_evidencias",
    "trazabilidad",
    "poka_yoke_logs",
    "log_actividad",
    "log_auditoria_nom016",
]

# Índices compuestos extra para acelerar filtrados frecuentes por tenant.
# Lista de (tabla, [columnas extra que se suelen filtrar junto al tenant_id]).
COMPOSITE_INDEXES: list[tuple[str, list[str]]] = [
    ("equipos", ["estado"]),
    ("equipos", ["criticidad"]),
    ("ordenes_servicio", ["estado"]),
    ("alertas", ["created_at"]),
    ("preventivos_programados", ["proxima_ejecucion"]),
    ("tecnovigilancia_eventos", ["fecha_evento"]),
    ("usuarios", ["matricula"]),
]


def upgrade() -> None:
    # ────────────────────────────────────────────────────────────────────
    # 1. Crear tabla hospitales (tenants)
    # ────────────────────────────────────────────────────────────────────
    op.create_table(
        "hospitales",
        sa.Column(
            "id",
            mysql.INTEGER(unsigned=True),
            autoincrement=True,
            primary_key=True,
            comment="Identificador del tenant.",
        ),
        sa.Column(
            "slug",
            sa.String(length=80),
            nullable=False,
            unique=True,
            comment="Identificador URL-friendly (p. ej. 'hgr-1-tijuana').",
        ),
        sa.Column(
            "razon_social",
            sa.String(length=200),
            nullable=False,
            comment="Nombre legal completo del hospital.",
        ),
        sa.Column(
            "nombre_corto",
            sa.String(length=80),
            nullable=False,
            comment="Alias para sidebar y UI.",
        ),
        sa.Column("delegacion", sa.String(length=120), nullable=True),
        sa.Column("unidad_medica", sa.String(length=160), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column(
            "color_primario",
            sa.String(length=7),
            nullable=False,
            server_default="#006CB7",
            comment="Color hex de acento institucional. Default SIGAH blue.",
        ),
        sa.Column("rfc", sa.String(length=13), nullable=True),
        sa.Column(
            "normativas",
            sa.JSON(),
            nullable=True,
            comment="Lista JSON de normativas aplicables (NOM-016, NOM-240, ...).",
        ),
        sa.Column(
            "departamento",
            sa.String(length=120),
            nullable=False,
            server_default="Departamento de Conservación",
        ),
        sa.Column(
            "zona_horaria",
            sa.String(length=40),
            nullable=False,
            server_default="America/Tijuana",
        ),
        sa.Column(
            "estado_suscripcion",
            sa.Enum("activo", "suspendido", "prueba", "cancelado", name="estado_suscripcion"),
            nullable=False,
            server_default="activo",
        ),
        sa.Column(
            "created_at",
            mysql.DATETIME,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            mysql.DATETIME,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_hospitales_slug", "hospitales", ["slug"], unique=True)

    # ────────────────────────────────────────────────────────────────────
    # 2. Insertar el tenant por defecto — HGR No. 1 IMSS Tijuana
    # ────────────────────────────────────────────────────────────────────
    op.execute(
        """
        INSERT INTO hospitales (
            id, slug, razon_social, nombre_corto, delegacion, unidad_medica,
            color_primario, departamento, zona_horaria, estado_suscripcion,
            normativas, created_at, updated_at
        ) VALUES (
            1,
            'hgr-1-tijuana',
            'Hospital General Regional No. 1 IMSS Tijuana',
            'HGR No. 1 Tijuana',
            'Delegación Regional Baja California',
            'Hospital General Regional',
            '#006CB7',
            'Departamento de Conservación',
            'America/Tijuana',
            'activo',
            JSON_ARRAY('NOM-016-SSA3-2012', 'NOM-240-SSA1-2012', 'ISO 13485:2016', 'IEC 60601'),
            NOW(),
            NOW()
        )
        """
    )

    # ────────────────────────────────────────────────────────────────────
    # 3. Agregar tenant_id a TODAS las tablas del dominio
    #    Estrategia: agregar nullable → backfill a 1 → SET NOT NULL → FK + índice.
    # ────────────────────────────────────────────────────────────────────
    for table in TENANT_TABLES:
        op.add_column(
            table,
            sa.Column(
                "tenant_id",
                mysql.INTEGER(unsigned=True),
                nullable=True,
                comment="FK a hospitales.id. Discriminador de tenant (aislamiento multi-tenant).",
            ),
        )

    # Backfill: todos los registros existentes pertenecen al HGR No. 1 (id=1)
    for table in TENANT_TABLES:
        op.execute(f"UPDATE {table} SET tenant_id = 1 WHERE tenant_id IS NULL")

    # Hacer NOT NULL + FK + índice por tenant
    for table in TENANT_TABLES:
        op.alter_column(
            table,
            "tenant_id",
            existing_type=mysql.INTEGER(unsigned=True),
            nullable=False,
        )
        op.create_foreign_key(
            f"fk_{table}_tenant",
            table,
            "hospitales",
            ["tenant_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"], unique=False)

    # ────────────────────────────────────────────────────────────────────
    # 4. Índices compuestos para queries calientes
    # ────────────────────────────────────────────────────────────────────
    for table, extra_cols in COMPOSITE_INDEXES:
        index_name = f"ix_{table}_tenant_{'_'.join(extra_cols)}"
        op.create_index(index_name, table, ["tenant_id", *extra_cols], unique=False)


def downgrade() -> None:
    # Rollback inverso al upgrade — quita índices compuestos, FKs, columnas y la tabla.

    # 1. Drop índices compuestos
    for table, extra_cols in COMPOSITE_INDEXES:
        index_name = f"ix_{table}_tenant_{'_'.join(extra_cols)}"
        op.drop_index(index_name, table_name=table)

    # 2. Drop FK + índice por tenant + columna tenant_id
    for table in TENANT_TABLES:
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_constraint(f"fk_{table}_tenant", table, type_="foreignkey")
        op.drop_column(table, "tenant_id")

    # 3. Drop tabla hospitales
    op.drop_index("ix_hospitales_slug", table_name="hospitales")
    op.drop_table("hospitales")

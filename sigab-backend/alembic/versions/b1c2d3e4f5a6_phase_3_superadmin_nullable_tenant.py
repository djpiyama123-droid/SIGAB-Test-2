"""Phase 3 prep: usuarios.tenant_id nullable para soportar el rol SuperAdmin SIGAH

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-05-17 06:30:00.000000

Propósito
---------
Esta migración complementaria habilita el rol SuperAdmin de SIGAH como empresa
(el operador global que da de alta hospitales, suspende licencias y monitorea
todo) sin asociar a esos usuarios a un tenant concreto.

Cambios
-------
1. ``usuarios.tenant_id`` pasa a ser NULLABLE (estaba NOT NULL después de la
   migración Fase 1 ``a1b2c3d4e5f6``).
2. Se agrega un CHECK constraint que exige consistencia:
   - Si ``rol = 'superadmin_sigah'`` → ``tenant_id`` DEBE ser NULL.
   - Si ``rol != 'superadmin_sigah'`` → ``tenant_id`` DEBE ser NOT NULL.

Esto previene crear "usuarios de hospital sin hospital" y "SuperAdmins
contaminados con un tenant".

Notas operativas
----------------
- Esta migración se introduce en Fase 1 (scaffold) pero **se aplica** cuando
  arranca Fase 3 (construcción del panel SuperAdmin).
- MySQL 8.0.16+ soporta CHECK constraints en serio (antes los ignoraba).
  Si la BD es 8.0.15 o anterior, el CHECK se ignora silenciosamente —
  considerar TRIGGER alternativo. La instancia de HGR No.1 usa MySQL 8.0,
  versión moderna, así que el CHECK es suficiente.
- Las dependencias FastAPI (``auth/tenancy.py``) ya están preparadas:
  ``get_current_tenant`` rechaza al SuperAdmin con un mensaje claro y
  ``require_superadmin`` valida el rol global.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHECK_CONSTRAINT_NAME = "ck_usuarios_superadmin_sin_tenant"
CHECK_CONSTRAINT_SQL = (
    "(rol = 'superadmin_sigah' AND tenant_id IS NULL) OR "
    "(rol <> 'superadmin_sigah' AND tenant_id IS NOT NULL)"
)


def upgrade() -> None:
    # 1. Volver tenant_id nullable. Se conserva el FK y el índice creados en Fase 1.
    op.alter_column(
        "usuarios",
        "tenant_id",
        existing_type=mysql.INTEGER(unsigned=True),
        nullable=True,
    )

    # 2. CHECK constraint para mantener consistencia rol ↔ tenant_id.
    op.create_check_constraint(
        CHECK_CONSTRAINT_NAME,
        "usuarios",
        CHECK_CONSTRAINT_SQL,
    )


def downgrade() -> None:
    # 1. Quitar el CHECK constraint primero.
    op.drop_constraint(CHECK_CONSTRAINT_NAME, "usuarios", type_="check")

    # 2. Antes de volver NOT NULL, asegurar que no haya NULLs huérfanos.
    #    Si existen SuperAdmins, el downgrade falla — es lo correcto: hay que
    #    decidir manualmente qué hacer con ellos antes de revertir Fase 3.
    op.execute(
        "UPDATE usuarios SET tenant_id = 1 "
        "WHERE tenant_id IS NULL AND rol <> 'superadmin_sigah'"
    )

    op.alter_column(
        "usuarios",
        "tenant_id",
        existing_type=mysql.INTEGER(unsigned=True),
        nullable=False,
    )

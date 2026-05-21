"""Mixin reusable para agregar la columna ``tenant_id`` a cualquier modelo
del dominio. Si un nuevo modelo se crea (por ejemplo, en una funcionalidad
nueva), heredar ``TenantMixin`` además de ``SQLModel`` garantiza que arranca
multi-tenant desde el día uno.

Ejemplo de uso::

    class MiNuevoModelo(TenantMixin, SQLModel, table=True):
        __tablename__ = "mi_nuevo_modelo"

        id: Optional[int] = Field(
            default=None,
            sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
        )
        nombre: str
        # ... otros campos

Notas
-----
- ``tenant_id`` siempre es ``NOT NULL`` en base de datos. Para inserciones,
  el código de la ruta debe asignarlo a partir de ``get_current_tenant()``
  (ver ``auth/tenancy.py``).
- El FK con ``ondelete=RESTRICT`` evita borrar un hospital con datos.
"""
from typing import Optional

from sqlmodel import Field, Column
from sqlalchemy import ForeignKey
from sqlalchemy.dialects import mysql


class TenantMixin:
    """Mixin que agrega ``tenant_id`` apuntando a ``hospitales.id``."""

    tenant_id: int = Field(
        sa_column=Column(
            mysql.INTEGER(unsigned=True),
            # FK desactivado dev local:
            nullable=False,
            index=True,
        ),
    )

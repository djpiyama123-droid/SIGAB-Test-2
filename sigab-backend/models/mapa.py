from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
from sqlalchemy import ForeignKey
from typing import Optional

class ZonasMapa(SQLModel, table=True):
    __tablename__ = "zonas_mapa"

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    # Multi-tenant SIGAH — agregado por la migración a1b2c3d4e5f6 (Fase 1).
    tenant_id: int = Field(
        sa_column=Column(
            mysql.INTEGER(unsigned=True),
            ForeignKey("hospitales.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
    )
    nombre: str
    codigo: str = Field(unique=True, index=True)
    piso: Optional[str] = None
    color_bg: str = Field(default="#1e293b")
    color_borde: str = Field(default="#334155")
    orden: int = Field(default=0)
    activa: bool = Field(default=True)

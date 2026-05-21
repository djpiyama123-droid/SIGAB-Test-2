"""Modelo Hospital — representa a un tenant de la plataforma SIGAH.

Cada fila de esta tabla es un hospital cliente. Toda otra tabla del dominio
lleva una columna ``tenant_id`` que referencia a ``hospitales.id`` y permite
aislar los datos por hospital.

Creado por la migración Alembic ``a1b2c3d4e5f6_phase_1_multitenancy_init``.
"""
from datetime import datetime, timezone
from typing import Optional, List

from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
from sqlalchemy import Enum as SAEnum, JSON


ESTADOS_SUSCRIPCION = ("activo", "suspendido", "prueba", "cancelado")


class Hospital(SQLModel, table=True):
    __tablename__ = "hospitales"

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
    )
    slug: str = Field(index=True, unique=True, max_length=80)
    razon_social: str = Field(max_length=200)
    nombre_corto: str = Field(max_length=80)
    delegacion: Optional[str] = Field(default=None, max_length=120)
    unidad_medica: Optional[str] = Field(default=None, max_length=160)
    logo_url: Optional[str] = None
    color_primario: str = Field(default="#006CB7", max_length=7)
    rfc: Optional[str] = Field(default=None, max_length=13)
    # Lista de normativas aplicables — almacenada como JSON en MySQL.
    normativas: Optional[List[str]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    departamento: str = Field(default="Departamento de Conservación", max_length=120)
    zona_horaria: str = Field(default="America/Tijuana", max_length=40)
    estado_suscripcion: str = Field(
        default="activo",
        sa_column=Column(SAEnum(*ESTADOS_SUSCRIPCION, name="estado_suscripcion"), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )

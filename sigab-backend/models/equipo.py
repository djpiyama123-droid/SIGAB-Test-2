from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import ForeignKey
from sqlalchemy.dialects import mysql
from typing import Optional, List
from datetime import date, datetime, timezone


class Equipo(SQLModel, table=True):
    __tablename__ = "equipos"

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
    )
    # Multi-tenant SIGAH — agregado por la migracion a1b2c3d4e5f6 (Fase 1).
    # Cada equipo pertenece a un unico hospital (tenant).
    tenant_id: int = Field(
        sa_column=Column(
            mysql.INTEGER(unsigned=True),
            ForeignKey("hospitales.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
    )
    serie: str = Field(index=True, unique=True)
    inventario: Optional[str] = None
    nombre: str
    marca: str
    modelo: str
    ubicacion: str
    piso: Optional[str] = None
    area: Optional[str] = None
    fotos: Optional[str] = None
    estado: str = Field(default="operativo")
    criticidad: str = Field(default="media")
    fecha_instalacion: Optional[date] = None
    fecha_ultimo_mantenimiento: Optional[date] = None
    fecha_proximo_mantenimiento: Optional[date] = None
    vida_util_anios: Optional[int] = None
    numero_contrato: Optional[str] = None
    proveedor_servicio: Optional[str] = None
    qr_code_path: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )
    zona_id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), ForeignKey("zonas_mapa.id"), nullable=True),
    )
    pos_x: float = Field(default=50.0)
    pos_y: float = Field(default=50.0)
    imagen_url: Optional[str] = None
    tipo_equipo: str = Field(default="otro")
    clase_cofepris: str = Field(default="II")
    fecha_compra: Optional[date] = None
    numero_contrato_servicio: Optional[str] = None
    qr_token: Optional[str] = Field(default=None, index=True)

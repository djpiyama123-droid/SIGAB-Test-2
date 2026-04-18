from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import datetime, date, timezone

class Refaccion(SQLModel, table=True):
    __tablename__ = "refacciones_almacen"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    nombre: str
    codigo_interno: Optional[str] = None
    compatible_con_modelo: Optional[str] = None
    cantidad_disponible: int = Field(default=0)
    cantidad_minima: int = Field(default=1)
    ubicacion_almacen: Optional[str] = None
    proveedor: Optional[str] = None
    costo_unitario: Optional[float] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class MetrologiaCalibracion(SQLModel, table=True):
    __tablename__ = "metrologia_calibracion"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    equipo_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"), nullable=False)
    )
    fecha_calibracion: date
    proxima_calibracion: date
    certificado_url: Optional[str] = None
    empresa_calibradora: Optional[str] = None
    resultado: str = Field(default="aprobado")
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class Capacitacion(SQLModel, table=True):
    __tablename__ = "capacitaciones"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    tema: str
    fecha: date
    instructor: str
    personal_asistente: str
    equipo_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"))
    )
    constancia_url: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class PokaYokeLog(SQLModel, table=True):
    __tablename__ = "poka_yoke_logs"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    equipo_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"))
    )
    qr_escaneado: str = Field(index=True)
    inventario_leido: Optional[str] = None
    serie_leida: Optional[str] = None
    es_valido: bool = Field(default=False)
    error_detalle: Optional[str] = None
    tecnico_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

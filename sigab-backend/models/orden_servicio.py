from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional, List, TYPE_CHECKING
from datetime import date, time, datetime, timezone
from decimal import Decimal

if TYPE_CHECKING:
    from .orden_casillas import OrdenCasillas

class MATERIAL_OS(SQLModel, table=True):
    __tablename__ = "os_materiales"
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    orden_id: int = Field(sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ordenes_servicio.id", ondelete="CASCADE"), nullable=False))
    descripcion: str = Field(max_length=255)
    cantidad: int = Field(default=1)

class EVIDENCIA_OS(SQLModel, table=True):
    __tablename__ = "os_evidencias"
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    orden_id: int = Field(sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ordenes_servicio.id", ondelete="CASCADE"), nullable=False))
    ruta_archivo: str = Field(max_length=500)
    tipo: str = Field(default="durante") # ENUM(antes, despues, durante, equipo, documento)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class OrdenServicio(SQLModel, table=True):
    __tablename__ = "ordenes_servicio"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    numero_orden: str = Field(unique=True, index=True)
    tipo_formato: str = Field(default="correctivo_corto")
    
    # Datos del equipo
    equipo_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"))
    )
    equipo_nombre: Optional[str] = None
    equipo_marca: Optional[str] = None
    equipo_modelo: Optional[str] = None
    equipo_serie: Optional[str] = None
    
    # Ubicación
    ubicacion_fisica: Optional[str] = None
    piso: Optional[str] = None
    area: Optional[str] = None
    
    # Datos del servicio
    tipo_mantenimiento: str = Field(default="correctivo")
    tipo_atencion: str = Field(default="interno")
    falla_reportada: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    descripcion_servicio: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    condiciones_encontradas: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    condicion_final: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    observaciones: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    recomendaciones: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    
    # Tiempos
    fecha: date = Field(default_factory=date.today)
    hora_inicio: Optional[time] = None
    hora_termino: Optional[time] = None
    tiempo_estimado_hrs: Optional[Decimal] = None
    tiempo_real_hrs: Optional[Decimal] = None
    
    # Personal
    tecnico_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    tecnico_nombre: Optional[str] = None
    empresa_externa: Optional[str] = None
    folio_externo: Optional[str] = None
    no_contrato: Optional[str] = None
    reporta_nombre: Optional[str] = None
    
    # Estado del ticket
    estado: str = Field(default="abierta", index=True)
    prioridad: str = Field(default="media")
    origen: str = Field(default="manual")
    
    # Metadatos
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )
    closed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(mysql.DATETIME, nullable=True)
    )

    # ── Relación 1-1 con casillas CENEVAL (Conservación) ─────────────────
    casillas: Optional["OrdenCasillas"] = Relationship(back_populates="orden")

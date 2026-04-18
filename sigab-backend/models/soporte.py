from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import datetime, timezone

class LSMaterial(SQLModel, table=True):
    __tablename__ = "os_materiales"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    orden_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ordenes_servicio.id"), nullable=False)
    )
    descripcion: str
    cantidad: int = Field(default=1)

class OSEvidencia(SQLModel, table=True):
    __tablename__ = "os_evidencias"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    orden_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ordenes_servicio.id"), nullable=False)
    )
    ruta_archivo: str = Field(max_length=500)
    tipo: str = Field(default="durante")
    descripcion: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class AuditLog(SQLModel, table=True):
    __tablename__ = "log_auditoria_nom016"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    usuario_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"), nullable=False)
    )
    accion: str
    entidad: str
    entidad_id: int = Field(sa_column=Column(mysql.INTEGER(unsigned=True)))
    hash_previo: str = Field(max_length=64)
    hash_registro: str = Field(max_length=64)
    datos_json: str = Field(sa_column=Column(mysql.TEXT))
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

class LogActividad(SQLModel, table=True):
    __tablename__ = "log_actividad"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    tabla_afectada: str
    registro_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), nullable=False)
    )
    accion: str
    usuario_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    origen: str = Field(default="sistema")
    datos_anteriores: Optional[str] = None
    datos_nuevos: Optional[str] = None
    ip_origen: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

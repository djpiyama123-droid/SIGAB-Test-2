from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import datetime, timezone

class Trazabilidad(SQLModel, table=True):
    __tablename__ = "trazabilidad"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    equipo_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"), nullable=False)
    )
    ubicacion_origen_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ubicaciones.id"))
    )
    ubicacion_destino_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ubicaciones.id"))
    )
    piso_origen: Optional[str] = None
    area_origen: Optional[str] = None
    piso_destino: Optional[str] = None
    area_destino: Optional[str] = None
    motivo: Optional[str] = None
    usuario_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    fecha_movimiento: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False, index=True)
    )
    notas: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))

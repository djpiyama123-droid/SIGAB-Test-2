from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import datetime, timezone

class Alerta(SQLModel, table=True):
    __tablename__ = "alertas"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    tipo: str = Field(index=True)
    equipo_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"))
    )
    orden_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ordenes_servicio.id"))
    )
    mensaje: str = Field(sa_column=Column(mysql.TEXT, nullable=False))
    prioridad: str = Field(default="media")
    leida: bool = Field(default=False, index=True)
    enviada_whatsapp: bool = Field(default=False)
    usuario_destino_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

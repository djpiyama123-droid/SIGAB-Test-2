from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import datetime

class Reserva(SQLModel, table=True):
    __tablename__ = "reservas"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    equipo_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"), nullable=False)
    )
    ubicacion_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("ubicaciones.id"))
    )
    area_reserva: str
    piso_reserva: Optional[str] = None
    solicitante_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    motivo: Optional[str] = None
    estado: str = Field(default="pendiente", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

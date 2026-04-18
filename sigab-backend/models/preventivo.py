from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional
from datetime import date, datetime

class PreventivoProgramado(SQLModel, table=True):
    __tablename__ = "preventivos_programados"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    equipo_id: int = Field(
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("equipos.id"), nullable=False)
    )
    tipo_preventivo: str
    frecuencia_dias: int = Field(default=90)
    ultima_ejecucion: Optional[date] = None
    proxima_ejecucion: date = Field(index=True)
    tecnico_asignado_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), sa.ForeignKey("usuarios.id"))
    )
    descripcion_procedimiento: Optional[str] = Field(default=None, sa_column=Column(mysql.TEXT))
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

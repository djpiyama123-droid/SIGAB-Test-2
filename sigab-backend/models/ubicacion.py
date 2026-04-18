from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
from typing import Optional
from datetime import datetime

class Ubicacion(SQLModel, table=True):
    __tablename__ = "ubicaciones"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    nombre: str
    piso: Optional[str] = None
    area: Optional[str] = None
    unidad: str = Field(default="H.G.R. 1")
    delegacion: str = Field(default="B.C.")
    clave_unidad: str = Field(default="020502142902")
    activa: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

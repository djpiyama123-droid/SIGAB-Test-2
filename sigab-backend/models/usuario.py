from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
from typing import Optional
from datetime import datetime, timezone

class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"
    
    id: Optional[int] = Field(
        default=None, 
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    )
    nombre: str
    matricula: Optional[str] = Field(default=None, unique=True, index=True)
    rol: str = Field(default="biomedico")
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    last_login: Optional[datetime] = Field(
        default=None,
        sa_column=Column(mysql.DATETIME, nullable=True)
    )
    must_change_password: bool = Field(default=True)
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False)
    )

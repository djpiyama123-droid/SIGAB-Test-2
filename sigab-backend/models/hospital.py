from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects import mysql
from typing import Optional
from datetime import datetime, timezone


class Hospital(SQLModel, table=True):
    __tablename__ = "hospitales"

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
    )
    nombre: str = Field(max_length=200)
    clave_imss: Optional[str] = Field(default=None, max_length=50)
    ciudad: str = Field(default="Tijuana", max_length=100)
    estado: str = Field(default="Baja California", max_length=50)
    pais: str = Field(default="México", max_length=50)
    plan: str = Field(default="standard", max_length=20)  # standard | premium | enterprise
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )


class HospitalRead(SQLModel):
    id: int
    nombre: str
    clave_imss: Optional[str]
    ciudad: str
    estado: str
    plan: str
    activo: bool

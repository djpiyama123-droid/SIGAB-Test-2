from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Usuario:
    id: int = 0
    nombre: str = ""
    matricula: Optional[str] = None
    rol: str = "biomedico"
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    activo: bool = True
    created_at: Optional[datetime] = None

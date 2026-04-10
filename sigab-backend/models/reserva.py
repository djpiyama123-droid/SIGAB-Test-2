from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Reserva:
    id: int = 0
    equipo_id: int = 0
    ubicacion_id: Optional[int] = None
    area_reserva: str = ""
    piso_reserva: Optional[str] = None
    solicitante_id: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    motivo: Optional[str] = None
    estado: str = "pendiente"
    created_at: Optional[datetime] = None

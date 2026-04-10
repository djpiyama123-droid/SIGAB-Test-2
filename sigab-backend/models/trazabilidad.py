from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Trazabilidad:
    id: int = 0
    equipo_id: int = 0
    ubicacion_origen_id: Optional[int] = None
    ubicacion_destino_id: Optional[int] = None
    piso_origen: Optional[str] = None
    area_origen: Optional[str] = None
    piso_destino: Optional[str] = None
    area_destino: Optional[str] = None
    motivo: Optional[str] = None
    usuario_id: Optional[int] = None
    fecha_movimiento: Optional[datetime] = None
    notas: Optional[str] = None

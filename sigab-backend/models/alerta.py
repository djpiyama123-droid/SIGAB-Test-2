from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Alerta:
    id: int = 0
    tipo: str = ""
    equipo_id: Optional[int] = None
    orden_id: Optional[int] = None
    mensaje: str = ""
    prioridad: str = "media"
    leida: bool = False
    enviada_whatsapp: bool = False
    usuario_destino_id: Optional[int] = None
    created_at: Optional[datetime] = None

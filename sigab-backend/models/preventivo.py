from dataclasses import dataclass
from typing import Optional
from datetime import date, datetime


@dataclass
class PreventivoProgramado:
    id: int = 0
    equipo_id: int = 0
    tipo_preventivo: str = ""
    frecuencia_dias: int = 90
    ultima_ejecucion: Optional[date] = None
    proxima_ejecucion: Optional[date] = None
    tecnico_asignado_id: Optional[int] = None
    descripcion_procedimiento: Optional[str] = None
    activo: bool = True
    created_at: Optional[datetime] = None

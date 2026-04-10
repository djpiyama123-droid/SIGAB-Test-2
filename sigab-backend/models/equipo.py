from dataclasses import dataclass, field
from typing import Optional
from datetime import date, datetime


@dataclass
class Equipo:
    id: int = 0
    serie: str = ""
    inventario: Optional[str] = None
    nombre: str = ""
    marca: str = ""
    modelo: str = ""
    ubicacion: str = ""
    piso: Optional[str] = None
    area: Optional[str] = None
    fotos: Optional[str] = None
    cobertura: Optional[str] = None
    estado: str = "operativo"
    criticidad: str = "media"
    fecha_instalacion: Optional[date] = None
    fecha_ultimo_mantenimiento: Optional[date] = None
    fecha_proximo_mantenimiento: Optional[date] = None
    vida_util_anios: Optional[int] = None
    numero_contrato: Optional[str] = None
    proveedor_servicio: Optional[str] = None
    qr_code_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

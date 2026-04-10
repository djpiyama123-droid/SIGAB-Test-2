from dataclasses import dataclass
from typing import Optional
from datetime import date, time, datetime
from decimal import Decimal


@dataclass
class OrdenServicio:
    id: int = 0
    numero_orden: str = ""
    tipo_formato: str = "correctivo_corto"
    equipo_id: Optional[int] = None
    equipo_nombre: Optional[str] = None
    equipo_marca: Optional[str] = None
    equipo_modelo: Optional[str] = None
    equipo_serie: Optional[str] = None
    ubicacion_fisica: Optional[str] = None
    piso: Optional[str] = None
    area: Optional[str] = None
    tipo_mantenimiento: str = "correctivo"
    tipo_atencion: str = "interno"
    falla_reportada: Optional[str] = None
    descripcion_servicio: Optional[str] = None
    condiciones_encontradas: Optional[str] = None
    condicion_final: Optional[str] = None
    observaciones: Optional[str] = None
    recomendaciones: Optional[str] = None
    fecha: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_termino: Optional[time] = None
    tiempo_estimado_hrs: Optional[Decimal] = None
    tiempo_real_hrs: Optional[Decimal] = None
    tecnico_id: Optional[int] = None
    tecnico_nombre: Optional[str] = None
    empresa_externa: Optional[str] = None
    folio_externo: Optional[str] = None
    no_contrato: Optional[str] = None
    reporta_nombre: Optional[str] = None
    estado: str = "abierta"
    prioridad: str = "media"
    origen: str = "manual"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

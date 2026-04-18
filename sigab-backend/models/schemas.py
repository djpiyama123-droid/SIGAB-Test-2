from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date

class RefaccionSchema(BaseModel):
    nombre: str = Field(..., min_length=3)
    codigo_interno: str
    compatible_con_modelo: Optional[str] = None
    cantidad_disponible: int = Field(..., ge=0)
    cantidad_minima: int = Field(1, ge=0)
    ubicacion_almacen: Optional[str] = None
    proveedor: Optional[str] = None

class CalibracionSchema(BaseModel):
    equipo_id: int
    tipo_medicion: str
    fecha_calibracion: date
    entidad_calibradora: Optional[str] = None
    certificado_numero: Optional[str] = None
    vigencia_meses: int = 12

class CapacitacionSchema(BaseModel):
    equipo_id: int
    tema: str
    fecha_capacitacion: date
    instructor: Optional[str] = None
    personal_capacitado: str

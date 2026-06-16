# SIGAH Models - Central Registration to avoid SQLModel/SQLAlchemy ForeignKey resolution issues
from models.hospital import Hospital
from models.usuario import Usuario
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio, MATERIAL_OS, EVIDENCIA_OS
from models.preventivo import PreventivoProgramado
from models.alerta import Alerta
from models.mapa import ZonasMapa
from models.reserva import Reserva
from models.trazabilidad import Trazabilidad
from models.ubicacion import Ubicacion
from models.orden_casillas import OrdenCasillas
from models.soporte import AuditLog, LogActividad
from models.modulos_extra import Refaccion, MetrologiaCalibracion, Capacitacion, PokaYokeLog

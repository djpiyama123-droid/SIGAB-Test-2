"""
Modelo SIGAB: OrdenCasillas — Sistema tipo CENEVAL para Conservación
Dominio: Equipos Médicos, Polivalentes, Aires Acondicionados / Infraestructura
El personal de Conservación llena UNA hoja para los tres dominios.
Una fila por orden de servicio (one-to-one con ordenes_servicio).
"""
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects import mysql
import sqlalchemy as sa
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from decimal import Decimal

if TYPE_CHECKING:
    from .orden_servicio import OrdenServicio


class OrdenCasillas(SQLModel, table=True):
    __tablename__ = "os_casillas"

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True),
    )
    orden_id: int = Field(
        sa_column=Column(
            mysql.INTEGER(unsigned=True),
            sa.ForeignKey("ordenes_servicio.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        )
    )

    # ── BLOQUE A: Dominio del activo (radio) ────────────────────────────────
    dominio: str = Field(
        default="medico",
        sa_column=Column(
            mysql.ENUM("medico", "polivalente", "ac_infra"),
            nullable=False,
        ),
    )

    # ── BLOQUE B: Tipo de servicio (radio) ────────────────────────────────
    tipo_servicio: str = Field(
        default="correctivo",
        sa_column=Column(
            mysql.ENUM("correctivo", "preventivo", "instalacion", "baja", "prestamo", "inspeccion"),
            nullable=False,
        ),
    )

    # ── BLOQUE C: Naturaleza de la falla / trabajo (multi-select, TINYINT) ─
    # Eléctrico
    falla_no_enciende:    int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_corto:          int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_cable:          int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_fusible:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_bateria:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_ups:            int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    # Mecánico
    falla_ruido:          int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_vibracion:      int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_atasco:         int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_fuga:           int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_rotura:         int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    # Neumático / Hidráulico
    falla_presion_baja:   int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_compresor:      int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_valvula:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_manguera:       int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    # Electrónico / Software
    falla_display:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_sensor:         int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_alarma_falsa:   int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_error_pantalla: int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_firmware:       int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    # Consumibles
    falla_filtro:         int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_empaque:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_lampara:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_toner_papel:    int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    # A/C específico
    falla_gas_ref:        int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_evaporador:     int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_condensador:    int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))
    falla_termostato:     int = Field(default=0, sa_column=Column(mysql.TINYINT(1), nullable=False))

    # ── BLOQUE D: Resolución (radio) ──────────────────────────────────────
    resolucion: str = Field(
        default="sitio",
        sa_column=Column(
            mysql.ENUM("sitio", "refaccion", "taller", "externo", "baja"),
            nullable=False,
        ),
    )

    # ── BLOQUE E: Estado final del equipo (radio) ─────────────────────────
    estado_final: str = Field(
        default="operativo",
        sa_column=Column(
            mysql.ENUM("operativo", "operativo_obs", "fuera_servicio", "en_taller"),
            nullable=False,
        ),
    )

    # ── BLOQUE F: Texto corto libre ────────────────────────────────────────
    observaciones_breves: Optional[str] = Field(
        default=None,
        sa_column=Column(mysql.VARCHAR(140), nullable=True),
    )
    refacciones_solicitadas: Optional[str] = Field(
        default=None,
        sa_column=Column(mysql.VARCHAR(255), nullable=True),
    )

    # ── Metadatos OCR ───────────────────────────────────────────────────────
    ocr_confianza: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(mysql.DECIMAL(4, 3), nullable=True),
    )
    ocr_modelo: str = Field(
        default="manual",
        sa_column=Column(
            mysql.ENUM("manual", "paddle", "gemini"),
            nullable=False,
        ),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(mysql.DATETIME, nullable=False),
    )

    # ── Relación back hacia OrdenServicio ─────────────────────────────────
    orden: Optional["OrdenServicio"] = Relationship(back_populates="casillas")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CasillasCreate(SQLModel):
    dominio: str = "medico"
    tipo_servicio: str = "correctivo"
    # Bloque C — todas opcionales (default 0)
    falla_no_enciende: int = 0
    falla_corto: int = 0
    falla_cable: int = 0
    falla_fusible: int = 0
    falla_bateria: int = 0
    falla_ups: int = 0
    falla_ruido: int = 0
    falla_vibracion: int = 0
    falla_atasco: int = 0
    falla_fuga: int = 0
    falla_rotura: int = 0
    falla_presion_baja: int = 0
    falla_compresor: int = 0
    falla_valvula: int = 0
    falla_manguera: int = 0
    falla_display: int = 0
    falla_sensor: int = 0
    falla_alarma_falsa: int = 0
    falla_error_pantalla: int = 0
    falla_firmware: int = 0
    falla_filtro: int = 0
    falla_empaque: int = 0
    falla_lampara: int = 0
    falla_toner_papel: int = 0
    falla_gas_ref: int = 0
    falla_evaporador: int = 0
    falla_condensador: int = 0
    falla_termostato: int = 0
    # Bloques D y E
    resolucion: str = "sitio"
    estado_final: str = "operativo"
    # Bloque F
    observaciones_breves: Optional[str] = None
    refacciones_solicitadas: Optional[str] = None
    # OCR
    ocr_confianza: Optional[Decimal] = None
    ocr_modelo: str = "manual"


class CasillasRead(CasillasCreate):
    id: int
    orden_id: int
    created_at: datetime
    updated_at: datetime

"""
Router SIGAB: Casillas CENEVAL para Conservación
Maneja el formulario de casillas tipo hoja de respuestas (binary checkboxes)
para los tres dominios: Médico, Polivalente, A/C/Infraestructura.

Endpoints:
  POST   /api/casillas/{orden_id}          — crear o actualizar casillas de una OS
  GET    /api/casillas/{orden_id}          — leer casillas de una OS
  POST   /api/casillas/ocr/{orden_id}      — OCR sobre foto de formato físico (Gemini Vision)
  GET    /api/casillas/resumen/dominio     — conteo agrupado por dominio (para Dashboard)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import datetime, timezone
import json
import base64
import logging
import os

from database import get_session
from models.orden_casillas import OrdenCasillas, CasillasCreate, CasillasRead
from models.orden_servicio import OrdenServicio
from services.sse_service import sse_manager

router = APIRouter(prefix="/api/casillas", tags=["Casillas CENEVAL (Conservación)"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/casillas/{orden_id}  — Crear o actualizar (upsert)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{orden_id}", response_model=CasillasRead)
async def upsert_casillas(
    orden_id: int,
    data: CasillasCreate,
    session: AsyncSession = Depends(get_session),
):
    # Verificar que la OS existe
    orden = await session.get(OrdenServicio, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail=f"Orden {orden_id} no encontrada")

    # Upsert: buscar si ya existe
    stmt = select(OrdenCasillas).where(OrdenCasillas.orden_id == orden_id)
    result = await session.execute(stmt)
    casillas = result.scalars().first()

    now = datetime.now(timezone.utc)

    if casillas:
        # Actualizar campos existentes
        for field, val in data.model_dump(exclude_unset=True).items():
            setattr(casillas, field, val)
        casillas.updated_at = now
    else:
        casillas = OrdenCasillas(
            orden_id=orden_id,
            **data.model_dump(),
            created_at=now,
            updated_at=now,
        )
        session.add(casillas)

    await session.commit()
    await session.refresh(casillas)

    # Emitir evento SSE para actualizar Dashboard en tiempo real
    await sse_manager.broadcast({
        "type": "casilla.updated",
        "orden_id": orden_id,
        "estado_final": casillas.estado_final,
        "dominio": casillas.dominio,
        "resolucion": casillas.resolucion,
    })

    # Si el equipo queda fuera de servicio, actualizar el estado de la OS
    if casillas.estado_final == "fuera_servicio":
        orden.estado = "cerrada"
        orden.condicion_final = "Fuera de servicio según casillas CENEVAL"
        orden.closed_at = now
        session.add(orden)
        await session.commit()

    logger.info(f"Casillas upserted: orden_id={orden_id}, dominio={casillas.dominio}, estado_final={casillas.estado_final}")
    return casillas


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/casillas/{orden_id}  — Leer
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{orden_id}", response_model=CasillasRead)
async def get_casillas(
    orden_id: int,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(OrdenCasillas).where(OrdenCasillas.orden_id == orden_id)
    result = await session.execute(stmt)
    casillas = result.scalars().first()
    if not casillas:
        raise HTTPException(status_code=404, detail="No hay casillas para esta orden")
    return casillas


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/casillas/ocr/{orden_id}  — OCR con Gemini Vision
# ─────────────────────────────────────────────────────────────────────────────

# Lista de campos multi-select para que Gemini sepa qué buscar
CAMPOS_CENEVAL = [
    "falla_no_enciende", "falla_corto", "falla_cable", "falla_fusible", "falla_bateria", "falla_ups",
    "falla_ruido", "falla_vibracion", "falla_atasco", "falla_fuga", "falla_rotura",
    "falla_presion_baja", "falla_compresor", "falla_valvula", "falla_manguera",
    "falla_display", "falla_sensor", "falla_alarma_falsa", "falla_error_pantalla", "falla_firmware",
    "falla_filtro", "falla_empaque", "falla_lampara", "falla_toner_papel",
    "falla_gas_ref", "falla_evaporador", "falla_condensador", "falla_termostato",
]

PROMPT_OCR = """Eres un sistema de lectura de hojas de respuestas CENEVAL para mantenimiento hospitalario.
Analiza esta imagen de un formulario de Orden de Servicio SIGAB con casillas.
Identifica qué casillas están marcadas (círculo relleno, palomita, X o tachado).

Devuelve SOLO un JSON válido con los siguientes campos (1 si está marcado, 0 si no):
- dominio: "medico" | "polivalente" | "ac_infra"
- tipo_servicio: "correctivo" | "preventivo" | "instalacion" | "baja" | "prestamo" | "inspeccion"
- resolucion: "sitio" | "refaccion" | "taller" | "externo" | "baja"
- estado_final: "operativo" | "operativo_obs" | "fuera_servicio" | "en_taller"
- falla_no_enciende, falla_corto, falla_cable, falla_fusible, falla_bateria, falla_ups,
  falla_ruido, falla_vibracion, falla_atasco, falla_fuga, falla_rotura,
  falla_presion_baja, falla_compresor, falla_valvula, falla_manguera,
  falla_display, falla_sensor, falla_alarma_falsa, falla_error_pantalla, falla_firmware,
  falla_filtro, falla_empaque, falla_lampara, falla_toner_papel,
  falla_gas_ref, falla_evaporador, falla_condensador, falla_termostato: 0 o 1
- observaciones_breves: texto corto (max 140 chars) o null
- refacciones_solicitadas: texto o null
- confianza: número decimal 0.0 - 1.0 indicando tu certeza general

No incluyas explicaciones. Solo el JSON."""


@router.post("/ocr/{orden_id}", response_model=CasillasRead)
async def ocr_casillas(
    orden_id: int,
    foto: UploadFile = File(..., description="Foto del formato físico CENEVAL"),
    session: AsyncSession = Depends(get_session),
):
    """
    Recibe la foto del formato físico y usa Gemini Vision para detectar casillas marcadas.
    Guarda automáticamente el resultado como casillas de la orden.
    """
    orden = await session.get(OrdenServicio, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail=f"Orden {orden_id} no encontrada")

    image_bytes = await foto.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB max
        raise HTTPException(status_code=413, detail="Imagen muy grande (máx 10 MB)")

    # Llamar a Gemini Vision
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no configurada")

    try:
        import httpx
        image_b64 = base64.b64encode(image_bytes).decode()
        mime_type = foto.content_type or "image/jpeg"

        payload = {
            "contents": [{
                "parts": [
                    {"text": PROMPT_OCR},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                ]
            }],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}",
                json=payload,
            )
            resp.raise_for_status()
            raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

        # Extraer JSON de la respuesta
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        extracted = json.loads(raw_text.strip())

        confianza = float(extracted.pop("confianza", 0.85))

        # Construir CasillasCreate desde la respuesta
        casillas_data = CasillasCreate(
            ocr_confianza=round(confianza, 3),
            ocr_modelo="gemini",
            **{k: v for k, v in extracted.items() if k in CasillasCreate.model_fields},
        )

    except Exception as e:
        logger.error(f"OCR Gemini falló: {e}")
        raise HTTPException(status_code=502, detail=f"Error en OCR: {str(e)}")

    # Guardar usando upsert existente
    return await upsert_casillas(orden_id, casillas_data, session)


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/casillas/resumen/dominio  — Conteo para Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/resumen/dominio")
async def resumen_por_dominio(session: AsyncSession = Depends(get_session)):
    """Retorna conteo de órdenes activas por dominio y estado_final para widgets del Dashboard."""
    stmt = select(OrdenCasillas)
    result = await session.execute(stmt)
    todas = result.scalars().all()

    resumen = {}
    for c in todas:
        key = f"{c.dominio}"
        if key not in resumen:
            resumen[key] = {"total": 0, "operativo": 0, "operativo_obs": 0, "fuera_servicio": 0, "en_taller": 0}
        resumen[key]["total"] += 1
        resumen[key][c.estado_final] += 1

    return {"resumen_dominio": resumen, "total_casillas": len(todas)}

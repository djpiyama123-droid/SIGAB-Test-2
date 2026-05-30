"""
twilio_whatsapp.py — Webhook de Twilio para recibir fotos de formatos IMSS
y extraer datos via OCR (Gemma Vision / PaddleOCR).

Flujo:
  WhatsApp → Twilio → POST /api/twilio/whatsapp
  → Si hay imagen: descarga, OCR, extrae campos, crea OS en SIGAH
  → Responde TwiML con mensaje de confirmación

Variables de entorno requeridas:
  SIGAH_TWILIO_ACCOUNT_SID  — SID de la cuenta Twilio
  SIGAH_TWILIO_AUTH_TOKEN   — Token de autenticación Twilio
  SIGAH_TWILIO_FROM         — Número Twilio WhatsApp (ej: whatsapp:+14155238886)
"""
import os
import base64
import logging
import hmac
import hashlib
from datetime import date

import httpx
from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_async_session
from services.ocr_service import OcrService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["twilio-whatsapp"])

TWILIO_ACCOUNT_SID = os.getenv("SIGAH_TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("SIGAH_TWILIO_AUTH_TOKEN", "")
TWILIO_FROM        = os.getenv("SIGAH_TWILIO_FROM", "whatsapp:+14155238886")
DEFAULT_TENANT_ID  = int(os.getenv("SIGAH_DEFAULT_TENANT_ID", "1"))


def _twiml_reply(msg: str) -> Response:
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message>{msg}</Message>"
        "</Response>"
    )
    return Response(content=xml, media_type="application/xml")


def _verify_twilio_signature(url: str, params: dict, signature: str) -> bool:
    if not TWILIO_AUTH_TOKEN:
        return True
    s = url + "".join(f"{k}{v}" for k, v in sorted(params.items()))
    expected = base64.b64encode(
        hmac.new(TWILIO_AUTH_TOKEN.encode(), s.encode(), hashlib.sha1).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)


async def _download_media(url: str) -> bytes:
    auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID else None
    async with httpx.AsyncClient(auth=auth, timeout=30) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


async def _process_image_form(image_bytes: bytes, from_number: str, session: AsyncSession) -> str:
    from models.orden import OrdenServicio

    image_b64 = base64.b64encode(image_bytes).decode()
    campos = {}
    try:
        result = await OcrService.extract_with_gemini(image_b64)
        campos = getattr(result, "campos_identificados", None) or {}
    except Exception as e:
        logger.error(f"OCR falló: {e}")

    if not campos:
        return "⚠ No se pudieron extraer datos del formato. Asegúrate de fotografiar el formato completo con buena iluminación."

    hoy = date.today()
    stmt = select(func.count()).select_from(OrdenServicio).where(
        OrdenServicio.tenant_id == DEFAULT_TENANT_ID,
        OrdenServicio.fecha >= date(hoy.year, 1, 1),
    )
    n = (await session.execute(stmt)).scalar() or 0
    numero = f"OS-{hoy.strftime('%Y%m%d')}-{n+1:04d}"

    orden = OrdenServicio(
        numero_orden=numero,
        tenant_id=DEFAULT_TENANT_ID,
        equipo_nombre=campos.get("equipo_nombre") or campos.get("nombre_equipo") or "Sin identificar",
        equipo_serie=campos.get("numero_serie") or campos.get("equipo_serie") or "",
        falla_reportada=campos.get("falla_reportada") or campos.get("descripcion_falla") or "Reporte desde WhatsApp",
        tecnico_nombre=campos.get("tecnico_nombre") or campos.get("nombre_tecnico") or from_number,
        area=campos.get("area") or campos.get("servicio") or "",
        tipo_mantenimiento=campos.get("tipo_mantenimiento") or "correctivo",
        estado="abierta",
        prioridad=campos.get("prioridad") or "media",
        fecha=hoy,
        origen="whatsapp_ocr",
    )
    session.add(orden)
    await session.commit()
    await session.refresh(orden)

    equipo_str = f"{orden.equipo_nombre} ({orden.equipo_serie})" if orden.equipo_serie else orden.equipo_nombre
    return (
        f"✅ *Formato SIGAH registrado*\n\n"
        f"📋 Orden: {numero}\n"
        f"🏥 Equipo: {equipo_str}\n"
        f"🔧 Tipo: {orden.tipo_mantenimiento}\n"
        f"📍 Área: {orden.area or 'Sin área'}\n\n"
        "La orden ha sido creada. Un biomédico la revisará en breve."
    )


@router.post("/whatsapp")
async def twilio_whatsapp_webhook(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Webhook Twilio WhatsApp — procesa fotos de formatos IMSS y crea OS."""
    form   = await request.form()
    params = dict(form)

    sig = request.headers.get("X-Twilio-Signature", "")
    if TWILIO_AUTH_TOKEN and not _verify_twilio_signature(str(request.url), params, sig):
        return Response(status_code=403)

    from_number = params.get("From", "desconocido")
    body        = params.get("Body", "").strip()
    num_media   = int(params.get("NumMedia", "0"))

    if num_media > 0:
        media_url  = params.get("MediaUrl0", "")
        media_type = params.get("MediaContentType0", "")
        if media_url and "image" in media_type:
            try:
                img_bytes = await _download_media(media_url)
                reply = await _process_image_form(img_bytes, from_number, session)
            except Exception as e:
                logger.error(f"Error procesando imagen Twilio: {e}")
                reply = "⚠ Error al procesar la imagen. Intenta de nuevo."
        else:
            reply = "ℹ Solo se procesan imágenes JPG/PNG de formatos IMSS."
    elif body.lower() in ("hola", "help", "ayuda", ""):
        reply = (
            "👋 *SIGAH — Sistema de Mantenimiento*\n\n"
            "Envía una *foto del formato IMSS* llenado para crear una orden automáticamente.\n\n"
            "También puedes acceder a la app en:\n"
            "🌐 https://sigab.129-121-100-147.sslip.io"
        )
    else:
        reply = "📋 Envía una *foto del formato IMSS* para registrar la orden de servicio."

    return _twiml_reply(reply)

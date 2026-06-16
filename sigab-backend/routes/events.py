from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request, Query, status
from sse_starlette.sse import EventSourceResponse
from jose import JWTError
from typing import Optional
from services.stt_service import stt_service
from services.intake_graph import intake_graph, IntakeState
from services.sse_service import sse_manager
from auth.jwt_handler import decode_token
import logging
import json
import httpx

router = APIRouter(tags=["events"])
logger = logging.getLogger(__name__)

# --- SSE Subscription (Phase 1 Restoration) ---

def _validar_token_sse(authorization: Optional[str], token: Optional[str]) -> dict:
    """Valida el JWT del canal SSE.

    EventSource (navegador) no puede enviar la cabecera Authorization, así que
    el frontend manda el token como query param (?token=...). Aceptamos ambos.
    Antes este endpoint era PÚBLICO: cualquiera podía abrir el stream de eventos
    en tiempo real del hospital. Validamos firma + tipo + expiración del token.
    """
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    elif token:
        raw = token
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token requerido para el canal de eventos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(raw)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido para el canal de eventos",
        )
    return payload


@router.get("/subscribe")
async def subscribe(
    request: Request,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = None,
):
    """
    Endpoint para que el frontend reciba actualizaciones en tiempo real.

    Requiere sesión válida (token por header Authorization o query param).
    NOTA multi-tenant: hoy el bus SSE difunde a todos los suscriptores por
    igual; con >1 hospital habría que segmentar por tenant_id (pendiente).
    """
    authorization = request.headers.get("authorization")
    _validar_token_sse(authorization, token)
    return EventSourceResponse(sse_manager.subscribe())

# --- WhatsApp AI Intake (Phase 3 Integration) ---

async def process_whatsapp_ai(data: dict):
    """
    Procesa el mensaje de WhatsApp (audio o texto) usando LangGraph.
    """
    from_jid = data.get("from")
    push_name = data.get("pushName")
    msg_type = data.get("type")
    
    # Preparar el estado inicial para el Grafo
    state: IntakeState = {
        "raw_text": data.get("body", ""),
        "audio_base64": data.get("data") if msg_type == "audio" else None,
        "from_whatsapp": from_jid,
        "push_name": push_name,
        "inventario": None,
        "serie": None,
        "falla": None,
        "equipo_id": None,
        "prioridad": "media",
        "tipo_mantenimiento": "correctivo",
        "ticket_id": None,
        "error": None
    }
    
    try:
        # Ejecutar LangGraph (Consolidado)
        final_state = await intake_graph.ainvoke(state)
        
        ticket_id = final_state.get("ticket_id")
        error = final_state.get("error")
        bot_url = "http://localhost:3000/send"
        
        if ticket_id:
            msg = (f"✅ *Ticket SIGAH Generado*\n\n"
                   f"ID: {ticket_id}\n"
                   f"Falla: {final_state['falla']}\n"
                   f"Prioridad: {final_state['prioridad']}\n\n"
                   f"Un biomédico revisará tu reporte pronto.")
            async with httpx.AsyncClient() as client:
                await client.post(bot_url, json={"to": from_jid, "message": msg})
            logger.info(f"✅ Ticket {ticket_id} notificado exitosamente.")
        elif error:
            msg = (f"⚠️ *Atención*\n\nNo pudimos procesar tu reporte: {error}.\n\n"
                   f"Por favor, intenta de nuevo mencionando el NII o Número de Serie.")
            async with httpx.AsyncClient() as client:
                await client.post(bot_url, json={"to": from_jid, "message": msg})
            logger.warn(f"❌ Error en intake: {error}")
            
    except Exception as e:
        logger.error(f"Error fatal en process_whatsapp_ai: {str(e)}")

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(data: dict, background_tasks: BackgroundTasks):
    """
    Webhook para el sigah-bot.
    """
    background_tasks.add_task(process_whatsapp_ai, data)
    return {"status": "processing"}

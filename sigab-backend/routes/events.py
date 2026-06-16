from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request, Query, status
from sse_starlette.sse import EventSourceResponse
from typing import Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from services.stt_service import stt_service
from services.intake_graph import intake_graph, IntakeState
from services.sse_service import sse_manager
from auth.dependencies import get_current_user_optional
from database import get_async_session
import logging
import json
import httpx

router = APIRouter(tags=["events"])
logger = logging.getLogger(__name__)

# --- SSE Subscription (Phase 1 Restoration) ---

@router.get("/subscribe")
async def subscribe(
    request: Request,
    token: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Canal SSE de eventos en tiempo real. Requiere sesión válida.

    EventSource (navegador) no envía la cabecera Authorization, así que el
    frontend manda el token como query param (?token=). Lo validamos por la
    MISMA vía que el resto del API (get_current_user_optional): firma, exp,
    type=access y, para usuarios humanos, que sigan existiendo y activos en BD
    (un usuario desactivado deja de poder abrir el stream). Soporta tokens bot.
    Antes este endpoint era PÚBLICO.

    NOTA multi-tenant: hoy el bus SSE difunde a todos los suscriptores por
    igual; con >1 hospital habría que segmentar por tenant_id (pendiente).
    """
    authorization = request.headers.get("authorization")
    if not authorization and token:
        authorization = f"Bearer {token}"
    user = await get_current_user_optional(authorization=authorization, session=session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión requerida para el canal de eventos",
            headers={"WWW-Authenticate": "Bearer"},
        )
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

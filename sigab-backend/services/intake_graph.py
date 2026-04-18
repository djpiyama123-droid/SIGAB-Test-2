from typing import TypedDict, Annotated, List, Optional
from langgraph.graph import StateGraph, END
import re
import logging
from datetime import datetime, timezone
from sqlmodel import select
from database import async_session_maker, get_async_session
from models.equipo import Equipo
from models.orden_servicio import OrdenServicio
from services.stt_service import stt_service
from services.sse_service import sse_manager

logger = logging.getLogger(__name__)

# --- Definición de Estado ---
class IntakeState(TypedDict):
    raw_text: str
    audio_base64: Optional[str]
    from_whatsapp: str
    push_name: Optional[str]
    inventario: Optional[str]
    serie: Optional[str]
    falla: Optional[str]
    equipo_id: Optional[int]
    prioridad: str
    tipo_mantenimiento: str
    ticket_id: Optional[str]
    error: Optional[str]

# --- Mock AI Extractor (Gemma/Qwen Persona) ---
class MockAIExtractor:
    def extract(self, text: str):
        inv_match = re.search(r'inv(?:entario)?[:\s-]*([A-Z0-9-]{6,15})', text, re.I)
        serie_match = re.search(r'serie[:\s-]*([A-Z0-9-]{6,20})', text, re.I)
        
        known_series = ["SK416381232HA", "STF244011695A", "MB203775", "82-0751"]
        serie = next((s for s in known_series if s.lower() in text.lower()), None)
        
        if serie_match and not serie:
            serie = serie_match.group(1)
            
        inventario = inv_match.group(1) if inv_match else None
        
        falla = text
        for term in ["serie", "inventario", "inv", "nii"]:
            split = re.split(term, falla, maxsplit=1, flags=re.I)
            if len(split) > 1:
                falla = split[0]
        
        return {
            "inventario": inventario,
            "serie": serie,
            "falla": falla.strip()[:500]
        }

# --- Nodos del Grafo ---

async def transcribe_node(state: IntakeState) -> dict:
    if not state.get("audio_base64"):
        return {}
    
    logger.info("Node [Transcribe]: Procesando audio...")
    text = await stt_service.transcribe_base64(state["audio_base64"])
    return {"raw_text": text}

async def extractor_node(state: IntakeState) -> dict:
    text = state.get("raw_text", "")
    if not text:
        return {"error": "No se recibió texto ni audio"}
        
    logger.info(f"Node [Extractor]: Procesando: {text[:50]}...")
    ai = MockAIExtractor()
    entities = ai.extract(text)
    return {
        "inventario": entities["inventario"],
        "serie": entities["serie"],
        "falla": entities["falla"] or text
    }

async def validator_node(state: IntakeState) -> dict:
    logger.info("Node [Validator]: Buscando equipo...")
    async with async_session_maker() as session:
        # 1. Por serie
        if state["serie"]:
            stmt = select(Equipo).where(Equipo.serie == state["serie"])
            equipo = (await session.execute(stmt)).scalar_one_or_none()
            if equipo:
                return {"equipo_id": equipo.id, "error": None}
        
        # 2. Por inventario
        if state["inventario"]:
            stmt = select(Equipo).where(Equipo.inventario == state["inventario"])
            equipo = (await session.execute(stmt)).scalar_one_or_none()
            if equipo:
                return {"equipo_id": equipo.id, "error": None}
                
    return {"error": "Equipo no identificado"}

async def classifier_node(state: IntakeState) -> dict:
    text = state["raw_text"].lower()
    prioridad = "media"
    if any(word in text for word in ["urgente", "critico", "paro", "emergencia"]):
        prioridad = "alta"
    return {"prioridad": prioridad, "tipo_mantenimiento": "correctivo"}

async def creator_node(state: IntakeState) -> dict:
    if state.get("error") and not state.get("equipo_id"):
        return {}
        
    async with async_session_maker() as session:
        now = datetime.now(timezone.utc)
        order_num = f"WSAI-{now.strftime('%Y%m%d')}-{state['from_whatsapp'][-4:]}"
        
        equipo = None
        if state["equipo_id"]:
            equipo = await session.get(Equipo, state["equipo_id"])

        nueva_os = OrdenServicio(
            numero_orden=order_num,
            equipo_id=state["equipo_id"],
            equipo_nombre=equipo.nombre if equipo else "Equipo Desconocido",
            equipo_serie=state["serie"] or (equipo.serie if equipo else None),
            falla_reportada=state["falla"],
            prioridad=state["prioridad"],
            origen="whatsapp_ai",
            reporta_nombre=state["push_name"] or state["from_whatsapp"],
            estado="abierta",
            created_at=now
        )
        
        session.add(nueva_os)
        await session.commit()
        await session.refresh(nueva_os)
        
        # BROADCAST LIVE (Phase 1 Integration)
        await sse_manager.broadcast("nueva_orden", {
            "id": nueva_os.id,
            "numero_orden": nueva_os.numero_orden,
            "equipo": nueva_os.equipo_nombre,
            "timestamp": now.isoformat()
        })
        
        return {"ticket_id": nueva_os.numero_orden}

# --- Grafo ---

def create_intake_graph():
    workflow = StateGraph(IntakeState)
    workflow.add_node("transcribe", transcribe_node)
    workflow.add_node("extractor", extractor_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("creator", creator_node)
    
    workflow.set_entry_point("transcribe")
    workflow.add_edge("transcribe", "extractor")
    workflow.add_edge("extractor", "validator")
    workflow.add_edge("validator", "classifier")
    workflow.add_edge("classifier", "creator")
    workflow.add_edge("creator", END)
    
    return workflow.compile()

intake_graph = create_intake_graph()

# STUB — langgraph deshabilitado para demo on-premise
# La funcionalidad de intake via WhatsApp se activa con OpenClaw

from typing import TypedDict, Optional

class IntakeState(TypedDict):
    mensaje: str
    serie: Optional[str]
    falla: Optional[str]
    resultado: Optional[str]

class _StubGraph:
    async def ainvoke(self, state):
        return {**state, "resultado": "stub_mode"}
    def invoke(self, state):
        return {**state, "resultado": "stub_mode"}

intake_graph = _StubGraph()

"""
SIGAH LLM Service — Router IA híbrido (Ollama local ↔ MiniMax nube).

Capa fina que unifica la interfaz de IA del producto y decide proveedor:
  - SIGAH_LLM_PROVIDER=ollama  -> on-premise (default, PHI nunca sale del hospital)
  - SIGAH_LLM_PROVIDER=minimax -> nube (agéntico/normativo, requiere clave + plan)

Con SIGAH_LLM_FALLBACK_LOCAL=1, si la nube falla cae a Ollama local
(resiliencia ante caída de luz/nube). Un **circuit breaker** evita pagar la
latencia de reintentos cuando MiniMax está caído: tras N fallos consecutivos
abre el breaker y enruta directo a local durante T segundos.

Interfaz drop-in: expone `analizar_no_stream(...)` y `chat_stream(...)` con las
MISMAS firmas/retornos que `gemma_service`, para que las rutas migren sin
cambiar el contrato HTTP. Default `ollama` + sin clave ⇒ comportamiento idéntico
al actual (capa opt-in).
"""

import time
import logging
from typing import AsyncGenerator

from config import LLM_PROVIDER, LLM_FALLBACK_LOCAL
from services import gemma_service
from services import minimax_service
from services.minimax_service import MiniMaxError

log = logging.getLogger("sigah.llm_router")

# ── Circuit breaker (nube) ────────────────────────────────────────────────
_BREAKER_THRESHOLD = 3      # fallos consecutivos antes de abrir
_BREAKER_COOLDOWN = 60.0    # segundos que permanece abierto (enruta a local)

_consecutive_failures = 0
_breaker_open_until = 0.0


def _breaker_is_open() -> bool:
    """True si el breaker está abierto (saltar nube, ir directo a local)."""
    return time.monotonic() < _breaker_open_until


def _record_cloud_success() -> None:
    global _consecutive_failures, _breaker_open_until
    _consecutive_failures = 0
    _breaker_open_until = 0.0


def _record_cloud_failure() -> None:
    global _consecutive_failures, _breaker_open_until
    _consecutive_failures += 1
    if _consecutive_failures >= _BREAKER_THRESHOLD:
        _breaker_open_until = time.monotonic() + _BREAKER_COOLDOWN
        log.warning(
            "Circuit breaker MiniMax ABIERTO tras %d fallos; enrutando a Ollama local %.0fs",
            _consecutive_failures,
            _BREAKER_COOLDOWN,
        )


def _reset_breaker() -> None:
    """Reinicia el estado del breaker (uso en tests)."""
    global _consecutive_failures, _breaker_open_until
    _consecutive_failures = 0
    _breaker_open_until = 0.0


def _use_cloud(prefer: str | None) -> bool:
    """Decide si esta petición debe intentar la nube."""
    provider = (prefer or LLM_PROVIDER or "ollama").strip().lower()
    if provider != "minimax":
        return False
    if _breaker_is_open():
        log.info("Breaker abierto: petición enrutada a Ollama local sin tocar nube.")
        return False
    return True


async def analizar_no_stream(
    prompt_user: str,
    contexto: dict = None,
    *,
    prefer: str | None = None,
) -> str:
    """Análisis sin streaming, con router + fallback. Drop-in de gemma_service."""
    if _use_cloud(prefer):
        try:
            result = await minimax_service.analizar_no_stream(prompt_user, contexto)
            _record_cloud_success()
            return result
        except MiniMaxError as e:
            _record_cloud_failure()
            if not LLM_FALLBACK_LOCAL:
                raise
            log.warning("MiniMax no disponible; fallback a Ollama local: %s", e)
    return await gemma_service.analizar_no_stream(prompt_user, contexto)


async def chat_stream(
    messages: list,
    contexto: dict = None,
    *,
    prefer: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming con router + fallback. Drop-in de gemma_service.chat_stream.

    El fallback ocurre ANTES de emitir tokens: minimax_service.chat_stream
    valida la conexión al abrir el stream y lanza MiniMaxError si la nube no
    responde, así no se mezclan tokens de dos proveedores en una misma respuesta.
    """
    if _use_cloud(prefer):
        try:
            agen = minimax_service.chat_stream(messages, contexto)
            first = await agen.__anext__()
            # Si llegó el primer chunk sin excepción, la nube respondió.
            _record_cloud_success()
            yield first
            async for chunk in agen:
                yield chunk
            return
        except StopAsyncIteration:
            _record_cloud_success()
            return
        except MiniMaxError as e:
            _record_cloud_failure()
            if not LLM_FALLBACK_LOCAL:
                raise
            log.warning("MiniMax stream no disponible; fallback a Ollama local: %s", e)

    async for chunk in gemma_service.chat_stream(messages, contexto):
        yield chunk

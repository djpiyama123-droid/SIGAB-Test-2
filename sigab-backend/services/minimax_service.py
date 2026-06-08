"""
SIGAH MiniMax Service — Backend de nube (MiniMax M3) detrás del router IA híbrido.

MiniMax expone un API **compatible con OpenAI** en SIGAH_MINIMAX_BASE_URL
(por defecto https://api.minimax.io/v1):
  POST /chat/completions   -> chat (stream=False | True via SSE)

Replica el patrón async httpx de `gemma_service.py` y reutiliza
`_build_system_prompt(...)` para inyectar el mismo contexto SIGAH, de modo que
sea un *drop-in* del backend local. NO es el punto de entrada: el router
(`llm_service.py`) decide cuándo usarlo y aplica fallback/circuit breaker.

Cumplimiento: enviar PHI a la nube choca con el sello 100% on-premise. Esta
capa es opt-in (SIGAH_LLM_PROVIDER=minimax) y solo se activa al contratar el
plan; en On-Premise el provider queda en `ollama` y este módulo no se invoca.
"""

import json
import httpx
from typing import AsyncGenerator

from config import (
    MINIMAX_API_KEY,
    MINIMAX_BASE_URL,
    MINIMAX_MODEL,
    MINIMAX_TIMEOUT,
)
from services.gemma_service import _build_system_prompt

_minimax_client: httpx.AsyncClient | None = None


class MiniMaxError(RuntimeError):
    """Fallo al consultar MiniMax (red, HTTP, o clave ausente).

    El router lo captura para decidir fallback a Ollama local.
    """


def get_minimax_client() -> httpx.AsyncClient:
    global _minimax_client
    if _minimax_client is None:
        _minimax_client = httpx.AsyncClient(
            base_url=MINIMAX_BASE_URL,
            timeout=httpx.Timeout(MINIMAX_TIMEOUT, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            headers={"Authorization": f"Bearer {MINIMAX_API_KEY}"},
        )
    return _minimax_client


async def close_minimax_client() -> None:
    global _minimax_client
    if _minimax_client is not None:
        await _minimax_client.aclose()
        _minimax_client = None


def _ensure_key() -> None:
    if not MINIMAX_API_KEY:
        raise MiniMaxError(
            "SIGAH_MINIMAX_API_KEY no configurada — backend de nube no disponible."
        )


async def chat_stream(
    messages: list,
    contexto: dict = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming desde MiniMax (formato OpenAI SSE) normalizado al MISMO formato
    que emite `gemma_service.chat_stream`:
        'data: {"token": "...", "done": false}\\n\\n'

    Si MiniMax falla, lanza MiniMaxError para que el router enrute a local
    ANTES de empezar a emitir tokens (el fallback en mitad del stream no es
    posible sin duplicar salida, así que validamos la conexión al abrir).
    """
    _ensure_key()
    system_prompt = _build_system_prompt(contexto or {})
    payload = {
        "model": MINIMAX_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            *messages,
        ],
        "stream": True,
        "temperature": 0.7,
        "top_p": 0.9,
        "max_tokens": 512,
    }

    try:
        client = get_minimax_client()
        async with client.stream("POST", "/chat/completions", json=payload) as response:
            if response.status_code != 200:
                body = (await response.aread()).decode("utf-8", "replace")[:200]
                raise MiniMaxError(f"MiniMax HTTP {response.status_code}: {body}")

            async for line in response.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
                    break
                try:
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content", "")
                    finish = data.get("choices", [{}])[0].get("finish_reason")
                    done = finish is not None
                    if token or done:
                        yield f"data: {json.dumps({'token': token, 'done': done})}\n\n"
                    if done:
                        break
                except (json.JSONDecodeError, IndexError):
                    continue
    except httpx.HTTPError as e:
        raise MiniMaxError(f"MiniMax error de red: {e}") from e


async def analizar_no_stream(prompt_user: str, contexto: dict = None) -> str:
    """
    Llamada MiniMax sin streaming — retorna texto completo.
    Misma firma/retorno que `gemma_service.analizar_no_stream` para ser drop-in.
    Lanza MiniMaxError ante cualquier fallo (lo gestiona el router).
    """
    _ensure_key()
    system_prompt = _build_system_prompt(contexto or {})
    payload = {
        "model": MINIMAX_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_user},
        ],
        "stream": False,
        "temperature": 0.5,
        "max_tokens": 768,
    }

    try:
        client = get_minimax_client()
        resp = await client.post("/chat/completions", json=payload, timeout=MINIMAX_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except httpx.HTTPStatusError as e:
        raise MiniMaxError(
            f"MiniMax HTTP {e.response.status_code}: {e.response.text[:200]}"
        ) from e
    except httpx.HTTPError as e:
        raise MiniMaxError(f"MiniMax error de red: {e}") from e

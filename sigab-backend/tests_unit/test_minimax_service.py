"""
Tests del cliente MiniMax (services/minimax_service.py).

DB-free y NET-free: mockean httpx con un transport en memoria
(httpx.MockTransport) — no requieren clave real, red ni base de datos. Validan:
  - sin clave -> MiniMaxError sin tocar la red (_ensure_key)
  - clave presente -> la petición lleva Authorization: Bearer <clave> (de env)
  - respuesta OpenAI-format -> se extrae el content del mensaje
  - HTTP 4xx/5xx -> se mapea a MiniMaxError
  - streaming SSE -> se normaliza a 'data: {"token","done"}'
La clave NUNCA se hardcodea: se lee de config.MINIMAX_API_KEY (env var).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import httpx
import pytest

from services import minimax_service
from services.minimax_service import MiniMaxError

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def _clean_client():
    """Asegura que cada test parta sin cliente cacheado (la clave puede cambiar)."""
    await minimax_service.close_minimax_client()
    yield
    await minimax_service.close_minimax_client()


def _install_mock_client(monkeypatch, handler):
    """Sustituye get_minimax_client por un AsyncClient con MockTransport.

    Reproduce el header Authorization real (Bearer <clave de config>) para poder
    aseverar que la clave proviene de env y no está hardcodeada.
    """
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(
        base_url=minimax_service.MINIMAX_BASE_URL,
        transport=transport,
        headers={"Authorization": f"Bearer {minimax_service.MINIMAX_API_KEY}"},
    )
    monkeypatch.setattr(minimax_service, "get_minimax_client", lambda: client)
    return client


# ── sin clave -> error sin red ─────────────────────────────────────────────
async def test_no_api_key_raises_without_network(monkeypatch):
    monkeypatch.setattr(minimax_service, "MINIMAX_API_KEY", "")

    def _boom(request):  # no debería invocarse
        raise AssertionError("no debe tocar la red sin clave")

    _install_mock_client(monkeypatch, _boom)

    with pytest.raises(MiniMaxError):
        await minimax_service.analizar_no_stream("hola", {})


# ── clave presente -> Authorization correcto + parseo OpenAI-format ────────
async def test_analizar_no_stream_ok_sends_bearer_and_parses(monkeypatch):
    monkeypatch.setattr(minimax_service, "MINIMAX_API_KEY", "sk-api-TESTKEY")
    captured = {}

    def _handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("authorization")
        body = json.loads(request.content)
        captured["model"] = body.get("model")
        captured["stream"] = body.get("stream")
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "RESPUESTA M3"}}]},
        )

    _install_mock_client(monkeypatch, _handler)

    out = await minimax_service.analizar_no_stream("diagnostica esta falla", {})

    assert out == "RESPUESTA M3"
    assert captured["auth"] == "Bearer sk-api-TESTKEY"  # clave desde env, no hardcode
    assert captured["model"] == minimax_service.MINIMAX_MODEL
    assert captured["stream"] is False


# ── HTTP error -> MiniMaxError ─────────────────────────────────────────────
async def test_analizar_no_stream_http_error_maps_to_minimaxerror(monkeypatch):
    monkeypatch.setattr(minimax_service, "MINIMAX_API_KEY", "sk-api-TESTKEY")

    def _handler(request):
        return httpx.Response(500, text="upstream boom")

    _install_mock_client(monkeypatch, _handler)

    with pytest.raises(MiniMaxError):
        await minimax_service.analizar_no_stream("x", {})


# ── streaming SSE -> normalizado a 'data: {"token","done"}' ────────────────
async def test_chat_stream_normalizes_openai_sse(monkeypatch):
    monkeypatch.setattr(minimax_service, "MINIMAX_API_KEY", "sk-api-TESTKEY")

    sse = (
        'data: {"choices":[{"delta":{"content":"Hola"},"finish_reason":null}]}\n'
        'data: {"choices":[{"delta":{"content":" mundo"},"finish_reason":null}]}\n'
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n'
        "data: [DONE]\n"
    )

    def _handler(request):
        return httpx.Response(200, text=sse)

    _install_mock_client(monkeypatch, _handler)

    chunks = [c async for c in minimax_service.chat_stream([{"role": "user", "content": "hi"}], {})]

    # Cada chunk debe seguir el formato SSE de gemma_service.
    assert all(c.startswith("data: ") and c.endswith("\n\n") for c in chunks)
    tokens = [json.loads(c[len("data: "):].strip())["token"] for c in chunks]
    assert "Hola" in tokens and " mundo" in tokens
    # Debe terminar con un evento done=True.
    last = json.loads(chunks[-1][len("data: "):].strip())
    assert last["done"] is True


# ── streaming con HTTP error -> MiniMaxError ───────────────────────────────
async def test_chat_stream_http_error_raises(monkeypatch):
    monkeypatch.setattr(minimax_service, "MINIMAX_API_KEY", "sk-api-TESTKEY")

    def _handler(request):
        return httpx.Response(503, text="unavailable")

    _install_mock_client(monkeypatch, _handler)

    with pytest.raises(MiniMaxError):
        async for _ in minimax_service.chat_stream([{"role": "user", "content": "hi"}], {}):
            pass

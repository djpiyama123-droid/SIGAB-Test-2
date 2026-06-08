"""
Tests del router IA híbrido (services/llm_service.py).

DB-free a propósito: viven en tests_unit/ (fuera del conftest session-autouse
que crea el schema MySQL sigah_test), y mockean los backends Ollama/MiniMax —
no requieren clave, red ni base de datos. Cubren:
  (a) provider=ollama          -> usa local, nunca toca la nube
  (b) provider=minimax + OK    -> usa MiniMax
  (c) provider=minimax + falla + fallback=1 -> cae a Ollama local
  (d) provider=minimax + falla + fallback=0 -> propaga MiniMaxError
  (e) circuit breaker abre tras N fallos -> enruta a local sin tocar la nube
También valida el camino streaming (chat_stream).
"""

import os
import sys

# Permite `import config` / `from services import ...` corriendo desde cualquier cwd.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from services import llm_service
from services import gemma_service
from services import minimax_service
from services.minimax_service import MiniMaxError

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    """Breaker limpio y estado de proveedor controlado en cada test."""
    llm_service._reset_breaker()
    yield
    llm_service._reset_breaker()


def _set(monkeypatch, *, provider, fallback=True):
    monkeypatch.setattr(llm_service, "LLM_PROVIDER", provider)
    monkeypatch.setattr(llm_service, "LLM_FALLBACK_LOCAL", fallback)


def _spy(calls, label, result=None, raises=None):
    """Crea una coroutine que registra su invocación."""
    async def _fn(*args, **kwargs):
        calls.append(label)
        if raises is not None:
            raise raises
        return result
    return _fn


def _spy_stream(calls, label, chunks=None, raises=None):
    """Crea un async-generator que registra su invocación."""
    async def _gen(*args, **kwargs):
        calls.append(label)
        if raises is not None:
            raise raises
        for c in (chunks or []):
            yield c
    return _gen


# ── (a) provider=ollama ────────────────────────────────────────────────────
async def test_provider_ollama_uses_local(monkeypatch):
    calls = []
    _set(monkeypatch, provider="ollama")
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud", "RESP_CLOUD"))

    out = await llm_service.analizar_no_stream("hola", {})

    assert out == "RESP_LOCAL"
    assert calls == ["local"]  # la nube nunca se tocó


# ── (b) provider=minimax + nube OK ─────────────────────────────────────────
async def test_provider_minimax_cloud_ok(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax")
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud", "RESP_CLOUD"))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    out = await llm_service.analizar_no_stream("hola", {})

    assert out == "RESP_CLOUD"
    assert calls == ["cloud"]


# ── (c) provider=minimax + falla + fallback=1 ──────────────────────────────
async def test_minimax_fails_falls_back_to_local(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    out = await llm_service.analizar_no_stream("hola", {})

    assert out == "RESP_LOCAL"
    assert calls == ["cloud", "local"]


# ── (d) provider=minimax + falla + fallback=0 ──────────────────────────────
async def test_minimax_fails_no_fallback_raises(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=False)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    with pytest.raises(MiniMaxError):
        await llm_service.analizar_no_stream("hola", {})
    assert calls == ["cloud"]  # no cayó a local


# ── (e) circuit breaker ────────────────────────────────────────────────────
async def test_breaker_opens_after_threshold(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    # 3 fallos consecutivos abren el breaker (_BREAKER_THRESHOLD = 3)
    for _ in range(llm_service._BREAKER_THRESHOLD):
        assert await llm_service.analizar_no_stream("x", {}) == "RESP_LOCAL"

    cloud_calls_antes = calls.count("cloud")
    assert cloud_calls_antes == llm_service._BREAKER_THRESHOLD

    # Con el breaker abierto, la siguiente petición NO toca la nube.
    assert await llm_service.analizar_no_stream("x", {}) == "RESP_LOCAL"
    assert calls.count("cloud") == cloud_calls_antes  # sin nuevas llamadas a nube


async def test_breaker_resets_on_success(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    # 2 fallos (por debajo del umbral)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud_fail", raises=MiniMaxError("x")))
    await llm_service.analizar_no_stream("x", {})
    await llm_service.analizar_no_stream("x", {})
    assert llm_service._consecutive_failures == 2

    # Un éxito reinicia el contador
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud_ok", "OK"))
    assert await llm_service.analizar_no_stream("x", {}) == "OK"
    assert llm_service._consecutive_failures == 0


# ── streaming ──────────────────────────────────────────────────────────────
async def test_chat_stream_cloud_ok(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax")
    monkeypatch.setattr(minimax_service, "chat_stream",
                        _spy_stream(calls, "cloud", chunks=["data: a\n\n", "data: b\n\n"]))
    monkeypatch.setattr(gemma_service, "chat_stream",
                        _spy_stream(calls, "local", chunks=["data: L\n\n"]))

    out = [c async for c in llm_service.chat_stream([{"role": "user", "content": "hi"}], {})]

    assert out == ["data: a\n\n", "data: b\n\n"]
    assert calls == ["cloud"]


async def test_chat_stream_falls_back_to_local(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(minimax_service, "chat_stream",
                        _spy_stream(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "chat_stream",
                        _spy_stream(calls, "local", chunks=["data: L\n\n"]))

    out = [c async for c in llm_service.chat_stream([{"role": "user", "content": "hi"}], {})]

    assert out == ["data: L\n\n"]
    assert calls == ["cloud", "local"]

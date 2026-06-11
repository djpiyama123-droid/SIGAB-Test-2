"""
Tests del router IA híbrido (services/llm_service.py).

DB-free a propósito: viven en tests_unit/ (fuera del conftest de tests/ que es
session-autouse y crea el schema MySQL sigah_test), y mockean los backends
Ollama/MiniMax — no requieren clave, red ni base de datos.

Cubren:
  (a) provider=ollama                         -> usa local, nunca toca la nube
  (b) provider=minimax + nube OK              -> usa MiniMax
  (c) provider=minimax + falla + fallback=1   -> cae a Ollama local
  (d) provider=minimax + falla + fallback=0   -> propaga MiniMaxError
  (e) circuit breaker abre tras N fallos      -> enruta a local sin tocar nube
  (f) breaker SEMI-ABIERTO (half-open)        -> al expirar cooldown reintenta nube
  (g) éxito en la nube reinicia el contador del breaker
También valida el camino streaming (chat_stream): nube OK y fallback a local.
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
def _reset():
    """Breaker limpio en cada test (antes y después)."""
    llm_service._reset_breaker()
    yield
    llm_service._reset_breaker()


def _set(monkeypatch, *, provider, fallback=True):
    """Fija el proveedor y el flag de fallback que lee el router."""
    monkeypatch.setattr(llm_service, "LLM_PROVIDER", provider)
    monkeypatch.setattr(llm_service, "LLM_FALLBACK_LOCAL", fallback)


def _spy(calls, label, result=None, raises=None):
    """Coroutine espía que registra su invocación y devuelve/lanza lo indicado."""
    async def _fn(*args, **kwargs):
        calls.append(label)
        if raises is not None:
            raise raises
        return result
    return _fn


def _spy_stream(calls, label, chunks=None, raises=None):
    """Async-generator espía que registra su invocación."""
    async def _gen(*args, **kwargs):
        calls.append(label)
        if raises is not None:
            raise raises
        for c in (chunks or []):
            yield c
    return _gen


# ── (a) provider=ollama ────────────────────────────────────────────────────
async def test_provider_ollama_uses_local(monkeypatch):
    """Default ollama: comportamiento actual preservado, la nube nunca se toca."""
    calls = []
    _set(monkeypatch, provider="ollama")
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud", "RESP_CLOUD"))

    out = await llm_service.analizar_no_stream("hola", {})

    assert out == "RESP_LOCAL"
    assert calls == ["local"]  # la nube nunca se invocó


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


# ── (e) circuit breaker abre tras N fallos ─────────────────────────────────
async def test_breaker_opens_after_threshold(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    # N fallos consecutivos abren el breaker (_BREAKER_THRESHOLD).
    for _ in range(llm_service._BREAKER_THRESHOLD):
        assert await llm_service.analizar_no_stream("x", {}) == "RESP_LOCAL"

    cloud_calls_antes = calls.count("cloud")
    assert cloud_calls_antes == llm_service._BREAKER_THRESHOLD

    # Con el breaker ABIERTO, la siguiente petición NO toca la nube (va directo a local).
    assert await llm_service.analizar_no_stream("x", {}) == "RESP_LOCAL"
    assert calls.count("cloud") == cloud_calls_antes  # sin nuevas llamadas a nube


# ── (f) breaker SEMI-ABIERTO (half-open): al expirar el cooldown reintenta ──
async def test_breaker_half_open_retries_cloud_after_cooldown(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud", raises=MiniMaxError("nube caída")))
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    # Abrir el breaker.
    for _ in range(llm_service._BREAKER_THRESHOLD):
        await llm_service.analizar_no_stream("x", {})
    assert llm_service._breaker_is_open()
    cloud_calls_abierto = calls.count("cloud")

    # Petición con breaker abierto: no toca la nube.
    await llm_service.analizar_no_stream("x", {})
    assert calls.count("cloud") == cloud_calls_abierto

    # Simular que pasó el cooldown -> breaker SEMI-ABIERTO.
    monkeypatch.setattr(llm_service, "_breaker_open_until", 0.0)
    assert not llm_service._breaker_is_open()

    # Ahora la nube vuelve a estar sana: la petición de prueba (half-open) la cierra.
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud_ok", "RESP_CLOUD"))
    out = await llm_service.analizar_no_stream("x", {})
    assert out == "RESP_CLOUD"
    assert calls.count("cloud_ok") == 1
    assert llm_service._consecutive_failures == 0  # breaker cerrado de nuevo


# ── (g) un éxito en la nube reinicia el contador ───────────────────────────
async def test_breaker_resets_on_success(monkeypatch):
    calls = []
    _set(monkeypatch, provider="minimax", fallback=True)
    monkeypatch.setattr(gemma_service, "analizar_no_stream", _spy(calls, "local", "RESP_LOCAL"))

    # 2 fallos (por debajo del umbral).
    monkeypatch.setattr(minimax_service, "analizar_no_stream",
                        _spy(calls, "cloud_fail", raises=MiniMaxError("x")))
    await llm_service.analizar_no_stream("x", {})
    await llm_service.analizar_no_stream("x", {})
    assert llm_service._consecutive_failures == 2

    # Un éxito reinicia el contador.
    monkeypatch.setattr(minimax_service, "analizar_no_stream", _spy(calls, "cloud_ok", "OK"))
    assert await llm_service.analizar_no_stream("x", {}) == "OK"
    assert llm_service._consecutive_failures == 0


# ── streaming: nube OK ─────────────────────────────────────────────────────
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


# ── streaming: fallback a local ────────────────────────────────────────────
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

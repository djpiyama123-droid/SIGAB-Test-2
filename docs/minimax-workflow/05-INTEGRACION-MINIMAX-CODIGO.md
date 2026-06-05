# SIGAH — Diseño de integración de MiniMax a nivel de código

> Objetivo: enchufar MiniMax M3 como **cerebro de nube** del producto, conservando Gemma/Ollama local como **fallback on-premise**, sin romper lo existente y con tests propios (mocks, sin API key).

## 1. Dónde encaja (puntos de integración reales)

| Archivo actual | Rol | Cambio propuesto |
|---|---|---|
| `sigab-backend/config.py` | Centraliza ENV (`OLLAMA_HOST`, `GEMMA_MODEL`, `GEMINI_API_KEY`, `DISABLE_COPILOT`) | Añadir vars MiniMax + selector de proveedor |
| `sigab-backend/services/gemma_service.py` | Cliente async httpx → Ollama (`/api/chat`) | Queda igual; se vuelve un *backend* detrás del router |
| `sigab-backend/services/ocr_service.py` | OCR vía Gemini | Opcional: M3 multimodal como alternativa/fallback |
| `sigab-backend/routes/copilot.py` | Endpoint Copilot | Llama al nuevo `llm_service` en vez de `gemma_service` directo |
| `sigab-backend/routes/openclaw.py` | Módulo agéntico (bot) | Usa `llm_service` para razonamiento agéntico |

**MiniMax M3 expone API compatible con OpenAI** → se integra con el mismo patrón `httpx.AsyncClient` ya usado para Ollama. (Confirmar endpoint y modelo exactos en doc `01-MINIMAX-PLAN-Y-API.md`.)

## 2. Variables de entorno nuevas (`config.py` + `.env.example`)

```python
# ── Proveedor de IA (router) ──────────────────────────────────────────────
# ollama = local on-premise (default, edición Premium) | minimax = nube (edición Cloud)
LLM_PROVIDER       = os.getenv("SIGAH_LLM_PROVIDER", "ollama").strip().lower()
# Failover automático a Ollama local si la nube no responde (resiliencia luz/nube)
LLM_FALLBACK_LOCAL = os.getenv("SIGAH_LLM_FALLBACK_LOCAL", "1").strip() in ("1","true","yes")

# ── MiniMax (nube) ─────────────────────────────────────────────────────────
MINIMAX_API_KEY  = os.getenv("SIGAH_MINIMAX_API_KEY", "")
MINIMAX_BASE_URL = os.getenv("SIGAH_MINIMAX_BASE_URL", "https://api.minimax.io/v1")  # confirmar en doc 01
MINIMAX_MODEL    = os.getenv("SIGAH_MINIMAX_MODEL", "MiniMax-M3")                    # confirmar nombre exacto
MINIMAX_TIMEOUT  = float(os.getenv("SIGAH_MINIMAX_TIMEOUT", "60"))
```

> El selector por ENV permite que **la MISMA imagen** sirva ambas ediciones: `SIGAH_LLM_PROVIDER=minimax` (Cloud) o `=ollama` (On-Premise Premium). Por hospital/tenant se puede sobreescribir.

## 3. Nuevo `services/llm_service.py` (router + circuit breaker)

Capa fina que unifica la interfaz `chat(messages, system, contexto) -> str | AsyncGenerator` y decide proveedor con fallback:

```python
# services/llm_service.py  (boceto)
from config import LLM_PROVIDER, LLM_FALLBACK_LOCAL
from services import gemma_service          # backend local (Ollama)
from services import minimax_service        # NUEVO backend nube

async def chat(messages, *, contexto=None, prefer=None):
    provider = prefer or LLM_PROVIDER
    if provider == "minimax":
        try:
            return await minimax_service.chat(messages, contexto=contexto)
        except Exception as e:
            if LLM_FALLBACK_LOCAL:
                log.warning("MiniMax no disponible, fallback a Ollama local: %s", e)
                return await gemma_service.chat(messages, contexto=contexto)
            raise
    return await gemma_service.chat(messages, contexto=contexto)
```

`services/minimax_service.py` replica el patrón de `gemma_service.py` pero contra el endpoint OpenAI-compatible de MiniMax (header `Authorization: Bearer $MINIMAX_API_KEY`, payload `{"model": MINIMAX_MODEL, "messages": [...], "stream": ...}`). Reutiliza `_build_system_prompt(...)` ya existente para inyectar el contexto SIGAH.

**Circuit breaker:** envolver el cliente nube con un contador de fallos consecutivos; tras N fallos, abrir el breaker y enrutar a local por T segundos (evita latencia por reintentos cuando la nube está caída). Esto materializa la resiliencia "si se cae la nube/luz, sigue el LLM local".

## 4. Ediciones → configuración

| | SIGAH Cloud (Plan A) | SIGAH On-Premise Premium |
|---|---|---|
| `SIGAH_LLM_PROVIDER` | `minimax` | `ollama` |
| `SIGAH_LLM_FALLBACK_LOCAL` | `1` (cae a Ollama si nube falla) | `1` (siempre local) |
| Datos clínicos (PHI) | salen a MiniMax (revisar contrato/aviso de privacidad) | **nunca salen** del hospital |
| Hardware | VPS/nube | ThinkCentre / futura máquina GB10 con Ollama |
| OCR | Gemini o M3 multimodal | local (paddleocr ya contemplado) |

> ⚠️ **Cumplimiento:** enviar datos clínicos a la nube de MiniMax choca con el sello "100% on-premise / NOM-016/240/ISO-13485". Para la edición Cloud hace falta: aviso de privacidad (LFPDPPP), contrato de tratamiento de datos, y de preferencia **minimizar PHI** (mandar IDs/metadatos, no nombres de pacientes). Detalle en doc 01.

## 5. Estrategia de tests (mantiene `all tests pass`, sin API key)

- Tests **aditivos** en `tests/test_llm_service.py` que mockean `httpx` (respx o monkeypatch) → no requieren clave ni red.
- Casos: (a) `provider=minimax` y nube OK → usa MiniMax; (b) `provider=minimax` + nube falla + `fallback=1` → cae a Ollama; (c) `provider=ollama` → usa local; (d) circuit breaker abre tras N fallos.
- Como son archivos nuevos y la capa es opt-in (default `ollama`, sin clave), **no alteran el comportamiento actual** ni los tests existentes.

## 6. Plan de implementación (incremental, detrás de flag)
1. Añadir vars a `config.py` + `.env.example` (no-op si `provider=ollama`).
2. Crear `services/minimax_service.py` (cliente nube) + `services/llm_service.py` (router/breaker).
3. Migrar `routes/copilot.py` y `routes/openclaw.py` a llamar `llm_service.chat(...)` en vez de `gemma_service` directo (sin cambiar contrato HTTP).
4. Tests con mocks → verde.
5. Activar `SIGAH_LLM_PROVIDER=minimax` solo cuando exista la clave/plan contratado (doc 01).

> Nada de esto se ejecuta todavía: queda **preparado y documentado**, listo para activar al contratar el plan MiniMax.

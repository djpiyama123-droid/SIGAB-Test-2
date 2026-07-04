"""
SIGAH Gemma Service — Interfaz asíncrona con Ollama (Gemma local on-premise)

Ollama expone el API en http://localhost:11434
Modelos soportados: gemma3:4b, gemma3:12b, gemma3:27b, gemma4 (cuando disponible)

Referencia API Ollama:
  POST /api/chat       -> chat con streaming
  POST /api/generate   -> texto sin formato chat
  GET  /api/tags       -> lista modelos instalados
  GET  /api/ps         -> estado modelo cargado
"""

import httpx
import json
import base64
from typing import AsyncGenerator
from config import OLLAMA_HOST, GEMMA_MODEL, LLM_API_MODE, LLM_API_BASE, LLM_API_KEY

_ollama_client: httpx.AsyncClient | None = None
_resolved_model: str | None = None  # modelo activo (auto-detectado si el configurado no existe)

# Modo OpenAI-compatible (ej. MiniMax): el chat/análisis de texto va a
# LLM_API_BASE con Bearer; visión y OCR siguen en Ollama local.
_OPENAI_MODE = LLM_API_MODE == "openai" and bool(LLM_API_KEY)


def get_ollama_client() -> httpx.AsyncClient:
    global _ollama_client
    if _ollama_client is None:
        if _OPENAI_MODE:
            _ollama_client = httpx.AsyncClient(
                base_url=LLM_API_BASE,
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
                timeout=httpx.Timeout(120.0, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
        else:
            _ollama_client = httpx.AsyncClient(
                base_url=OLLAMA_HOST,
                timeout=httpx.Timeout(120.0, connect=5.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
    return _ollama_client


def _vision_client() -> httpx.AsyncClient:
    """Cliente SIEMPRE apuntado a Ollama local (visión no migra a la API)."""
    if not _OPENAI_MODE:
        return get_ollama_client()
    return httpx.AsyncClient(
        base_url=OLLAMA_HOST,
        timeout=httpx.Timeout(120.0, connect=5.0),
    )


async def close_ollama_client() -> None:
    global _ollama_client
    if _ollama_client is not None:
        await _ollama_client.aclose()
        _ollama_client = None

# ── Prompt de sistema ─────────────────────────────────────────────
SYSTEM_PROMPT_BASE = """Eres SIGAH Copilot, asistente de ingeniería biomédica del HGR No.1 IMSS Tijuana.

Especialidad: mantenimiento de equipos médicos, MTBF/MTTR, tecnovigilancia.
Normativa: NOM-016-SSA3-2012, NOM-240-SSA1-2012, ISO-13485.

Estilo:
- Español técnico, conciso. Sin saludos ni rellenos.
- Diagnósticos en formato: [Causa probable] → [Verificaciones] → [Acción].
- Solo usa datos del contexto SIGAH; nunca inventes equipos, fechas o métricas.
- Si falta información clave, dilo en una línea y pide el dato faltante.
"""


def _build_system_prompt(contexto: dict) -> str:
    """Construye el prompt de sistema inyectando contexto SIGAH actual."""
    prompt = SYSTEM_PROMPT_BASE

    if not contexto:
        return prompt

    prompt += "\n--- CONTEXTO SIGAH ACTUAL ---\n"

    if "resumen" in contexto:
        r = contexto["resumen"]
        prompt += f"""
Estado del hospital (ahora mismo):
- Tickets abiertos: {r.get('tickets_abiertos', 'N/A')}
- Alertas pendientes: {r.get('alertas_pendientes', 'N/A')}
- Preventivos vencidos: {r.get('preventivos_vencidos', 'N/A')}
"""
        if r.get("equipos_por_estado"):
            estado_str = ", ".join(
                f"{e['estado']}: {e['total']}"
                for e in r["equipos_por_estado"]
            )
            prompt += f"- Equipos por estado: {estado_str}\n"

    if "equipo" in contexto:
        eq = contexto["equipo"]
        prompt += f"""
Equipo en contexto:
- Nombre: {eq.get('nombre')} | Marca: {eq.get('marca')} | Modelo: {eq.get('modelo')}
- Serie: {eq.get('serie')} | Estado: {eq.get('estado')} | Criticidad: {eq.get('criticidad')}
- Área: {eq.get('area')} Piso {eq.get('piso')}
- Último mantenimiento: {eq.get('fecha_ultimo_mantenimiento', 'N/A')}
- Próximo preventivo: {eq.get('fecha_proximo_mantenimiento', 'N/A')}
"""

    if "historial_ordenes" in contexto:
        hist = contexto["historial_ordenes"][:5]
        if hist:
            prompt += "Últimas 5 órdenes del equipo:\n"
            for o in hist:
                prompt += (
                    f"  - [{o.get('fecha')}] {o.get('tipo_mantenimiento','').upper()}: "
                    f"{o.get('falla_reportada', 'Sin descripción')} → {o.get('estado')}\n"
                )

    if "evento_adverso" in contexto:
        ev = contexto["evento_adverso"]
        prompt += f"""
Evento adverso en análisis:
- Dispositivo: {ev.get('dispositivo_nombre')} | Serie: {ev.get('dispositivo_serie')}
- Tipo: {ev.get('tipo_evento')} | Severidad: {ev.get('severidad')}
- Descripción: {ev.get('descripcion_evento')}
"""

    if "fiabilidad" in contexto:
        criticos = [m for m in contexto["fiabilidad"] if m.get("riesgo") == "Crítico"]
        if criticos:
            prompt += f"Equipos en riesgo crítico de falla ({len(criticos)}):\n"
            for m in criticos[:3]:
                prompt += (
                    f"  - {m['nombre']} ({m['serie']}): MTBF={m['mtbf_dias']}d, "
                    f"prob_falla={m['probabilidad_falla_pct']}%\n"
                )

    prompt += "--- FIN CONTEXTO ---\n"
    return prompt


# ── Funciones principales ─────────────────────────────────────────

async def _resolve_model() -> str:
    """
    Devuelve el modelo activo. Intenta el configurado primero; si no existe
    en Ollama, toma el primer modelo instalado como fallback.
    Cachea el resultado en _resolved_model para no re-consultar en cada petición.
    """
    global _resolved_model
    if _resolved_model:
        return _resolved_model

    if _OPENAI_MODE:
        _resolved_model = GEMMA_MODEL
        return _resolved_model

    try:
        client = get_ollama_client()
        resp = await client.get("/api/tags", timeout=5.0)
        if resp.status_code != 200:
            _resolved_model = GEMMA_MODEL
            return _resolved_model

        modelos = [m["name"] for m in resp.json().get("models", [])]
        modelo_base = GEMMA_MODEL.split(":")[0]
        if any(modelo_base in m or GEMMA_MODEL in m for m in modelos):
            _resolved_model = GEMMA_MODEL
        elif modelos:
            # fallback: primer modelo de texto disponible (no vision)
            _resolved_model = next(
                (m for m in modelos if "vision" not in m.lower() and "embed" not in m.lower()),
                modelos[0],
            )
        else:
            _resolved_model = GEMMA_MODEL
    except Exception:
        _resolved_model = GEMMA_MODEL

    return _resolved_model


async def verificar_ollama() -> dict:
    """Verifica si Ollama está corriendo y si el modelo está disponible."""
    global _resolved_model
    _resolved_model = None  # forzar re-detección
    if _OPENAI_MODE:
        return {
            "ok": True,
            "ollama_activo": False,
            "api_mode": "openai",
            "api_base": LLM_API_BASE,
            "modelo_configurado": GEMMA_MODEL,
            "modelo_activo": GEMMA_MODEL,
            "modelo_disponible": True,
            "modelos_instalados": [],
        }
    try:
        client = get_ollama_client()
        resp = await client.get("/api/tags", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            modelos = [m["name"] for m in data.get("models", [])]
            modelo_activo = await _resolve_model()
            modelo_base = GEMMA_MODEL.split(":")[0]
            modelo_disponible = any(
                modelo_base in m or GEMMA_MODEL in m for m in modelos
            )
            return {
                "ok": True,
                "ollama_activo": True,
                "modelo_configurado": GEMMA_MODEL,
                "modelo_activo": modelo_activo,
                "modelo_disponible": modelo_disponible,
                "modelos_instalados": modelos,
            }
    except Exception as e:
        return {
            "ok": False,
            "ollama_activo": False,
            "error": str(e),
            "modelo_configurado": GEMMA_MODEL,
            "modelo_activo": GEMMA_MODEL,
            "modelo_disponible": False,
            "modelos_instalados": [],
        }


async def chat_stream(
    messages: list,
    contexto: dict = None,
) -> AsyncGenerator[str, None]:
    """
    Genera tokens en streaming desde Ollama/Gemma.
    Yields líneas SSE: 'data: {"token":"...", "done": false}\n\n'
    """
    system_prompt = _build_system_prompt(contexto or {})

    model = await _resolve_model()
    mensajes_full = [
        {"role": "system", "content": system_prompt},
        *messages,
    ]

    if _OPENAI_MODE:
        payload = {
            "model": model,
            "messages": mensajes_full,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 512,
        }
        try:
            client = get_ollama_client()
            async with client.stream("POST", "/chat/completions", json=payload) as response:
                if response.status_code != 200:
                    yield f"data: {json.dumps({'error': f'LLM API error {response.status_code}', 'done': True})}\n\n"
                    return
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue
                    chunk = line[5:].strip()
                    if chunk == "[DONE]":
                        yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
                        return
                    try:
                        data = json.loads(chunk)
                        token = (data.get("choices") or [{}])[0].get("delta", {}).get("content") or ""
                        if token:
                            yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
                    except json.JSONDecodeError:
                        continue
                yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'API LLM no accesible desde el servidor.', 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
        return

    payload = {
        "model": model,
        "messages": mensajes_full,
        "stream": True,
        "keep_alive": "30m",
        "options": {
            "temperature": 0.7,
            "num_predict": 512,
            "num_ctx": 8192,
            "top_p": 0.9,
        },
    }

    try:
        client = get_ollama_client()
        async with client.stream("POST", "/api/chat", json=payload) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': f'Ollama error {response.status_code}', 'done': True})}\n\n"
                return

            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    done = data.get("done", False)
                    yield f"data: {json.dumps({'token': token, 'done': done})}\n\n"
                    if done:
                        break
                except json.JSONDecodeError:
                    continue

    except httpx.ConnectError:
        yield (
            f"data: {json.dumps({'error': 'Ollama no está corriendo. Inicia Ollama en el servidor.', 'done': True})}\n\n"
        )
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"


async def analizar_no_stream(prompt_user: str, contexto: dict = None) -> str:
    """
    Llamada Gemma sin streaming — retorna texto completo.
    Usado para análisis internos (diagnóstico estructurado, resumen, causa raíz).
    """
    system_prompt = _build_system_prompt(contexto or {})

    model = await _resolve_model()
    mensajes_full = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt_user},
    ]

    if _OPENAI_MODE:
        try:
            client = get_ollama_client()
            resp = await client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": mensajes_full,
                    "stream": False,
                    "temperature": 0.5,
                    "max_tokens": 768,
                },
                timeout=90.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        except httpx.HTTPStatusError as e:
            return f"Error LLM API HTTP {e.response.status_code}: {e.response.text[:200]}"
        except Exception as e:
            return f"Error al consultar el LLM: {str(e)}"

    payload = {
        "model": model,
        "messages": mensajes_full,
        "stream": False,
        "keep_alive": "30m",
        "options": {
            "temperature": 0.5,
            "num_predict": 768,
            "num_ctx": 8192,
        },
    }

    try:
        client = get_ollama_client()
        resp = await client.post("/api/chat", json=payload, timeout=90.0)
        if resp.status_code == 404:
            return f"Modelo '{model}' no encontrado en Ollama. Instala el modelo con: ollama pull {model}"
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")
    except httpx.ConnectError:
        return "Error: Ollama no está disponible. Verifica que el servicio esté corriendo en el servidor."
    except httpx.HTTPStatusError as e:
        return f"Error Ollama HTTP {e.response.status_code}: {e.response.text[:200]}"
    except Exception as e:
        return f"Error al consultar Gemma: {str(e)}"


async def analizar_imagen(image_b64: str, pregunta: str) -> str:
    """
    Análisis de imagen con Gemma 4 multimodal (vision).
    image_b64: imagen en base64 (PNG/JPG)
    pregunta: instrucción sobre qué analizar
    """
    import os
    vision_model = os.getenv("SIGAH_VISION_MODEL", "gemma4-claw")

    payload = {
        "model": vision_model,
        "messages": [
            {
                "role": "user",
                "content": pregunta,
                "images": [image_b64],
            }
        ],
        "stream": False,
        "keep_alive": "30m",
        "options": {"temperature": 0.3, "num_predict": 384, "num_ctx": 8192},
    }

    client = _vision_client()
    try:
        resp = await client.post("/api/chat", json=payload, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")
    except Exception as e:
        return f"Error en análisis de imagen: {str(e)}"
    finally:
        if _OPENAI_MODE:
            await client.aclose()  # cliente efímero solo-visión


# ── Prompts especializados SIGAH ──────────────────────────────────

def prompt_diagnostico(
    falla: str, equipo_tipo: str, marca: str, modelo: str
) -> str:
    return f"""Analiza la siguiente falla en un equipo médico y proporciona un diagnóstico estructurado.

Equipo: {equipo_tipo} — {marca} {modelo}
Falla reportada: "{falla}"

Responde en este formato exacto:
**Causas probables** (máximo 3, ordenadas por probabilidad):
1. [causa] — [por qué]
2. [causa] — [por qué]

**Verificaciones inmediatas** (qué revisar primero):
- [verificación concreta]
- [verificación concreta]

**Acción recomendada**: [correctivo/preventivo/reemplazar componente/llamar a servicio técnico]

**Herramientas/refacciones probables**: [lista]

**Tiempo estimado de reparación**: [estimación]
"""


def prompt_causa_raiz(
    dispositivo: str, tipo_evento: str, severidad: str, descripcion: str
) -> str:
    return f"""Analiza el siguiente evento adverso en un dispositivo médico y sugiere la causa raíz más probable, siguiendo la metodología NOM-240-SSA1-2012.

Dispositivo: {dispositivo}
Tipo de evento: {tipo_evento}
Severidad: {severidad}
Descripción del evento: "{descripcion}"

Responde con:
**Causa raíz más probable**: [causa específica]

**Categoría de causa** (selecciona una):
- Falla de diseño del fabricante
- Desgaste normal / vida útil excedida
- Error de uso / capacitación
- Mantenimiento inadecuado
- Problema de infraestructura (eléctrica, ambiente)
- Falla de componente aislado

**Acciones correctivas recomendadas**:
1. [acción inmediata]
2. [acción a mediano plazo]

**¿Requiere notificación a COFEPRIS?**: [Sí/No — justificación breve]

**Medidas preventivas**: [para evitar recurrencia]
"""


def prompt_resumen_diario(datos: dict) -> str:
    estados = datos.get("equipos_por_estado", [])
    estado_str = ", ".join(f"{e['estado']}: {e['total']}" for e in estados)
    return f"""Genera un resumen ejecutivo conciso (máximo 180 palabras) del estado actual del departamento de Ingeniería Biomédica del HGR No. 1 IMSS Tijuana basado en estos datos del SIGAH:

Equipos por estado: {estado_str}
Tickets abiertos: {datos.get('tickets_abiertos', 0)}
Alertas pendientes sin leer: {datos.get('alertas_pendientes', 0)}
Preventivos vencidos: {datos.get('preventivos_vencidos', 0)}
Fecha: {datos.get('fecha_hoy', 'hoy')}

El resumen debe:
1. Destacar el estado general (positivo/atención/crítico)
2. Identificar las 2-3 prioridades del día
3. Terminar con una recomendación de acción inmediata

Tono: profesional, directo, para el Jefe de Conservación e Ingeniería Biomédica.
"""


def prompt_vision_etiqueta(tipo_doc: str) -> str:
    prompts = {
        "etiqueta_equipo": (
            "Analiza esta imagen de etiqueta/placa de equipo médico. "
            "Extrae: nombre del equipo, marca, modelo, número de serie, número de lote, "
            "registro sanitario (si aparece), voltaje y frecuencia. "
            "Responde en formato JSON con estos campos: "
            "{nombre, marca, modelo, serie, lote, registro_sanitario, voltaje}. "
            "Si un campo no es visible, usa null."
        ),
        "reporte_servicio": (
            "Analiza esta imagen de reporte de servicio técnico externo. "
            "Extrae: número de folio, fecha, técnico/ingeniero, descripción del trabajo, "
            "refacciones utilizadas, costo total. "
            "Responde en JSON: {folio, fecha, tecnico, descripcion, refacciones, costo}. "
            "Si un campo no es visible, usa null."
        ),
        "general": (
            "Analiza esta imagen en el contexto de equipos médicos e ingeniería biomédica. "
            "Describe lo que ves y extrae cualquier información relevante para mantenimiento."
        ),
    }
    return prompts.get(tipo_doc, prompts["general"])


def prompt_prediccion_insumos(inventario: list, historial_os: list) -> str:
    return f"""Analiza el historial de mantenimiento y el inventario actual para predecir necesidades de refacciones.

Inventario actual (stock): {json.dumps(inventario)}
Historial de fallas/materiales (últimas 20 OS): {json.dumps(historial_os)}

Basado en la frecuencia de fallas y el stock actual:
1. ¿Qué refacciones corren riesgo de agotarse en los próximos 30 días?
2. ¿Qué equipos requieren compra preventiva de kits de mantenimiento?
3. Sugiere cantidades de reabastecimiento para mantener la operatividad al 98% en el HGR No. 1.

Responde de forma concisa y técnica.
"""

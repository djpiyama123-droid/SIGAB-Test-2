"""
imss_os_extractor.py — Extracción de campos de Orden de Servicio IMSS
desde imagen escaneada usando Gemma 3:4b local (Ollama, preferido) o
Gemini 1.5 Flash (cloud, fallback). Devuelve un dict mapeable 1:1 al
modelo OrdenServicio.

Path de uso:
  POST /api/ordenes/scan-imss            (cámara web / archivo)
  POST /api/openclaw/scan-os              (foto desde WhatsApp via bot)

El prompt verifica el banner 'SIGAB-IMSS-OS-V3' impreso en el footer
de la plantilla orden-servicio-v3-imss.html.
"""
import os
import json
import base64
import logging
from typing import Any, Dict, Optional

import httpx

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    _GENAI_AVAILABLE = False

from config import OLLAMA_HOST, GEMMA_MODEL, GEMINI_API_KEY

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# Prompt IMSS-aware. Diseñado para ser estricto: si la imagen no es
# el formato SIGAB-IMSS-OS-V3, devuelve un error explícito.
# ─────────────────────────────────────────────────────────────────
PROMPT_IMSS_OS = """Eres un OCR especializado en formatos del Instituto Mexicano del Seguro Social.
Esta imagen contiene una ORDEN DE SERVICIO del HGR No.1 IMSS Tijuana, formato SIGAB-IMSS-OS-V3.
La hoja tiene rejillas de casillas monospace (una letra/dígito por celda) y checkboxes
(▢ vacío, ✓/✗/■/X marcado).

Extrae los siguientes campos. Si un campo no es legible o está vacío, devuelve null.
NO INVENTES DATOS. Devuelve SÓLO JSON válido (sin texto antes ni después) con esta
estructura exacta:

{
  "numero_orden":         "OS-YYYYMMDD-XXXX o null",
  "fecha":                "YYYY-MM-DD o null",
  "tipo_mantenimiento":   "preventivo|correctivo|calibracion|instalacion|verificacion|baja|null",
  "prioridad":            "alta|media|baja|null",
  "equipo_serie":         "string sin espacios o null",
  "equipo_nombre":        "string o null",
  "equipo_marca":         "string o null",
  "equipo_modelo":        "string o null",
  "equipo_inventario":    "string o null",
  "ubicacion_fisica":     "string o null",
  "area":                 "string o null",
  "piso":                 "Sótano|1|2|3|4|null",
  "hora_inicio":          "HH:MM o null",
  "hora_termino":         "HH:MM o null",
  "tiempo_estimado_min":  "int o null",
  "tiempo_real_min":      "int o null",
  "descripcion_servicio": "string o null",
  "observaciones":        "string o null",
  "causa_raiz":           "string o null",
  "tecnico_nombre":       "string o null",
  "tecnico_matricula":    "string o null",
  "valida_nombre":        "string o null",
  "recibe_nombre":        "string o null",
  "recibe_servicio":      "string o null",
  "poka_yoke_validaciones": [bool, bool, bool, bool, bool],
  "refacciones": [{"cantidad": int, "descripcion": "string", "folio": "string", "tiempo_min": int}],
  "confianza_global":     0.0
}

Reglas:
- Las casillas-grid se leen carácter por carácter, izquierda a derecha.
- Los checkboxes con cualquier marca (✓, ✗, ■, X) cuentan como TRUE.
- Si la cabecera no contiene 'INSTITUTO MEXICANO DEL SEGURO SOCIAL', devuelve {"error":"no_es_formato_imss"}.
- Si NO encuentras el banner 'SIGAB-IMSS-OS-V3' al pie, devuelve confianza_global ≤ 0.5.
- confianza_global es tu propia estimación 0.0–1.0 sobre la legibilidad global.
- poka_yoke_validaciones es un array de 5 bools en orden: [QR, ubicación, causa_raíz, refacciones, regreso_operación].
- refacciones es un array (puede ser []).
"""


# ─────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────
async def extract_imss_os(imagen_bytes: bytes) -> Dict[str, Any]:
    """
    Extrae los campos de una OS IMSS desde los bytes de una imagen.

    1. Intenta primero Gemma local (privacy-preserving, on-prem).
    2. Si Gemma falla o devuelve confianza < 0.6, hace fallback a Gemini.
    3. Si ambos fallan, devuelve {"error": "extraction_failed", ...}.

    El campo `engine` indica qué motor produjo el resultado final:
      'gemma' | 'gemini' | 'fallback_failed'
    """
    b64 = base64.b64encode(imagen_bytes).decode()

    # ── 1. Gemma local ──────────────────────────────────────────────
    gemma_result = await _extract_with_gemma(b64)
    if gemma_result and not gemma_result.get("error"):
        confidence = gemma_result.get("confianza_global", 0)
        if confidence >= 0.6:
            return {"engine": "gemma", **gemma_result}
        logger.info(f"Gemma confianza baja ({confidence:.2f}), intentando Gemini")
    else:
        logger.info(f"Gemma no respondió útilmente: {gemma_result}")

    # ── 2. Gemini fallback ──────────────────────────────────────────
    if not GEMINI_API_KEY or not _GENAI_AVAILABLE:
        logger.warning("Gemini no disponible (sin API key o sin lib)")
        return gemma_result or {"error": "extraction_failed", "engine": "fallback_failed"}

    gemini_result = await _extract_with_gemini(b64)
    if gemini_result and not gemini_result.get("error"):
        return {"engine": "gemini", **gemini_result}

    # ── 3. Ambos fallaron ───────────────────────────────────────────
    return {
        "error": "extraction_failed",
        "engine": "fallback_failed",
        "details": {"gemma": gemma_result, "gemini": gemini_result},
    }


# ─────────────────────────────────────────────────────────────────
# Gemma 3:4b vía Ollama (local)
# ─────────────────────────────────────────────────────────────────
async def _extract_with_gemma(b64: str) -> Optional[Dict[str, Any]]:
    """Llama a Ollama /api/generate con el modelo Gemma 3:4b multimodal."""
    try:
        async with httpx.AsyncClient(timeout=90.0) as cli:
            r = await cli.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": GEMMA_MODEL,
                    "prompt": PROMPT_IMSS_OS,
                    "images": [b64],
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 2048},
                },
            )
        if r.status_code != 200:
            logger.warning(f"Ollama HTTP {r.status_code}: {r.text[:200]}")
            return None
        raw = r.json().get("response", "")
        return _parse_json_response(raw, "gemma")
    except httpx.TimeoutException:
        logger.warning("Gemma timeout (90s)")
        return None
    except Exception as e:
        logger.warning(f"Gemma error: {e}")
        return None


# ─────────────────────────────────────────────────────────────────
# Gemini 1.5 Flash (cloud fallback)
# ─────────────────────────────────────────────────────────────────
async def _extract_with_gemini(b64: str) -> Optional[Dict[str, Any]]:
    """Llama a Gemini 1.5 Flash con el mismo prompt."""
    if not GEMINI_API_KEY or not _GENAI_AVAILABLE:
        return None
    try:
        from PIL import Image
        import io as _io

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        img = Image.open(_io.BytesIO(base64.b64decode(b64)))
        response = model.generate_content(
            [PROMPT_IMSS_OS, img],
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
        )
        return _parse_json_response(response.text, "gemini")
    except Exception as e:
        logger.warning(f"Gemini error: {e}")
        return None


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
def _parse_json_response(raw: str, engine: str) -> Optional[Dict[str, Any]]:
    """Limpia markdown fences si los hubiera y parsea JSON."""
    if not raw:
        return None
    text = raw.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif text.startswith("```"):
        text = text.strip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"{engine} devolvió JSON inválido: {e}; raw[:200]={text[:200]}")
        return {"error": "invalid_json_response", "raw": text[:500]}


def map_to_orden_servicio(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mapea el dict extraído por el OCR a los nombres de columnas del modelo
    OrdenServicio. Filtra valores None y campos no soportados.
    """
    if not extracted or extracted.get("error"):
        return {}

    mapping = {
        "numero_orden": "numero_orden",
        "fecha": "fecha",
        "tipo_mantenimiento": "tipo_mantenimiento",
        "prioridad": "prioridad",
        "equipo_serie": "equipo_serie",
        "equipo_nombre": "equipo_nombre",
        "equipo_marca": "equipo_marca",
        "equipo_modelo": "equipo_modelo",
        "ubicacion_fisica": "ubicacion_fisica",
        "area": "area",
        "piso": "piso",
        "hora_inicio": "hora_inicio",
        "hora_termino": "hora_termino",
        "tiempo_real_min": "tiempo_real_min",
        "descripcion_servicio": "descripcion_servicio",
        "observaciones": "observaciones",
        "tecnico_nombre": "tecnico_nombre",
    }

    out: Dict[str, Any] = {}
    for src_key, dst_key in mapping.items():
        v = extracted.get(src_key)
        if v not in (None, "", []):
            out[dst_key] = v

    # falla_reportada se llena desde descripcion_servicio si no hay otra cosa
    if "descripcion_servicio" in out and "falla_reportada" not in out:
        out["falla_reportada"] = out["descripcion_servicio"]

    return out

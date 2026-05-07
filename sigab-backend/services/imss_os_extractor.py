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

Post-procesamiento (`normalize_extracted`):
  - Folio: forzar formato OS-YYYYMMDD-XXXX, corregir confusiones O/0.
  - Fecha: normalizar a YYYY-MM-DD aceptando varios formatos.
  - Horas: forzar HH:MM 24h.
  - Tipo de mantenimiento: lowercase + diccionario de sinónimos.
  - Prioridad: lowercase ASCII (alta/media/baja).
  - Serie: fuzzy match contra catálogo de equipos si está disponible.
"""
import os
import re
import json
import base64
import logging
from datetime import datetime
from difflib import get_close_matches
from typing import Any, Dict, Iterable, Optional

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
async def extract_imss_os(
    imagen_bytes: bytes,
    series_catalogo: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """
    Extrae los campos de una OS IMSS desde los bytes de una imagen.

    1. Intenta primero Gemma local (privacy-preserving, on-prem).
    2. Si Gemma falla o devuelve confianza < 0.6, hace fallback a Gemini.
    3. Si ambos fallan, devuelve {"error": "extraction_failed", ...}.
    4. Antes de retornar, aplica `normalize_extracted` (corrección de
       caracteres, fuzzy match de serie contra catálogo).

    El campo `engine` indica qué motor produjo el resultado final:
      'gemma' | 'gemini' | 'fallback_failed'
    """
    b64 = base64.b64encode(imagen_bytes).decode()

    # ── 1. Gemma local ──────────────────────────────────────────────
    gemma_result = await _extract_with_gemma(b64)
    if gemma_result and not gemma_result.get("error"):
        confidence = gemma_result.get("confianza_global", 0)
        if confidence >= 0.6:
            return normalize_extracted({"engine": "gemma", **gemma_result}, series_catalogo)
        logger.info(f"Gemma confianza baja ({confidence:.2f}), intentando Gemini")
    else:
        logger.info(f"Gemma no respondió útilmente: {gemma_result}")

    # ── 2. Gemini fallback ──────────────────────────────────────────
    if not GEMINI_API_KEY or not _GENAI_AVAILABLE:
        logger.warning("Gemini no disponible (sin API key o sin lib)")
        if gemma_result and not gemma_result.get("error"):
            return normalize_extracted({"engine": "gemma", **gemma_result}, series_catalogo)
        return {"error": "extraction_failed", "engine": "fallback_failed"}

    gemini_result = await _extract_with_gemini(b64)
    if gemini_result and not gemini_result.get("error"):
        return normalize_extracted({"engine": "gemini", **gemini_result}, series_catalogo)

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


# ─────────────────────────────────────────────────────────────────
# Post-procesamiento: corrección de caracteres y normalización de tipos
# ─────────────────────────────────────────────────────────────────

_TIPO_MANT_SYNONYMS = {
    "preventivo": "preventivo", "prev": "preventivo", "preventiva": "preventivo",
    "correctivo": "correctivo", "corr": "correctivo", "correctiva": "correctivo",
    "calibracion": "calibracion", "calibración": "calibracion", "calib": "calibracion",
    "instalacion": "instalacion", "instalación": "instalacion", "instal": "instalacion",
    "verificacion": "verificacion", "verificación": "verificacion",
    "inspeccion": "verificacion", "inspección": "verificacion",
    "baja": "baja", "decomision": "baja", "decomisión": "baja",
}

_PRIORIDAD_SYNONYMS = {
    "alta": "alta", "high": "alta", "urgente": "alta", "critica": "alta", "crítica": "alta",
    "media": "media", "medium": "media", "normal": "media",
    "baja": "baja", "low": "baja", "rutinaria": "baja",
}

_PISO_SYNONYMS = {
    "sotano": "Sótano", "sótano": "Sótano",
    "1": "1", "1er": "1", "primero": "1", "uno": "1",
    "2": "2", "2do": "2", "segundo": "2", "dos": "2",
    "3": "3", "3er": "3", "tercero": "3", "tres": "3",
    "4": "4", "4to": "4", "cuarto": "4", "cuatro": "4",
}


def _normalize_folio(folio: Optional[str]) -> Optional[str]:
    """Forzar formato OS-YYYYMMDD-XXXX. Si Gemma escribió la O del prefijo como 0, corrige."""
    if not folio or not isinstance(folio, str):
        return folio
    s = folio.upper().strip().replace(" ", "")
    # Casos comunes: '0S-...', 'OS-...', 'OS_...'
    s = re.sub(r"^0S[-_]", "OS-", s)
    s = re.sub(r"^O5[-_]", "OS-", s)
    s = s.replace("OS_", "OS-")
    m = re.match(r"^OS-(\d{8})-?(\d{1,4})$", s.replace("-", ""))
    if m:
        return f"OS-{m.group(1)}-{m.group(2).zfill(4)}"
    m = re.match(r"^OS-(\d{8})-(\d{1,4})$", s)
    if m:
        return f"OS-{m.group(1)}-{m.group(2).zfill(4)}"
    return s if s.startswith("OS-") else folio


def _normalize_fecha(fecha: Any) -> Optional[str]:
    """Acepta YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc. Retorna ISO YYYY-MM-DD."""
    if not fecha:
        return None
    s = str(fecha).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _normalize_hora(h: Any) -> Optional[str]:
    """Acepta '7:00', '07:00', '7:00 am', '15:30'. Devuelve 'HH:MM' 24h."""
    if not h:
        return None
    s = str(h).strip().lower().replace(" ", "")
    is_pm = "pm" in s
    is_am = "am" in s
    s = s.replace("am", "").replace("pm", "")
    m = re.match(r"^(\d{1,2}):?(\d{0,2})$", s)
    if not m:
        return None
    hh = int(m.group(1))
    mm = int(m.group(2)) if m.group(2) else 0
    if is_pm and hh < 12:
        hh += 12
    if is_am and hh == 12:
        hh = 0
    if 0 <= hh <= 23 and 0 <= mm <= 59:
        return f"{hh:02d}:{mm:02d}"
    return None


def _normalize_enum(value: Any, table: Dict[str, str], default: Optional[str] = None) -> Optional[str]:
    if not value:
        return default
    key = str(value).strip().lower()
    return table.get(key, default if default is not None else value)


def normalize_extracted(
    extracted: Dict[str, Any],
    series_catalogo: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """
    Aplica reglas de corrección sobre el JSON crudo del OCR.

    `series_catalogo` opcional: lista/iterable de seriales válidos del catálogo
    de equipos. Si se pasa y la serie extraída no matchea exacto, hace fuzzy
    match (cutoff 0.85) y guarda la corrección bajo el flag `_serie_corrected=True`.
    """
    if not extracted or extracted.get("error"):
        return extracted

    out = dict(extracted)

    # Folio
    if out.get("numero_orden"):
        out["numero_orden"] = _normalize_folio(out["numero_orden"])

    # Fecha
    if out.get("fecha"):
        norm_f = _normalize_fecha(out["fecha"])
        if norm_f:
            out["fecha"] = norm_f

    # Horas
    for k in ("hora_inicio", "hora_termino"):
        if out.get(k):
            norm_h = _normalize_hora(out[k])
            if norm_h:
                out[k] = norm_h

    # Tipo de mantenimiento
    if out.get("tipo_mantenimiento"):
        out["tipo_mantenimiento"] = _normalize_enum(
            out["tipo_mantenimiento"], _TIPO_MANT_SYNONYMS,
            default=str(out["tipo_mantenimiento"]).lower().strip(),
        )

    # Prioridad
    if out.get("prioridad"):
        out["prioridad"] = _normalize_enum(
            out["prioridad"], _PRIORIDAD_SYNONYMS,
            default=str(out["prioridad"]).lower().strip(),
        )

    # Piso
    if out.get("piso"):
        out["piso"] = _normalize_enum(
            out["piso"], _PISO_SYNONYMS,
            default=str(out["piso"]).strip(),
        )

    # Serie: fuzzy match contra catálogo si se entregó
    if out.get("equipo_serie") and series_catalogo:
        serie_raw = str(out["equipo_serie"]).strip().upper()
        catalogo_set = {str(s).strip().upper(): s for s in series_catalogo if s}
        if serie_raw in catalogo_set:
            out["equipo_serie"] = catalogo_set[serie_raw]
        else:
            match = get_close_matches(serie_raw, list(catalogo_set.keys()), n=1, cutoff=0.85)
            if match:
                out["equipo_serie"] = catalogo_set[match[0]]
                out["_serie_corrected"] = {
                    "from": serie_raw,
                    "to": catalogo_set[match[0]],
                    "method": "fuzzy",
                }

    # Strings: limpiar trailing spaces y N/A literal
    for k, v in list(out.items()):
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.upper() in ("N/A", "NA", "-", "—", ""):
                out[k] = None
            else:
                out[k] = stripped

    return out


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

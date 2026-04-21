import os
import time
import base64
import numpy as np
import cv2
from PIL import Image
import io
import logging
from typing import Optional, Dict, Any, Tuple

# OCR opcional: si paddleocr / google-generativeai no están instalados,
# el backend sigue arrancando y las rutas no-OCR funcionan normalmente.
try:
    from paddleocr import PaddleOCR
    _PADDLE_AVAILABLE = True
except ImportError:
    PaddleOCR = None  # type: ignore
    _PADDLE_AVAILABLE = False
    logging.warning("paddleocr no instalado — OCR deshabilitado para esta sesión.")

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    _GENAI_AVAILABLE = False
    logging.warning("google-generativeai no instalado — fallback Gemini deshabilitado.")

from config import (
    OCR_CONFIDENCE_THRESHOLD, 
    OCR_MIN_WORDS_THRESHOLD, 
    GEMINI_API_KEY
)
from models.ocr_schemas import OcrExtractionResult, OcrBlock

# Singleton para el modelo de PaddleOCR para evitar recargas
_PADDLE_INSTANCE: Optional[PaddleOCR] = None

class OcrService:
    @staticmethod
    def _get_paddle() -> PaddleOCR:
        global _PADDLE_INSTANCE
        if _PADDLE_INSTANCE is None:
            logging.info("Cargando modelo PaddleOCR (CPU)...")
            # use_angle_cls=True permite detectar texto rotado
            # lang='es' para mejor precisión en español
            _PADDLE_INSTANCE = PaddleOCR(use_angle_cls=True, lang='es', show_log=False)
        return _PADDLE_INSTANCE

    @staticmethod
    def _decode_image(image_b64: str) -> np.ndarray:
        """Decodifica base64 a imagen OpenCV (BGR)."""
        img_data = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img

    @staticmethod
    async def extract_with_paddle(image_b64: str) -> Tuple[OcrExtractionResult, float]:
        """Extrae texto localmente usando PaddleOCR."""
        start_time = time.time()
        img = OcrService._decode_image(image_b64)
        
        ocr = OcrService._get_paddle()
        result = ocr.ocr(img, cls=True)
        
        full_text = []
        blocks = []
        confidences = []
        
        # PaddleOCR entrega una lista de listas [[box, [text, conf]], ...]
        if result and result[0]:
            for line in result[0]:
                box = line[0] # [[x,y], [x,y], [x,y], [x,y]]
                text = line[1][0]
                conf = line[1][1]
                
                full_text.append(text)
                confidences.append(conf)
                blocks.append(OcrBlock(
                    text=text,
                    confidence=conf,
                    box={"points": box}
                ))
        
        avg_confidence = np.mean(confidences) if confidences else 0.0
        elapsed = (time.time() - start_time) * 1000
        
        # Heurística simple de extracción de campos (folio, fecha, serie)
        text_str = "\n".join(full_text)
        extracted = OcrService._regex_extraction(text_str)
        
        heuristic = "standard" if len(full_text) > OCR_MIN_WORDS_THRESHOLD else "empty/complex"
        
        return OcrExtractionResult(
            full_text=text_str,
            blocks=blocks,
            extracted_fields=extracted,
            model_used="paddle",
            confidence_score=avg_confidence,
            execution_time_ms=elapsed,
            heuristic_type=heuristic
        ), avg_confidence

    @staticmethod
    async def extract_with_gemini(image_b64: str) -> OcrExtractionResult:
        """Fallback: Análisis profundo con Gemini 2.5 Flash."""
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY no configurada")
        
        start_time = time.time()
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash') # Usamos 1.5 flash como el estándar actual de alta velocidad
        
        # Preparar imagen para Gemini
        img_data = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_data))
        
        prompt = """Extrae todo el texto de esta forma de mantenimiento biomédico de forma estructurada. 
        Pon especial atención en: Número de Folio, Número de Serie del equipo, Modelo, Marca y Fecha. 
        Retorna el resultado en formato JSON puro."""
        
        response = model.generate_content([prompt, img])
        text_response = response.text
        
        # Limpiar respuesta de markdown si es necesario
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        
        try:
            extracted = json.loads(text_response)
        except:
            extracted = {"raw_llm_response": text_response}
            
        elapsed = (time.time() - start_time) * 1000
        
        return OcrExtractionResult(
            full_text=response.text,
            blocks=[], # Gemini no suele dar bounding boxes por bloque de forma simple aquí
            extracted_fields=extracted,
            model_used="gemini",
            confidence_score=1.0, # Asumimos alta confianza si llegó aquí
            execution_time_ms=elapsed,
            heuristic_type="complex_fallback"
        )

    @staticmethod
    def _regex_extraction(texto: str) -> Dict[str, str]:
        """Búsqueda de patrones comunes en reportes del IMSS."""
        import re
        extracted = {}
        
        # Buscar Folio (Ejem: OS-2026-001)
        res_folio = re.search(r'(Folio|Orden|Ticket)[\s:#]*([A-Z0-9-]{4,20})', texto, re.I)
        if res_folio: extracted["folio"] = res_folio.group(2)
        
        # Buscar Serie (Ejem: S/N 123456)
        res_serie = re.search(r'(Serie|S/N|Serial)[\s:#]*([A-Z0-9]{5,25})', texto, re.I)
        if res_serie: extracted["serie"] = res_serie.group(2)

        # Buscar Modelo
        res_modelo = re.search(r'(Modelo|Mod)[\s:#]*([A-Za-z0-9\s-]{3,20})', texto, re.I)
        if res_modelo: extracted["modelo"] = res_modelo.group(2).strip()
        
        return extracted

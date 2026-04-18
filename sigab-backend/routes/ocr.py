from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import base64
import logging
from typing import Dict, Any

from auth.dependencies import get_current_user
from services.ocr_service import OcrService
from models.ocr_schemas import OcrExtractionResult, OcrRequest
from config import OCR_CONFIDENCE_THRESHOLD

router = APIRouter()

@router.post("/extract", response_model=OcrExtractionResult)
async def extract_text_from_form(
    data: OcrRequest,
    user: dict = Depends(get_current_user)
):
    """
    Endpoint principal de extracción de datos de formas de mantenimiento.
    Implementa ruteo: PaddleOCR (local) -> Gemini (cloud fallback).
    """
    try:
        # 1. Intentar con PaddleOCR (Local)
        result, confidence = await OcrService.extract_with_paddle(data.image_b64)
        
        # 2. Verificar si necesitamos fallback
        # Si la confianza es baja o el usuario fuerza el fallback
        if (confidence < OCR_CONFIDENCE_THRESHOLD or data.force_fallback):
            logging.info(f"Confianza OCR baja ({confidence:.2f}). Ejecutando fallback Gemini...")
            try:
                fallback_result = await OcrService.extract_with_gemini(data.image_b64)
                return fallback_result
            except Exception as e:
                logging.error(f"Error en fallback Gemini: {str(e)}")
                # Si falla Gemini, retornamos lo que obtuvo Paddle aunque sea de baja confianza
                return result
        
        return result

    except Exception as e:
        logging.error(f"Error crítico en pipeline OCR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando OCR: {str(e)}")

@router.post("/extract-file", response_model=OcrExtractionResult)
async def extract_from_file_upload(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Variante que acepta archivo directo (multi-part)."""
    content = await file.read()
    image_b64 = base64.b64encode(content).decode("utf-8")
    
    return await extract_text_from_form(OcrRequest(image_b64=image_b64), user)

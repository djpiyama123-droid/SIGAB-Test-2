import pytesseract
from PIL import Image
import io
import re

def parsear_reporte_ocr(image_bytes: bytes) -> dict:
    """Extrae texto usando Tesseract OCR y busca patrones de reporte físico."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        texto = pytesseract.image_to_string(image, lang='spa+eng')
        
    except Exception as e:
        return {"error": f"Error de OCR: {str(e)}", "texto": ""}

    return procesar_texto_inteligente(texto)


def procesar_texto_inteligente(texto: str) -> dict:
    """Busca folios, costos, refacciones y técnicos en el texto extraído."""
    resultado = {
        "texto_extraido": texto,
        "campos_identificados": {}
    }
    
    match_folio = re.search(r'(Folio|No\.\s*Servicio|Ticket|Orden)[\s:0-9\#]*([A-Z0-9\-]{4,12})', texto, re.IGNORECASE)
    if match_folio:
        resultado["campos_identificados"]["folio"] = match_folio.group(2)
        
    match_costo = re.search(r'(Total|Costo|Importe)[\s:\$]*([0-9]{1,3}(,[0-9]{3})*(\.[0-9]{2})?)', texto, re.IGNORECASE)
    if match_costo:
        resultado["campos_identificados"]["costo"] = match_costo.group(2)
        
    match_ref = re.search(r'(Refacciones|Piezas|Materiales|Sustituido)[\s:]*(.*?\n)', texto, re.IGNORECASE)
    if match_ref:
        resultado["campos_identificados"]["refacciones"] = match_ref.group(2).strip()

    match_tec = re.search(r'(Ingeniero|Tecnico|Técnico|Realiz[óo]|Atendió)[\s:]*([A-Za-z\s]{5,30})', texto, re.IGNORECASE)
    if match_tec:
        resultado["campos_identificados"]["ingeniero_externo"] = match_tec.group(2).strip()

    return resultado

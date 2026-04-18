from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OcrBoundingBox(BaseModel):
    points: List[List[float]] = Field(..., description="Coordenadas [x, y] del polígono del texto")

class OcrBlock(BaseModel):
    text: str
    confidence: float
    box: Optional[OcrBoundingBox] = None

class OcrExtractionResult(BaseModel):
    full_text: str
    blocks: List[OcrBlock]
    extracted_fields: Dict[str, Any] = Field(default_factory=dict)
    model_used: str = Field(..., description="paddle o gemini")
    confidence_score: float
    execution_time_ms: float
    heuristic_type: str = Field(..., description="standard o complex")

class OcrRequest(BaseModel):
    image_b64: str
    force_fallback: bool = False

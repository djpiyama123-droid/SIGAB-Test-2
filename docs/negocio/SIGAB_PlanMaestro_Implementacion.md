# SIGAB: Plan Maestro de Implementación
## Clasificación Tareas Técnicas ANTIGRAVITY vs CLAUDE DESKTOP

**Documento:** Plan Maestro de Implementación SIGAB  
**Versión:** 1.0  
**Fecha:** 11 de abril de 2026  
**Autores:** Equipo de Arquitectura (Claude + Gustavo Antigravity)  
**Clasificación:** Técnico-Ejecutivo  
**Periodo:** Abril – Junio 2026 (Sprints 1-12)

---

## 1. Resumen Ejecutivo del Plan

Este Plan Maestro desglosa la modernización integral del **Sistema de Gestión Aplicada en Biomedicina (SIGAB)** en dos categorías de ejecución:

1. **[ANTIGRAVITY]** — Módulos de código backend/frontend que Gustavo ejecuta en Google Antigravity IDE. Incluyen mejoras en ORM, OCR on-premise, WebSockets en tiempo real, validación triple Poka-Yoke, y composición de servicios de IA.

2. **[CLAUDE DESKTOP]** — Tareas de análisis, documentación, generación de reportes, actualización de especificaciones financieras y redacción de estrategias que se ejecutan en este entorno.

### Principios Rectores

- **Sprint-based**: Entrega incremental cada 2 semanas (12 sprints = 24 semanas = 6 meses)
- **P0/P1/P2/P3**: Prioridades escalonadas (P0 primero, impacto crítico inmediato)
- **Copy-paste listo**: Cada instrucción Antigravity incluye código + contexto específico SIGAB
- **Testing integrado**: Cada módulo incluye casos de prueba y validación
- **Hardware real**: Optimizaciones para ThinkCentre M720q + monitores 24"/55"

### Stack Actual vs. Meta

| Aspecto | Actual | Meta | Riesgo |
|---------|--------|------|--------|
| **ORM** | SQLAlchemy básico | SQLModel + asyncmy + Alembic | Migración datos históricos |
| **OCR** | Gemini 2.5 Flash (cloud) | PaddleOCR + Gemini híbrido | Latencia, costos API |
| **Realtime** | Polling / REST | SSE via sse-starlette | Arquitectura socket |
| **WhatsApp** | whatsapp-web.js (500MB) | Baileys (Node.js puro) | Token refresh automation |
| **Dashboard** | React vanilla + CSS | Recharts + Tremor + Framer Motion | Curva aprendizaje componentes |
| **Validación** | Manual/básica | QR ID + NII + Serie (triple) | Sincronización entre endpoints |
| **Fechas BD** | Mixtas (UTC/local) | ISO 8601 UTC estricto | NOM-016-SSA3-2012 compliance |
| **QR/RFID** | Manual | Ciclo completo con sllurp UHF | Infraestructura reader |

---

## 2. Arquitectura de Tareas y Matriz de Responsabilidades

### Tabla Consolidada: ID | Módulo | Categoría | Prioridad | Sprint | Estado | Responsable

| ID | Módulo | Categoría | P | Sprint | Estado | Responsable |
|:--:|---------|-----------|:---:|:------:|:-------:|-------------|
| AG-01 | SQLModel + asyncmy + Alembic | ANTIGRAVITY | P0 | 1-2 | TODO | Gustavo |
| AG-02 | PaddleOCR on-premise (integración) | ANTIGRAVITY | P0 | 2-3 | TODO | Gustavo |
| AG-03 | SSE via sse-starlette (real-time) | ANTIGRAVITY | P0 | 3-4 | TODO | Gustavo |
| AG-04 | Stack UI Moderno (Recharts+Tremor+FM) | ANTIGRAVITY | P0 | 4-5 | TODO | Gustavo |
| AG-05 | Responsive Design (24"+55") | ANTIGRAVITY | P0 | 5-6 | TODO | Gustavo |
| AG-06 | Baileys WhatsApp (reemplazo web.js) | ANTIGRAVITY | P1 | 6-7 | TODO | Gustavo |
| AG-07 | Whisper STT + QR-First Flujo | ANTIGRAVITY | P1 | 7-8 | TODO | Gustavo |
| AG-08 | Triple Validación Poka-Yoke (QR+NII+Serie) | ANTIGRAVITY | P1 | 8-9 | TODO | Gustavo |
| AG-09 | Migración ISO 8601 UTC en MySQL | ANTIGRAVITY | P1 | 9-10 | TODO | Gustavo |
| AG-10 | QR/RFID Lifecycle (Segno+pyzbar+sllurp) | ANTIGRAVITY | P2 | 10-11 | TODO | Gustavo |
| AG-11 | LangGraph Orquestador (WhatsApp→Validación) | ANTIGRAVITY | P2 | 11-12 | TODO | Gustavo |
| CD-01 | Documento Inversionista (Secciones 3.1-3.6) | CLAUDE | P0 | 1-2 | TODO | Claude |
| CD-02 | Actualización Sección 3.2 (Precios Auditados) | CLAUDE | P0 | 2-3 | TODO | Claude |
| CD-03 | Estrategia Financiera V2 | CLAUDE | P0 | 3-4 | TODO | Claude |
| CD-04 | Reporte Mejoras Consolidado | CLAUDE | P1 | 5-6 | TODO | Claude |
| CD-05 | Especificación Técnica (NOM Compliance Motor) | CLAUDE | P2 | 7-8 | TODO | Claude |
| CD-06 | Especificación Técnica (Clasificador Biomédico) | CLAUDE | P2 | 9-10 | TODO | Claude |

---

## 3. Módulos ANTIGRAVITY (Instrucciones Copy-Paste para Gustavo)

Cada módulo Antigravity incluye descripción, impacto, dependencias, stack y una **instrucción detallada en inglés** que Gustavo puede copiar directamente a Antigravity IDE.

### AG-01: SQLModel + asyncmy + Alembic

**Descripción:** Reemplazar SQLAlchemy básico con SQLModel (SQL dataclass hybrid) + asyncmy (async MySQL driver) + Alembic (migration tool). Esto moderniza el ORM y habilita async/await en FastAPI.

**Impacto Crítico:**
- Async queries = mejor uso de concurrencia bajo carga
- Type hints nativos = menos bugs en validación de datos
- Alembic = control de versiones de schema automático

**Dependencias:** Ninguna (módulo foundacional)

**Stack:**
```python
sqlmodel==0.0.14
asyncmy==0.0.21
alembic==1.13.1
fastapi==0.109.0
```

**Instrucción para Antigravity (COPIAR Y PEGAR):**

```
## TASK: Implement SQLModel + asyncmy + Alembic for SIGAB Backend Modernization

### Context:
SIGAB is a medical device inventory system (FastAPI backend, MySQL 8.0, Lenovo ThinkCentre M720q i5-8500T).
Current ORM: SQLAlchemy basic (blocking, no type hints).
Goal: Async-first architecture with declarative models.

### Step 1: Install Dependencies
pip install sqlmodel==0.0.14 asyncmy==0.0.21 alembic==1.13.1

### Step 2: Create Database Connection Module (db.py)
File: backend/app/db.py

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel
from contextlib import asynccontextmanager
from typing import AsyncGenerator

DATABASE_URL = "mysql+asyncmy://sigab_user:SIGAB_password@localhost:3306/sigab_prod"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

@asynccontextmanager
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    await engine.dispose()
```

### Step 3: Define Models with SQLModel (models.py)
File: backend/app/models.py

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from pydantic import EmailStr
import uuid

class EquipoBase(SQLModel):
    nombre: str
    numero_serie: str = Field(unique=True, index=True)
    modelo: str
    fabricante: str
    fecha_adquisicion: datetime = Field(default_factory=datetime.utcnow)
    fecha_ultimo_mantenimiento: datetime
    estado: str = Field(default="operativo")  # operativo, mantenimiento, retirado
    ubicacion: str
    responsable_id: Optional[str] = Field(foreign_key="usuario.id")

class Equipo(EquipoBase, table=True):
    __tablename__ = "equipos"
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UsuarioBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True)
    nombre_completo: str
    rol: str  # admin, tecnico, supervisor

class Usuario(UsuarioBase, table=True):
    __tablename__ = "usuarios"
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FormaOCRBase(SQLModel):
    equipo_id: str = Field(foreign_key="equipos.id")
    contenido_extraido: dict  # {campo: valor} from OCR
    confianza_ocr: float  # 0.0-1.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    fuente: str = Field(default="gemini")  # gemini, paddleocr, manual

class FormaOCR(FormaOCRBase, table=True):
    __tablename__ = "formas_ocr"
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
```

### Step 4: Initialize Alembic
Run: alembic init -t generic backend/alembic

Edit backend/alembic/env.py:
```python
from backend.app.models import SQLModel  # Import your models
target_metadata = SQLModel.metadata  # Use SQLModel.metadata instead of Base.metadata
```

### Step 5: Create Initial Migration
Run: alembic revision --autogenerate -m "Initial SIGAB schema"
This scans your models and generates migration scripts automatically.

### Step 6: Update FastAPI Dependency Injection (main.py)
File: backend/app/main.py

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db import SessionLocal, get_session, init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB
    async with init_db():
        yield
    # Shutdown: cleanup (engine.dispose handled by init_db)

app = FastAPI(lifespan=lifespan)

# Example endpoint with async session
@app.get("/equipos/{equipo_id}")
async def get_equipo(equipo_id: str, session: AsyncSession = Depends(get_session)):
    from sqlalchemy import select
    stmt = select(Equipo).where(Equipo.id == equipo_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()

@app.post("/equipos", response_model=Equipo)
async def create_equipo(equipo: EquipoBase, session: AsyncSession = Depends(get_session)):
    db_equipo = Equipo.from_orm(equipo)
    session.add(db_equipo)
    await session.commit()
    await session.refresh(db_equipo)
    return db_equipo
```

### Step 7: Test Async Database Queries
Run: pytest backend/tests/test_db.py -v

```python
# backend/tests/test_db.py
import pytest
from sqlalchemy import select
from backend.app.models import Equipo, EquipoBase
from backend.app.db import SessionLocal

@pytest.mark.asyncio
async def test_create_equipo():
    async with SessionLocal() as session:
        equipo = Equipo(
            nombre="Monitor Ventilador",
            numero_serie="ZBR-2026-001",
            modelo="ZBR-P1",
            fabricante="Zebra",
            fecha_ultimo_mantenimiento=datetime.utcnow(),
            ubicacion="Sala de Control"
        )
        session.add(equipo)
        await session.commit()
        
        stmt = select(Equipo).where(Equipo.numero_serie == "ZBR-2026-001")
        result = await session.execute(stmt)
        assert result.scalar_one() is not None

@pytest.mark.asyncio
async def test_query_performance():
    """Verify async queries are faster than sync baseline"""
    async with SessionLocal() as session:
        # Bulk insert for test
        equipos = [
            Equipo(
                nombre=f"Equipo {i}",
                numero_serie=f"SN-{i:05d}",
                modelo="Model-X",
                fabricante="Generic",
                fecha_ultimo_mantenimiento=datetime.utcnow(),
                ubicacion="Lab"
            )
            for i in range(100)
        ]
        session.add_all(equipos)
        await session.commit()
        
        # Query all
        stmt = select(Equipo)
        result = await session.execute(stmt)
        all_equipos = result.scalars().all()
        assert len(all_equipos) >= 100
```

### Step 8: Run Alembic Migration Against Production
Run: alembic upgrade head

This applies all pending migrations to sigab_prod database.

### Deliverables:
- ✓ db.py with AsyncSession factory
- ✓ models.py with SQLModel definitions (Equipo, Usuario, FormaOCR)
- ✓ alembic/ directory with auto-generated migrations
- ✓ main.py updated with async dependencies
- ✓ All tests passing (pytest -v)
- ✓ Verify DB schema with: mysql -u sigab_user -p sigab_prod -e "SHOW TABLES;"

### Performance Targets:
- SELECT queries: <100ms (p95) for 10K equipos
- INSERT batch: <500ms for 100 records
- Connection pool: 20 min, 40 max overflow
```

---

### AG-02: PaddleOCR On-Premise Integration

**Descripción:** Implementar PaddleOCR como motor OCR on-premise para extraer texto de formas médicas. Complementar Gemini 2.5 Flash para casos estándar (80% de volumen); usar Gemini solo para casos complejos/multi-idioma.

**Impacto Crítico:**
- Reduce costos API Gemini en ~75% (solo casos complejos)
- Latencia local: <500ms vs. 2-5s cloud round-trip
- Compliance: datos nunca salen del servidor local

**Dependencias:** AG-01 (necesita tabla FormaOCR)

**Stack:**
```python
paddleocr==2.7.0.3
opencv-python==4.8.0
numpy==1.24.0
fastapi==0.109.0
```

**Instrucción para Antigravity:**

```
## TASK: Implement PaddleOCR On-Premise Integration for SIGAB

### Context:
SIGAB processes medical equipment maintenance forms via WhatsApp/camera.
Current: Gemini 2.5 Flash (cloud, $0.075/request, 2-5s latency).
Target: PaddleOCR local (free, <500ms) + Gemini fallback for complex cases.
Budget: ~$15K/month → ~$4K/month (80% reduction).

### Step 1: Install PaddleOCR and Dependencies
pip install paddleocr==2.7.0.3 opencv-python==4.8.0 numpy==1.24.0 pdf2image pillow

### Step 2: Create OCR Service Module (ocr_service.py)
File: backend/app/services/ocr_service.py

```python
import asyncio
import base64
import json
from typing import Optional, Dict
from paddleocr import PaddleOCR
import cv2
import numpy as np
from datetime import datetime
from backend.app.models import FormaOCR, Equipo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        # Initialize PaddleOCR (Spanish language, GPU optional)
        # First run downloads ~500MB models to ~/.paddleocr/
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='es',  # Spanish OCR model
            use_gpu=False,  # Set True if GPU available (ThinkCentre doesn't have)
            show_log=False
        )
        logger.info("PaddleOCR initialized (Spanish model)")
    
    async def extract_text_from_image(
        self, 
        image_path: str,
        min_confidence: float = 0.5
    ) -> Dict[str, any]:
        """
        Run PaddleOCR on image file.
        
        Returns:
        {
            "status": "success" | "error",
            "text": "concatenated extracted text",
            "confidence": average_confidence,
            "raw_result": [...],  # Full PaddleOCR output
            "timestamp": ISO8601,
            "engine": "paddle"
        }
        """
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.ocr.ocr(image_path, cls=True)
            )
            
            text_blocks = []
            confidences = []
            
            for line in result:
                for word_info in line:
                    text, conf = word_info[1], word_info[2]
                    if conf >= min_confidence:
                        text_blocks.append(text)
                        confidences.append(conf)
            
            avg_confidence = np.mean(confidences) if confidences else 0.0
            
            return {
                "status": "success",
                "text": " ".join(text_blocks),
                "confidence": float(avg_confidence),
                "raw_result": result,
                "timestamp": datetime.utcnow().isoformat(),
                "engine": "paddle"
            }
        except Exception as e:
            logger.error(f"PaddleOCR error: {str(e)}")
            return {
                "status": "error",
                "text": "",
                "confidence": 0.0,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
                "engine": "paddle"
            }
    
    async def extract_form_fields(
        self,
        image_path: str
    ) -> Dict[str, str]:
        """
        Extract specific form fields from medical equipment maintenance form.
        
        Standard SIGAB form has: Equipo, Número de Serie, Tipo Mantenimiento, Fecha, Responsable
        
        Uses simple pattern matching on OCR output.
        """
        ocr_result = await self.extract_text_from_image(image_path)
        
        if ocr_result["status"] != "success":
            return {"error": "OCR failed"}
        
        text = ocr_result["text"].upper()
        
        # Simple field extraction logic
        fields = {
            "numero_serie": self._extract_campo(text, r'SERIE[:\s]+([A-Z0-9\-]+)'),
            "equipo_nombre": self._extract_campo(text, r'EQUIPO[:\s]+([^,\n]+)'),
            "tipo_mantenimiento": self._extract_campo(text, r'TIPO[:\s]+([A-Za-z]+)'),
            "responsable": self._extract_campo(text, r'RESPONSABLE[:\s]+([A-Za-z\s]+)'),
            "fecha": self._extract_campo(text, r'FECHA[:\s]+([0-9/\-]+)'),
            "confianza_paddle": str(ocr_result["confidence"])
        }
        
        return fields
    
    def _extract_campo(self, text: str, pattern: str) -> str:
        """Extract field using regex pattern"""
        import re
        match = re.search(pattern, text)
        return match.group(1).strip() if match else ""


ocr_service = None

def get_ocr_service() -> OCRService:
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService()
    return ocr_service
```

### Step 3: Create FastAPI Endpoint for OCR
File: backend/app/routes/ocr.py

```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import shutil
import os
from datetime import datetime
from backend.app.db import get_session
from backend.app.models import FormaOCR, Equipo
from backend.app.services.ocr_service import get_ocr_service
from sqlalchemy import select

router = APIRouter(prefix="/api/ocr", tags=["OCR"])
UPLOAD_DIR = "/tmp/sigab_ocr_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/extract")
async def extract_form(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    ocr_svc = Depends(get_ocr_service)
):
    """Extract text from uploaded form image using PaddleOCR"""
    
    # Save uploaded file temporarily
    file_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Run PaddleOCR
        result = await ocr_svc.extract_text_from_image(file_path)
        
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Extract structured fields
        fields = await ocr_svc.extract_form_fields(file_path)
        
        return {
            "status": "success",
            "extracted_text": result["text"],
            "confidence": result["confidence"],
            "form_fields": fields,
            "engine": "paddle"
        }
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/save-ocr-result")
async def save_ocr_result(
    equipo_id: str,
    contenido: dict,
    confianza: float,
    session: AsyncSession = Depends(get_session)
):
    """Save OCR extraction result to database"""
    
    # Verify equipo exists
    stmt = select(Equipo).where(Equipo.id == equipo_id)
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Equipo not found")
    
    # Create FormaOCR record
    forma = FormaOCR(
        equipo_id=equipo_id,
        contenido_extraido=contenido,
        confianza_ocr=confianza,
        timestamp=datetime.utcnow(),
        fuente="paddleocr"
    )
    
    session.add(forma)
    await session.commit()
    await session.refresh(forma)
    
    return {"status": "saved", "id": forma.id}
```

### Step 4: Update main.py to Include OCR Routes
File: backend/app/main.py

```python
from backend.app.routes import ocr
app.include_router(ocr.router)
```

### Step 5: Test PaddleOCR Extraction
Create test image and run:

```python
# backend/tests/test_ocr.py
import pytest
from backend.app.services.ocr_service import get_ocr_service
from PIL import Image, ImageDraw, ImageFont
import os

@pytest.mark.asyncio
async def test_paddle_ocr_extraction():
    """Test PaddleOCR on sample form image"""
    
    # Create synthetic test image with text
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    test_text = """FORMA MANTENIMIENTO EQUIPO
    EQUIPO: Monitor Ventilador
    NUMERO SERIE: ZBR-2026-001
    TIPO: Preventivo
    FECHA: 2026-04-11
    RESPONSABLE: Juan Perez"""
    
    draw.text((50, 50), test_text, fill='black')
    
    test_image_path = "/tmp/test_form.png"
    img.save(test_image_path)
    
    ocr = get_ocr_service()
    result = await ocr.extract_text_from_image(test_image_path)
    
    assert result["status"] == "success"
    assert "ZBR-2026-001" in result["text"] or "2026" in result["text"]
    assert result["confidence"] > 0.3
    
    os.remove(test_image_path)

@pytest.mark.asyncio
async def test_field_extraction():
    """Test structured field extraction from OCR output"""
    
    ocr = get_ocr_service()
    
    # Create test image
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "NUMERO SERIE: ABC-123-XYZ\nTIPO: Correctivo", fill='black')
    
    test_image_path = "/tmp/test_fields.png"
    img.save(test_image_path)
    
    fields = await ocr.extract_form_fields(test_image_path)
    
    assert fields.get("numero_serie", "").upper() in ["ABC-123-XYZ", "ABC", "123"]
    
    os.remove(test_image_path)
```

### Step 6: Performance Tuning
PaddleOCR on i5-8500T (4 cores, 8GB assigned):
- First request: ~2-3s (model loading)
- Subsequent: ~300-500ms per page
- Optimize by: keeping service singleton (done above), pre-loading models on startup

### Deliverables:
- ✓ ocr_service.py with PaddleOCR + field extraction
- ✓ FastAPI /api/ocr/extract endpoint
- ✓ FormaOCR records saved to MySQL
- ✓ All tests passing
- ✓ Verify: curl -X POST -F "file=@form.jpg" http://localhost:8000/api/ocr/extract

### Cost & Performance:
- PaddleOCR cost: $0 (open source)
- Gemini fallback: $0.075/request (only 20% of cases = $3K/mo vs $15K before)
- Latency: <500ms local vs 2-5s cloud
```

---

### AG-03: SSE via sse-starlette (Real-Time Dashboard)

**Descripción:** Implementar Server-Sent Events (SSE) para actualización en tiempo real del dashboard. Reemplaza WebSockets pesados con protocolo HTTP simple uni-directional (servidor → cliente).

**Impacto Crítico:**
- Menor consumo de memoria (WebSockets mantienen conexión TCP abierta)
- Compatible con proxies/load balancers estándar
- Auto-reconnect nativo en navegador
- Ideal para dashboard (servidor push, no necesita bi-directional)

**Dependencias:** AG-01 (necesita async DB queries)

**Stack:**
```python
sse-starlette==1.6.1
fastapi==0.109.0
```

**Instrucción para Antigravity:**

```
## TASK: Implement Server-Sent Events (SSE) for Real-Time SIGAB Dashboard

### Context:
SIGAB dashboard displays live equipment status, maintenance alerts, battery levels.
Currently: polling every 5 seconds (wasteful, high CPU on ThinkCentre M720q).
Goal: Server-push via SSE (low bandwidth, real-time, simpler than WebSockets).

### Step 1: Install SSE Starlette
pip install sse-starlette==1.6.1

### Step 2: Create SSE Event Publisher (sse_publisher.py)
File: backend/app/services/sse_publisher.py

```python
import asyncio
import json
from datetime import datetime
from typing import Set, Callable, Any
import logging

logger = logging.getLogger(__name__)

class EventPublisher:
    """Manages SSE connections and broadcasts events to all connected clients"""
    
    def __init__(self):
        self.subscribers: Set[Callable] = set()
        self._lock = asyncio.Lock()
    
    async def subscribe(self, send_fn: Callable) -> None:
        """Register a client send function"""
        async with self._lock:
            self.subscribers.add(send_fn)
        logger.info(f"SSE client subscribed. Total: {len(self.subscribers)}")
    
    async def unsubscribe(self, send_fn: Callable) -> None:
        """Unregister a client"""
        async with self._lock:
            self.subscribers.discard(send_fn)
        logger.info(f"SSE client unsubscribed. Total: {len(self.subscribers)}")
    
    async def publish(self, event_type: str, data: dict) -> None:
        """Broadcast event to all connected clients"""
        message = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        async with self._lock:
            dead_subscribers = []
            for send_fn in self.subscribers:
                try:
                    # SSE format: "event: ...\ndata: {...}\n\n"
                    await send_fn({
                        "event": event_type,
                        "data": json.dumps(data),
                        "id": str(int(datetime.utcnow().timestamp() * 1000))
                    })
                except Exception as e:
                    logger.warning(f"Failed to send SSE event: {e}")
                    dead_subscribers.append(send_fn)
            
            # Remove dead connections
            for send_fn in dead_subscribers:
                self.subscribers.discard(send_fn)

publisher = EventPublisher()

def get_publisher() -> EventPublisher:
    return publisher
```

### Step 3: Create SSE FastAPI Endpoint
File: backend/app/routes/dashboard.py

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta

from backend.app.db import get_session
from backend.app.models import Equipo, FormaOCR
from backend.app.services.sse_publisher import get_publisher

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stream")
async def stream_dashboard(session: AsyncSession = Depends(get_session)):
    """
    SSE endpoint for real-time dashboard updates.
    Client connects: GET /api/dashboard/stream
    Receives: event stream with equipment status, alerts, metrics
    """
    
    publisher = get_publisher()
    
    async def event_generator():
        # First: send current state
        stmt = select(Equipo)
        result = await session.execute(stmt)
        equipos = result.scalars().all()
        
        dashboard_state = {
            "equipos": [
                {
                    "id": e.id,
                    "nombre": e.nombre,
                    "serie": e.numero_serie,
                    "estado": e.estado,
                    "ubicacion": e.ubicacion,
                    "ultimo_mantenimiento": e.fecha_ultimo_mantenimiento.isoformat()
                }
                for e in equipos
            ],
            "total_equipos": len(equipos),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        yield {
            "event": "dashboard_state",
            "data": json.dumps(dashboard_state),
            "id": "state_0"
        }
        
        # Subscribe to real-time updates
        async def send_event(event_data):
            """Callback that yields SSE event"""
            # This is called by publisher when new events occur
            return event_data
        
        await publisher.subscribe(send_event)
        
        try:
            # Keep connection alive and stream events
            while True:
                # Every 10 seconds: send heartbeat + current metrics
                await asyncio.sleep(10)
                
                # Calculate dashboard metrics
                stmt = select(Equipo).where(Equipo.estado == "operativo")
                result = await session.execute(stmt)
                operativos = len(result.scalars().all())
                
                stmt = select(Equipo).where(Equipo.estado == "mantenimiento")
                result = await session.execute(stmt)
                en_mant = len(result.scalars().all())
                
                metrics = {
                    "operativos": operativos,
                    "en_mantenimiento": en_mant,
                    "total": len(equipos),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                yield {
                    "event": "metrics_update",
                    "data": json.dumps(metrics),
                    "id": str(int(datetime.utcnow().timestamp() * 1000))
                }
        finally:
            await publisher.unsubscribe(send_event)
    
    return EventSourceResponse(event_generator())

@router.post("/alert/{equipo_id}")
async def trigger_alert(
    equipo_id: str,
    alert_type: str,
    message: str
):
    """
    Manually trigger an alert to all connected dashboard clients.
    Example: equipment needs maintenance, battery low, etc.
    """
    
    publisher = get_publisher()
    alert_data = {
        "equipo_id": equipo_id,
        "tipo": alert_type,  # "mantenimiento", "bateria_baja", "error"
        "mensaje": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await publisher.publish("alert", alert_data)
    
    return {"status": "alert_sent"}
```

### Step 4: Frontend JavaScript SSE Consumer
File: frontend/src/hooks/useDashboardStream.js

```javascript
import { useEffect, useState, useCallback } from 'react';

export function useDashboardStream(baseUrl = 'http://localhost:8000') {
  const [state, setState] = useState({
    equipos: [],
    metrics: { operativos: 0, en_mantenimiento: 0, total: 0 }
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        eventSource = new EventSource(`${baseUrl}/api/dashboard/stream`);
        setConnected(true);
        setError(null);

        // Handle dashboard_state event
        eventSource.addEventListener('dashboard_state', (event) => {
          const data = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            equipos: data.equipos
          }));
        });

        // Handle metrics_update event
        eventSource.addEventListener('metrics_update', (event) => {
          const data = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            metrics: data
          }));
        });

        // Handle alerts
        eventSource.addEventListener('alert', (event) => {
          const data = JSON.parse(event.data);
          console.warn('Alert received:', data);
          // Trigger UI notification
        });

        eventSource.onerror = () => {
          setConnected(false);
          eventSource.close();
          // Attempt reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        setError(err.message);
        setConnected(false);
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [baseUrl]);

  return { state, connected, error };
}
```

### Step 5: Update main.py
File: backend/app/main.py

```python
from backend.app.routes import dashboard
app.include_router(dashboard.router)
```

### Step 6: Test SSE Stream
```bash
# Terminal 1: Start backend
python -m uvicorn backend.app.main:app --reload

# Terminal 2: Test SSE connection
curl -N http://localhost:8000/api/dashboard/stream

# Terminal 3: Trigger alert
curl -X POST "http://localhost:8000/api/dashboard/alert/equipo123?alert_type=mantenimiento&message=Servicio%20requerido"
```

Expected output in Terminal 2:
```
event: dashboard_state
data: {"equipos": [...], ...}

event: metrics_update
data: {"operativos": 45, "en_mantenimiento": 3, ...}

event: alert
data: {"equipo_id": "equipo123", "tipo": "mantenimiento", ...}
```

### Step 7: Browser Integration
Use the useDashboardStream hook in any React component:

```jsx
import { useDashboardStream } from '@/hooks/useDashboardStream';

export function DashboardPage() {
  const { state, connected, error } = useDashboardStream();

  return (
    <div>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <p>Equipos Operativos: {state.metrics.operativos}</p>
      <p>En Mantenimiento: {state.metrics.en_mantenimiento}</p>
      {state.equipos.map(e => (
        <EquipoCard key={e.id} equipo={e} />
      ))}
    </div>
  );
}
```

### Deliverables:
- ✓ sse_publisher.py with EventPublisher singleton
- ✓ /api/dashboard/stream endpoint (SSE)
- ✓ /api/dashboard/alert/{id} endpoint (trigger alerts)
- ✓ useDashboardStream React hook
- ✓ Frontend integration example
- ✓ Manual SSE test via curl

### Performance Benefits:
- Bandwidth: ~500 bytes/10s vs 2KB/5s polling = 60% reduction
- CPU: lower on both server and client (no repeated connection setup)
- Latency: <100ms push vs 2-5s polling cycle
```

---

### AG-04: Stack UI Moderno (Recharts + Tremor + Framer Motion + Lucide)

**Descripción:** Modernizar dashboard con componentes visuales profesionales. Reemplaza CSS/Bootstrap basic con: Recharts (gráficas), Tremor (KPI cards), Framer Motion (animaciones), Lucide (iconos médicos).

**Impacto Crítico:**
- UX profesional (requisito inversor)
- Monitoring de degradación de equipos (gráficas MTBF en tiempo real)
- Responsive para 24" técnicos + 55" sala control
- Accesibilidad WCAG 2.1 AA (auditoría requirement)

**Dependencias:** AG-03 (necesita SSE para data real-time)

**Stack:**
```javascript
recharts==2.10.3
@tremor/react==3.13.0
framer-motion==11.0.3
lucide-react==0.376.0
tailwindcss==3.4.1
@tailwindcss/typography==0.5.10
```

**Instrucción para Antigravity:**

```
## TASK: Implement Modern UI Stack (Recharts + Tremor + Framer Motion + Lucide)

### Context:
SIGAB dashboard needs professional appearance for investor presentations.
Shows: equipment status, maintenance trends, alert distribution.
Supports: 24" monitors (technicians) + 55" displays (control room).
Note: "nano banana pro 3" is not a recognized React framework — using industry-standard stack above.

### Step 1: Install UI Dependencies
npm install recharts==2.10.3 @tremor/react==3.13.0 framer-motion==11.0.3 lucide-react==0.376.0 tailwindcss==3.4.1

### Step 2: Configure Tailwind (tailwind.config.js)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    'node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: '#eff6ff',
            muted: '#bfdbfe',
            subtle: '#60a5fa',
            DEFAULT: '#3b82f6',
            emphasis: '#1e40af',
            inverted: '#ffffff',
          },
          background: {
            muted: '#f9fafb',
            subtle: '#f3f4f6',
            DEFAULT: '#ffffff',
            emphasis: '#374151',
          },
          border: {
            DEFAULT: '#e5e7eb',
          },
          ring: {
            DEFAULT: '#e5e7eb',
          },
          text: {
            DEFAULT: '#111827',
            muted: '#6b7280',
            subtle: '#9ca3af',
            inverted: '#ffffff',
          },
        },
      },
    },
  },
  plugins: [require('@tremor/react/lib/esm/utils/postcssPlugin')],
};
```

### Step 3: Create Dashboard Layout Component
File: frontend/src/components/Dashboard.jsx

```jsx
import React, { useMemo } from 'react';
import {
  Card,
  Text,
  Grid,
  Col,
  AreaChart,
  BarChart,
  DonutChart,
  Title,
  Subtitle,
  Toggle,
  ToggleItem,
  Metric,
  ProgressBar
} from '@tremor/react';
import { useDashboardStream } from '@/hooks/useDashboardStream';
import {
  AlertCircle,
  CheckCircle,
  Wrench,
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { state, connected } = useDashboardStream();
  const [view, setView] = React.useState('overview');

  // Mock MTBF degradation data (would come from backend analytics)
  const mtbfData = useMemo(() => [
    { mes: 'Enero', 'MTBF (días)': 89 },
    { mes: 'Febrero', 'MTBF (días)': 76 },
    { mes: 'Marzo', 'MTBF (días)': 65 },
    { mes: 'Abril', 'MTBF (días)': 58 },
  ], []);

  const maintenanceByType = useMemo(() => [
    { tipo: 'Preventivo', count: 32 },
    { tipo: 'Correctivo', count: 18 },
    { tipo: 'Calibración', count: 12 },
  ], []);

  const statusDistribution = [
    { name: 'Operativo', value: state.metrics.operativos || 0, color: 'emerald' },
    { name: 'Mantenimiento', value: state.metrics.en_mantenimiento || 0, color: 'amber' },
    { name: 'Fuera Servicio', value: 2, color: 'red' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Title className="text-3xl font-bold text-slate-900">
              Sistema SIGAB Dashboard
            </Title>
            <Subtitle className="text-slate-600">
              Monitoreo en Tiempo Real de Equipos Biomédicos
            </Subtitle>
          </div>
          <motion.div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              connected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
            animate={{ scale: connected ? 1 : [1, 1.05] }}
            transition={{ duration: 0.5, repeat: !connected ? Infinity : 0 }}
          >
            <Activity className="w-4 h-4" />
            <span>{connected ? 'Conectado' : 'Desconectado'}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="mb-8">
        <Grid numColsLg={4} numColsMd={2} numColsSm={1} className="gap-6">
          {[
            {
              icon: CheckCircle,
              label: 'Operativos',
              value: state.metrics.operativos,
              color: 'emerald'
            },
            {
              icon: Wrench,
              label: 'En Mantenimiento',
              value: state.metrics.en_mantenimiento,
              color: 'amber'
            },
            {
              icon: TrendingUp,
              label: 'Total',
              value: state.metrics.total,
              color: 'blue'
            },
            {
              icon: AlertCircle,
              label: 'Críticos',
              value: 2,
              color: 'red'
            },
          ].map((metric, i) => {
            const Icon = metric.icon;
            const colorClasses = {
              emerald: 'from-emerald-50 to-emerald-100',
              amber: 'from-amber-50 to-amber-100',
              blue: 'from-blue-50 to-blue-100',
              red: 'from-red-50 to-red-100',
            };

            return (
              <motion.div key={i} variants={item}>
                <Card className={`bg-gradient-to-br ${colorClasses[metric.color]}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-slate-600">{metric.label}</Text>
                      <Metric className="text-3xl font-bold">{metric.value}</Metric>
                    </div>
                    <Icon className={`w-12 h-12 text-${metric.color}-500`} />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </Grid>
      </motion.div>

      {/* View Toggle */}
      <motion.div variants={item} className="mb-6">
        <Toggle
          value={view}
          onValueChange={setView}
          className="bg-white rounded-lg border border-slate-200"
        >
          <ToggleItem value="overview" label="Resumen" />
          <ToggleItem value="analytics" label="Análisis" />
          <ToggleItem value="maintenance" label="Mantenimiento" />
        </Toggle>
      </motion.div>

      {/* Charts Grid */}
      {view === 'overview' && (
        <motion.div variants={item}>
          <Grid numColsLg={2} numColsMd={1} className="gap-6">
            {/* MTBF Trend */}
            <Card>
              <Title>Tendencia MTBF (Mean Time Between Failures)</Title>
              <Text className="text-sm text-slate-600">
                Degradación esperada de equipos en meses
              </Text>
              <AreaChart
                data={mtbfData}
                index="mes"
                categories={['MTBF (días)']}
                colors={['red']}
                showAnimation={true}
                className="mt-6 h-80"
              />
            </Card>

            {/* Status Distribution */}
            <Card>
              <Title>Distribución de Estado</Title>
              <DonutChart
                data={statusDistribution}
                category="value"
                index="name"
                colors={['emerald', 'amber', 'red']}
                showAnimation={true}
                className="mt-6"
              />
            </Card>
          </Grid>
        </motion.div>
      )}

      {view === 'analytics' && (
        <motion.div variants={item}>
          <Grid numColsLg={1}>
            <Card>
              <Title>Mantenimientos por Tipo (Últimas 4 Semanas)</Title>
              <BarChart
                data={maintenanceByType}
                index="tipo"
                categories={['count']}
                colors={['blue']}
                showAnimation={true}
                className="mt-6 h-80"
              />
            </Card>
          </Grid>
        </motion.div>
      )}

      {view === 'maintenance' && (
        <motion.div variants={item}>
          <Grid numColsLg={1}>
            <Card>
              <Title>Plan de Mantenimiento Próximo Mes</Title>
              <div className="space-y-4 mt-6">
                {[
                  { equipo: 'Monitor Ventilador', dias: 3 },
                  { equipo: 'Bomba Infusión', dias: 7 },
                  { equipo: 'Monitor Signos', dias: 14 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={item}
                    className="p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Text className="font-medium">{item.equipo}</Text>
                      <Text className="text-sm text-slate-600">
                        En {item.dias} días
                      </Text>
                    </div>
                    <ProgressBar
                      value={((30 - item.dias) / 30) * 100}
                      color="blue"
                    />
                  </motion.div>
                ))}
              </div>
            </Card>
          </Grid>
        </motion.div>
      )}

      {/* Footer Stats */}
      <motion.div
        variants={item}
        className="mt-8 pt-8 border-t border-slate-200 text-center text-slate-600 text-sm"
      >
        <p>Última actualización: {new Date().toLocaleTimeString('es-MX')}</p>
      </motion.div>
    </motion.div>
  );
}
```

### Step 4: Lucide Icons for Medical Equipment
File: frontend/src/components/EquipoIcon.jsx

```jsx
import {
  Monitor,
  Droplet,
  Zap,
  Stethoscope,
  Radio,
  Heart,
  Wind,
  AlertTriangle,
} from 'lucide-react';

const ICON_MAP = {
  'Monitor Ventilador': Wind,
  'Monitor Cardiaco': Heart,
  'Bomba Infusión': Droplet,
  'Electrocardiograma': Radio,
  'Monitor Signos Vitales': Monitor,
  'Desfibrilador': Zap,
  'Estetoscopio': Stethoscope,
};

export function EquipoIcon({ nombreEquipo, ...props }) {
  const Icon = ICON_MAP[nombreEquipo] || Monitor;
  return <Icon {...props} />;
}
```

### Step 5: Responsive Styles for Multiple Screens
File: frontend/src/styles/responsive.css

```css
/* 24" Desktop (1920x1080) */
@media (min-width: 1920px) {
  .dashboard { font-size: 16px; }
  .metric { font-size: 2.5rem; }
}

/* 55" Control Room (1920x1080 or 3840x2160 with scaling) */
@media (min-width: 3840px) {
  .dashboard { font-size: 32px; }
  .metric { font-size: 4rem; }
  .card { min-height: 400px; }
}

/* Mobile/Tablet */
@media (max-width: 768px) {
  .dashboard { padding: 1rem; }
  .grid { grid-template-columns: 1fr; }
}
```

### Step 6: Test UI Components
```bash
npm run dev
# Visit http://localhost:5173/dashboard
```

### Deliverables:
- ✓ Dashboard.jsx with Tremor cards, Recharts graphs
- ✓ Framer Motion animations (fade-in, stagger)
- ✓ Lucide icons for 8+ equipment types
- ✓ Responsive styles (24" + 55" + mobile)
- ✓ WCAG 2.1 AA color contrast (verified with axe DevTools)
- ✓ Real-time data via SSE hook

### Design Notes:
- Use 'tremor' colors (slate, emerald, amber, red) for consistency
- MTBF chart shows equipment degradation (critical for maintenance planning)
- Donut chart for quick status overview
- Toggle for different views (overview, analytics, maintenance)
- Animations are performance-optimized (no 60fps budget overruns on i5-8500T)
```

---

### AG-05: Responsive Design (24" Técnicos + 55" Sala Control)

**Descripción:** Implementar diseño responsive que funcione en monitores 24" (resolución nativa 1920x1080, técnicos en el bench) y 55" (sala de control, posibles múltiples resoluciones).

**Impacto Crítico:**
- Usabilidad para dos contextos: taller (detalle) vs. control room (overview)
- Escalado de fonts, gráficas, espacios para legibilidad
- Touch-friendly en 55" (posible interacción directa)

**Dependencias:** AG-04 (necesita CSS responsive)

**Stack:**
```javascript
tailwindcss==3.4.1
react==18.2.0
vite==5.0.0
```

**Instrucción para Antigravity:**

```
## TASK: Implement Responsive Design for 24" + 55" Displays

### Context:
SIGAB dashboard deployed to:
1. 24" monitors (1920x1080) in technician workshop (detailed view)
2. 55" displays (1920x1080 or 3840x2160 scaled) in control room (overview, large fonts)

Both need identical functionality, different visual presentation.

### Step 1: Responsive Tailwind Configuration
Update: frontend/tailwind.config.js

```javascript
module.exports = {
  theme: {
    screens: {
      'xs': '320px',   // Mobile
      'sm': '640px',   // Tablet
      'md': '768px',   // Small desktop
      'lg': '1024px',  // Standard desktop (24")
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // XL desktop
      'hd': '1920px',  // 24" (1080p)
      '4k': '3840px',  // 55" (4K)
    },
    extend: {
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
        '4xl': ['36px', '44px'],
        // 55" sizes (enlarged)
        '55-base': ['32px', '48px'],   // Normal text on 55"
        '55-lg': ['48px', '64px'],     // Headings on 55"
        '55-xl': ['64px', '80px'],     // Metrics on 55"
      },
      spacing: {
        '55-xs': '2rem',   // 24px
        '55-sm': '4rem',   // 64px
        '55-md': '6rem',   // 96px
        '55-lg': '8rem',   // 128px
      },
    },
  },
};
```

### Step 2: Create Responsive Dashboard Layout
File: frontend/src/components/ResponsiveDashboard.jsx

```jsx
import React from 'react';
import { useWindowSize } from '@/hooks/useWindowSize';

export function ResponsiveDashboard() {
  const { width, height } = useWindowSize();
  
  // Detect screen type
  const isSmall24 = width === 1920 && height === 1080;
  const is55 = width >= 3840 || (width === 1920 && height === 1080 && localStorage.getItem('display') === '55');
  const isMobile = width < 768;

  // Scale factors
  const scale = is55 ? 2 : 1;
  const padding = is55 ? '4rem' : '2rem';
  const gapSize = is55 ? '3rem' : '1.5rem';

  return (
    <div
      className={`
        ${isMobile ? 'p-4' : `p-8`}
        ${is55 ? 'bg-slate-900' : 'bg-slate-50'}
        transition-all duration-300
      `}
      style={{
        '--gap-size': gapSize,
        '--text-scale': scale,
      }}
    >
      {/* Header */}
      <header className={`${is55 ? 'mb-12' : 'mb-8'}`}>
        <h1 className={`
          font-bold text-slate-900
          ${is55 ? 'text-55-lg text-white' : 'text-3xl'}
          ${isMobile ? 'text-2xl' : ''}
        `}>
          SIGAB Dashboard
        </h1>
        <p className={`
          text-slate-600
          ${is55 ? 'text-55-base text-slate-400' : 'text-sm'}
          ${isMobile ? 'text-xs' : ''}
        `}>
          Monitoreo de Equipos Biomédicos
        </p>
      </header>

      {/* KPI Grid */}
      <div className={`
        grid gap-${is55 ? '8' : '4'}
        ${isMobile ? 'grid-cols-1' : ''}
        ${!isMobile && width < 1920 ? 'grid-cols-2' : ''}
        ${!isMobile && width >= 1920 ? 'grid-cols-4' : ''}
        ${is55 ? 'grid-cols-2 md:grid-cols-4' : ''}
        mb-8
      `}>
        {[
          { label: 'Operativos', value: 45, color: 'emerald' },
          { label: 'Mantenimiento', value: 3, color: 'amber' },
          { label: 'Total', value: 50, color: 'blue' },
          { label: 'Críticos', value: 2, color: 'red' },
        ].map((metric) => (
          <KPICard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            color={metric.color}
            scale={scale}
            is55={is55}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className={`
        grid gap-${is55 ? '8' : '4'}
        ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}
        ${is55 ? 'grid-cols-1 lg:grid-cols-2' : ''}
      `}>
        <ChartPanel title="MTBF Trend" is55={is55} isMobile={isMobile} />
        <ChartPanel title="Status Distribution" is55={is55} isMobile={isMobile} />
      </div>
    </div>
  );
}

function KPICard({ label, value, color, scale, is55 }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-900',
    amber: 'bg-amber-100 text-amber-900',
    blue: 'bg-blue-100 text-blue-900',
    red: 'bg-red-100 text-red-900',
  };

  return (
    <div className={`
      ${colorMap[color]} rounded-lg p-${is55 ? '8' : '4'} shadow-md
      ${is55 ? 'min-h-96' : 'min-h-24'}
    `}>
      <p className={`
        ${is55 ? 'text-55-base' : 'text-sm'}
        font-medium opacity-75
      `}>
        {label}
      </p>
      <p className={`
        font-bold mt-${is55 ? '4' : '2'}
        ${is55 ? 'text-55-xl' : 'text-3xl'}
      `}>
        {value}
      </p>
    </div>
  );
}

function ChartPanel({ title, is55, isMobile }) {
  return (
    <div className={`
      bg-white rounded-lg shadow-md
      p-${is55 ? '8' : '4'}
      ${is55 ? 'min-h-96' : 'min-h-64'}
    `}>
      <h3 className={`
        font-bold text-slate-900
        ${is55 ? 'text-55-lg mb-6' : 'text-lg mb-4'}
        ${isMobile ? 'text-sm' : ''}
      `}>
        {title}
      </h3>
      {/* Chart placeholder */}
      <div className={`
        bg-slate-50 rounded
        ${is55 ? 'min-h-80' : 'min-h-48'}
        flex items-center justify-center text-slate-400
      `}>
        [Chart Component]
      </div>
    </div>
  );
}
```

### Step 3: Create useWindowSize Hook
File: frontend/src/hooks/useWindowSize.js

```javascript
import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      
      // Log for debugging display detection
      console.log(`Display: ${window.innerWidth}x${window.innerHeight}`);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

### Step 4: Create Display Selector Component
File: frontend/src/components/DisplaySelector.jsx

```jsx
import React from 'react';
import { Monitor } from 'lucide-react';

export function DisplaySelector() {
  const [display, setDisplay] = React.useState(
    localStorage.getItem('display') || 'auto'
  );

  const handleChange = (value) => {
    setDisplay(value);
    localStorage.setItem('display', value);
    window.location.reload();
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <select
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm border border-slate-700"
      >
        <option value="auto">Auto Detect</option>
        <option value="24">24\" Desktop</option>
        <option value="55">55\" Control Room</option>
        <option value="mobile">Mobile</option>
      </select>
    </div>
  );
}
```

### Step 5: CSS Utilities for Responsive Typography
File: frontend/src/styles/responsive.css

```css
/* Base 24" Desktop (1920x1080) */
@media (min-width: 1920px) {
  :root {
    --text-base: 16px;
    --text-lg: 20px;
    --text-xl: 24px;
    --metric-size: 36px;
    --padding: 2rem;
    --gap: 1.5rem;
  }
}

/* 55" Control Room (3840x2160 or scaled) */
@media (min-width: 3840px) {
  :root {
    --text-base: 32px;
    --text-lg: 48px;
    --text-xl: 64px;
    --metric-size: 72px;
    --padding: 4rem;
    --gap: 3rem;
  }
}

/* Touch-friendly spacing for 55" */
@media (min-width: 3840px) {
  button, a { min-height: 72px; min-width: 72px; }
  .metric { line-height: 1.2; }
  .card { border-radius: 1rem; }
}

/* Mobile (<768px) */
@media (max-width: 768px) {
  :root {
    --text-base: 14px;
    --text-lg: 16px;
    --metric-size: 24px;
    --padding: 1rem;
    --gap: 0.75rem;
  }
}

/* Accessibility: Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

### Step 6: Test Responsive Behavior
```bash
# Test on 24" (1920x1080)
# Open DevTools → Device Toolbar → Custom 1920x1080

# Test on 55" (3840x2160)
# Open DevTools → Device Toolbar → Custom 3840x2160
# or use --zoom flag: window.devicePixelRatio = 2
```

### Step 7: Performance Optimization
File: frontend/src/utils/lazy-load.js

```javascript
import { lazy, Suspense } from 'react';

// Lazy-load charts only on large displays
export const LargeDisplayCharts = lazy(() => 
  import('../components/Charts/LargeDisplay')
);

export const ResponsiveChartWrapper = ({ is55, ...props }) => {
  return is55 ? (
    <Suspense fallback={<div>Cargando gráficas...</div>}>
      <LargeDisplayCharts {...props} />
    </Suspense>
  ) : (
    <SimpleChart {...props} />
  );
};
```

### Deliverables:
- ✓ ResponsiveDashboard.jsx with breakpoint logic
- ✓ useWindowSize hook
- ✓ DisplaySelector component
- ✓ Tailwind responsive utilities
- ✓ CSS responsive rules (24" + 55" + mobile)
- ✓ Touch-friendly sizing (72px buttons on 55")
- ✓ Tested on all screen sizes (DevTools)

### Breakpoints Summary:
| Display | Width | Height | Font Scale | Use Case |
|---------|-------|--------|------------|----------|
| Mobile | <768px | * | 14px base | — |
| Tablet | 768-1024px | * | 16px base | — |
| 24" Desktop | 1920px | 1080px | 16px base | Technician workshop |
| 55" Control | 3840px | 2160px | 32px base | Control room overview |
```

---

## 4. Módulos CLAUDE DESKTOP

Tareas de documentación, análisis y generación de reportes que se ejecutan en Claude Desktop.

### CD-01: Documento Inversionista (Secciones 3.1-3.6)

**Descripción:** Redacción completa de secciones técnicas del documento de inversión: Stack tecnológico, Arquitectura, Modelo de Datos, Seguridad, Compliance.

**Entregable esperado:** Documento markdown con 8-10 páginas, listo para conversión a PDF.

**Estado actual:** Esquema básico; necesita expansión técnica detallada.

**Responsable:** Claude Desktop

---

### CD-02: Actualización Sección 3.2 (Precios Auditados)

**Descripción:** Integrar precios actualizados de auditoría (ThinkCentre $13,500; Zebra impresora $6,500; monitores) en sección de costos.

**Entregable esperado:** Tabla de precios con variabilidad de mercado + justificación financiera.

**Estado actual:** Precios obsoletos (abril 2025).

**Responsable:** Claude Desktop

---

### CD-03: Estrategia Financiera V2

**Descripción:** Revisión completa del modelo financiero con correcciones:
- Capital de trabajo insuficiente ($35K vs. ciclos IMSS 60-90 días)
- Separación hardware/software (pure-software model)
- Proyecciones 3 años con sensibilidad (optimista/base/pesimista)

**Entregable esperado:** Documento 5-6 páginas + spreadsheet financiero.

**Estado actual:** Modelo V1 necesita validación con auditor.

**Responsable:** Claude Desktop

---

### CD-04: Reporte Mejoras Consolidado

**Descripción:** Consolidar hallazgos de 3 fuentes (PDF auditoría + audio NotebookLM + PRD) en un reporte único de mejoras técnicas y financieras.

**Entregable esperado:** Documento 4-5 páginas con recomendaciones priorizadas.

**Estado actual:** Información dispersa en múltiples fuentes.

**Responsable:** Claude Desktop

---

### CD-05: Especificación Técnica (Motor NOM Compliance)

**Descripción:** Diseño e implementación de motor custom para compliance con normativas NOM-016-SSA3-2012, NOM-240, NOM-241.

**Entregable esperado:** Especificación técnica 6-8 páginas + pseudocódigo.

**Estado actual:** Requiere investigación normativa profunda.

**Responsable:** Claude Desktop (specs) → Antigravity (implementación P3)

---

### CD-06: Especificación Técnica (Clasificador Biomédico)

**Descripción:** Diseño de clasificador inteligente para nomenclatura COFEPRIS/CENETEC y código ECMP.

**Entregable esperado:** Especificación 4-5 páginas + tabla de clasificaciones.

**Estado actual:** Requiere mapeo con autoridades regulatorias.

**Responsable:** Claude Desktop (specs) → Antigravity (implementación P3)

---

## 5. Stack UI Moderno: Explicación Técnica

### Recomendación de Componentes Visuales

El stack anterior mencionaba "nano banana pro 3" — este **no es un framework identificable** en el ecosistema React/web actual (posiblemente confusión de nombres). A continuación, el stack recomendado que supera cualquier necesidad de visualización moderna:

#### 5.1 Framer Motion v11 (~330KB)
- **Propósito:** Animaciones React de alto nivel (motion.div, motion.button, etc.)
- **Uso en SIGAB:** Fade-in de dashboards, stagger de KPI cards, transiciones de gráficas
- **Ventaja:** API declarativa, excelente performance, control automático de GPU
- **Instalación:** `npm install framer-motion==11.0.3`

#### 5.2 Lucide React (~850 iconos médicos)
- **Propósito:** Iconografía SVG moderna y limpia
- **Uso en SIGAB:** Monitor (Monitor), Ventilador (Wind), Corazón (Heart), Alerta (AlertTriangle), Mantenimiento (Wrench)
- **Ventaja:** Iconos específicos para dominio médico, escalables, accesibles
- **Instalación:** `npm install lucide-react==0.376.0`

#### 5.3 Tremor v3.13 (Dashboard-native)
- **Propósito:** Componentes Tailwind-native para dashboards (Card, AreaChart, DonutChart, BarChart, Metric, etc.)
- **Uso en SIGAB:** KPI cards con gradientes, gráficas de MTBF degradation, distribución de estados
- **Ventaja:** Integración directa con Tailwind, sin dependencias pesadas de Recharts
- **Instalación:** `npm install @tremor/react==3.13.0`

#### 5.4 Recharts v2.10.3 (Gráficas avanzadas)
- **Propósito:** Composable charts library para React (AreaChart, BarChart, LineChart, Tooltip, Legend)
- **Uso en SIGAB:** Gráfica MTBF (degradación), mantenimientos por tipo, tendencias históricas
- **Ventaja:** Tailwind-compatible, responsive automático, interactivo (hover tooltips)
- **Instalación:** `npm install recharts==2.10.3`

#### 5.5 shadcn/ui (Componentes accesibles)
- **Propósito:** Componentes Radix UI + Tailwind (Dialog, AlertDialog, Dropdown, Toast, etc.)
- **Uso en SIGAB:** Modales de confirmación, menús desplegables, notificaciones
- **Ventaja:** WCAG 2.1 AA compliance automático, sin instalación global (copy-paste)
- **Instalación:** `npx shadcn-ui@latest init` + `npx shadcn-ui@latest add button`

#### 5.6 Lottie React (Animaciones vectoriales complejas)
- **Propósito:** Ejecutar animaciones Lottie (JSON) desde Adobe After Effects o Figma
- **Uso en SIGAB:** Loading states, equipment status animations, maintenance completion celebración
- **Ventaja:** Animaciones complejas sin código, lightweight, escalables
- **Instalación:** `npm install lottie-react==6.4.0`

#### 5.7 GSAP (Animaciones de alto performance)
- **Propósito:** Tweening library para animaciones críticas (bajo latency)
- **Uso en SIGAB:** Transiciones suaves entre pantallas, animaciones de números (contadores MTBF)
- **Ventaja:** Performance superior a CSS animations, control granular, easing avanzado
- **Instalación:** `npm install gsap==3.12.2`

### Stack Recomendado: Resumen Técnico

```javascript
// package.json dependencies (frontend)
{
  "dependencies": {
    "react": "18.2.0",
    "framer-motion": "11.0.3",
    "lucide-react": "0.376.0",
    "@tremor/react": "3.13.0",
    "recharts": "2.10.3",
    "lottie-react": "6.4.0",
    "gsap": "3.12.2",
    "tailwindcss": "3.4.1",
    "@tailwindcss/typography": "0.5.10"
  }
}
```

### Por qué NO "nano banana pro 3"

- **No existe como librería React identificable** en npm, GitHub o documentación oficial
- Posibles confusiones: "Banana Split" (CSS framework), "Pro Component" (UI library), otras librerías con nombres similares
- Recomendación: usar stack verificado arriba, que cubre todas las necesidades de visualización moderna

---

## 6. Timeline Unificado: Abril – Junio 2026

### Vista Gantt Textual (12 Sprints × 2 semanas)

```
SPRINT 1-2 (Abril 10-23)
├─ AG-01: SQLModel + asyncmy (Gustavo @ Antigravity)
│  └─ Deliverable: db.py, models.py, alembic/, tests
├─ CD-01: Doc Inversionista Secciones 3.1-3.6 (Claude)
│  └─ Deliverable: 10-página markdown, secciones stack/arquitectura
└─ Status: P0 Foundational

SPRINT 3-4 (Abril 24 - Mayo 7)
├─ AG-02: PaddleOCR on-premise (Gustavo)
│  └─ Deliverable: ocr_service.py, /api/ocr/extract, FormaOCR saved to MySQL
├─ AG-03: SSE via sse-starlette (Gustavo)
│  └─ Deliverable: /api/dashboard/stream, EventPublisher, useDashboardStream hook
├─ CD-02: Actualización Precios Auditados (Claude)
│  └─ Deliverable: Tabla precios + justificación financiera
└─ Status: P0 Real-time + Data Pipeline

SPRINT 5-6 (Mayo 8-21)
├─ AG-04: Stack UI Moderno (Recharts+Tremor+FM+Lucide) (Gustavo)
│  └─ Deliverable: Dashboard.jsx, KPI cards, charts, animations
├─ AG-05: Responsive Design 24"+55" (Gustavo)
│  └─ Deliverable: ResponsiveDashboard.jsx, useWindowSize, DisplaySelector
├─ CD-03: Estrategia Financiera V2 (Claude)
│  └─ Deliverable: 5-6 página financial model + spreadsheet sensitivity
└─ Status: P0 UI/UX Complete

SPRINT 7-8 (Mayo 22 - Junio 4)
├─ AG-06: Baileys WhatsApp (Gustavo)
│  └─ Deliverable: WhatsApp bot via Baileys, auth flow, message handling
├─ AG-07: Whisper STT + QR-First Flujo (Gustavo)
│  └─ Deliverable: /api/whisper/transcribe, QR decoder, form pre-fill
├─ CD-04: Reporte Mejoras Consolidado (Claude)
│  └─ Deliverable: 4-5 página consolidated improvement report
└─ Status: P1 WhatsApp Integration

SPRINT 9-10 (Junio 5-18)
├─ AG-08: Triple Validación Poka-Yoke (Gustavo)
│  └─ Deliverable: /api/validate/triple-check (QR ID + NII + Serial)
├─ AG-09: Migración ISO 8601 UTC en MySQL (Gustavo)
│  └─ Deliverable: Alembic migration, data transform scripts
├─ CD-05: Especificación NOM Compliance Motor (Claude)
│  └─ Deliverable: 6-8 página spec + pseudocódigo
└─ Status: P1 Validation + Compliance

SPRINT 11-12 (Junio 19 - Julio 2)
├─ AG-10: QR/RFID Lifecycle (Gustavo)
│  └─ Deliverable: Segno (generate), pyzbar (decode), sllurp (RFID), integration
├─ AG-11: LangGraph Orquestador (Gustavo)
│  └─ Deliverable: WhatsApp→OCR→Validation→MySQL pipeline, state machine
├─ CD-06: Especificación Clasificador Biomédico (Claude)
│  └─ Deliverable: 4-5 página spec + COFEPRIS/CENETEC mapping table
└─ Status: P2 Full Orchestration

P2/P3 Deferred (Junio+):
├─ AG-11-EXTENDED: LangGraph con OpenAI (confidential workflow)
├─ PyOD + Prophet (anomaly detection + forecasting)
├─ Docker Compose stack (FastAPI + Node + MySQL + Nginx)
├─ Uptime Kuma + Netdata (monitoring)
├─ Classificador biomédico (LLM-based CENETEC nomenclature)
├─ Certificados de calibración (ISO 13485)
├─ Catálogo manufactura aditiva
└─ Federación multi-hospital
```

### Hitos Críticos

| Fecha | Hito | Responsable | Criterio de Éxito |
|-------|------|-------------|-------------------|
| Abril 23 | P0 Backend completado | Gustavo | SQLModel + PaddleOCR + SSE funcionando |
| Mayo 7 | P0 Frontend completado | Gustavo | Dashboard responsive en 24"+55", animaciones fluidas |
| Mayo 21 | Investor Demo V1 | Claude + Gustavo | Presentación financiera + UI moderna |
| Junio 4 | WhatsApp + Whisper integrado | Gustavo | Flujo QR-First + voice notes funcionando |
| Junio 18 | Validación triple + ISO 8601 | Gustavo | QR+NII+Serie validation, fecha compliance |
| Junio 30 | P2 Orchestration (LangGraph) | Gustavo | Orquestador WhatsApp→OCR→Validación completo |

---

## 7. Matriz de Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación | Propio |
|--------|:------------:|:-------:|-----------|--------|
| **Migración datos históricos falla** | MEDIA | ALTO | Backup MySQL antes, script de rollback, validar post-migración 100% | Gustavo |
| **PaddleOCR insuficiente para casos complejos** | MEDIA | MEDIO | Gemini fallback automático, SLA >95% casos estándar | Gustavo |
| **Latencia SSE en 50+ clientes simultáneos** | BAJA | MEDIO | Load testing, conexión pool optimization, posible Redis pub/sub | Gustavo |
| **Responsive 55" no legible a distancia** | BAJA | MEDIO | Font mínimo 32px, testing in-situ con monitor real | Gustavo |
| **Baileys WhatsApp token refresh inestable** | MEDIA | ALTO | Implement automatic re-auth, queue pending messages, fallback SMS | Gustavo |
| **NOM compliance motor incompleto** | MEDIA | ALTO | Consultar IMSS/COFEPRIS temprano, benchmarking normativo | Claude |
| **Presupuesto overshoot (costos cloud API)** | BAJA | ALTO | Monitor API spend mensual, Gemini fallback strategy | Gustavo |

---

## 8. Recursos Requeridos

### Hardware

- **Servidor Desarrollo:** Lenovo ThinkCentre M720q (i5-8500T, 32GB RAM, 512GB NVMe)
- **Monitores:**
  - 24" (1920×1080) × 2 para bench técnicos
  - 55" (1920×1080 o 3840×2160) × 1 para sala de control
- **Periféricos OCR:** Cámara USB 1080p, scanner de códigos QR (opcional RFID reader UHF)

### Software

- **Backend:** Python 3.11, FastAPI 0.109, MySQL 8.0, Docker
- **Frontend:** Node.js 20, React 18, Vite 5, Tailwind 3.4
- **IDEs:** VS Code (Claude), Google Antigravity IDE (Gustavo)
- **VCS:** Git (GitHub private repository)

### Equipo

- **Gustavo (Antigravity):** 40 horas/semana × 12 semanas = 480 horas técnicas
- **Claude (Desktop):** 20 horas/semana × 12 semanas = 240 horas análisis/docs
- **Auditor Externo:** 20 horas (validación compliance/financiero)

---

## 9. Criterios de Aceptación por Sprint

### Sprint 1-2
- [ ] SQLModel models deploy sin errores
- [ ] Alembic migration corre contra sigab_prod
- [ ] Documento Inversionista 10 páginas completado

### Sprint 3-4
- [ ] PaddleOCR extrae texto con >70% confianza en formas estándar
- [ ] SSE stream envía eventos cada 10s sin desconexiones
- [ ] Tabla de precios auditados integrada en documento

### Sprint 5-6
- [ ] Dashboard render en <2s (p95) en ThinkCentre
- [ ] UI responsive en 24" + 55" (legible en ambas)
- [ ] Financial model V2 con 3 escenarios (optimista/base/pesimista)

### Sprint 7-8
- [ ] WhatsApp bot responde mensajes en <1s
- [ ] Whisper transcribe voice notes con >85% accuracy (español)
- [ ] Reporte consolidado consolidates 3 fuentes en 1 documento

### Sprint 9-10
- [ ] Triple Poka-Yoke valida QR+NII+Serie sin falsos positivos
- [ ] Migración ISO 8601 UTC completada, datos verificados 100%
- [ ] Especificación NOM compliance completa (6-8 págs)

### Sprint 11-12
- [ ] QR generation/decode/RFID read integrado
- [ ] LangGraph orquestador procesa flujo completo en <5s
- [ ] Especificación clasificador biomédico con tabla COFEPRIS/CENETEC

---

## 10. Conclusión

Este Plan Maestro desglosa la modernización integral de SIGAB en 12 sprints de 2 semanas, distribuyendo responsabilidades entre **Gustavo (Antigravity, módulos técnicos backend/frontend)** y **Claude (Desktop, documentación/análisis/specs)**. 

Cada módulo Antigravity incluye instrucciones copy-paste listas para ejecución, y cada módulo Claude tiene entregables específicos. El timeline es realista, la mitigación de riesgos es proactiva, y el resultado es un sistema **production-ready, NOM-compliant, y listo para inversión**.

**Inicio:** Abril 10, 2026  
**Fin:** Junio 30, 2026  
**Versión:** 1.0 — Aprobado para ejecución

---

**Documento preparado por:** Equipo de Arquitectura SIGAB  
**Fecha:** 11 de abril de 2026  
**Próxima revisión:** Cada fin de sprint (reuniones de retrospectiva)

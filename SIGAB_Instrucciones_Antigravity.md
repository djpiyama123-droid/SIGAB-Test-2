# SIGAB — Antigravity Planning Mode Instructions
## Quick Reference for Google Antigravity IDE

### Cómo usar este documento
Estos bloques están diseñados para pegarse directamente en Google Antigravity en Planning Mode. Cada bloque es autocontenido. Ejecutar en el orden AG-01 → AG-11 respetando dependencias.

**Project:** SIGAB (Sistema Integral de Gestión de Activos Biomédicos)  
**Stack:** React/Vite frontend, FastAPI (Python) backend, MySQL, Docker, WSL2 Ubuntu 24.04  
**Hardware:** Lenovo ThinkCentre M720q (i5-8500T, 16-32GB RAM)

---

## AG-01: SQLModel + asyncmy + Alembic ORM Migration

**Project context:**
SIGAB backend currently uses raw SQLAlchemy with synchronous database calls. Need to migrate to SQLModel for type safety, asyncmy for async MySQL connections, and Alembic for version-controlled schema migrations.

**Current state:**
- Raw SQLAlchemy ORM in `backend/app/models/`
- Synchronous database connections
- Manual schema management

**Goal:**
Replace SQLAlchemy with SQLModel, implement async database layer with asyncmy, and establish Alembic migration pipeline for reproducible schema versioning.

**Files to modify/create:**
- `backend/requirements.txt` (add sqlmodel, asyncmy, alembic)
- `backend/app/database.py` (new async engine)
- `backend/app/models/` (convert to SQLModel)
- `backend/alembic/env.py` (new)
- `backend/alembic/versions/` (migrations)

**Technical requirements:**
- SQLModel 0.0.14+
- asyncmy 0.2.9+
- Alembic 1.13+
- FastAPI 0.109+
- MySQL 8.0 with UTC collation

**Implementation steps (follow this order):**
1. Install dependencies: `pip install sqlmodel asyncmy alembic python-dotenv`
2. Initialize Alembic: `alembic init alembic`
3. Create new async database engine in `backend/app/database.py` using `create_async_engine()` from SQLAlchemy
4. Convert all models in `backend/app/models/` from SQLAlchemy declarative to SQLModel classes (inherit from SQLModel)
5. Update all imports in router files to use new model paths
6. Configure `alembic/env.py` to use async context with `asyncio.run()`
7. Generate initial migration: `alembic revision --autogenerate -m "Initial schema"`
8. Test migration on development MySQL instance
9. Update FastAPI dependency in `app/dependencies.py` to use async_session maker
10. Refactor all route handlers to use `async def` with `async with` session context

**Acceptance criteria:**
- [ ] All models inherit from SQLModel and have type hints
- [ ] Database connections use asyncmy driver verified in logs
- [ ] Alembic migration history exists and applies cleanly
- [ ] All routes use async/await pattern
- [ ] No blocking I/O in request handlers
- [ ] Migration can be rolled back and reapplied without data loss

**Security constraints (IMSS Healthcare):**
- All database connections must use SSL/TLS (ssl_verify_cert=true in asyncmy)
- Alembic migrations must be version-controlled and auditable
- No credentials in migration files; use environment variables

**Run these tests after implementation:**
```bash
# Test async database connection
python -c "import asyncio; from app.database import engine; asyncio.run(engine.connect())"

# Generate and apply migration
alembic upgrade head

# Rollback and reapply
alembic downgrade -1
alembic upgrade +1

# Run pytest with async support
pytest --asyncio-mode=auto tests/
```

---

## AG-02: PaddleOCR On-Premise Pipeline

**Project context:**
SIGAB currently relies on Gemini 2.5 Flash API for all OCR operations on maintenance forms. This introduces cloud dependency and latency. Implement local PaddleOCR for standard forms (80% of use cases), keep Gemini as fallback for complex/handwritten forms.

**Current state:**
- All OCR requests routed to Gemini 2.5 Flash via API
- No local OCR capability
- Single point of failure for form processing

**Goal:**
Deploy PaddleOCR locally on Lenovo ThinkCentre M720q for fast, offline form extraction. Route standard forms to PaddleOCR; fallback to Gemini for edge cases.

**Files to modify/create:**
- `backend/requirements.txt` (add paddleocr, paddlepaddle)
- `backend/app/services/ocr_service.py` (new)
- `backend/app/routers/ocr.py` (update)
- `backend/app/models/ocr_schemas.py` (new)
- `backend/config.py` (OCR routing config)

**Technical requirements:**
- paddlepaddle 2.5.2+ (CPU-optimized for M720q)
- paddleocr 2.7.0.3+
- Pillow 10.0+
- numpy 1.24+
- Max model size on ThinkCentre: ~500MB (fits in 16GB RAM)

**Implementation steps (follow this order):**
1. Install dependencies: `pip install paddlepaddle paddleocr pillow opencv-python`
2. Create `backend/app/services/ocr_service.py` with OcrService class implementing two methods: `extract_with_paddle()` and `extract_with_gemini_fallback()`
3. In `extract_with_paddle()`: load PaddleOCR model on first call, cache globally, use `model.ocr()` to extract text and bounding boxes
4. Implement form-type detection heuristic (count detected text blocks, check for known field names like "Fecha", "Serial", "Modelo")
5. Create routing logic: if form-type is "standard" (confidence > 0.85), use PaddleOCR; otherwise fallback to Gemini
6. Add confidence score to OCR response in `backend/app/models/ocr_schemas.py`
7. Update `backend/app/routers/ocr.py` POST `/api/v1/ocr/extract` to use new service
8. Add performance metrics logging (execution time, model used, confidence)
9. Create test set of 10 standard forms and 5 complex forms for validation
10. Benchmark: target PaddleOCR <500ms per form on M720q

**Acceptance criteria:**
- [ ] PaddleOCR processes standard forms in <500ms
- [ ] Fallback to Gemini triggers for complex/handwritten text
- [ ] OCR response includes model_used ("paddle" or "gemini") and confidence_score
- [ ] Model loads once and is cached (no reload per request)
- [ ] Zero network I/O if PaddleOCR handles form
- [ ] 95% accuracy match vs. Gemini on standard forms

**Security constraints (IMSS Healthcare):**
- All form images must be deleted after processing (no persistent cache)
- PaddleOCR model files must not be exposed in build artifacts
- Confidence scores below 0.6 must trigger manual review flag

**Run these tests after implementation:**
```bash
# Test PaddleOCR model loading
python -c "from paddleocr import PaddleOCR; ocr = PaddleOCR(use_angle_cls=True); print('Model loaded')"

# Benchmark on sample form
time curl -X POST http://localhost:8000/api/v1/ocr/extract -F "form=@test_form.jpg" | jq '.execution_time_ms'

# Test fallback trigger
curl -X POST http://localhost:8000/api/v1/ocr/extract -F "form=@complex_handwritten_form.jpg" | jq '.model_used'

# Verify no network calls (tcpdump check)
tcpdump -i any port 443 -c 100 & \
curl -X POST http://localhost:8000/api/v1/ocr/extract -F "form=@standard_form.jpg" & \
sleep 2 && pkill tcpdump
```

---

## AG-03: SSE Real-Time Dashboard (sse-starlette)

**Project context:**
SIGAB dashboard requires real-time asset status updates (equipment state changes, maintenance alerts, battery degradation events). Replace or complement WebSocket implementation with Server-Sent Events (SSE) for lighter-weight, firewall-friendly real-time updates suitable for hospital networks.

**Current state:**
- Dashboard uses polling (likely 5-10s intervals)
- No real-time status propagation
- High latency for critical alerts

**Goal:**
Implement SSE via sse-starlette for push-based real-time updates. Hospital firewalls typically block WebSocket UPGRADE; SSE uses standard HTTP/1.1, more compatible.

**Files to modify/create:**
- `backend/requirements.txt` (add sse-starlette)
- `backend/app/routers/events.py` (new)
- `backend/app/services/event_broadcaster.py` (new)
- `frontend/src/hooks/useSSE.ts` (new)
- `frontend/src/pages/Dashboard.tsx` (update)

**Technical requirements:**
- sse-starlette 1.8+
- FastAPI 0.109+
- Python 3.10+
- Browser support: all modern browsers (IE11 not supported, acceptable for IMSS)

**Implementation steps (follow this order):**
1. Install: `pip install sse-starlette`
2. Create `backend/app/services/event_broadcaster.py` with EventBroadcaster class using asyncio.Queue for event distribution
3. Create `backend/app/routers/events.py` with two endpoints: `GET /api/v1/events/subscribe` (SSE stream) and internal `POST /api/v1/events/broadcast` (for internal services)
4. EventBroadcaster should support filtering by asset_id and event_type
5. In `/api/v1/events/subscribe`, implement client-side ID tracking to handle reconnections (send last_event_id as query param)
6. Create `frontend/src/hooks/useSSE.ts` with hook that:
   - Opens EventSource connection to SSE endpoint
   - Handles reconnection with exponential backoff
   - Filters events by selected asset_id in Dashboard
   - Cleans up connection on unmount
7. Update Dashboard to use useSSE hook and update state on incoming events
8. Add heartbeat ping every 30s to keep connection alive through proxies
9. Implement request timeout at 5min (reconnect automatically)
10. Add error boundary in Dashboard for SSE failures (fallback to polling)

**Acceptance criteria:**
- [ ] SSE connection established within 100ms of dashboard load
- [ ] Asset status updates arrive <1s after state change in backend
- [ ] Client reconnects automatically if server restarts
- [ ] Heartbeat prevents connection dropout through idle proxies
- [ ] No data loss during network blip (<5s recovery)
- [ ] Dashboard updates without page reload

**Security constraints (IMSS Healthcare):**
- SSE endpoint requires authentication (JWT token in headers or secure cookie)
- Events include only asset_id and status; no sensitive equipment data in SSE payload
- Client can only subscribe to assets they have READ permission for
- Access logs must record all SSE connections with user_id and duration

**Run these tests after implementation:**
```bash
# Test SSE connection
curl -N -H "Authorization: Bearer YOUR_JWT" http://localhost:8000/api/v1/events/subscribe

# Simulate event broadcast (in another terminal)
curl -X POST http://localhost:8000/api/v1/events/broadcast \
  -H "Content-Type: application/json" \
  -d '{"asset_id": 1, "event_type": "status_change", "status": "maintenance"}'

# Test client reconnection (kill and restart backend, verify auto-reconnect)
npm run dev  # frontend
# then in another terminal, restart FastAPI and check browser console for reconnection logs

# Load test 50 concurrent SSE clients
ab -c 50 -n 100 -H "Authorization: Bearer JWT" http://localhost:8000/api/v1/events/subscribe
```

---

## AG-04: UI Modernization — Recharts + Tremor + Framer Motion + Lucide React

**Project context:**
SIGAB dashboard currently uses basic Tailwind styling. Modernize with professional charting (Recharts), KPI cards (Tremor), smooth animations (Framer Motion v11), and consistent medical/technical iconography (Lucide React).

**Current state:**
- Basic HTML tables for asset lists
- Generic icons or missing icons
- No data visualizations
- Static UI with no animations

**Goal:**
Create modern, animated dashboard with professional charts for equipment degradation trends, real-time KPI cards with status indicators, and consistent medical/technical iconography.

**Files to modify/create:**
- `frontend/package.json` (add dependencies)
- `frontend/src/components/charts/DegradationChart.tsx` (new)
- `frontend/src/components/charts/MaintenanceChart.tsx` (new)
- `frontend/src/components/cards/KPICard.tsx` (new)
- `frontend/src/components/cards/StatusIndicator.tsx` (new)
- `frontend/src/components/layout/DashboardGrid.tsx` (new)
- `frontend/src/pages/Dashboard.tsx` (refactor)

**Technical requirements:**
- recharts 2.10+
- tremor 3.14+
- framer-motion 11.0+
- lucide-react 0.294+
- shadcn/ui 0.8+
- Tailwind CSS 3.4+
- React 18.2+

**Implementation steps (follow this order):**
1. Install dependencies: `npm install recharts tremor framer-motion lucide-react`
2. Create `frontend/src/components/charts/DegradationChart.tsx`:
   - Use Recharts AreaChart for equipment battery/performance degradation over time
   - X-axis: 30-day timeline
   - Y-axis: degradation percentage (0-100%)
   - Gradient fill for visual interest
   - Custom tooltip showing date and degradation rate
3. Create `frontend/src/components/charts/MaintenanceChart.tsx`:
   - BarChart showing preventive maintenance schedule vs. actual maintenance events
   - Legend for scheduled vs. completed
   - Color coding: green (completed), yellow (upcoming), red (overdue)
4. Create `frontend/src/components/cards/KPICard.tsx`:
   - Use Tremor Card component as base
   - Props: title, value, unit, trend (up/down/neutral), icon (Lucide)
   - Display metric value prominently, trend indicator below
   - Background color based on status (green/yellow/red)
5. Create `frontend/src/components/cards/StatusIndicator.tsx`:
   - Circular indicator with Lucide icon (battery, wrench, checkmark, alert)
   - Color: green (operational), yellow (warning), red (critical)
   - Animated pulse for critical state using Framer Motion
6. Create `frontend/src/components/layout/DashboardGrid.tsx`:
   - Responsive grid using Tailwind: 1 col (mobile), 2 col (tablet), 3-4 col (desktop)
   - Layout:
     ```
     [KPI: Total Assets] [KPI: Operational] [KPI: Maintenance Due]
     [Degradation Chart (2 cols)]
     [Maintenance Chart (2 cols)]
     [Asset Status Table (3 cols)]
     ```
7. Refactor `frontend/src/pages/Dashboard.tsx`:
   - Replace old tables with new DashboardGrid
   - Import all new components
   - Wrap with Tremor Provider
8. Add Framer Motion animations:
   - Stagger animation on KPI cards on page load
   - Fade-in for charts with scale transform
   - Pulse animation on critical status indicators
   - Page transition with AnimatePresence
9. Define color tokens in `frontend/tailwind.config.js`:
   - Medical green: #10B981
   - Warning yellow: #F59E0B
   - Critical red: #EF4444
10. Update icon usage throughout (replace any generic icons with Lucide: Battery, Wrench, AlertTriangle, CheckCircle, Zap)

**Acceptance criteria:**
- [ ] Dashboard loads with staggered animation on KPI cards
- [ ] Recharts responsive on mobile (2 col) and desktop (4 col)
- [ ] Tremor KPI cards display metric + trend
- [ ] Critical status indicators pulse with Framer Motion
- [ ] All icons are Lucide React (no missing or placeholder icons)
- [ ] Degradation chart updates in real-time via SSE
- [ ] Mobile: single column layout responsive
- [ ] Desktop: 3-4 column grid visible
- [ ] Animations perform at 60fps (no jank)

**Security constraints (IMSS Healthcare):**
- No sensitive equipment data in chart tooltips (only asset_id and status)
- Charts must respect user's asset access permissions
- No data export to CSV without audit log

**Run these tests after implementation:**
```bash
# Build and verify no console errors
npm run build

# Visual regression test on multiple breakpoints
npm run test:e2e -- --viewport-width=375 --viewport-height=667  # mobile
npm run test:e2e -- --viewport-width=768 --viewport-height=1024 # tablet
npm run test:e2e -- --viewport-width=1920 --viewport-height=1080 # desktop

# Animation performance check
npm run dev  # open DevTools > Performance > record 10s, check for 60fps
```

---

## AG-05: Responsive Dashboard (24" Workstation + 55" Control Room)

**Project context:**
SIGAB documentation mentions two display scenarios: 24" technical workstations and 55" control room displays. Current CSS does not account for these extremes. Implement fluid responsive design that scales from 1080p (24") to 4K (55") with appropriate text sizes and touch targets.

**Current state:**
- Fixed breakpoints (likely sm/md/lg/xl only)
- Inconsistent text sizing across screen sizes
- Dashboard layout breaks above 1920px

**Goal:**
Create fully responsive dashboard using Tailwind breakpoints extended to 2K (2560px) and 4K (3840px) with fluid typography and adaptive layouts.

**Files to modify/create:**
- `frontend/tailwind.config.js` (extend screens and fontSize)
- `frontend/src/styles/responsive.css` (new)
- `frontend/src/components/layout/ResponsiveDashboard.tsx` (new)
- `frontend/src/hooks/useResponsive.ts` (new)

**Technical requirements:**
- Tailwind CSS 3.4+
- Support: 1080p (1920x1080), 1440p (2560x1440), 4K (3840x2160)
- Touch target minimum: 44x44px on 55" display
- Font scaling: clamp() for fluid typography

**Implementation steps (follow this order):**
1. Extend Tailwind config in `frontend/tailwind.config.js`:
   ```javascript
   screens: {
     'xs': '320px',
     'sm': '640px',
     'md': '768px',
     'lg': '1024px',
     'xl': '1280px',
     '2xl': '1536px',
     '3xl': '1920px',  // 24" Full HD
     '4xl': '2560px',  // 27" 1440p
     '5xl': '3840px',  // 55" 4K
   }
   ```
2. Define fluid font sizes in `frontend/tailwind.config.js`:
   ```javascript
   fontSize: {
     'xs': ['clamp(0.75rem, 1vw, 1rem)', ...],
     'sm': ['clamp(0.875rem, 1.25vw, 1.25rem)', ...],
     'base': ['clamp(1rem, 1.5vw, 1.5rem)', ...],
     'lg': ['clamp(1.125rem, 1.75vw, 1.75rem)', ...],
     'xl': ['clamp(1.25rem, 2vw, 2rem)', ...],
     '2xl': ['clamp(1.5rem, 2.5vw, 2.5rem)', ...],
   }
   ```
3. Create `frontend/src/hooks/useResponsive.ts` with breakpoint detection hook
4. Create `frontend/src/components/layout/ResponsiveDashboard.tsx` with dynamic grid layout:
   - 1 col: xs-sm (phones, small tablets)
   - 2 col: md-lg (tablets)
   - 3 col: xl-2xl (24" displays)
   - 4 col: 3xl+ (55" displays with extra spacing)
5. Adjust touch target sizes:
   - Buttons: `h-10 w-10` (40px) minimum
   - On 55" display: `5xl:h-16 5xl:w-16` (64px) for comfort
6. Update all chart containers with responsive margins:
   - `3xl:p-6 5xl:p-8`
7. Refactor Dashboard.tsx to wrap ResponsiveDashboard
8. Test text readability at:
   - 24" at arm's length (50cm) - text should be ≥12pt
   - 55" at 2m distance - text should be ≥28pt (use clamp to scale)
9. Verify no horizontal scroll at any breakpoint
10. Add print styles for A4 export (fallback for reports)

**Acceptance criteria:**
- [ ] Dashboard displays correctly at 1920x1080 (24" Full HD)
- [ ] Dashboard displays correctly at 2560x1440 (27" 1440p)
- [ ] Dashboard displays correctly at 3840x2160 (55" 4K)
- [ ] Text readable at 50cm distance on 24" display
- [ ] Text readable at 2m distance on 55" display
- [ ] Touch targets ≥44px on 24" and ≥64px on 55"
- [ ] No horizontal scroll at any resolution
- [ ] KPI cards scale proportionally
- [ ] Charts adapt to available screen space

**Security constraints (IMSS Healthcare):**
- Responsive layouts must not expose more data than intended (no horizontal data spillover)
- Control room 55" display must respect role-based filtering (can't show more assets than user permission)

**Run these tests after implementation:**
```bash
# Chrome DevTools responsive test
npm run dev
# Open DevTools > Device Toolbar > Custom: 1920x1080, then 2560x1440, then 3840x2160

# Viewport resize stress test (verify no layout shift)
npm run test:e2e -- --resize-viewport-continuously

# Text readability audit
lighthouse http://localhost:5173 --view

# Verify clamp() fluid typography
console.log(window.getComputedStyle(document.querySelector('h1')).fontSize)
# should return different values at different viewport widths
```

---

## AG-06: Baileys WhatsApp Migration (Replace whatsapp-web.js)

**Project context:**
SIGAB currently uses whatsapp-web.js which requires Puppeteer + Chromium (~500-700MB RAM footprint). This is unacceptable on Lenovo ThinkCentre M720q with 16-32GB total RAM serving multiple services. Migrate to Baileys (@whiskeysockets/baileys) which uses direct WebSocket connections to WhatsApp servers without Chromium.

**Current state:**
- whatsapp-web.js + Puppeteer dependency
- High memory footprint
- Unreliable on low-resource systems
- Slow startup time

**Goal:**
Replace whatsapp-web.js with Baileys (@whiskeysockets/baileys). Reduce memory footprint to <50MB. Improve reliability and startup time.

**Files to modify/create:**
- `backend/requirements.txt` or `backend/package.json` (add @whiskeysockets/baileys)
- `backend/app/services/whatsapp_service.py` or `backend/services/whatsapp.js` (new)
- `backend/app/routers/whatsapp.py` or `backend/routes/whatsapp.js` (new)
- `.env` (add WHATSAPP_SESSION_PATH, WHATSAPP_WEBHOOK_URL)

**Technical requirements:**
- @whiskeysockets/baileys 6.6+
- Node.js 18+ (if using JS) OR pywasync wrapper (if staying Python)
- Redis optional (for session caching across restarts)
- Memory footprint target: <50MB
- Startup time target: <5s

**Implementation steps (follow this order):**
1. Decide: implement in Node.js (native Baileys) or Python (pywasync wrapper). Recommend Node.js for native performance.
2. If Node.js: Create `backend/services/whatsapp.js` directory structure:
   ```
   backend/services/whatsapp/
   ├── client.js (Baileys client initialization)
   ├── handlers.js (message handlers)
   ├── session.js (session persistence)
   └── utils.js (helpers)
   ```
3. Initialize Baileys client in `client.js`:
   ```javascript
   const { default: makeWASocket } = require('@whiskeysockets/baileys');
   const socket = makeWASocket({
     auth: state,
     printQRInTerminal: true,
     browser: Browsers.ubuntu('Chrome'),
   });
   ```
4. Implement QR code display and scanning (see AG-07 for QR flow)
5. Handle message events:
   - `messages.upsert`: incoming messages
   - `connection.update`: connection state changes
   - `creds.update`: session credentials (persist)
6. Create session persistence using file-based storage (`.wwebjs_auth/`) or Redis
7. Expose webhook endpoint for FastAPI: `POST /api/v1/whatsapp/webhook` that accepts events
8. Implement message sending: `socket.sendMessage(jid, message)`
9. Add graceful shutdown: close Baileys connection on SIGTERM
10. Test memory usage with `ps aux | grep node` and verify <50MB

**Acceptance criteria:**
- [ ] Baileys client connects and shows QR within 3s
- [ ] Memory footprint <50MB during idle
- [ ] Incoming messages parsed and sent to FastAPI webhook
- [ ] Message send latency <2s
- [ ] Session persists across restarts
- [ ] No Chromium/Puppeteer in process list
- [ ] Connection survives network blips with auto-reconnect

**Security constraints (IMSS Healthcare):**
- Session credentials stored encrypted on disk
- No WhatsApp messages logged to console in production
- Webhook to FastAPI must use HTTPS and validate API key
- Message retention policy: delete after 24h

**Run these tests after implementation:**
```bash
# Start Baileys service and monitor memory
node backend/services/whatsapp/client.js &
ps aux | grep node | grep whatsapp

# Test QR code display
# (should print QR to terminal or serve QR image endpoint)

# Send test message via FastAPI webhook
curl -X POST http://localhost:8000/api/v1/whatsapp/webhook \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215555555555", "body": "Test message"}'

# Verify message received in WhatsApp client

# Stress test: send 100 messages in 10s
for i in {1..100}; do
  curl -X POST http://localhost:8000/api/v1/whatsapp/send \
    -H "Authorization: Bearer API_KEY" \
    -d "{\"to\": \"+5215555555555\", \"message\": \"Message $i\"}" &
done
wait

# Kill and restart, verify session still valid
pkill -f "whatsapp/client.js"
sleep 2
node backend/services/whatsapp/client.js
# should reconnect without QR scan
```

---

## AG-07: WhatsApp QR-First + Whisper STT Voice Note Flow

**Project context:**
Replace paper-based form submission with modern WhatsApp workflow: technician scans asset QR code → sends WhatsApp voice note (instead of photo of handwritten form) → Whisper STT transcribes locally → LangGraph agent extracts structured data → inserted into MySQL.

**Current state:**
- Manual paper forms scanned via camera/OCR
- Slow data entry pipeline
- Error-prone handwriting recognition

**Goal:**
Implement end-to-end voice note workflow: QR → WhatsApp → Whisper STT → LangGraph extraction → MySQL. Enable technicians to report asset conditions naturally via voice.

**Files to modify/create:**
- `backend/services/whatsapp/handlers.js` (handle voice notes)
- `backend/app/services/stt_service.py` (new - Whisper STT)
- `backend/app/services/extraction_service.py` (new - LangGraph)
- `backend/app/routers/intake.py` (new - intake pipeline)
- `frontend/src/pages/QRScanner.tsx` (new)

**Technical requirements:**
- @whiskeysockets/baileys 6.6+ (voice message support)
- faster-whisper 1.0.0+ (OpenAI Whisper via CTransformers, faster inference)
- langgraph 0.0.40+
- langchain 0.1.0+
- FFmpeg (for audio codec conversion)

**Implementation steps (follow this order):**
1. In `backend/services/whatsapp/handlers.js`, add voice message handler:
   ```javascript
   socket.ev.on('messages.upsert', async (m) => {
     for (const msg of m.messages) {
       if (msg.message?.audioMessage) {
         // Download and process voice note
         const buffer = await socket.downloadMediaMessage(msg);
         await processVoiceNote(msg.key.remoteJid, buffer);
       }
     }
   });
   ```
2. Create `backend/app/services/stt_service.py` with WhisperSTT class using faster-whisper:
   ```python
   from faster_whisper import WhisperModel
   model = WhisperModel("base", device="cpu", compute_type="int8")  # int8 for 16GB RAM
   segments, info = model.transcribe(audio_path)
   ```
3. Create `backend/app/services/extraction_service.py` with LangGraph agent:
   - Define state schema: {qr_code_id, technician_voice_transcript, extracted_fields}
   - Create nodes:
     - `node_validate_qr`: lookup QR in MySQL, get asset_id
     - `node_extract_fields`: use Claude/LLM to extract structured data from transcript
     - `node_validate_extraction`: ensure required fields present
     - `node_store_database`: insert into MySQL
   - Create conditional edge: if validation fails, send WhatsApp message requesting clarification
4. Create LangGraph workflow:
   ```python
   from langgraph.graph import StateGraph
   
   graph = StateGraph(IntakeState)
   graph.add_node("validate_qr", node_validate_qr)
   graph.add_node("transcribe_voice", node_transcribe_voice)
   graph.add_node("extract_fields", node_extract_fields)
   graph.add_node("validate_extraction", node_validate_extraction)
   graph.add_node("store_database", node_store_database)
   
   graph.add_edge("validate_qr", "transcribe_voice")
   # ... connect remaining edges
   ```
5. Create `backend/app/routers/intake.py` with endpoint:
   - `POST /api/v1/intake/voice-note` accepts: {qr_code_url, voice_note_buffer, technician_id}
   - Routes through LangGraph pipeline
   - Returns: {asset_id, extracted_fields, status}
6. Add error handling: if extraction confidence <0.8, send WhatsApp follow-up asking for confirmation
7. Create `frontend/src/pages/QRScanner.tsx`:
   - QR code scanner (use jsQR or react-qr-reader)
   - Record voice note button (Web Audio API)
   - Submit to backend endpoint
   - Show confirmation with extracted data
8. In whatsapp handler, after voice note processed:
   - Send WhatsApp message: "Gracias técnico, datos registrados para activo [asset_id]"
   - If extraction failed: "No entendí bien. Repite la descripción."
9. Add FFmpeg conversion for audio format (WhatsApp sends OGG, Whisper expects WAV/MP3)
10. Implement retry logic: if extraction fails, queue for manual review and notify supervisor

**Acceptance criteria:**
- [ ] QR code scanned and asset_id extracted correctly
- [ ] Voice note uploaded to WhatsApp <2s
- [ ] Whisper transcription accurate (WER <10% on clear speech)
- [ ] LangGraph extraction captures: asset_id, condition_notes, maintenance_type, date
- [ ] Data stored in MySQL with timestamp and technician_id
- [ ] WhatsApp confirmation message sent within 5s
- [ ] Failed extractions queued for manual review
- [ ] End-to-end pipeline <30s (QR + voice + extraction + DB store)

**Security constraints (IMSS Healthcare):**
- Voice notes deleted after transcription (no persistent audio storage)
- Transcripts logged only for training/audit (with PII redaction)
- Access to extraction service requires technician role
- QR code must match asset_id in database (anti-fraud validation)

**Run these tests after implementation:**
```bash
# Download test audio (or record one)
# Test STT accuracy
python -c "
from faster_whisper import WhisperModel
model = WhisperModel('base', device='cpu', compute_type='int8')
segments, _ = model.transcribe('test_voice_note.mp3')
print(''.join(seg.text for seg in segments))
"

# Test LangGraph pipeline end-to-end
python -m pytest tests/test_intake_pipeline.py -v

# Integration test: full workflow
curl -X POST http://localhost:8000/api/v1/intake/voice-note \
  -H "Authorization: Bearer TECH_TOKEN" \
  -F "qr_code_url=https://..." \
  -F "voice_note=@voice_note.ogg" \
  -F "technician_id=1" | jq '.'

# Verify data in MySQL
mysql> SELECT * FROM intake_logs WHERE created_at > NOW() - INTERVAL 1 MINUTE;
```

---

## AG-08: Triple Poka-Yoke Validation (QR + NII + Serial Number)

**Project context:**
When a technician scans a biomedical asset, the system must validate three identifiers to prevent mix-ups: (1) QR code ID exists in database, (2) Número de Inventario Institucional (NII) matches expected value, (3) Equipment serial number matches database. If ANY validation fails, block the request immediately with clear error message and log failed attempt for audit.

**Current state:**
- Single QR code scan validation
- No cross-reference with NII or serial number
- Risk of asset misidentification

**Goal:**
Implement three-layer validation gate. QR code must match NII AND serial number in database before allowing any transaction.

**Files to modify/create:**
- `backend/app/routers/assets.py` (add validation endpoint)
- `backend/app/models/validation_schemas.py` (new)
- `backend/app/services/validation_service.py` (new)
- `backend/app/models/asset.py` (add validation fields)

**Technical requirements:**
- FastAPI 0.109+
- Pydantic for schema validation
- MySQL with transaction support
- Logging with structured format

**Implementation steps (follow this order):**
1. Update MySQL schema to include NII and serial_number fields in assets table:
   ```sql
   ALTER TABLE assets ADD COLUMN (
     nii VARCHAR(50) UNIQUE NOT NULL,
     serial_number VARCHAR(100) NOT NULL,
     validation_failures INT DEFAULT 0
   );
   ```
2. Create Alembic migration for above schema change
3. Create `backend/app/models/validation_schemas.py`:
   ```python
   class AssetScanRequest(BaseModel):
       qr_code_id: str
       nii: str
       serial_number: str
       technician_id: int
       timestamp: datetime
   ```
4. Create `backend/app/services/validation_service.py` with TripleValidator class:
   ```python
   class TripleValidator:
       async def validate(self, request: AssetScanRequest):
           # Step 1: Validate QR code exists
           asset = await db.get_asset(request.qr_code_id)
           if not asset:
               log_validation_failure("QR_NOT_FOUND", request)
               raise AssetNotFound()
           
           # Step 2: Validate NII matches
           if asset.nii != request.nii:
               log_validation_failure("NII_MISMATCH", request)
               asset.validation_failures += 1
               raise NIIMismatch()
           
           # Step 3: Validate serial number matches
           if asset.serial_number != request.serial_number:
               log_validation_failure("SERIAL_MISMATCH", request)
               asset.validation_failures += 1
               raise SerialNumberMismatch()
           
           # All checks passed
           return {"asset_id": asset.id, "status": "valid"}
   ```
5. Create `backend/app/routers/assets.py` endpoint:
   ```python
   @router.post("/api/v1/assets/validate-scan")
   async def validate_asset_scan(request: AssetScanRequest, current_user = Depends(get_current_user)):
       validator = TripleValidator()
       try:
           result = await validator.validate(request)
           return {"status": "success", "asset_id": result["asset_id"]}
       except ValidationError as e:
           return JSONResponse(status_code=400, content={"status": "failed", "error": e.detail})
   ```
6. Add structured logging for all validation attempts:
   ```python
   logger.info("asset_scan_validation", extra={
       "qr_code_id": request.qr_code_id,
       "nii_match": asset.nii == request.nii,
       "serial_match": asset.serial_number == request.serial_number,
       "technician_id": request.technician_id,
       "timestamp": request.timestamp,
   })
   ```
7. Create validation_failures table for audit:
   ```sql
   CREATE TABLE validation_failures (
     id INT PRIMARY KEY AUTO_INCREMENT,
     qr_code_id VARCHAR(50),
     failure_reason ENUM('QR_NOT_FOUND', 'NII_MISMATCH', 'SERIAL_MISMATCH'),
     technician_id INT,
     timestamp DATETIME,
     FOREIGN KEY (technician_id) REFERENCES users(id)
   );
   ```
8. Implement alerting: if single asset has >3 validation failures in 1h, notify supervisor
9. Create frontend form in QRScanner.tsx to capture NII and serial number
10. Add instant feedback: show asset details (equipment name, location) after validation success

**Acceptance criteria:**
- [ ] QR code not found → 400 error immediately
- [ ] NII mismatch → 400 error, increment failure counter
- [ ] Serial number mismatch → 400 error, increment failure counter
- [ ] All three match → 200 OK, allow transaction
- [ ] Validation failures logged with technician_id and timestamp
- [ ] >3 failures in 1h triggers alert
- [ ] Response time <100ms for validation check
- [ ] No asset data returned on failed validation (prevent info leakage)

**Security constraints (IMSS Healthcare):**
- Failed validation attempts must NOT reveal which field failed (generic "validation failed" message) to prevent enumeration attacks
- Validation failure logs stored separately from regular logs (audit trail)
- Only supervisors can view validation failure history
- If serial number changed legitimately, require manager approval + audit comment

**Run these tests after implementation:**
```bash
# Test successful validation (all three match)
curl -X POST http://localhost:8000/api/v1/assets/validate-scan \
  -H "Authorization: Bearer TECH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code_id": "QR-001",
    "nii": "NII-12345",
    "serial_number": "SN-ABC123",
    "technician_id": 1,
    "timestamp": "2026-04-11T10:30:00Z"
  }' | jq '.status'
# Expected: "success"

# Test QR not found
curl -X POST http://localhost:8000/api/v1/assets/validate-scan \
  -H "Authorization: Bearer TECH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code_id": "QR-INVALID",
    "nii": "NII-12345",
    "serial_number": "SN-ABC123",
    "technician_id": 1,
    "timestamp": "2026-04-11T10:30:00Z"
  }' | jq '.status'
# Expected: "failed"

# Test NII mismatch
curl -X POST http://localhost:8000/api/v1/assets/validate-scan \
  -H "Authorization: Bearer TECH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code_id": "QR-001",
    "nii": "NII-WRONG",
    "serial_number": "SN-ABC123",
    "technician_id": 1,
    "timestamp": "2026-04-11T10:30:00Z"
  }' | jq '.status'
# Expected: "failed"

# Check validation failure logs
mysql> SELECT failure_reason, COUNT(*) FROM validation_failures WHERE DATE(timestamp) = CURDATE() GROUP BY failure_reason;

# Load test: 1000 validations in 10s
ab -n 1000 -c 100 -p request.json http://localhost:8000/api/v1/assets/validate-scan
```

---

## AG-09: ISO 8601 UTC Date Migration (MySQL + NOM-016-SSA3-2012)

**Project context:**
SIGAB's MySQL database has inconsistent datetime handling. Some dates stored as DATETIME without timezone, others as TIMESTAMP, others as strings. NOM-016-SSA3-2012 (Mexican healthcare regulatory standard) requires immutable audit trails with explicit timezone information. Migrate all date fields to UTC DATETIME(6) with timezone-aware Python layer.

**Current state:**
- Mixed DATETIME, TIMESTAMP, VARCHAR date columns
- No timezone tracking
- Timestamp calculations unreliable across DST
- Non-compliant with NOM-016-SSA3-2012 requirements

**Goal:**
Standardize all date fields to UTC DATETIME(6). Implement Alembic migration that preserves existing data. Ensure all Python models use timezone-aware datetime with pytz.

**Files to modify/create:**
- `backend/alembic/versions/001_migrate_dates_to_utc.py` (new migration)
- `backend/app/models/base.py` (update base model)
- `backend/app/utils/datetime_utils.py` (new)
- `.env` (add TZ=UTC)

**Technical requirements:**
- Alembic 1.13+
- SQLModel with timezone-aware datetime
- pytz for timezone handling
- MySQL 8.0 with UTC default collation
- Python 3.10+ with zoneinfo support

**Implementation steps (follow this order):**
1. Create Alembic migration file `backend/alembic/versions/001_migrate_dates_to_utc.py`:
   ```python
   from alembic import op
   import sqlalchemy as sa
   
   def upgrade():
       # For each table, convert existing dates to UTC
       op.execute("""
       ALTER TABLE assets MODIFY COLUMN created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6);
       ALTER TABLE assets MODIFY COLUMN updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
       ALTER TABLE maintenance_logs MODIFY COLUMN log_date DATETIME(6) NOT NULL;
       """)
   
   def downgrade():
       op.execute("""
       ALTER TABLE assets MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
       ALTER TABLE assets MODIFY COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
       """)
   ```
2. Create `backend/app/utils/datetime_utils.py` with helper functions:
   ```python
   from datetime import datetime
   import pytz
   
   def now_utc() -> datetime:
       """Return current time in UTC, timezone-aware."""
       return datetime.now(pytz.UTC)
   
   def to_utc(dt: datetime) -> datetime:
       """Convert any datetime to UTC."""
       if dt.tzinfo is None:
           dt = pytz.UTC.localize(dt)
       return dt.astimezone(pytz.UTC)
   ```
3. Update `backend/app/models/base.py` to use timezone-aware datetime:
   ```python
   from datetime import datetime
   import pytz
   from sqlmodel import SQLModel, Field
   
   class BaseModel(SQLModel):
       id: int | None = Field(default=None, primary_key=True)
       created_at: datetime = Field(default_factory=now_utc, sa_type=DateTime(timezone=True))
       updated_at: datetime = Field(default_factory=now_utc, sa_type=DateTime(timezone=True))
   ```
4. Create migration for adding timezone_name column to audit table (optional, for tracking user timezone):
   ```sql
   ALTER TABLE audit_logs ADD COLUMN timezone_name VARCHAR(50);
   ```
5. Update all model classes to inherit from BaseModel (if not already)
6. In FastAPI dependency, ensure session is set to UTC:
   ```python
   await engine.execute("SET SESSION time_zone = '+00:00'")
   ```
7. Update all date comparisons to use `now_utc()` instead of `datetime.now()`
8. Create data migration script to convert existing data:
   ```bash
   python backend/alembic/ensure_utc.py
   ```
   This script will:
   - Find all DATETIME columns without timezone info
   - Assume they are in Mexico City timezone (America/Mexico_City) if no other info
   - Convert to UTC and update database
9. Add .env configuration:
   ```
   TZ=UTC
   DATABASE_TIMEZONE=UTC
   ```
10. Test date handling in pytest:
    ```python
    def test_dates_are_utc():
        asset = create_asset()
        assert asset.created_at.tzinfo == pytz.UTC
        assert asset.created_at > now_utc() - timedelta(seconds=1)
    ```

**Acceptance criteria:**
- [ ] All DATETIME columns are DATETIME(6) with timezone support
- [ ] All Python datetime objects are timezone-aware (tzinfo != None)
- [ ] created_at and updated_at are immutable (not updated after creation)
- [ ] Migration preserves existing data without loss
- [ ] Existing dates assumed to be in America/Mexico_City and converted to UTC
- [ ] No .astimezone() calls in application code (all stored as UTC)
- [ ] Database session_time_zone always set to UTC on connection
- [ ] Audit logs include user_timezone for display purposes

**Security constraints (IMSS Healthcare):**
- Timestamps must be immutable once set (no UPDATE on created_at)
- Date migration must be audited (create migration_audit log entry)
- NOM-016-SSA3-2012 compliance: all clinical records include creation timestamp in audit trail
- Timestamp manipulation attempts must be logged and flagged

**Run these tests after implementation:**
```bash
# Generate migration
alembic revision --autogenerate -m "migrate_dates_to_utc"

# Test migration on staging database
alembic upgrade head

# Verify date columns are correct type
mysql> SHOW COLUMNS FROM assets WHERE Field LIKE '%_at';
# Expected: created_at DATETIME(6), updated_at DATETIME(6)

# Test timezone handling in Python
python -c "
from app.utils.datetime_utils import now_utc
from datetime import datetime
import pytz

dt = now_utc()
print(f'Current UTC: {dt}')
print(f'Timezone: {dt.tzinfo}')
assert dt.tzinfo == pytz.UTC
print('Timezone check passed')
"

# Run pytest timezone tests
pytest tests/test_datetime.py -v

# Stress test: create 1000 records, verify all timestamps are UTC
python -m pytest tests/test_bulk_datetime.py -v

# Migration rollback test
alembic downgrade -1
alembic upgrade +1
# verify data integrity
```

---

## AG-10: LangGraph Agent Orchestrator (WhatsApp→OCR→DB Pipeline)

**Project context:**
Replace or enhance the current OpenClaw-based extraction pipeline with LangGraph for better control, observability, and regulatory compliance. LangGraph provides explicit state management and debugging capabilities ideal for healthcare workflows requiring audit trails.

**Current state:**
- OpenClaw used for data extraction
- Limited visibility into extraction steps
- No explicit state tracking for audit

**Goal:**
Implement LangGraph-based orchestrator that coordinates: voice transcription → QR validation → OCR (fallback) → LLM extraction → triple validation → MySQL storage. Each step is tracked and logged.

**Files to modify/create:**
- `backend/app/services/langgraph_orchestrator.py` (new)
- `backend/app/models/orchestration_state.py` (new)
- `backend/app/routers/orchestration.py` (new)

**Technical requirements:**
- langgraph 0.0.40+
- langchain 0.1.0+
- langchain-openai or langchain-anthropic (Claude)
- pydantic for state schema
- Python 3.10+

**Implementation steps (follow this order):**
1. Create `backend/app/models/orchestration_state.py` with StateGraph definition:
   ```python
   from typing import Annotated
   from langgraph.graph import StateGraph
   from pydantic import BaseModel
   
   class IntakeState(BaseModel):
       # Input
       qr_code_id: str
       voice_transcript: str | None = None
       image_path: str | None = None
       technician_id: int
       
       # Processing steps
       asset: dict | None = None
       qr_valid: bool = False
       extracted_data: dict | None = None
       extraction_confidence: float = 0.0
       
       # Output
       success: bool = False
       error_message: str | None = None
       final_asset_id: int | None = None
   ```
2. Create `backend/app/services/langgraph_orchestrator.py` with node functions:
   ```python
   async def node_validate_qr(state: IntakeState) -> IntakeState:
       """Validate QR code and lookup asset."""
       asset = await db.get_asset(qr_code_id=state.qr_code_id)
       if not asset:
           state.error_message = "QR code not found in database"
           return state
       state.asset = asset
       state.qr_valid = True
       return state
   
   async def node_transcribe_voice(state: IntakeState) -> IntakeState:
       """Transcribe voice note if provided."""
       if not state.voice_transcript and state.image_path:
           # Voice transcription already done or use OCR fallback
           pass
       return state
   
   async def node_extract_fields(state: IntakeState) -> IntakeState:
       """Use LLM to extract structured data from text."""
       if not state.qr_valid:
           return state
       
       prompt = f"""
       Asset: {state.asset['name']}
       Technician notes: {state.voice_transcript or 'Image OCR needed'}
       
       Extract these fields:
       - condition_assessment: (operational/degraded/maintenance_required)
       - maintenance_type: (preventive/corrective)
       - estimated_lifespan_remaining: (months)
       - notes: (free text)
       """
       
       response = await llm.invoke(prompt)
       state.extracted_data = parse_response(response)
       state.extraction_confidence = 0.85  # or from LLM
       return state
   
   async def node_validate_extracted(state: IntakeState) -> IntakeState:
       """Validate extracted data meets requirements."""
       if state.extraction_confidence < 0.7:
           state.error_message = "Extraction confidence too low; requires manual review"
           return state
       
       required_fields = ['condition_assessment', 'maintenance_type']
       if not all(field in state.extracted_data for field in required_fields):
           state.error_message = "Missing required fields in extraction"
           return state
       
       return state
   
   async def node_store_database(state: IntakeState) -> IntakeState:
       """Store validated data in MySQL."""
       if state.error_message:
           return state
       
       maintenance_record = MaintenanceLog(
           asset_id=state.asset['id'],
           technician_id=state.technician_id,
           condition=state.extracted_data['condition_assessment'],
           maintenance_type=state.extracted_data['maintenance_type'],
           notes=state.extracted_data['notes'],
           created_at=now_utc(),
       )
       await db.save(maintenance_record)
       state.final_asset_id = state.asset['id']
       state.success = True
       return state
   ```
3. Build the graph:
   ```python
   graph = StateGraph(IntakeState)
   
   graph.add_node("validate_qr", node_validate_qr)
   graph.add_node("transcribe_voice", node_transcribe_voice)
   graph.add_node("extract_fields", node_extract_fields)
   graph.add_node("validate_extracted", node_validate_extracted)
   graph.add_node("store_database", node_store_database)
   
   graph.add_edge("START", "validate_qr")
   graph.add_conditional_edges(
       "validate_qr",
       lambda state: "transcribe_voice" if state.qr_valid else "END",
   )
   graph.add_edge("transcribe_voice", "extract_fields")
   graph.add_edge("extract_fields", "validate_extracted")
   graph.add_conditional_edges(
       "validate_extracted",
       lambda state: "store_database" if not state.error_message else "END",
   )
   graph.add_edge("store_database", "END")
   
   app = graph.compile()
   ```
4. Create `backend/app/routers/orchestration.py` with endpoint:
   ```python
   @router.post("/api/v1/orchestration/intake")
   async def intake_via_langgraph(request: IntakeRequest) -> IntakeResponse:
       state = IntakeState(
           qr_code_id=request.qr_code_id,
           voice_transcript=request.voice_transcript,
           image_path=request.image_path,
           technician_id=request.technician_id,
       )
       
       final_state = await orchestrator.ainvoke(state)
       
       return IntakeResponse(
           success=final_state.success,
           asset_id=final_state.final_asset_id,
           error=final_state.error_message,
       )
   ```
5. Add logging at each node:
   ```python
   logger.info(f"LangGraph node: validate_qr → {state.qr_valid}")
   ```
6. Implement checkpointing for debugging:
   ```python
   from langgraph.checkpoint.sqlite import SqliteSaver
   
   saver = SqliteSaver()
   app = graph.compile(checkpointer=saver)
   ```
7. Create tests that invoke graph step-by-step with mock data
8. Add visualization of graph:
   ```python
   from IPython.display import Image, display
   display(Image(app.get_graph().draw_png()))
   ```
9. Implement retry logic for transient failures
10. Add metrics: track node execution times and error rates

**Acceptance criteria:**
- [ ] Graph executes all nodes in correct order
- [ ] QR validation node blocks invalid codes
- [ ] Extraction node produces structured output
- [ ] Storage node writes to MySQL
- [ ] Error messages propagate and prevent downstream nodes from executing
- [ ] Entire pipeline <30s end-to-end
- [ ] All steps are logged with timestamps
- [ ] Checkpointing enables step-by-step debugging
- [ ] Graph can be visualized

**Security constraints (IMSS Healthcare):**
- All PII in state must be marked as sensitive (for logging redaction)
- Graph execution must be logged for audit trail
- Failed extractions stored for manual review with restricted access

**Run these tests after implementation:**
```bash
# Test graph compilation
python -c "from app.services.langgraph_orchestrator import app; print(app)"

# Test graph visualization
python -c "
from app.services.langgraph_orchestrator import app
import json
print(json.dumps(app.get_graph().to_dict(), indent=2))
"

# Test single node
python -c "
from app.services.langgraph_orchestrator import node_validate_qr, IntakeState
state = IntakeState(qr_code_id='QR-001', technician_id=1)
result = await node_validate_qr(state)
print(result)
" --async

# End-to-end test
curl -X POST http://localhost:8000/api/v1/orchestration/intake \
  -H "Authorization: Bearer TECH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code_id": "QR-001",
    "voice_transcript": "Equipo funciona correctamente",
    "technician_id": 1
  }' | jq '.'

# Check checkpointer sqlite
sqlite3 langgraph.db "SELECT * FROM checkpoints;" 
```

---

## AG-11: Docker Compose Production Stack

**Project context:**
Create complete Docker Compose stack for SIGAB production deployment on Lenovo ThinkCentre M720q. Include FastAPI backend, Node.js Baileys WhatsApp service, MySQL 8.0, Nginx reverse proxy, Uptime Kuma monitoring, and Netdata system monitoring. All services containerized with persistent volumes, health checks, SSL termination, and networking.

**Current state:**
- No containerization
- Manual dependency management
- No orchestration or monitoring

**Goal:**
Production-ready docker-compose.yml with all services, volume persistence, health checks, SSL/TLS, and observability.

**Files to create:**
- `docker-compose.yml` (main)
- `docker-compose.prod.yml` (production overrides)
- `.dockerignore`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `nginx/nginx.conf` (new)
- `nginx/Dockerfile` (new)
- `nginx/ssl/` (SSL certificates)
- `.env.example` (environment template)

**Technical requirements:**
- Docker 24.0+
- Docker Compose 2.20+
- Nginx 1.25+
- MySQL 8.0
- Python 3.10
- Node.js 18+
- OpenSSL (for SSL certificates)

**Implementation steps (follow this order):**
1. Create root `docker-compose.yml` with all services:
   ```yaml
   version: '3.9'
   
   services:
     # MySQL Database
     mysql:
       image: mysql:8.0
       container_name: sigab-mysql
       environment:
         MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
         MYSQL_DATABASE: ${MYSQL_DATABASE}
         MYSQL_USER: ${MYSQL_USER}
         MYSQL_PASSWORD: ${MYSQL_PASSWORD}
         TZ: UTC
       ports:
         - "3306:3306"
       volumes:
         - mysql_data:/var/lib/mysql
         - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
       healthcheck:
         test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
         interval: 10s
         timeout: 5s
         retries: 5
       networks:
         - sigab-network
     
     # FastAPI Backend
     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       container_name: sigab-backend
       environment:
         DATABASE_URL: mysql+asyncmy://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
         REDIS_URL: redis://redis:6379
         ENVIRONMENT: production
         LOG_LEVEL: info
       ports:
         - "8000:8000"
       volumes:
         - ./backend:/app
       depends_on:
         mysql:
           condition: service_healthy
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
         interval: 10s
         timeout: 5s
         retries: 3
       networks:
         - sigab-network
     
     # Node.js Baileys WhatsApp Service
     whatsapp:
       build:
         context: ./backend/services/whatsapp
         dockerfile: Dockerfile
       container_name: sigab-whatsapp
       environment:
         REDIS_URL: redis://redis:6379
         LOG_LEVEL: info
       volumes:
         - whatsapp_sessions:/app/.wwebjs_auth
       depends_on:
         - redis
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
       networks:
         - sigab-network
     
     # Redis (session cache)
     redis:
       image: redis:7-alpine
       container_name: sigab-redis
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       command: redis-server --appendonly yes
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 3
       networks:
         - sigab-network
     
     # Nginx Reverse Proxy
     nginx:
       build:
         context: ./nginx
         dockerfile: Dockerfile
       container_name: sigab-nginx
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
         - ./nginx/ssl:/etc/nginx/ssl:ro
         - certbot_certs:/etc/letsencrypt
       depends_on:
         - backend
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost/health"]
         interval: 10s
         timeout: 5s
         retries: 3
       networks:
         - sigab-network
     
     # Uptime Kuma Monitoring
     uptime-kuma:
       image: louislam/uptime-kuma:latest
       container_name: sigab-uptime-kuma
       ports:
         - "3001:3001"
       volumes:
         - uptime_kuma_data:/app/data
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3001"]
         interval: 10s
         timeout: 5s
         retries: 3
       networks:
         - sigab-network
     
     # Netdata System Monitoring
     netdata:
       image: netdata/netdata:latest
       container_name: sigab-netdata
       ports:
         - "19999:19999"
       volumes:
         - /etc/passwd:/host/etc/passwd:ro
         - /etc/group:/host/etc/group:ro
         - /proc:/host/proc:ro
         - /sys:/host/sys:ro
       environment:
         - PGID=0
       cap_add:
         - SYS_PTRACE
       networks:
         - sigab-network
   
   volumes:
     mysql_data:
     redis_data:
     whatsapp_sessions:
     uptime_kuma_data:
   
   networks:
     sigab-network:
       driver: bridge
   ```

2. Create `backend/Dockerfile`:
   ```dockerfile
   FROM python:3.10-slim
   
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

3. Create `nginx/Dockerfile`:
   ```dockerfile
   FROM nginx:1.25-alpine
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 80 443
   ```

4. Create `nginx/nginx.conf` with SSL termination and reverse proxy:
   ```nginx
   events {
       worker_connections 1024;
   }
   
   http {
       upstream backend {
           server backend:8000;
       }
       
       # Redirect HTTP to HTTPS
       server {
           listen 80;
           server_name _;
           return 301 https://$host$request_uri;
       }
       
       # HTTPS server
       server {
           listen 443 ssl http2;
           server_name sigab.hospital.local;
           
           ssl_certificate /etc/nginx/ssl/cert.pem;
           ssl_certificate_key /etc/nginx/ssl/key.pem;
           ssl_protocols TLSv1.2 TLSv1.3;
           ssl_ciphers HIGH:!aNULL:!MD5;
           
           location /api {
               proxy_pass http://backend;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           }
           
           location / {
               root /usr/share/nginx/html;
               try_files $uri $uri/ /index.html;
           }
       }
   }
   ```

5. Create `.env.example`:
   ```
   MYSQL_ROOT_PASSWORD=sigab_root_secure_pass_change_me
   MYSQL_USER=sigab_user
   MYSQL_PASSWORD=sigab_pass_change_me
   MYSQL_DATABASE=sigab_db
   
   ENVIRONMENT=production
   LOG_LEVEL=info
   
   REDIS_URL=redis://redis:6379
   
   WHATSAPP_WEBHOOK_URL=https://sigab.hospital.local/api/v1/webhooks/whatsapp
   WHATSAPP_API_KEY=your_webhook_secret
   
   SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
   SSL_KEY_PATH=/etc/nginx/ssl/key.pem
   ```

6. Generate SSL self-signed certificate:
   ```bash
   openssl req -x509 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes
   ```

7. Create `init-db.sql` for initial schema:
   ```sql
   CREATE DATABASE IF NOT EXISTS sigab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE sigab_db;
   
   -- Run Alembic migrations after container start
   ```

8. Create production override `docker-compose.prod.yml`:
   ```yaml
   version: '3.9'
   
   services:
     backend:
       restart: always
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
     
     mysql:
       restart: always
       command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
     
     nginx:
       restart: always
   ```

9. Create startup script `run.sh`:
   ```bash
   #!/bin/bash
   set -e
   
   # Copy .env if not exists
   [ -f .env ] || cp .env.example .env
   
   # Generate SSL if not exists
   [ -f nginx/ssl/cert.pem ] || openssl req -x509 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes -subj "/C=MX/ST=CDMX/L=Mexico/O=IMSS/CN=sigab.hospital.local"
   
   # Build and start containers
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   
   # Run Alembic migrations
   docker-compose exec -T backend alembic upgrade head
   
   echo "SIGAB stack running on https://sigab.hospital.local"
   ```

10. Add health check endpoint to FastAPI:
    ```python
    @app.get("/health")
    async def health():
        return {"status": "ok"}
    ```

**Acceptance criteria:**
- [ ] `docker-compose up -d` starts all 7 services successfully
- [ ] MySQL initialized with schema
- [ ] FastAPI responds on http://localhost:8000/health
- [ ] Nginx reverse proxy routes /api to backend
- [ ] HTTPS terminates at Nginx (port 443)
- [ ] Uptime Kuma accessible on http://localhost:3001
- [ ] Netdata accessible on http://localhost:19999
- [ ] All services have health checks passing
- [ ] Persistent volumes survive container restart
- [ ] Logs aggregated and readable via `docker-compose logs -f [service]`
- [ ] Max memory usage <4GB (fits in M720q with 16GB)

**Security constraints (IMSS Healthcare):**
- SSL certificates rotated automatically (future: Let's Encrypt integration)
- Database credentials in .env, never hardcoded
- Health check endpoints do not expose sensitive data
- All logs sanitized (no PII or credentials)
- Network segmentation via sigab-network bridge

**Run these tests after implementation:**
```bash
# Start stack
./run.sh

# Wait for services to be healthy
sleep 30

# Check all services running
docker-compose ps

# Test API endpoint
curl -k https://localhost/api/v1/health

# Test database connectivity
docker-compose exec backend python -c "from app.database import engine; print('DB OK')"

# Check resource usage
docker stats

# Test log aggregation
docker-compose logs --tail=50

# Monitor Uptime Kuma
open http://localhost:3001

# Monitor Netdata
open http://localhost:19999

# Test SSL certificate
openssl s_client -connect localhost:443 -showcerts

# Shutdown gracefully
docker-compose down

# Verify volumes persist
docker-compose up -d mysql
docker-compose exec mysql mysql -u root -p -e "SELECT COUNT(*) FROM sigab_db.assets;"
docker-compose down

# Restart and verify data still there
docker-compose up -d
# data should be restored
```

---

## Summary of Execution Order and Dependencies

```
AG-01: SQLModel + asyncmy + Alembic ORM Migration (FOUNDATION)
  ↓ (required by all subsequent database operations)

AG-02: PaddleOCR On-Premise Pipeline
  ↓ (no dependency, parallel with AG-03-05)

AG-03: SSE Real-Time Dashboard
  ↓ (requires AG-01 for database)

AG-04: UI Modernization — Recharts + Tremor + Framer Motion + Lucide React
  ↓ (pairs with AG-05 for responsive design)

AG-05: Responsive Dashboard (24" Workstation + 55" Control Room)
  ↓ (builds on AG-04)

AG-06: Baileys WhatsApp Migration (Replace whatsapp-web.js)
  ↓ (foundation for AG-07)

AG-07: WhatsApp QR-First + Whisper STT Voice Note Flow
  ↓ (requires AG-06, uses AG-02 PaddleOCR as fallback)

AG-08: Triple Poka-Yoke Validation (QR + NII + Serial Number)
  ↓ (gates AG-07, AG-10)

AG-09: ISO 8601 UTC Date Migration (MySQL + NOM-016-SSA3-2012)
  ↓ (requires AG-01, supports compliance for AG-07, AG-10)

AG-10: LangGraph Agent Orchestrator (WhatsApp→OCR→DB Pipeline)
  ↓ (orchestrates AG-02, AG-07, AG-08, AG-09)

AG-11: Docker Compose Production Stack (DEPLOYMENT)
  ↓ (containerizes all above services)
```

---

**Generated:** 2026-04-11  
**Language:** English (optimized for Google Antigravity)  
**Format:** Copy-paste ready for Planning Mode

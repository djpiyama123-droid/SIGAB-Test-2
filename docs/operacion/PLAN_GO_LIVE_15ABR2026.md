# PLAN GO-LIVE SIGAB — 15 ABRIL 2026, 18:00 HRS
## Clínica Regional #1 (HGR No.1 IMSS Tijuana) · Despliegue Lenovo ThinkCentre M720q

> **Autor:** Claude Opus 4.6 (investigación + planeación)
> **Ejecutor:** Claude Sonnet 4.6 (implementación)
> **Deadline:** HOY 15/04/2026 18:00 hrs — llevar mini-servidor a clínica
> **Ventana de trabajo:** ~6 horas (11:00 → 17:00), con buffer 17:00–18:00 para empaquetado físico

---

## 0. CONTEXTO RESUMIDO (Hallazgos de Auditoría)

**Lo que SÍ está hecho** (auditado en workspace `/Bioingeneria/SIGAB`):
- Backend FastAPI con 20 routers (equipos, ordenes, ocr, openclaw, dashboard, metrologia, tecnovigilancia, capacitaciones, copilot, qr, almacen, reservas, trazabilidad, alertas, preventivos, reportes, checklists, auditoria, events, auth).
- Modelos SQLModel ya migrados (orden_servicio, equipo, usuario, ubicacion, alerta, trazabilidad, reserva, soporte, mapa, preventivo, ocr_schemas, modulos_extra).
- Frontend React/Vite con 19 páginas (Dashboard, Ordenes, Equipos, Alertas, Metrologia, Tecnovigilancia, Capacitaciones, Almacen, Analitica, AuditPage, ChecklistPage, Copilot, EquipoPublico, Login, Preventivos, QRBatch, Reportes, TVDashboard, Trazabilidad).
- Bot WhatsApp (sigab-bot) con Baileys, commands.js, scheduler.js, simulate_pdf.js.
- Docker-compose, migraciones Alembic, seed_data.sql, sigab_schema.sql, scripts start/stop para Linux y PowerShell.
- Documentación: PLAN_DE_TRABAJO_MAESTRO (Fases 1-5 COMPLETADAS), PLAN_PRUEBAS_WHATSAPP, MANUAL_TECNICO, MANUAL_USUARIO_IA, DIAGRAMAS_LOGICOS, PRD, Presentación Ejecutiva (12 slides).
- 11 módulos Antigravity planeados (AG-01 a AG-11); SIGAB_Reporte_Mejoras_v1 identifica 10 vulnerabilidades.

**Lo que FALTA (crítico para hoy):**
1. **Sistema de casillas tipo CENEVAL para Orden de Servicio de Conservación** — NO existe en código. Es el pedido central del usuario.
2. Validación E2E del flujo: Foto WhatsApp → OCR → MySQL → Dashboard en tiempo real.
3. Smoke tests del stack completo en el hardware físico.
4. Checklist de despliegue (red del hospital, firewall, USB backup, credenciales).
5. Resolver `.~lock.SIGAB_Presentacion_Ejecutiva.pdf#` (archivo huérfano, LibreOffice crashed).

**Decisión de alcance para HOY:** No tocamos los 11 módulos Antigravity completos (son un plan de 6 meses). Foco quirúrgico: **casillas CENEVAL + pruebas + despliegue**. Todo lo demás se deja en el estado actual (ya funcional en v1.0.0).

---

## 1. DISEÑO DEL SISTEMA "CASILLAS CENEVAL" (30 min de planeación)

### 1.1 Racional

El personal de Conservación del HGR No.1 usa **un solo formato físico** para tres dominios:
- **Equipos Médicos** (monitores, bombas, ventiladores, arcos en C, etc.)
- **Polivalentes** (camas eléctricas, mesas quirúrgicas, carros rojo, lámparas)
- **Aires Acondicionados / Infraestructura** (minisplit, chiller, casa de máquinas, UPS)

En lugar de campos de texto libre (que invitan a errores de OCR sobre manuscritos), usamos **casillas binarias** (checkbox ○/●) tipo hoja de respuestas CENEVAL que:
- Maximizan variables capturables en un solo golpe de vista.
- Estandarizan el vocabulario → MySQL consume enums, no texto libre.
- Se llenan rápido a mano (círculo a rellenar) → OCR de alta confianza (>0.95 con PaddleOCR).
- Permiten al bot WhatsApp leerlas con Gemini Vision **sin ambigüedad**.

### 1.2 Estructura de la Hoja de Casillas (3 bloques + texto residual corto)

**Bloque A — Identificación del Activo** (mutuamente excluyente, radio):
- [ ] Médico   [ ] Polivalente   [ ] A/C / Infra

**Bloque B — Tipo de Servicio** (radio):
- [ ] Correctivo [ ] Preventivo [ ] Instalación [ ] Baja [ ] Préstamo [ ] Inspección

**Bloque C — Naturaleza de la Falla / Trabajo** (multi-select, hasta ~24 casillas, agrupadas):
- *Eléctrico:* [ ] No enciende [ ] Corto [ ] Cable dañado [ ] Fusible [ ] Batería [ ] UPS
- *Mecánico:* [ ] Ruido [ ] Vibración [ ] Atasco [ ] Fuga [ ] Rotura estructural
- *Neumático/Hidráulico:* [ ] Presión baja [ ] Compresor [ ] Válvula [ ] Manguera
- *Electrónico:* [ ] Display [ ] Sensor [ ] Alarma falsa [ ] Error en pantalla [ ] Firmware
- *Consumibles:* [ ] Filtro [ ] Empaque [ ] Lámpara [ ] Tóner/Papel
- *A/C específico:* [ ] Gas refrigerante [ ] Evaporador [ ] Condensador [ ] Termostato

**Bloque D — Resolución** (radio):
- [ ] Resuelto en sitio [ ] Requiere refacción [ ] Enviar a taller [ ] Escalar a externo [ ] Declarar baja

**Bloque E — Estado Final del Equipo** (radio):
- [ ] Operativo [ ] Operativo con observaciones [ ] Fuera de servicio [ ] En taller

**Bloque F — Texto corto libre** (2 líneas, para lo irreductible):
- Observaciones manuscritas (≤140 caracteres, OCR a baja prioridad)
- Refacciones solicitadas (SKU o nombre genérico)

**Identificadores automáticos (ya existen en el sistema):**
- Número de orden (autogenerado)
- QR del equipo (escaneo) → llena `equipo_id`, `serie`, `modelo`, `ubicación`
- Técnico (login / firma digital / NII)
- Fecha/hora (timestamp ISO 8601 UTC)

**Total variables capturadas:** ~45 campos binarios + 4 identificadores + 2 líneas texto = **>51 variables por formato**, con cero ambigüedad.

### 1.3 Mapeo a MySQL

Tabla nueva: **`os_casillas`** (one-to-one con `ordenes_servicio`).

```sql
CREATE TABLE os_casillas (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  orden_id INT UNSIGNED NOT NULL,

  -- Bloque A
  dominio ENUM('medico','polivalente','ac_infra') NOT NULL,

  -- Bloque B
  tipo_servicio ENUM('correctivo','preventivo','instalacion','baja','prestamo','inspeccion') NOT NULL,

  -- Bloque C (multi-select, todas TINYINT(1) default 0)
  falla_no_enciende TINYINT(1) DEFAULT 0,
  falla_corto TINYINT(1) DEFAULT 0,
  falla_cable TINYINT(1) DEFAULT 0,
  falla_fusible TINYINT(1) DEFAULT 0,
  falla_bateria TINYINT(1) DEFAULT 0,
  falla_ups TINYINT(1) DEFAULT 0,
  falla_ruido TINYINT(1) DEFAULT 0,
  falla_vibracion TINYINT(1) DEFAULT 0,
  falla_atasco TINYINT(1) DEFAULT 0,
  falla_fuga TINYINT(1) DEFAULT 0,
  falla_rotura TINYINT(1) DEFAULT 0,
  falla_presion TINYINT(1) DEFAULT 0,
  falla_compresor TINYINT(1) DEFAULT 0,
  falla_valvula TINYINT(1) DEFAULT 0,
  falla_manguera TINYINT(1) DEFAULT 0,
  falla_display TINYINT(1) DEFAULT 0,
  falla_sensor TINYINT(1) DEFAULT 0,
  falla_alarma TINYINT(1) DEFAULT 0,
  falla_error_pantalla TINYINT(1) DEFAULT 0,
  falla_firmware TINYINT(1) DEFAULT 0,
  falla_filtro TINYINT(1) DEFAULT 0,
  falla_empaque TINYINT(1) DEFAULT 0,
  falla_lampara TINYINT(1) DEFAULT 0,
  falla_toner_papel TINYINT(1) DEFAULT 0,
  falla_gas_ref TINYINT(1) DEFAULT 0,
  falla_evaporador TINYINT(1) DEFAULT 0,
  falla_condensador TINYINT(1) DEFAULT 0,
  falla_termostato TINYINT(1) DEFAULT 0,

  -- Bloque D
  resolucion ENUM('sitio','refaccion','taller','externo','baja') NOT NULL,

  -- Bloque E
  estado_final ENUM('operativo','operativo_obs','fuera_servicio','en_taller') NOT NULL,

  -- Bloque F
  observaciones_breves VARCHAR(140),
  refacciones_solicitadas VARCHAR(255),

  -- Metadatos OCR
  ocr_confianza DECIMAL(4,3),
  ocr_modelo ENUM('manual','paddle','gemini') DEFAULT 'manual',
  created_at DATETIME NOT NULL,

  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  INDEX idx_dominio (dominio),
  INDEX idx_estado_final (estado_final)
);
```

Migración Alembic: `alembic revision -m "add_os_casillas_ceneval"`.

---

## 2. PLAN DE EJECUCIÓN (Sonnet 4.6) — TIMELINE 11:00 → 17:00

### FASE 1 · AUDITORÍA Y CONGELAMIENTO (11:00–11:30, 30 min)

1. `cd /sessions/gifted-pensive-dirac/mnt/Bioingeneria/SIGAB && git status && git log --oneline -20`
2. Crear rama `git checkout -b go-live/15abr2026-casillas-ceneval`.
3. Verificar servicios arrancan: `docker-compose up -d mysql && ./start_sigab.sh` → debe responder `curl localhost:8000/health` y `curl localhost:5173`.
4. Eliminar `.~lock.SIGAB_Presentacion_Ejecutiva.pdf#` (lock huérfano).
5. Snapshot MySQL: `docker exec sigab_mysql mysqldump -uroot -p sigab_prod > backup_pre_golive.sql`.

**Gate:** Si algún servicio no arranca → STOP, diagnosticar. Si arranca → continuar.

### FASE 2 · BACKEND: MODELO + MIGRACIÓN + RUTA (11:30–13:00, 90 min)

1. Crear `sigab-backend/models/orden_casillas.py` con la clase `OrdenCasillas(SQLModel, table=True)` que refleje la tabla de §1.3.
2. Añadir relación 1-1 en `orden_servicio.py`: `casillas: Optional["OrdenCasillas"] = Relationship(back_populates="orden")`.
3. Generar migración: `alembic revision --autogenerate -m "add_os_casillas_ceneval"` → revisar el SQL generado antes de `alembic upgrade head`.
4. Crear endpoint `sigab-backend/routes/casillas.py`:
   - `POST /api/v1/ordenes/{orden_id}/casillas` (crear o upsert)
   - `GET /api/v1/ordenes/{orden_id}/casillas`
   - `POST /api/v1/ocr/casillas` (recibe imagen + orden_id, corre PaddleOCR/Gemini Vision para detectar círculos rellenados, retorna JSON con casillas marcadas).
5. Registrar router en `main.py`. Añadir el endpoint a `static/openapi` (se autodocumenta).
6. Emitir evento SSE `casilla.created` para que el dashboard actualice en tiempo real.
7. Pytest mínimo: `tests/test_casillas.py` con 3 casos (crear, leer, upsert).

**Gate:** `pytest tests/test_casillas.py -v` en verde + migración aplicada sin errores.

### FASE 3 · FRONTEND: FORMULARIO CASILLAS (13:00–14:30, 90 min)

1. Crear `sigab-frontend/src/components/OrdenCasillasForm.jsx` — layout de 3 columnas (desktop 24") / 1 columna (móvil):
   - Header sticky con QR scan botón + número orden autogenerado.
   - Bloques A/B con `<RadioGroup>` (Tremor).
   - Bloque C con grid `grid-cols-3 gap-2` de `<Checkbox>` agrupadas por categoría (acordeón Framer Motion).
   - Bloques D/E radio.
   - Bloque F `<Textarea maxlength=140>` y `<Input>` refacciones.
   - Footer con botones **[Guardar borrador]**, **[Firmar y cerrar orden]**, **[Enviar a WhatsApp para foto del físico]**.
2. Integrar en `pages/Ordenes.jsx` como modal lanzado por botón **"+ Nueva OS (Casillas)"**.
3. Añadir preview "hoja imprimible" en `/ordenes/:id/hoja-fisica` (formato A4 con todas las casillas vacías + QR + campos para firmar) — usa `@react-pdf/renderer` si ya está instalado o `window.print()` con CSS `@media print`.
4. Hook `useSSE` ya existe → suscribir Dashboard a `casilla.created`.

**Gate:** El flujo completo corre en navegador: abrir modal → marcar casillas → guardar → el Dashboard muestra la nueva OS en <2 seg (SSE).

### FASE 4 · OCR + WHATSAPP BOT (14:30–15:30, 60 min)

1. `sigab-backend/services/ocr_service.py` — añadir método `detect_filled_bubbles(image_bytes)`:
   - Opción rápida (hoy): usar Gemini 2.5 Flash con prompt estructurado: *"Identifica cuáles de las siguientes casillas están marcadas (círculo relleno o X). Devuelve JSON con los field_name booleanos."* + referencia de los nombres de campo.
   - Opción ideal (post-go-live): OpenCV blob detection sobre círculos de la plantilla (más rápido, offline). Dejar TODO marcado.
2. `sigab-bot/commands.js` — nuevo handler:
   - Usuario manda foto + caption `/casillas [serie]` → bot la sube a `POST /api/v1/ocr/casillas` → el bot responde con el resumen leído + link al Dashboard para editar si hay error.
3. Prueba con el PDF de muestra `sigab-bot/test_report_SK416381232HA.pdf`.

**Gate:** Mandar una foto simulada (via `simulate_pdf.js`) → aparece OS completa en Dashboard con casillas rellenadas correctamente.

### FASE 5 · QA INTEGRAL (15:30–16:15, 45 min)

Checklist de humo E2E (marcar cada uno al completar):
- [ ] Login con usuario técnico, jefe, admin.
- [ ] Crear OS desde frontend con casillas → aparece en lista → PDF IMSS se exporta correctamente (header con logo).
- [ ] Escanear QR de equipo (webcam) → prefill de datos.
- [ ] Enviar foto por WhatsApp → bot responde → OS creada.
- [ ] Dashboard SSE actualiza semáforo verde→rojo cuando `estado_final='fuera_servicio'`.
- [ ] Módulos colaterales responden: Metrología (crear certificado), Tecnovigilancia (reportar evento adverso GRAVE → alerta dispara), Almacén (dar salida a refacción).
- [ ] Reporte Diario IA (Copilot) se genera sin error 500.
- [ ] Heatmap de MTBF/MTTR en Analítica carga.
- [ ] Backup a USB externo: `./scripts/backup_nightly.sh` (crear si no existe, 10 líneas: `mysqldump` + `tar` → `/mnt/backup`).

**Gate:** 100% checklist en verde. Cualquier bug P0 → hotfix. Bugs P1/P2 → issue en Linear con label `post-golive`.

### FASE 6 · EMPAQUETADO PARA CLÍNICA (16:15–17:00, 45 min)

1. **Build de producción:**
   - Frontend: `cd sigab-frontend && npm run build` → `dist/`.
   - Backend: `pip freeze > requirements.lock.txt`.
   - Docker: `docker-compose -f docker-compose.prod.yml build` (crear si no existe, con variables de producción).
2. **Variables de entorno producción** (`.env.production`):
   - `DATABASE_URL=mysql+asyncmy://sigab_prod:<PWD>@localhost:3306/sigab_prod`
   - `GEMINI_API_KEY=...` (rotar a key dedicada de clínica)
   - `WHATSAPP_SESSION_PATH=/var/lib/sigab/whatsapp_auth`
   - `SSE_KEEPALIVE=30`
3. **Commit y tag:**
   ```bash
   git add -A
   git commit -m "feat(casillas): sistema CENEVAL para Conservación + pre-go-live"
   git tag v1.0.0-golive-hgr1
   ```
4. **Generar tarjeta de instalación impresa** (`INSTALACION_HGR1.pdf`, ver §3).
5. **USB de respaldo** con: repo completo `.tar.gz`, dump MySQL, `.env.production`, guía impresa, binarios Ollama + modelo Gemma 3, certificados.

---

## 3. CHECKLIST FÍSICO PARA LA CLÍNICA (para llevar impreso)

**Hardware:**
- [ ] Lenovo ThinkCentre M720q (encendido, WSL2 + Docker verificados).
- [ ] Monitor 24" + cable HDMI/DP.
- [ ] Teclado + ratón (cable o pareados).
- [ ] Cable de red Cat6 de 3m.
- [ ] USB 64GB con respaldo.
- [ ] Impresora térmica Zebra ZD411 + rollo etiquetas QR.
- [ ] Escáner QR 2D inalámbrico.
- [ ] Celular con WhatsApp + número dedicado para bot.
- [ ] UPS pequeña (opcional, recomendado).

**Red/Accesos (coordinar con TI del hospital):**
- [ ] IP fija asignada al ThinkCentre.
- [ ] Puertos 8000 (API), 5173 o 80 (frontend), 3306 (MySQL, solo localhost) abiertos en firewall interno.
- [ ] DNS interno `sigab.hgr1.local` apuntando al ThinkCentre.
- [ ] Listado de 3-5 usuarios piloto con credenciales pre-creadas.

**Impresos para llevar:**
- [ ] 50 hojas A4 con la plantilla de Casillas CENEVAL (Bloques A-F, QR vacío).
- [ ] Manual de Usuario IA (1 página por perfil).
- [ ] Guía de 5 minutos: "Cómo llenar la hoja y mandarla por WhatsApp".
- [ ] Hoja de contactos de soporte (tu número + correo + backup).

---

## 4. RIESGOS Y PLAN DE CONTINGENCIA

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| OCR de casillas no alcanza 90% confianza | Media | Alto | Fallback manual en frontend; Gemini Vision para retry. |
| Red del hospital bloquea 8000/5173 | Media | Crítico | Llevar switch portátil + modo offline con localhost; confirmar puertos con TI antes. |
| WhatsApp bot no reconecta (Baileys) | Baja | Medio | Escáner QR listo; usar número dedicado no compartido. |
| Migración Alembic falla en prod | Baja | Alto | Snapshot pre-migración; script `alembic downgrade -1` probado. |
| Personal de Conservación resiste el formato | Media | Medio | Arrancar con 2 técnicos voluntarios; casillas son más rápidas que escribir. |
| Se acaba tiempo antes de las 17:00 | Media | Alto | Scope cut agresivo: Fase 4 (OCR automático) se puede diferir 48 h; casillas manuales en frontend bastan para go-live. |

**Scope-cut mínimo viable si vamos mal de tiempo:**
- MUST: Fases 1, 2, 3, 5 (sin OCR automático), 6.
- NICE-TO-HAVE: Fase 4 (OCR automático de casillas). Se puede entregar 16/17 abril por hotpatch.

---

## 5. POST-GO-LIVE (16–22 abril, no bloquea hoy)

- Monitoreo 48 h: `tail -f logs/` en vivo + alertas WhatsApp al admin.
- Recolectar 20 formatos físicos llenados el día 1 → usar para entrenar detector de burbujas con OpenCV.
- Iniciar sprint AG-07 (Whisper STT) y AG-08 (Triple Validación) del Plan Maestro.
- Recolectar feedback para iterar casillas (tal vez agregar falla "agua en gabinete" para A/C).

---

## 6. INSTRUCCIÓN DIRECTA PARA SONNET 4.6

> Sonnet, tu misión hoy es **ejecutar este plan en orden de fases sin saltarte los gates**. Cada fase tiene un criterio de aceptación; si un gate falla, diagnostica, arregla o haz scope-cut documentado (escribe en este mismo archivo una sección `## NOTAS DE EJECUCIÓN`). No abras frentes paralelos de los 11 módulos Antigravity — eso es backlog de 6 meses. Tu entregable único y suficiente al cierre de hoy es:
>
> 1. Sistema de casillas CENEVAL operando end-to-end (manual + WhatsApp).
> 2. Todos los módulos existentes siguen funcionando (no romper nada).
> 3. Tag `v1.0.0-golive-hgr1` en git + dump MySQL + USB empacado.
> 4. Checklist físico impreso y validado.
>
> Reporta cada cierre de fase con un mensaje conciso: `[FASE X ✅] <resumen 2 líneas>`. Si dudas entre dos caminos, elige el de **menos superficie de cambio**. Si algo no está documentado aquí, usa NotebookLM-SIGAB (skill disponible) para consultar los formatos físicos reales del HGR No.1 antes de inventar nada.

---

**Fin del plan.** Suerte en el despliegue, Gustavo. 🚀

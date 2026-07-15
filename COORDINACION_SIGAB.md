# COORDINACIÓN SIGAB — Carril BACKEND+DATOS (Claude Code)

> Rama: `feat/import-2026-metadatos` · Worktree: `.claude/worktrees/claude-backend-import-2026`
> Tarea: indexar `Bioingeneria/2026` y cablear metadatos a `equipos` (todo aditivo).
> Para Hermes/OpenCode: este carril NO toca DESIGN.md ni .jsx visuales.

## Contrato con OpenCode (frontend)
- Bandera nueva en `equipos`: **`imagen_referencial`** (BOOL, default 0) — pendiente migración (paso 5).
- **`fotos`**: JSON array de URLs (string en BD). Ya existe en el modelo.
- `tipo_adquisicion` ∈ {recurso_propio, contrato_consolidado, garantia, subrogado}.
- Campos de contrato ya en modelo: `numero_contrato`, `numero_contrato_servicio`, `proveedor_servicio`, `contrato_pdf_url`, `hojas_servicio_urls`.

## PASO 0 — Seguridad/DB ✅
- BD de prod: **`sigah`** (MySQL 8.0, host 127.0.0.1:3306, user `sigah_user`). Credenciales en `sigab-backend/.env` (no expuestas).
- BD local de dev: solo 1 equipo. **Los 778 reales viven en el VPS.** Nada escrito a prod.
- Migración `fb21941638ba` (campos de contrato) ya aplicada en la BD local; columnas presentes.

## PASO 1-2 — Parser + staging + match (dry-run) ✅
- `scripts/import_2026/parse_2026.py` → lee CEDULAS (consolidado, garantía) + CALENDARIOS recurso propio + nombres .docx. Salida: `staging/equipos_2026.{json,csv}`.
  - **656 registros**, 627 con serie (95%), 432 series únicas.
  - Normalización: upper + sin separadores (hace coincidir `518-0187087` ↔ `5180187087`).
  - Hallazgo: las cédulas traen serie + proveedor + calendario/vigencia, **no** nº de contrato ni inventario → cruce será por **serie** (fallback inventario).
- `scripts/import_2026/match_2026.py` → cruza staging vs referencia (legacy dump / CSV / mysql).
  - Dry-run vs dump legacy `equipomedico` (~751 series): **337 match por serie (78%)**, 95 sin match, 29 sin serie.
  - `staging/no_match.csv` para revisión.

## PASO 3 — Carga aditiva (DRY-RUN) ✅ listo, pendiente OK para aplicar
- Acceso prod vía **túnel SSH read-only** (`sigab-vps` → `docker exec sigah-mysql`). Prod real: **882 equipos** (no 778), todos con serie, 515 con inventario, **192 sin foto**.
- Cruce real: **421/431 series cruzan (97%)**, 10 sin match, 29 sin serie.
- `load_2026.py` (dry-run, no escribe): plan aditivo solo rellena huecos.
  - **8 UPDATEs de relleno** (4 tipo_adquisicion null→valor, 5 proveedor vacío→valor).
  - El grueso YA estaba cargado (413 tipo + 206 proveedor coinciden) — hubo carga previa.
  - **51 conflictos NO se tocan**: 47 proveedor = mismo proveedor distinta redacción (cosmético), 4 tipo = reclasificación (prod=recurso_propio vs cédula 2026=consolidado/garantía).
  - Bug corregido: "INICIO DE CONTRATO" (año) ya no se confunde con numero_contrato.
- `staging/plan_update.sql` (envuelto en ROLLBACK), `staging/conflictos.csv`.

## PASO 5/6 — esquema + exposición + serving ✅ (código), pendiente aplicar migración
- `imagen_referencial: bool = False` en modelo `Equipo` + migración `c7d8e9f0a1b2` (aditiva, server_default 0). Encadena a `fb21941638ba`.
- Exposición en API: **automática** (endpoints usan `model_dump()`).
- Serving `/static/uploads/REFERENCIAL/`: **automático** (`main.py` monta `/static`).

## PASO 4 — fotos históricas (parcial)
- `migrate_photos.py`/`link_images.py` migran de `dummyequipomedicoimss.equipomedico` (ruta_*) → `equipos.imagen_url`+`fotos`. Prod ya tiene **690/882 con foto**. Falta verificar si la BD vieja en prod aporta fotos a los 192 sin foto.

## Pendiente / decisiones abiertas
- [ ] **OK de Gustavo** para aplicar a prod: (a) 8 UPDATEs de relleno, (b) migración `imagen_referencial`.
- [ ] Política para los 4 conflictos de tipo (reclasificar a la cédula 2026 sí/no).
- [ ] PASO 5 scraping: fuente de imágenes web, lote de 20 + muestra antes de correr todo.
- [ ] PASO 4: confirmar BD vieja en prod y fotos para los 192 sin foto.

## Commits
- `a49d279` esquema campos de contrato + endpoint importar-contratos-zip (base).
- `d122cef` parser + cruce + carga aditiva (dry-run) de metadatos 2026.

---

# FASE 1 — Bugs backend (Claude Code, 2026-07-14)

> Rama: `fix/backend-bugs-fase1-2026-07-14` · PR: #TBD (ver commit de seguimiento)
> Encargo directo de Gustavo (no viene de una tabla de Antigravity — este archivo
> no tenía tal tabla al momento de empezar; ver nota al final de esta sección).

| Bug | Descripción | Estado | Detalle |
|---|---|---|---|
| 2 | Alta de equipo: columna faltante en BD prod | **HECHO (migración preparada, sin aplicar)** | Ver abajo — "Bug 2". |
| 3 | Endpoint para subir N fotos por equipo | **HECHO (ya existía, verificado)** | `POST /api/equipos/{id}/imagenes` — sin cambios de código. |
| 4 | OS rápida: corregir endpoint | **HECHO** | Ver abajo — "Bug 4". |
| 5 | Router `/api/casillas` colgado en prod | **HECHO (verificado, no era el bug)** | Ver abajo — "Bug 5". |
| 6a | `orden.fotos` no llega a `/api/formatos` | **HECHO (ya implementado, verificado)** | Ver abajo — "Bug 6a". |

### Bug 5 — router `/api/casillas`
Verificado en vivo contra prod: `curl https://sigah.129-121-100-147.sslip.io/api/casillas/resumen/dominio`
→ **HTTP 401** (no timeout, no 404, no 502) — el router está registrado en
`main.py` y responde normalmente; solo exige el JWT, como se espera. No estaba
"colgado". El código de `routes/casillas.py` (upsert/get/pdf/ocr/resumen) está
completo y correcto. Los bugs de UX de casillas (botón guardar deshabilitado,
`handleDescargarPdf`, firma de `broadcast()`) ya se arreglaron y están en
prod desde el PR #16 (`fix/fase1-bugs-lunes-2026-07-13`, commits `88ecf0b`/`21f012a`).
Sin cambios de código en este PR.

### Bug 6a — `orden.fotos` en `/api/formatos`
Verificado en código: `routes/formatos.py` (`formato_con_datos`) ya arma
`orden_dict["fotos"]` desde la tabla `os_evidencias` (modelo `EVIDENCIA_OS`),
filtrando PDFs y devolviendo `{url, descripcion}` por foto — construido sobre
el commit base `87e7315` que pediste como referencia, ya en prod. El frontend
(`formatoHelpers.jsx` → `FormatoEvidenciaFotografica`, usado por
`FormatoOSPreventivo.jsx` y `FormatoOSCorrectivo.jsx`) ya acepta tanto el
formato `{url, descripcion}` como strings sueltas y pinta la sección
"Evidencia Fotográfica del Proceso". Sin cambios de código en este PR.

### Bug 3 — N fotos por equipo
Ya existe `POST /api/equipos/{equipo_id}/imagenes` (`routes/equipos.py`):
acepta una lista de archivos, valida extensión/tamaño/imagen real con PIL,
las agrega a `equipo.fotos` (JSON array, columna ya existente — **no**
necesitó reutilizar `equipo_documentos`/migración 010, que es para
expedientes/contratos, no para galería de fotos) y sincroniza `imagen_url`
con la primera foto. El frontend (`EquipoForm.jsx`) ya lo consume y avisa si
quedan <3 fotos. Sin cambios de código en este PR.

### Bug 4 — OS rápida: endpoint
`POST /ordenes/` (`routes/ordenes.py::crear_orden`) generaba el folio
`OS-YYYYMMDD-NNNN` contando filas del año y luego insertando, **sin
protección de concurrencia ni manejo de errores** (a diferencia de
`crear_equipo`, que sí atrapa `IntegrityError`). Dos altas casi simultáneas
(típico en "OS Rápida", donde varios técnicos crean órdenes desde el mapa)
podían calcular el mismo folio, chocar contra el `UNIQUE` de `numero_orden`
y tumbar la petición con un 500 crudo. Fix: se envuelve la construcción del
modelo y el commit en `try/except` (mismo patrón que `crear_equipo`) y se
reintenta hasta 5 veces con el siguiente folio si hay colisión, devolviendo
409 con mensaje claro solo si se agotan los reintentos.

### Bug 2 — columna faltante en alta de equipo
`models/equipo.py` define `imagen_referencial`, `numero_contrato`,
`proveedor_servicio` y `numero_contrato_servicio`. De estas:
- `imagen_referencial` tiene migración alembic `c7d8e9f0a1b2`, pero el
  **PASO 5/6 de este mismo archivo** (línea 8 y 46, arriba) ya advertía que
  seguía **pendiente de aplicar en prod**.
- `numero_contrato`, `proveedor_servicio`, `numero_contrato_servicio` NO
  tienen ninguna migración versionada en este repo — el comentario en
  `fb21941638ba` dice que se aplicaron "a mano" en prod vía una migración
  SQL **009 externa**, pero ese archivo no existe en `database/migrations/`
  (ahí solo hay 008, 010, 011).

Si a la tabla `equipos` de prod le falta cualquiera de estas columnas, el
INSERT (o el `session.refresh()` que hace el ORM justo después) revienta con
`Unknown column` y el alta de equipo falla — coincide con el bug reportado.

**No pude confirmar contra el esquema real de prod** (acceso de solo lectura
al VPS bloqueado por el propio guardrail de esta sesión: BD solo con Gustavo
presente). Dejé preparado, **sin aplicar**:
- `database/migrations/012_equipos_columnas_faltantes.sql` — idempotente
  (chequea `INFORMATION_SCHEMA` antes de cada `ADD COLUMN`, igual que
  `fb21941638ba`), corre limpio aunque alguna columna ya exista.
- `sigab-backend/alembic/versions/e4f5a6b7c8d9_add_equipos_columnas_faltantes.py`
  — mismo contenido en alembic, para que el historial quede completo en
  entornos limpios (CI/staging/dev).

@gustavo: antes de aplicar, corre `SHOW COLUMNS FROM equipos;` en prod para
confirmar cuáles faltan de verdad, y aplica con backup (imagen
`:pre-<fecha>` + dump SQL) como de costumbre.

> Nota sobre "tabla de Antigravity": este archivo no tenía, al momento de
> empezar (2026-07-14), ninguna tabla de bugs numerados de Antigravity — su
> contenido es sobre el carril de importación de metadatos 2026 (arriba).
> Los 5 bugs de esta sección vienen directo del encargo de Gustavo.

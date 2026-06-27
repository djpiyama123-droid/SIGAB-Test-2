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

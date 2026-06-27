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

## Pendiente / decisiones abiertas
- [ ] Cruce y carga **definitivos** contra `equipos` de prod (778) → falta acceso (túnel SSH read-only o dump fresco).
- [ ] PASO 3: UPDATE aditivo por serie (fallback inventario) — solo tras OK de Gustavo y dry-run de conteos.
- [ ] PASO 4: fotos históricas desde dump legacy (`equipomedico.ruta_*`) — el dump tiene pocas rutas pobladas; verificar `/static/uploads/` en VPS.
- [ ] PASO 5: `imagen_referencial` + scraping web + watermark (lote de 20, muestra antes).
- [ ] PASO 6: serving `/static/uploads/REFERENCIAL/` + exponer `imagen_referencial` en schema.

## Commits
- `a49d279` feat(equipos): esquema campos de contrato + endpoint importar-contratos-zip (base).

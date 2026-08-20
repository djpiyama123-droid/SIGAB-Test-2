# Reporte barrido pre-demo — 2026-07-17 (mañana de la demo HGR No. 1)

> Rama: `predemo/barrido-2026-07-17` → PR draft hacia `v4.0/piloto-clinica-1`.
> Ejecutado por la rutina programada de Claude Code (cloud) antes de la demo del piloto.

## 1. Pendientes encontrados (por fuente)

### Ramas remotas (últimas 24–48 h)
| Rama | Estado |
|---|---|
| `feature/pulido-vps-jul-16` | ✅ Ya mergeada (PR #19) |
| `fix/openclaw-tenant-id-jul16` | ✅ Ya mergeada (merges `84e58ad`, `6231ca9`) |
| `fix/ocultar-badge-fotos-incompletas-2026-07-15` | ✅ Ya mergeada |
| `reports/pitch-nightly` | Rama de reportes del deck Canva (solo docs, intencional, no se mergea) |
| `fase1-tests-fix` (10-jun, nunca mergeada) | Contenía el fix del conftest multi-tenant que la suite necesitaba; divergió del conftest actual, así que el fix se reescribió aquí en vez de cherry-pickearse |

### PRs abiertos
Ninguno. GitHub no reporta PRs abiertos en el repo.

### Docs de coordinación
- **PROGRESO.md (cierre 16-jul), pendiente #3**: revisar si `/scan-os` e `/intake-group` de OpenClaw tienen el mismo bug de `tenant_id` que tumbó `/ticket` con 500 en vivo. **Confirmado y corregido en esta rama** (ver §2).
- **PROGRESO.md pendientes #1 (pool_pre_ping/asyncmy upstream) y #2 (encoding roto en texto migrado)**: post-demo por instrucción explícita, no se tocaron.
- **COORDINACION_SIGAB.md**: pendientes que requieren OK de Gustavo y acceso a prod (8 UPDATEs de relleno, migración `imagen_referencial`, política de 4 conflictos de tipo) — fuera de alcance de esta sesión cloud, siguen abiertos.
- **HERMES_CONTEXT.md**: solo TODOs operativos de infraestructura (bot Telegram, vault Obsidian), nada de código.
- **Reporte nocturno pitch (17-jul, rama `reports/pitch-nightly`)**: pendientes manuales del deck Canva para Gustavo (ver §4).

### Linear
El workspace conectado no devuelve ninguna issue (ni SIG-* ni de otro tipo, con y sin filtros). No hay issue del piloto donde dejar comentario; se deja constancia aquí.

## 2. Qué se completó (todo en esta rama)

1. **fix(openclaw)**: `INSERT` de `ordenes_servicio` en `/scan-os` e `/intake-group` ahora incluye `tenant_id=1`, `tipo_atencion='correctivo'`, `created_at`/`updated_at` — las mismas columnas NOT NULL sin default que causaron los 500 de `/ticket` el 16-jul (verificadas entonces contra la BD viva). Los `INSERT` de `alertas` en `/scan-os`, `/intake-group` y `/cambiar-estado` ahora incluyen `leida`, `enviada_whatsapp`, `created_at` (mismo patrón del fix ya desplegado en `/ticket`). Sin esto, un técnico escaneando una OS o escribiendo al grupo de WhatsApp durante la demo recibiría un 500.
2. **fix(admin)**: el router `routes/admin_contratos.py` (`POST /api/admin/importar-equipos`) existía pero **nunca se registró en `main.py`** — el endpoint daba 404 y sus 11 tests fallaban. Registrado, más validación adicional: rechaza `metadata.json` sin lista `contratos` y nombres de archivo con path traversal referidos desde metadata.
3. **deps**: `PyPDF2==3.0.1` agregado a `requirements.txt` — `routes/equipos_batch.py` lo importa (etiquetas QR batch A4/A6) pero no estaba declarado; en un deploy limpio ese endpoint daba 500.
4. **fix(tests)** (solo infraestructura de tests, no toca lógica de producción):
   - `conftest.py`: siembra el Hospital tenant 1 (los fixtures crean equipos con `tenant_id=1`, FK NOT NULL → `hospitales.id`; sin la fila, 16+ tests reventaban con IntegrityError 1452). Desactiva el rate limiter en tests (`SIGAH_RL_ENABLED=0`, devolvía 429 a ráfagas del TestClient).
   - `test_reservas_crud.py`: el INSERT crudo de equipos incluye `tipo_adquisicion` e `imagen_referencial` (NOT NULL sin default en el schema actual).
   - `test_importar_contratos.py`: fixture `client` real con overrides de auth (sensible al header para probar 401/403) y de sesión hacia la BD de pruebas, con limpieza de series `TEST-0%`.

## 3. Estado de tests

| Suite | Antes del barrido | Después |
|---|---|---|
| Backend `pytest` (sigab-backend, MySQL 8.0 real) | 24 passed / 20 failed / 16 errors | **60 passed / 0 failed / 1 xfailed** (el xfail es esperado: token legacy sin tenant_id) |
| Frontend `npm run build` (Vite) | — | **OK**, sin errores (Dashboard ya no arrastra el chunk charts, cambio de Hermes v4.0.54 verificado) |
| Frontend `vitest` | — | **57/57 passed** (10 archivos) |

## 4. Pendiente MANUAL antes de la demo (priorizado, máx. 5)

1. **Mergear este PR y redesplegar el backend en el VPS** — sin esto, los fixes de OpenClaw no están en prod y el flujo WhatsApp/scan de la demo puede dar 500. (`git pull` + `docker compose build backend && up -d`, con backup previo como siempre.)
2. **Deck Canva: decidir sobre las 14 páginas nuevas (17–30)** que aparecieron anoche en el design de trabajo `DAHO0pWG4g0` — ¿anexo técnico intencional o fusión accidental? Los números de página de los pendientes cambiaron (tarjetas en 7/12/14, "90%" en 9).
3. **Deck Canva: línea del escáner 3D** — el rango "Inversión $72,000–$80,800" no cuadra con la opción Sermoon P1 $85,999 que alguien dejó en la página 10. Persiste desde el 11-jul; se nota si Carlos Grave hace la cuenta.
4. **Duplicar las 3 tarjetas faltantes en Canva** (Atención Proactiva p.7, Datos on-premise p.12, Mantenimiento eficiente p.14) — la API no puede insertar texto nuevo, es manual.
5. **No reactivar `pool_pre_ping`** ni aplicar a prod las migraciones pendientes (`imagen_referencial`, columnas de contrato) durante la mañana — riesgo innecesario horas antes de la demo; van después con backup.

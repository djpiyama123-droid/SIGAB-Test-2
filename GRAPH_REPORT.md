# SIGAH — Knowledge Graph Report
**Generado**: 2026-06-21 | **Herramienta**: medición directa (grep/wc/find)
**Última revisión**: ciclo 4 autocycle (mini-rebanada de mantenimiento)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| Módulos backend (routes) | **26 archivos Python** (25 productivos + `_examples_tenant_pattern.py`) |
| Líneas de código backend | ~**12,783 LOC** (excluyendo example pattern y __init__) |
| Endpoints REST | **120** (67 GET · 38 POST · 13 PUT · 1 PATCH · 1 DELETE) |
| Páginas frontend | **26 páginas JSX** |
| Componentes UI | **48 archivos** (.jsx/.js en `components/`, contando subdirs) |
| Archivos frontend JS/JSX | **87** |
| Líneas de código frontend | ~**17,480 LOC** (sin contar `node_modules/`) |
| Stack | FastAPI + React 19 + MySQL 8.0 |

> **Diferencias vs. reporte de 2026-05-25**: +4 routes (cerebro, monitor, tokens, twilio_whatsapp — WebPanel), +4 páginas (Formatos, LandingPage, SuperAdmin), +37 LOC frontend, +15 archivos frontend, +7,173 LOC backend (mayormente `equipos.py` y `openclaw.py` crecieron con multi-tenant + bot-login).

---

## Grafo de Módulos Backend

```
sigab-backend/routes/
├── equipos.py           [16 endpoints]  ★ CORE — CRUD + estados + QR + imágenes  (950 LOC)
├── openclaw.py          [14 endpoints]  — Bot webhook, bot-login, notificaciones (782 LOC)
├── ordenes.py           [13 endpoints]  ★ CORE — OS + estados + asignación        (736 LOC)
├── tecnovigilancia.py   [ 9 endpoints]  — NOM-240 eventos adversos               (530 LOC)
├── reportes.py          [ 7 endpoints]  — PDF/Excel exports                       (285 LOC)
├── copilot.py           [ 7 endpoints]  — IA local (Gemma/Ollama) chat + análisis (457 LOC)
├── dashboard.py         [ 5 endpoints]  — KPIs + alertas en tiempo real           (282 LOC)
├── casillas.py          [ 5 endpoints]  — Casillas de trabajo por servicio        (303 LOC)
├── preventivos.py       [ 4 endpoints]  — Mantenimientos preventivos              (218 LOC)
├── auth.py              [ 4 endpoints]  — JWT tokens, login, refresh              (145 LOC)
├── alertas.py           [ 4 endpoints]  — Alertas críticas de equipos             (139 LOC)
├── trazabilidad.py      [ 3 endpoints]  — NOM-016 audit trail                     (122 LOC)
├── reservas.py          [ 3 endpoints]  — Reservas de equipos                     (124 LOC)
├── metrologia.py        [ 3 endpoints]  — Calibración y trazabilidad ISO          (85 LOC)
├── checklists.py        [ 3 endpoints]  — Checklists de mantenimiento             (88 LOC)
├── almacen.py           [ 3 endpoints]  — Inventario de refacciones               (80 LOC)
├── admin.py             [ 3 endpoints]  — Gestión de usuarios/roles               (197 LOC)
├── ocr.py               [ 2 endpoints]  — OCR de etiquetas de equipos             (53 LOC)
├── formatos.py          [ 2 endpoints]  — Formatos IMSS                           (110 LOC)
├── events.py            [ 2 endpoints]  — SSE streaming de eventos                (109 LOC)
├── capacitaciones.py    [ 2 endpoints]  — Capacitaciones al personal              (61 LOC)
├── auditoria.py         [ 2 endpoints]  — Log de actividad                        (86 LOC)
├── twilio_whatsapp.py   [ 1 endpoint ]  — Bot WhatsApp Twilio (WebPanel)          (157 LOC)
├── tokens.py            [ 1 endpoint ]  — Tokens API (WebPanel)                   (20 LOC)
├── monitor.py           [ 1 endpoint ]  — Monitor status (WebPanel)               (55 LOC)
└── cerebro.py           [ 1 endpoint ]  — Cerebro / Claude Code sesiones (WebPanel)(73 LOC)
```

### Módulos más críticos (mayor LOC, excluyendo `_examples_tenant_pattern.py`)
1. **equipos.py** (950 LOC) — máquina de estado: baja/fuera_servicio/mantenimiento/operativo
2. **openclaw.py** (782 LOC) — bot-login JWT, webhooks Teams/Telegram, intake-group
3. **ordenes.py** (736 LOC) — flujo OS: pendiente→en_progreso→completada
4. **tecnovigilancia.py** (530 LOC) — compliance NOM-240
5. **copilot.py** (457 LOC) — IA local Gemma vía Ollama (11434)
6. **casillas.py** (303 LOC) — patrón multi-tenant `get_current_tenant()`

---

## Grafo de Páginas Frontend

```
sigab-frontend/src/pages/
├── Login.jsx            — Auth JWT
├── Dashboard.jsx        — KPIs + gráficas en tiempo real
├── Equipos.jsx          ★ — Inventario + QR + estados + filtros
├── Ordenes.jsx          ★ — OS + timeline + técnicos
├── Preventivos.jsx      — Calendario MP por equipo
├── Tecnovigilancia.jsx  — Eventos adversos NOM-240
├── Copilot.jsx          — Chat IA con contexto de equipos
├── Trazabilidad.jsx     — Audit trail NOM-016
├── Reportes.jsx         — Generación PDF/Excel
├── Alertas.jsx          — Panel de alertas críticas
├── Analitica.jsx        — Analytics avanzada
├── Almacen.jsx          — Inventario refacciones
├── Metrologia.jsx       — Calibración + certificados
├── ChecklistPage.jsx    — Checklists interactivos
├── AuditPage.jsx        — Log completo de actividad
├── CommandCenter.jsx    — Centro de control integrado
├── Capacitaciones.jsx   — Gestión de capacitaciones
├── QRBatch.jsx          — Generación masiva de QR
├── QRScanner.jsx        — Escáner QR móvil
├── TVDashboard.jsx      — Dashboard modo TV (full-screen)
├── AdminGlobal.jsx      — Panel admin multi-tenant
├── EquipoPublico.jsx    — Vista pública de ficha de equipo
├── Formatos.jsx         — Formatos IMSS
├── LandingPage.jsx      — Landing pública (Outfit, glass)
└── SuperAdmin.jsx       — SuperAdmin multi-hospital
```

> **+4 vs 2026-05-25**: Formatos, LandingPage, SuperAdmin, y reordenamiento menor.

---

## Paleta de Color Frontend (consolidada)

Tras ciclo 4, `tailwind.config.js` define solo **2 paletas canónicas** + 2 extras:

| Paleta | Uso | Notas |
|---|---|---|
| `sigah-{blue,emerald,amber,red,slate,gray}{,-light/-dark}` | UI canónica (cards, KPIs, botones) | Alineada con CLAUDE.md |
| `glass-{0,50,100,200,300,400,500}` | Fondos premium dark mode (LandingPage, CommandCenter) | Fase Stitch / Apple-Medical |
| `cyan-glow` `#22D3EE` | Acento IA/Copilot | Single token |
| `ai-violet` `#8B5CF6` | Acento IA/Copilot | Single token |

> **Removidas en ciclo 4**: `medical:` (3 colores, 0 referencias en JSX/CSS) y `imss:` (3 colores, 0 referencias). Dead code eliminado sin regresión de build.

---

## Dependencias Frontend Clave

```
react 19.x          — Core framework
vite 5.x            — Build tool (build verificado: 4726 modules, CSS 157 kB, JS 3.08 MB)
tailwindcss 3.x     — Utility CSS
framer-motion 12.x  — Animaciones (recién instalado)
@material-symbols   — Iconos Google Material (recién instalado)
axios               — HTTP client
recharts            — Gráficas KPIs
react-router-dom    — SPA routing
sonner / Toast.jsx  — Notificaciones toast (custom)
```

---

## Arquitectura Multi-Tenant

El sistema está migrando a aislamiento multi-tenant por `hospital_id`:

- **Completado**: `routes/casillas.py`, `routes/checklists.py`
- **Patrón establecido**: `get_current_tenant()` → filtra por `hospital_id`
- **Pendiente**: 18 tablas SQL restantes
- **Tabla clave**: `hospitales` — identificador del tenant
- **Referencia**: `routes/_examples_tenant_pattern.py` (288 LOC, doc + ejemplo canónico)

---

## Infraestructura

```
Docker Compose (VPS Bluehost)
├── sigah-backend   → FastAPI :8000 (healthy, bind 127.0.0.1 desde ciclo 3)
├── sigah-mysql     → MySQL 8.0 :3306 (healthy, bind 127.0.0.1 desde ciclo 3)
├── sigah-frontend  → nginx :80
├── openclaw        → Bot notificaciones :18789 (bind interno)
├── sigah-bot       → Bot WhatsApp Baileys :3000 (bind 127.0.0.1)
├── sigah-monitor   → Watchdog (externo)
├── sigah-portal    → Portal comercial :80
├── sigab-panel     → WebPanel CEO/Dev
├── sigab-panel-api → API WebPanel
├── n8n             → Automatizaciones :5678
└── traefik         → Reverse proxy :80/:443 → sslip.io
```

**VPS**: Bluehost 129.121.100.147 (Ubuntu 24.04)
- SSH key: `~/.ssh/sigah_bluehost`
- Seguridad: fail2ban + UFW (22/80/443) + PasswordAuthentication no
- Headers: HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy, CSP (PROD-004 completo en ciclo 1-2)
- Deploy: `bash quick_deploy.sh` (incremental) / `bash deploy_to_vps.sh` (full)

---

## Patrones Arquitectónicos Verificados

1. **Máquina de estados**: dict `TRANSICIONES` en cada route (equipos, ordenes)
2. **Audit trail**: escritura en `log_actividad` en toda operación crítica
3. **JWT dual**: humano (login) + bot (bot-login sin sesión) + JWT efímero para bots externos
4. **SSE**: `events.py` para streaming a TVDashboard y CommandCenter
5. **Tenant isolation**: `get_current_tenant()` aplicado progresivamente
6. **Toast system**: `src/lib/toast.js` + `src/components/Toast.jsx` (custom, sin react-hot-toast)
7. **Tipografía**: Inter (UI) + JetBrains Mono (folios/series) + Outfit (LandingPage display) — Source Sans 3 purgado en ciclo 3
8. **Seguridad HTTP**: Traefik añade HSTS/XFO/CSP/Referrer/Permissions en cada respuesta

---

## Archivos Más Importantes para Contexto IA

1. `CLAUDE.md` — instrucciones del proyecto
2. `HERMES_CONTEXT.md` — contexto del sistema HERMES
3. `sigab-frontend/DESIGN.md` — design system (para Google Stitch)
4. `sigab-backend/routes/equipos.py` — módulo más complejo
5. `sigab-backend/routes/_examples_tenant_pattern.py` — patrón canónico multi-tenant
6. `.sigab-autocycle/STATE.md` — bitácora de mantenimiento autónomo
7. `.github/workflows/deploy.yml` — pipeline CI/CD

---

## Changelog del Reporte

- **2026-05-25**: versión inicial (graphifyy manual + tree-sitter)
- **2026-06-21** (ciclo 4): conteo directo con grep/wc/find; añadidos 4 routes de WebPanel,
  3 páginas nuevas, registro de paletas consolidadas, registro de headers de seguridad,
  purgado de tipografía Source Sans 3.

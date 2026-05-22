# SIGAH — Claude Code Project Context

## Proyecto
**SIGAH — Sistema Integral de Activos Hospitalarios**
Plataforma SaaS B2B multi-tenant para gestión de activos biomédicos hospitalarios | Cliente ancla: HGR No.1 IMSS Tijuana | NOM-016 / NOM-240 / ISO-13485

**Nota de transición:** la instancia desplegada en HGR No.1 conserva el branding **SIGAB** (V2.0 on-premise) y sigue operando para no afectar al hospital. La codebase y la empresa son **SIGAH** y evolucionan hacia el modelo SaaS multi-tenant. Las referencias a "SIGAB" en este repo apuntan a la instancia/legacy; "SIGAH" apunta a la plataforma y la empresa.

**Fase actual:** Fase 0 — Fundación y preparación (constitución legal S. de R.L. de C.V. + RESICO PM, infraestructura Hetzner Cloud, rebrand de docs). Ver `docs/SIGAH/Plan_de_Trabajo_Maestro_SIGAH.docx`.

## Stack Tecnológico
- **Backend**: FastAPI + Python 3.12 + MySQL 8.0 (puerto 8000)
- **Frontend**: React 19 + Vite + Tailwind CSS (puerto 5173)
- **IA (objetivo SaaS)**: arquitectura híbrida — Gemini 2.5 Flash-Lite + Claude Sonnet 4.6 (ver `docs/SIGAH/Calculo_de_Costos_Cloud_IA_SIGAH.docx`)
- **IA (instancia HGR No.1)**: Gemma + Qwen vía Ollama local (legacy, se conserva)
- **Infraestructura objetivo**: Hetzner Cloud (CX32 / CX42) + Edge Nodes por hospital
- **Contenedores**: Docker Compose

## Skills Activas

### UI/UX Pro Max (`ui-ux-pro-max`)
**Stack target**: React 19 + Vite + Tailwind CSS

Invocar esta skill cuando se trabaje en:
- Páginas en `sigab-frontend/src/pages/` (Dashboard, Equipos, Ordenes, Tecnovigilancia, Copilot, etc.)
- Componentes en `sigab-frontend/src/components/`
- Mejoras visuales, rediseño, accesibilidad, responsive
- Nuevos módulos con UI (formularios, tablas, modales, cards, charts)

**Paleta SIGAH**: Medical/Clinical — azul SIGAH (#006CB7), azul oscuro (#00497D), verde biomédico (emerald-600), alertas (amber/red)
**Estilo base**: Minimalism + Dark Mode compatible, componentes con Tailwind utility classes
**Tipografía**: Inter (UI) + Source Sans Pro (data tables)

## Agentes Especializados — The Agency (`.claude/agents/`)

Instalados **67 agentes especializados** del repo [agency-agents](https://github.com/msitarzewski/agency-agents) — set curado para SIGAH (divisiones: engineering, design, testing, project-management, support, finance, product). Capa de coordinación **NEXUS** en `.claude/agency-strategy/` (playbooks fase 0–6, runbooks de escenario, plantillas de handoff).

### Directriz de uso — SIEMPRE para SIGAH
Al iniciar **cualquier** tarea de SIGAH, activar primero el/los agente(s) del ruteo de abajo antes de ejecutar. Para features completas o flujos multi-agente, seguir el playbook NEXUS correspondiente en `.claude/agency-strategy/playbooks/`. Activación: referir al agente por su nombre, p. ej. _"Activa Backend Architect y…"_.

### Ruteo tarea → agente

| Tarea SIGAH | Agente(s) recomendado(s) |
|---|---|
| Arquitectura multi-tenant, aislamiento de datos, diseño de API | Backend Architect, Software Architect |
| Migración Alembic, columna `tenant_id`, índices, tuning MySQL | Database Optimizer |
| Endpoints FastAPI, dependencias JWT, filtrado por `hospital_id` | Backend Architect, Senior Developer |
| Panel SuperAdmin, enrutamiento React, dashboards globales | Frontend Developer, UI Designer |
| UI/UX de páginas y componentes | skill `ui-ux-pro-max` + UI Designer, UX Architect |
| Seguridad, aislamiento de datos, JWT, hardening | Security Engineer |
| Despliegue cloud, Docker, CI/CD, Edge Nodes | DevOps Automator, SRE |
| Revisión de código / PRs | Code Reviewer, Reality Checker |
| Pruebas de API, regresión, evidencia | API Tester, Evidence Collector, Test Results Analyzer |
| **QA visual UI/UX, botones, flujos, accesibilidad** | **skill `webapp-testing` (Playwright)** + Accessibility Auditor, UX Architect |
| Rendimiento bajo carga multi-tenant | Performance Benchmarker |
| Modelo de negocio SaaS, precios, suscripciones, punto de equilibrio | FP&A Analyst, Financial Analyst |
| Registro ante SAT, estructura fiscal, cumplimiento | Tax Strategist, Legal Compliance Checker |
| Roadmap, fases, priorización de sprints | Product Manager, Sprint Prioritizer |
| Gestión de proyecto, handoffs, seguimiento | Senior Project Manager, Project Shepherd |
| Documentación técnica | Technical Writer |
| Onboarding al repo / explicación de código | Codebase Onboarding Engineer |
| Incidentes en producción | Incident Response Commander |
| Cambios quirúrgicos / mínimos | Minimal Change Engineer |
| Resúmenes ejecutivos para jefatura | Executive Summary Generator |

Catálogo completo: `.claude/agents/` (67 archivos) y `.claude/agency-strategy/QUICKSTART.md`.

## Estructura del Proyecto
```
sigab-backend/      # FastAPI routes, services, models  (rename a sigah-backend pendiente — Fase 1)
sigab-frontend/     # React pages, components, hooks    (rename a sigah-frontend pendiente — Fase 1)
sigab-bot/          # Bot de notificaciones             (rename pendiente)
migrations/         # SQL migrations (001-006)
docs/SIGAH/         # Entregables estratégicos SIGAH (Plan Maestro, Fiscal/SAT, Costos, Formatos, Especificación)
.claude/skills/     # Skills instaladas (ui-ux-pro-max)
.claude/agents/     # 67 agentes especializados (The Agency)
.claude/agency-strategy/  # Capa de coordinación NEXUS (playbooks, runbooks)
```

## Módulos Implementados (instancia SIGAB en HGR No.1)
1. Autenticación JWT (auth/)
2. Gestión de Equipos (equipos.py / Equipos.jsx)
3. Órdenes de Servicio (ordenes.py / Ordenes.jsx)
4. Mantenimiento Preventivo (preventivos.py / Preventivos.jsx)
5. Alertas + Dashboard KPIs (dashboard.py / Dashboard.jsx)
6. Tecnovigilancia NOM-240 (tecnovigilancia.py / Tecnovigilancia.jsx)
7. Copilot IA Local (copilot.py / Copilot.jsx) — branding "SIGAB Copilot" en la instancia
8. Trazabilidad NOM-016 (trazabilidad.py / Trazabilidad.jsx)
9. Reportes PDF/Excel (reportes.py / Reportes.jsx)

## Módulos a construir para SIGAH SaaS (roadmap)
- **Fase 1:** columna `tenant_id` en todas las tablas + tabla `hospitales` (tenants)
- **Fase 2:** dependencia `get_current_tenant` en FastAPI + filtrado JWT por `hospital_id`
- **Fase 3:** rol SuperAdmin + panel `/admin-global` de SIGAH
- **Fase 4:** despliegue en Hetzner + Edge Nodes
- **Fase 5:** módulo de Formatos (4 plantillas — ver `docs/SIGAH/Formato_*.docx` y `Especificacion_Formatos_SIGAH.docx`)
- **Fase 6:** facturación SaaS (Setup Fee + mensualidad), CFDI 4.0 vía PAC, onboarding repetible

## Estado actual del frontend (mayo 2026)

### Sistema de notificaciones — Sileo (Toast custom)
- `react-hot-toast` eliminado del proyecto (migración completada mayo 2026)
- Nuevo sistema: `sigab-frontend/src/components/Toast.jsx` + `ToastContext.jsx`
- API compatible: `toast.success()`, `toast.error()`, `toast.loading()`, `toast.info()`, `toast.warn()`
- Keyframes `slideIn` / `fadeIn` en `sigab-frontend/src/index.css`
- **NO usar `import toast from 'react-hot-toast'`** en ningún archivo nuevo — usar `useToast` de `ToastContext`

### Sistema de 3 temas (pendiente cherry-pick desde worktree-sileo-themes)
- `ThemeContext.jsx` — provider con `sigah-theme` en localStorage
- `index.css` — 3 bloques `data-theme`: `blue` (Azul IMSS), `green` (Verde SIGAH), `dark` (Oscuro SIGAH)
- `tailwind.config.js` — tokens `sigah.*` + Inter/Source Sans 3
- `Header.jsx` — toggle de 3 círculos de color
- Commit: `d02b1fb` en branch `worktree-sileo-themes`
- **Pendiente**: `git cherry-pick d02b1fb3` desde `feat/sileo-toasts-hermes-context`

### Command Center (`/command-center`)
- Página React: `sigab-frontend/src/pages/CommandCenter.jsx`
- Hub de conocimiento para el equipo de desarrollo
- Registrado en `App.jsx` (ruta `/command-center`) y `Sidebar.jsx` (sección Dev)
- Documentos de conocimiento: `docs/SIGAH/KNOWLEDGE_HUB.md`, `CLAUDE_CODE_ENV.md`, `SESIONES_CONTEXTO.md`

## Backend — Contexto multi-tenant (Fase 2)

### Patrón canónico
Archivo de referencia: `sigab-backend/routes/_examples_tenant_pattern.py`
- 9 ejemplos con antes/después y anti-patrones
- **Regla de oro**: `tenant_id` SIEMPRE viene de `get_current_tenant`, NUNCA del body/query/header
- Cross-tenant access → 404, no 403 (privacidad)

### Cache en copilot (riesgo fase 2)
`sigab-backend/routes/copilot.py` usa `TTLCache` con clave `"dashboard"` (sin tenant) → cambiar a `f"dashboard:{tenant_id}"` antes de Fase 2.

## Tests
```
sigab-backend/tests/
  conftest.py               # fixtures: BD MySQL sigab_test, JWT, rollback por test
  test_equipos_auth.py      # 7 tests auth/JWT
  test_baja_y_edicion.py    # 7 tests CRUD equipos
  test_equipos_ubicacion.py # 3 tests ubicación
  test_tenant_isolation.py  # 7 tests aislamiento multi-tenant (TDD — fallan hasta Fase 2)
```
- Requieren BD MySQL `sigab_test` (no SQLite)
- `pytest==8.3.5` y `pytest-asyncio==0.24.0` en requirements.txt
- Correr desde `sigab-backend/`: `pytest tests/ -v`

## Convenciones
- Todos los textos en **español mexicano** (UI y mensajes)
- Toast notifications con `toast.success/error/loading` (via `useToast`, NO react-hot-toast)
- Colores de estado: emerald=operativo, amber=mantenimiento, red=fuera_servicio, slate=baja
- Máquinas de estado con dict `TRANSICIONES` en backend (patrón establecido)
- Audit trail en tabla `log_actividad` para NOM-016

# SIGAB — Claude Code Project Context

## Proyecto
**Sistema Integral de Gestión de Activos Biomédicos (SIGAB) V2.0**
Hospital General Regional No.1 IMSS Tijuana | On-Premise | NOM-016 / NOM-240 / ISO-13485

## Stack Tecnológico
- **Backend**: FastAPI + Python 3.12 + MySQL 8.0 (puerto 8000)
- **Frontend**: React 19 + Vite + Tailwind CSS (puerto 5173)
- **IA Local**: Gemma via Ollama (puerto 11434)
- **Infraestructura**: Docker Compose, 100% On-Premise

## Skills Activas

### UI/UX Pro Max (`ui-ux-pro-max`)
**Stack target**: React 19 + Vite + Tailwind CSS

Invocar esta skill cuando se trabaje en:
- Páginas en `sigab-frontend/src/pages/` (Dashboard, Equipos, Ordenes, Tecnovigilancia, Copilot, etc.)
- Componentes en `sigab-frontend/src/components/`
- Mejoras visuales, rediseño, accesibilidad, responsive
- Nuevos módulos con UI (formularios, tablas, modales, cards, charts)

**Paleta SIGAB recomendada**: Medical/Clinical — azul IMSS (#006CB7), verde biomédico (emerald-600), alertas (amber/red)
**Estilo base**: Minimalism + Dark Mode compatible, componentes con Tailwind utility classes
**Tipografía**: Inter (UI) + Source Sans Pro (data tables)

## Estructura del Proyecto
```
sigab-backend/      # FastAPI routes, services, models
sigab-frontend/     # React pages, components, hooks
migrations/         # SQL migrations (001-006)
sigab-bot/          # Bot de notificaciones
.claude/skills/     # Skills instaladas (ui-ux-pro-max)
```

## Módulos Implementados
1. Autenticación JWT (auth/)
2. Gestión de Equipos (equipos.py / Equipos.jsx)
3. Órdenes de Servicio (ordenes.py / Ordenes.jsx)
4. Mantenimiento Preventivo (preventivos.py / Preventivos.jsx)
5. Alertas + Dashboard KPIs (dashboard.py / Dashboard.jsx)
6. Tecnovigilancia NOM-240 (tecnovigilancia.py / Tecnovigilancia.jsx)
7. SIGAB Copilot IA Local (copilot.py / Copilot.jsx)
8. Trazabilidad NOM-016 (trazabilidad.py / Trazabilidad.jsx)
9. Reportes PDF/Excel (reportes.py / Reportes.jsx)

## gstack (Navegación Web y Skills de Ingeniería)

Para toda navegación web usar la skill `/browse` de gstack. **Nunca usar herramientas `mcp__claude-in-chrome__*`.**

**Instalación (una vez por máquina, requiere `bun`):**
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

Skills disponibles:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Convenciones
- Todos los textos en **español mexicano** (UI y mensajes)
- Toast notifications con `toast.success/error/loading`
- Colores de estado: emerald=operativo, amber=mantenimiento, red=fuera_servicio, slate=baja
- Máquinas de estado con dict `TRANSICIONES` en backend (patrón establecido)
- Audit trail en tabla `log_actividad` para NOM-016

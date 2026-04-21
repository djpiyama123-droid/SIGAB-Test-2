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

## Convenciones
- Todos los textos en **español mexicano** (UI y mensajes)
- Toast notifications con `toast.success/error/loading`
- Colores de estado: emerald=operativo, amber=mantenimiento, red=fuera_servicio, slate=baja
- Máquinas de estado con dict `TRANSICIONES` en backend (patrón establecido)
- Audit trail en tabla `log_actividad` para NOM-016

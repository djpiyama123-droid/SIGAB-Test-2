# SIGAB — Knowledge Graph Report
**Generado**: 2026-05-25 | **Herramienta**: graphifyy (análisis manual + tree-sitter)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| Módulos backend (routes) | 22 archivos Python |
| Líneas de código backend | ~5,610 LOC |
| Endpoints REST | ~118 (16 equipos, 12 ordenes, 13 openclaw, 9 tecnovigilancia, 7 copilot…) |
| Páginas frontend | 22 páginas JSX |
| Componentes UI | ~50 componentes |
| Archivos frontend JS/JSX | 72 |
| Stack | FastAPI + React 19 + MySQL 8.0 |

---

## Grafo de Módulos Backend

```
sigab-backend/routes/
├── auth.py              [4 endpoints]   → JWT tokens, login, refresh
├── equipos.py           [16 endpoints]  ★ CORE — CRUD + estados + QR + imágenes
├── ordenes.py           [12 endpoints]  ★ CORE — OS + estados + asignación técnicos
├── openclaw.py          [13 endpoints]  — Bot webhook, bot-login, notificaciones
├── tecnovigilancia.py   [9 endpoints]   — NOM-240 eventos adversos
├── copilot.py           [7 endpoints]   — IA local (Gemma/Ollama) chat + análisis
├── reportes.py          [7 endpoints]   — PDF/Excel exports
├── dashboard.py         [4 endpoints]   — KPIs + alertas en tiempo real
├── alertas.py           [4 endpoints]   — Alertas críticas de equipos
├── casillas.py          [4 endpoints]   — Casillas de trabajo por servicio
├── checklists.py        [3 endpoints]   — Checklists de mantenimiento
├── admin.py             [3 endpoints]   — Gestión de usuarios/roles
├── almacen.py           [3 endpoints]   — Inventario de refacciones
├── metrologia.py        [3 endpoints]   — Calibración y trazabilidad ISO
├── preventivos.py       [3 endpoints]   — Mantenimientos preventivos
├── reservas.py          [3 endpoints]   — Reservas de equipos
├── trazabilidad.py      [3 endpoints]   — NOM-016 audit trail
├── auditoria.py         [2 endpoints]   — Log de actividad
├── capacitaciones.py    [2 endpoints]   — Capacitaciones al personal
├── events.py            [2 endpoints]   — SSE streaming de eventos
├── ocr.py               [2 endpoints]   — OCR de etiquetas de equipos
└── auth.py (bot)        —               — Bot JWT sin sesión humana
```

### Módulos más críticos (mayor LOC)
1. **equipos.py** (909 LOC) — máquina de estado: baja/fuera_servicio/mantenimiento/operativo
2. **ordenes.py** (649 LOC) — flujo OS: pendiente→en_progreso→completada
3. **openclaw.py** (601 LOC) — sistema de notificaciones bot Teams/Telegram
4. **tecnovigilancia.py** (530 LOC) — compliance NOM-240
5. **copilot.py** (451 LOC) — IA local Gemma vía Ollama (11434)

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
└── EquipoPublico.jsx    — Vista pública de ficha de equipo
```

---

## Dependencias Frontend Clave

```
react 19.x          — Core framework
vite 5.x            — Build tool
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

---

## Infraestructura

```
Docker Compose (local / VPS Bluehost)
├── sigab-backend   → FastAPI :8000 (healthy)
├── sigab-mysql     → MySQL 8.0 :3306 (healthy)
├── sigab-frontend  → nginx :80
├── openclaw        → Bot notificaciones :18789
└── traefik         → Reverse proxy :80/:443
```

**VPS**: Bluehost 129.121.100.147 (Ubuntu 24.04)
- SSH key: `~/.ssh/sigah_bluehost`
- Seguridad: fail2ban + UFW (22/80/443) + PasswordAuthentication no
- Deploy: `bash quick_deploy.sh` (incremental) / `bash deploy_to_vps.sh` (full)

---

## Patrones Arquitectónicos Verificados

1. **Máquina de estados**: dict `TRANSICIONES` en cada route (equipos, ordenes)
2. **Audit trail**: escritura en `log_actividad` en toda operación crítica
3. **JWT dual**: humano (login) + bot (bot-login sin sesión)
4. **SSE**: `events.py` para streaming a TVDashboard y CommandCenter
5. **Tenant isolation**: `get_current_tenant()` aplicado progresivamente
6. **Toast system**: `src/lib/toast.js` + `src/components/Toast.jsx` (custom, sin react-hot-toast)

---

## Archivos Más Importantes para Contexto IA

1. `CLAUDE.md` — instrucciones del proyecto
2. `HERMES_CONTEXT.md` — contexto del sistema HERMES
3. `sigab-frontend/DESIGN.md` — design system (para Google Stitch)
4. `sigab-backend/routes/equipos.py` — módulo más complejo
5. `.github/workflows/deploy.yml` — pipeline CI/CD

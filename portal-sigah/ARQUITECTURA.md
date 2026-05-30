# SIGAH — Mapa Completo de Arquitectura y Rutas

> Última actualización: 2026-05-29

---

## 1. Diagrama de Sistemas

```
┌─────────────────────────────────────────────────────────────┐
│  SIGAH/  (este repo — C:\...\SIGAH)                         │
│  Portal comercial + WebPanel de gestión (CEO/Dev)           │
│  Tech: React 19 + TypeScript + Tailwind v4 + Vite           │
│  VPS:  panel.129-121-100-147.sslip.io                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ API calls → VITE_API_URL
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  SIGAB/  (C:\...\SIGAB) — PLATAFORMA HOSPITALARIA REAL      │
│  Backend FastAPI :8000  →  sigab.129-121-100-147.sslip.io   │
│  Frontend React  :5173  →  sigab.129-121-100-147.sslip.io   │
│  DB MySQL sigab         →  docker: sigah-mysql              │
│  Bot WhatsApp    :3000  →  docker: sigah-bot                │
│  IA Ollama       :11434 →  host-gateway                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SIGAH WebPanel — Rutas de Páginas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `PublicApp.tsx` | Landing page pública (marketing) |
| `/login` | `LoginPage.tsx` | Login con JWT → SIGAB API |
| `/panel/dashboard` | `DashboardPage.tsx` | KPIs globales del sistema |
| `/panel/monitor` | `MonitorPage.tsx` | Estado CPU/RAM/Disco/Servicios |
| `/panel/sigab` | `SIGABAppPage.tsx` | Inventario hospitalario (equipos) |
| `/panel/ordenes` | `OrdenesPage.tsx` | Tabla de órdenes de servicio |
| `/panel/mantenimientos` | `MantenimientosPage.tsx` | Calendario preventivos + señales IA |
| `/panel/terminal` | `TerminalPage.tsx` | Terminal Claude Code |
| `/panel/tokens` | `TokensPage.tsx` | Gestión tokens Anthropic API |
| `/panel/cerebro` | `ObsidianPage.tsx` | Información/sesiones por equipo |
| `/panel/cerebro/asus` | `ObsidianPage.tsx` | ASUS TUF A16 — dev principal |
| `/panel/cerebro/lenovo` | `ObsidianPage.tsx` | Lenovo ThinkCentre — servidor local |
| `/panel/cerebro/bluehost` | `ObsidianPage.tsx` | VPS Bluehost — producción |

---

## 3. SIGAH WebPanel — Calls a la API (SIGAB FastAPI)

| Página | Endpoint SIGAB | Método |
|--------|----------------|--------|
| AuthContext | `/api/auth/token` | POST |
| AuthContext | `/api/auth/me` | GET |
| DashboardPage | `/api/dashboard/kpis` | GET |
| DashboardPage | `/api/ordenes` | GET |
| MonitorPage | `/api/monitor/status` | GET |
| SIGABAppPage | `/api/equipos` | GET |
| OrdenesPage | `/api/ordenes` | GET |
| MantenimientosPage | `/api/mantenimientos/proximos` | GET |
| TokensPage | `/api/tokens` | GET |
| ObsidianPage | `/api/cerebro/sesiones` | GET |

---

## 4. SIGAB FastAPI — Todos los Endpoints

### Auth
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/token` | POST | Login (OAuth2 form) → JWT |
| `/api/auth/me` | GET | Usuario actual |

### Dashboard
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/dashboard/kpis` | GET | KPIs resumidos (WebPanel) |
| `/api/dashboard/resumen` | GET | Resumen ejecutivo completo |
| `/api/dashboard/equipos` | GET | Lista equipos con filtros |
| `/api/dashboard/mapa` | GET | Zonas del hospital con equipos |

### Equipos
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/equipos` | GET | Lista todos los equipos |
| `/api/equipos/{id}` | GET/PUT/DELETE | CRUD equipo |
| `/api/equipos/qr/...` | GET | Generación/lectura QR |

### Órdenes de Servicio
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ordenes` | GET/POST | Lista/crear órdenes |
| `/api/ordenes/{id}` | GET/PUT | Detalle/actualizar orden |

### Preventivos / Mantenimiento
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/preventivos` | GET/POST | Lista/crear preventivos |
| `/api/preventivos/proximos` | GET | Calendario próximos + señales IA |
| `/api/preventivos/{id}/ejecutar` | PUT | Marcar ejecutado |

### Monitor (WebPanel)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/monitor/status` | GET | CPU, RAM, Disco, latencia servicios |

### Tokens API (WebPanel)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/tokens` | GET | Tokens Anthropic registrados |

### Cerebro / Claude Code (WebPanel)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/cerebro/sesiones` | GET | Sesiones JSONL de Claude Code |

### Otros módulos
`/api/alertas`, `/api/trazabilidad`, `/api/tecnovigilancia`, `/api/copilot`,
`/api/reportes`, `/api/auditoria`, `/api/checklists`, `/api/almacen`,
`/api/metrologia`, `/api/capacitaciones`, `/api/reservas`, `/api/formatos`,
`/api/ocr`, `/api/openclaw`, `/api/twilio`, `/api/v1/events`

---

## 5. Variables de Entorno

### SIGAH WebPanel (este repo)
| Variable | Dev (`.env`) | Producción (`.env.production`) |
|----------|-------------|--------------------------------|
| `VITE_API_URL` | `https://sigab.129-121-100-147.sslip.io` | `https://sigab.129-121-100-147.sslip.io` |
| `VITE_APP_URL` | `https://sigab.129-121-100-147.sslip.io` | `https://sigab.129-121-100-147.sslip.io` |

### SIGAB Backend
| Variable | Descripción |
|----------|-------------|
| `SIGAH_DB_HOST` | Host MySQL (default: `mysql`) |
| `SIGAH_JWT_SECRET` | Secreto JWT |
| `SIGAH_CORS_EXTRA` | URLs adicionales para CORS (separadas por coma) |
| `SIGAH_DISABLE_COPILOT` | `1` para desactivar módulo Copilot |
| `SIGAH_OLLAMA_HOST` | Host Ollama IA local |

---

## 6. Flujo de Despliegue

```bash
# 1. Build SIGAH WebPanel (portal + panel)
cd C:\...\SIGAH
npm run build  # genera dist/

# 2. Subir dist/ al VPS como servicio estático en panel.sslip.io
# (Traefik label + nginx o servicio estático)

# 3. Cambios a SIGAB plataforma:
git -C C:\...\SIGAB add .
git -C C:\...\SIGAB commit -m "feat: ..."
git -C C:\...\SIGAB push origin main

# 4. En el VPS (con OK de Gustavo):
ssh sigab-vps
cd /opt/sigab && git pull
cd sigab-frontend && npm run build
docker compose up -d --force-recreate
# Si hay 502: docker restart traefik
```

---

## 7. Estructura de Directorios

```
C:\...\SIGAH\                    ← SIGAH WebPanel + Portal
├── src/
│   ├── components/              ← Landing: Hero, Navbar, Footer, etc.
│   ├── pages/
│   │   ├── LoginPage.tsx        ← Login del panel
│   │   └── panel/               ← Páginas del WebPanel
│   │       ├── DashboardPage.tsx
│   │       ├── MonitorPage.tsx
│   │       ├── SIGABAppPage.tsx
│   │       ├── OrdenesPage.tsx
│   │       ├── MantenimientosPage.tsx
│   │       ├── TerminalPage.tsx
│   │       ├── TokensPage.tsx
│   │       └── ObsidianPage.tsx
│   ├── contexts/AuthContext.tsx ← JWT auth → SIGAB API
│   ├── router.tsx               ← Rutas del panel
│   └── PublicApp.tsx            ← Landing pública
├── backend/                     ← Express backend (local dev, no VPS)
├── .env                         ← Dev: VITE_API_URL=sigab.sslip.io
└── .env.production              ← Prod: VITE_API_URL=sigab.sslip.io

C:\...\SIGAB\                    ← SIGAB Plataforma Hospitalaria
├── sigab-backend/               ← FastAPI Python 3.12
│   ├── main.py                  ← Entry point, todos los routers
│   ├── routes/                  ← 26 módulos de rutas
│   ├── models/                  ← SQLModel ORM
│   ├── auth/                    ← JWT, permisos, tenancy
│   └── services/                ← Cache, IA, etc.
├── sigab-frontend/              ← React 19 JSX (panel hospitalario)
├── sigab-bot/                   ← Bot WhatsApp Baileys
├── docker-compose.yml           ← Stack completo
└── CLAUDE.md                    ← Memoria compartida Claude+Antigravity
```

# SIGAH — Workbook Maestro

> **Para qué sirve este archivo:** es la primera cosa que abres cada mañana antes de programar. Te dice qué correr en la terminal, dónde vive cada cosa del proyecto, qué credenciales necesitas a mano, qué skills y agentes tiene Claude listos, y dónde retomas el desarrollo.
>
> **Mantenedor:** Gustavo López Carballo · **Versión:** 1.0 · **Fecha:** 17 de mayo de 2026
> **Equipo SIGAH:** Gustavo López Carballo (CEO, ingeniero biomédico) + Ing. Carlos Oswaldo Ramírez González (subjefe de Conservación, HGR No.1 IMSS Tijuana).

---

## 1. TL;DR — Lo que vas a hacer mañana en 5 minutos

```powershell
# 1. Abre Windows Terminal (o PowerShell) en el Asus TUF A16.
cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB

# 2. (Solo la primera vez) Corre el setup. En adelante puedes saltarlo.
.\scripts\setup_claude_code_sigah.ps1

# 3. (Opcional) Levanta el túnel SSH al VPS para que la skill mysql funcione.
#    En una terminal aparte que dejas abierta toda la sesión:
ssh -L 3306:127.0.0.1:3306 sigab-bluehost

# 4. Sincroniza el repo
git pull

# 5. Arranca Claude Code en el folder del repo
claude
```

Dentro de Claude Code:

```
/skills          # ver las 26 skills disponibles (12 proyecto + 14 usuario)
@CLAUDE.md       # cargar el contexto del proyecto SIGAH (se carga automático también)
```

Y arranca pidiendo lo que toque (ver §10 — "Estado actual y siguiente sprint").

---

## 2. Cómo arranca tu día de desarrollo (rutina recomendada)

| Paso | Comando | Por qué |
|------|---------|---------|
| 1. Entrar al folder del repo | `cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB` | Para que Claude Code cargue `CLAUDE.md` y todas las skills del proyecto. |
| 2. Sincronizar cambios remotos | `git pull` | Tiene los pushes recientes de Carlos / del otro equipo. |
| 3. Revisar la rama activa | `git status` y `git branch --show-current` | Para no commitear en la rama equivocada. La rama de trabajo SIGAH es `sigah-saas`. |
| 4. Levantar el túnel SSH a MySQL del VPS (opcional) | `ssh -L 3306:127.0.0.1:3306 sigab-bluehost` | Solo si vas a usar la skill `mysql` para consultar la BD de SIGAB en tiempo real. |
| 5. Arrancar Claude Code | `claude` | Carga `CLAUDE.md` + las 12 skills del proyecto + los 67 agentes especializados. |
| 6. Decirle qué quieres hacer | (lenguaje natural) | Ej: *"Activa Backend Architect y refactorizemos `routes/equipos.py` para multi-tenant"*. |

**Cierre del día:**

```powershell
git add -p && git commit -m "wip: <lo que avanzaste>"
git push
exit   # cierra el túnel SSH
```

---

## 3. Mapa del repositorio — dónde vive cada cosa

```
C:\Users\djpiy\Desktop\Bioingeneria\SIGAB\
│
├── CLAUDE.md                       ← Contexto del proyecto (Claude lo carga solo)
├── AGENTS.md                       ← Directriz de contextualización
├── README.md                       ← README rebrandeado a SIGAH
├── docker-compose.yml              ← Stack local (mysql + backend + frontend)
│
├── sigab-backend/                  ← FastAPI + SQLModel + MySQL
│   ├── main.py
│   ├── auth/
│   │   ├── jwt_handler.py          (extendido con tenant_id en Fase 1)
│   │   ├── dependencies.py         (get_current_user)
│   │   └── tenancy.py              ⭐ NUEVO Fase 1: get_current_tenant / require_superadmin
│   ├── models/
│   │   ├── hospital.py             ⭐ NUEVO Fase 1: tabla tenants
│   │   ├── tenancy.py              ⭐ NUEVO Fase 1: TenantMixin reusable
│   │   ├── usuario.py              (con tenant_id)
│   │   ├── equipo.py               (con tenant_id - ejemplo canónico)
│   │   └── ... 17 modelos más pendientes de agregar tenant_id
│   ├── routes/
│   │   ├── _examples_tenant_pattern.py  ⭐ NUEVO: plantilla canónica Fase 2
│   │   ├── equipos.py              (16 endpoints — refactor Fase 2 pendiente)
│   │   ├── auth.py, ordenes.py, preventivos.py, alertas.py, ... (20 archivos)
│   ├── alembic/
│   │   └── versions/
│   │       ├── fc59a6b78c4f_initial_sqlmodel_migration_ultimate_.py
│   │       ├── b2c3d4e5f6g7_phase_2_utc_and_poka_yoke.py
│   │       ├── a1b2c3d4e5f6_phase_1_multitenancy_init.py        ⭐ Fase 1 (NO aplicada)
│   │       └── b1c2d3e4f5a6_phase_3_superadmin_nullable_tenant.py ⭐ Fase 3 (NO aplicada)
│   └── tests/
│       ├── conftest.py
│       └── test_tenant_isolation.py ⭐ NUEVO Fase 2: suite cross-tenant
│
├── sigab-frontend/                 ← React 19 + Vite + Tailwind
│   └── src/
│       ├── pages/                  (Dashboard, Equipos, Ordenes, Copilot, ...)
│       ├── components/
│       └── api/sigab.js
│
├── sigab-bot/                      ← Bot Telegram
│
├── docs/SIGAH/                     ← TODOS los entregables estratégicos
│   ├── WORKBOOK_MAESTRO_SIGAH.md   ← ESTE ARCHIVO
│   ├── Plan_de_Trabajo_Maestro_SIGAH.docx    (12 págs, 7 fases, Gantt 24 sem)
│   ├── Propuesta_Fiscal_SAT_SIGAH.docx       (11 págs, S. de R.L. + RESICO PM)
│   ├── Calculo_de_Costos_Cloud_IA_SIGAH.docx (13 págs, Hetzner + IA híbrida)
│   ├── Especificacion_Formatos_SIGAH.docx    (modelo de datos para la app)
│   ├── Formato_01_Reporte_de_Falla.docx
│   ├── Formato_02_OS_Correctivo.docx
│   ├── Formato_03_OS_Preventivo.docx
│   ├── Formato_04_OS_Predictivo.docx
│   ├── Fase_0_Checklist_Operativo_SIGAH.docx
│   ├── Fase_1_README.md            (cómo aplicar la migración multi-tenant)
│   ├── Fase_2_README.md            (patrón refactor + checklist 20 routes)
│   ├── Marca_SIGAH.md              (paleta, tipografía, dominios)
│   ├── Runbook_Provisioning_Hetzner.md (12 pasos para levantar el VPS Hetzner)
│   └── Setup_ClaudeCode_AsusTUF.md (cómo configuraste este Asus, paso a paso)
│
├── scripts/
│   ├── setup_claude_code_sigah.ps1  ← Setup para Windows (corres una vez)
│   └── setup_claude_code_sigah.sh   ← Setup para WSL/Linux
│
└── .claude/
    ├── skills/                     ← 12 skills a nivel proyecto (§4)
    ├── agents/                     ← 67 agentes especializados (§5)
    ├── agency-strategy/            ← Capa NEXUS (playbooks fase 0-6)
    └── ssh/config.sigah            ← Template SSH para Bluehost + Hetzner
```

---

## 4. Inventario completo de skills (26 totales)

### 4.1 A nivel proyecto — `SIGAB/.claude/skills/` (12)

| # | Skill | Cuándo activarla |
|---|-------|------------------|
| 1 | `ui-ux-pro-max` | UI/UX para páginas React de SIGAH. Paleta médica, dark mode. |
| 2 | `mysql` | Consultar la BD de SIGAB/SIGAH en lenguaje natural (read-only). |
| 3 | `ccpm` | Romper un PRD en GitHub Issues y dejar que varios agentes trabajen en paralelo. |
| 4 | `git-workflow` | Preparar PRs, resolver merge conflicts, limpiar ramas. |
| 5 | `project-docs` | Auto-generar ARCHITECTURE.md / API_ENDPOINTS.md desde el código. |
| 6 | `deep-research` | Antes de construir algo nuevo, investigar a fondo. |
| 7 | `react-patterns` | Patrones React 19 (perf, memoización, composición). |
| 8 | `shadcn-ui` | Instalar y configurar componentes shadcn/ui. |
| 9 | `tailwind-theme-builder` | Tailwind v4 + tema SIGAH + dark mode. |
| 10 | `mcp-builder` | Construir MCP servers (exponer endpoints SIGAH a Claude). |
| 11 | `skill-creator` | Crear/editar/validar skills propias. |
| 12 | `webapp-testing` | **Playwright**: probar la UI del frontend, capturar screenshots, ver logs. |

### 4.2 A nivel usuario — `~/.claude/skills/` (14, las instala el script)

`pdf`, `docx`, `xlsx`, `pptx`, `web-artifacts-builder`, `frontend-design`, `claude-api`, `mcp-builder`, `skill-creator`, `brand-guidelines`, `doc-coauthoring`, `internal-comms`, `canvas-design`, `theme-factory`.

> Estas son **genéricas**: no se versionan en el repo porque sirven para cualquier proyecto. Las ves desde Claude Code en cualquier carpeta.

### 4.3 Cómo activar una skill

Solo dilo en lenguaje natural dentro de Claude Code:

> *"Activa la skill `webapp-testing` y dame screenshots de las 5 páginas principales del frontend SIGAB."*

> *"Usa `mysql` para listar los equipos del HGR No.1 que tengan más de 5 órdenes correctivas el último año."*

---

## 5. Inventario de agentes especializados (67 — The Agency)

Catálogo completo en `.claude/agents/` (67 archivos `.md`). Capa de coordinación NEXUS en `.claude/agency-strategy/`.

### 5.1 Ruteo rápido tarea → agente (de `CLAUDE.md`)

| Quiero… | Activo… |
|---------|---------|
| Diseñar arquitectura multi-tenant | `Backend Architect`, `Software Architect` |
| Escribir/optimizar migración Alembic | `Database Optimizer` |
| Endpoints FastAPI con JWT + tenant filtering | `Backend Architect`, `Senior Developer` |
| Panel React SuperAdmin | `Frontend Developer`, `UI Designer` |
| UI/UX de páginas | skill `ui-ux-pro-max` + `UI Designer`, `UX Architect` |
| Hardening de seguridad | `Security Engineer` |
| Provisioning Hetzner / Docker / CI/CD | `DevOps Automator`, `SRE` |
| Revisar un PR antes de mergear | `Code Reviewer`, `Reality Checker` |
| Pruebas de API / cross-tenant | `API Tester`, `Evidence Collector` |
| Rendimiento bajo carga | `Performance Benchmarker` |
| Modelo de precios SaaS | `FP&A Analyst`, `Financial Analyst` |
| Trámites SAT / fiscal | `Tax Strategist`, `Legal Compliance Checker` |
| Priorización del sprint | `Product Manager`, `Sprint Prioritizer` |
| Documentación técnica | `Technical Writer` |
| Onboarding al código | `Codebase Onboarding Engineer` |
| Incidente en producción | `Incident Response Commander` |
| Cambio mínimo / quirúrgico | `Minimal Change Engineer` |
| Resumen ejecutivo para jefatura | `Executive Summary Generator` |

> Sintaxis: *"Activa Backend Architect y…"* o *"Que el Database Optimizer revise esta migración."*

---

## 6. Servidores y conexiones SSH

### 6.1 Servidores

| Nombre | Para qué | IP / Host | Notas |
|--------|----------|-----------|-------|
| `sigab-bluehost` | VPS donde corre **SIGAB hoy** (legacy single-tenant). Cliente: HGR No.1 IMSS Tijuana. | `129.121.100.147` | 16 GB RAM, 8 vCPU, NVMe. URL: `https://sigab.129-121-100-147.sslip.io` |
| `sigah-staging` | Servidor en **Hetzner Cloud** para SIGAH SaaS multi-tenant (post Fase 0). | `<IP_HETZNER>` (por crear) | CX32 (4 vCPU, 8 GB, ~$150 MXN/mes). Ver `Runbook_Provisioning_Hetzner.md`. |
| `sigah-prod` | Producción SIGAH (post Fase 6). | `<IP_PROD>` (futuro) | CX42 o superior. |

### 6.2 Conectarte

Después de correr el setup, los aliases ya están en `~/.ssh/config`:

```powershell
ssh sigab-bluehost          # entra como root al VPS Bluehost
ssh sigah-staging           # cuando exista el servidor Hetzner
```

### 6.3 Túnel para usar la skill mysql

Necesario para que la skill `mysql` pueda consultar la BD del VPS desde el Asus:

```powershell
# Terminal aparte (déjala abierta toda la sesión)
ssh -L 3306:127.0.0.1:3306 sigab-bluehost
```

Si el puerto 3306 local está ocupado por tu MySQL local, usa otro puerto y ajústalo en `connections.json`:

```powershell
ssh -L 3308:127.0.0.1:3306 sigab-bluehost
```

---

## 7. Credenciales — checklist de lo que necesitas tener a mano

> **No commitees ninguna de estas en git.** Guárdalas en un gestor (1Password, Bitwarden) y referencia desde `~/.env` o `~/.claude/skills/mysql/connections.json` con `chmod 600`.

### 7.1 Personales

| Credencial | Para qué | Estado |
|------------|---------|--------|
| Cuenta GitHub de Gustavo | Push al repo SIGAH, CCPM | ☑ Ya tienes |
| e.firma SAT — Gustavo | Constituir la S. de R.L. (Fase 0 paso 1.1 del checklist) | ☐ Pendiente cita SAT |
| e.firma SAT — Carlos | Constituir la S. de R.L. (Fase 0 paso 1.2) | ☐ Pendiente cita SAT |
| Cuenta Bluehost | Acceso al cPanel del VPS actual de SIGAB | Verificar que tengas el password |

### 7.2 Servidor Bluehost (VPS SIGAB actual)

| Dato | Valor | Cómo obtener / dónde |
|------|-------|----------------------|
| Host | `129.121.100.147` | Ya en `~/.ssh/config` |
| Usuario SSH | `root` (probable) | cPanel de Bluehost o `<USUARIO_BLUEHOST>` en config |
| Llave SSH | `~/.ssh/sigab_bluehost_ed25519` | Generada por el script de setup |
| Password root MySQL | (en el VPS) | `grep PASSWORD docker-compose.yml` dentro del VPS, o el password que usaste al instalar |
| Usuario MySQL read-only | `sigab_readonly` | Crear con: `CREATE USER 'sigab_readonly'@'localhost' IDENTIFIED BY '<pw>'; GRANT SELECT ON sigab.* TO 'sigab_readonly'@'localhost';` |
| Bot Telegram token | `@sigab_imss_tj_bot` | En el VPS, env var del contenedor del bot |

### 7.3 Servidor Hetzner (cuando exista — Fase 0)

| Dato | Cómo obtener |
|------|-------------|
| API token Hetzner Cloud | `console.hetzner.cloud` → `Security` → `API Tokens` |
| IP del servidor `sigah-staging` | Al provisionar el CX32 (paso 3 del Runbook) |
| Usuario SSH | `sigah` (lo crea el runbook) |
| Llave SSH | `~/.ssh/sigah_ed25519` (generar) |
| Password MySQL `sigah_readonly` | Crear en BD nueva al hacer Fase 1 |

### 7.4 APIs de IA

| Servicio | Dónde generar la key | Límite mensual sugerido |
|----------|----------------------|-------------------------|
| Anthropic API | `console.anthropic.com` → `Settings` → `API Keys` | $30 USD (~$550 MXN) |
| Google AI Studio (Gemini) | `aistudio.google.com` → `Get API key` | $15 USD (~$280 MXN) |
| OpenAI (opcional, alternativa) | `platform.openai.com` → `API Keys` | $20 USD (~$370 MXN) |

### 7.5 Empresa SIGAH (cuando esté constituida)

| Dato | Estado |
|------|--------|
| Razón social: SIGAH, S. de R.L. de C.V. | ☐ Por reservar en Secretaría de Economía |
| RFC | ☐ Al alta SAT |
| Domicilio fiscal | Tijuana, BC (por confirmar) |
| Cuenta bancaria empresarial | ☐ Por abrir (BBVA, Santander o Banorte) |
| PAC para emitir CFDI | ☐ Por contratar (Facturama, Sat.ws o Konfio Sat) |
| Dominio | `sigah.mx` ☐ Por registrar en Akky o NIC.mx (~$350 MXN/año) |
| Correos institucionales | `gustavo@sigah.mx`, `carlos@sigah.mx`, `contacto@sigah.mx` |

> Detalle completo en `docs/SIGAH/Fase_0_Checklist_Operativo_SIGAH.docx` y `Propuesta_Fiscal_SAT_SIGAH.docx`.

---

## 8. Comandos útiles cotidianos

### 8.1 Git

```powershell
git pull                                  # sincronizar
git checkout sigah-saas                   # rama de trabajo SIGAH
git status
git add -p                                # agregar cambios por chunks
git commit -m "feat(tenant): refactor equipos.py"
git push
```

### 8.2 Backend (FastAPI) — solo local

```powershell
cd sigab-backend
.\venv\Scripts\Activate.ps1               # o source venv/bin/activate en WSL
uvicorn main:app --reload --port 8000
```

### 8.3 Frontend (React + Vite) — solo local

```powershell
cd sigab-frontend
npm run dev
# Abre http://localhost:5173
```

### 8.4 Pruebas

```powershell
cd sigab-backend
pytest                                     # todos
pytest tests/test_tenant_isolation.py -v   # solo aislamiento multi-tenant
```

### 8.5 Migraciones Alembic

```powershell
cd sigab-backend
alembic history --verbose                  # ver árbol de migraciones
alembic upgrade head --sql > /tmp/upgrade.sql   # dry-run (preview SQL)
alembic upgrade head                       # aplicar todas
alembic downgrade -1                       # revertir la última
```

### 8.6 Túnel SSH para MySQL del VPS

```powershell
ssh -L 3306:127.0.0.1:3306 sigab-bluehost      # mantén abierta
# En otra terminal:
mysql -h 127.0.0.1 -u sigab_readonly -p sigab  # entrar a la BD del VPS
```

### 8.7 Docker (stack local completo)

```powershell
docker compose up -d                       # levantar mysql + backend + frontend
docker compose logs -f backend             # seguir logs
docker compose down                        # apagar
```

### 8.8 Claude Code

```
/skills                # listar skills disponibles
/help                  # ayuda
/clear                 # limpiar el historial de la sesión
/memory                # ver/editar memoria persistente
```

---

## 9. Estado actual del proyecto (al 17 de mayo 2026)

### Lo que ya está hecho (entregables en `docs/SIGAH/`)

- ✅ Plan de Trabajo Maestro SIGAH (12 págs)
- ✅ Propuesta Fiscal/SAT (recomienda S. de R.L. + RESICO PM)
- ✅ Cálculo de Costos Cloud + IA (Hetzner + IA híbrida, ~$1,500/mes mes 1)
- ✅ 4 plantillas operativas .docx (Reporte de Falla, OS Correctivo/Preventivo/Predictivo) + Especificación
- ✅ Mockups visuales aprobados
- ✅ Checklist operativo Fase 0
- ✅ Runbook Hetzner + Marca SIGAH + Setup Claude Code para Asus TUF
- ✅ Rebrand SIGAB→SIGAH en CLAUDE.md, AGENTS.md, README.md
- ✅ Fase 1 scaffold: migración Alembic + modelo Hospital + TenantMixin + dependencia `get_current_tenant` + JWT extendido (NO aplicado)
- ✅ Fase 3 prep: migración complementaria SuperAdmin (NO aplicada)
- ✅ Fase 2 prep: plantilla canónica `_examples_tenant_pattern.py` + suite `test_tenant_isolation.py` + README + checklist 20 routes
- ✅ 12 skills + 67 agentes instalados en el repo
- ✅ Scripts setup PowerShell + bash + config SSH

### Lo que queda pendiente (priorizado)

| # | Tarea | Quién | Bloqueo |
|---|------|-------|---------|
| 1 | Citas SAT para e.firma de Gustavo y Carlos | ambos | nada |
| 2 | Reservar denominación social "SIGAH" en SE | Gustavo | nada |
| 3 | Cotizar 2-3 notarios en Tijuana | Gustavo | nada |
| 4 | Crear cuenta Hetzner Cloud + provisionar CX32 | Gustavo | nada (~30 min) |
| 5 | Registrar dominio `sigah.mx` | Gustavo | nada |
| 6 | Aplicar migración Fase 1 en `staging` | Gustavo | servidor Hetzner (#4) |
| 7 | Refactor de los 20 archivos `routes/*` | Gustavo + Claude | migración Fase 1 aplicada |
| 8 | Correr `pytest tests/test_tenant_isolation.py` | Gustavo | refactor (#7) |
| 9 | Diseño de logo SIGAH | diseñador externo | nada |
| 10 | Constitución legal (notario) | Gustavo + Carlos | citas SAT (#1) |

### El siguiente sprint sugerido (las próximas 2 semanas)

**Semana 1 — Fundación legal y cloud**
- L–M: citas SAT, reservar SIGAH en SE
- M–J: provisionar Hetzner CX32 + registrar sigah.mx (~3 hrs)
- V: contratar contador + cotizar notarios

**Semana 2 — Migración técnica**
- L–M: aplicar Fase 1 en staging Hetzner, verificar
- M–V: refactor de `routes/equipos.py`, `routes/ordenes.py`, `routes/auth.py` con Claude (sesión por archivo, ~3 hrs c/u)
- V: correr suite tenant_isolation, commitear

---

## 10. Migración SIGAB → SIGAH — vista consolidada

```
┌───────────────────────────────────────────────────────────────────┐
│  SIGAB (instancia HGR No.1 IMSS Tijuana)                          │
│  • On-premise · single-tenant · sigue corriendo sin cambios       │
│  • Funciona como "cliente ancla" y caso de éxito de SIGAH         │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         │  Misma codebase, mismo equipo, otra
                         │  empresa y modelo de despliegue.
                         ▼
┌───────────────────────────────────────────────────────────────────┐
│  SIGAH (la empresa y la plataforma SaaS)                          │
│  • Multi-tenant en la nube (Hetzner)                              │
│  • Cada hospital cliente = 1 tenant aislado por tenant_id         │
│  • Panel SuperAdmin para administración global de SIGAH           │
│  • Edge Nodes en cada hospital para impresión y escaneo local     │
│  • Vende suscripciones (Setup Fee + mensualidad)                  │
└───────────────────────────────────────────────────────────────────┘

Fase 0 → Fundación legal + infra Hetzner + repo rebrandeado       [EN CURSO]
Fase 1 → Multi-tenancy en BD (tabla hospitales + tenant_id)      [SCAFFOLD]
Fase 2 → Aislamiento backend (get_current_tenant en todos routes)[SCAFFOLD]
Fase 3 → Panel SuperAdmin SIGAH                                  [PENDIENTE]
Fase 4 → Despliegue cloud + Edge Nodes                           [PENDIENTE]
Fase 5 → Módulo de Formatos parametrizables                      [PENDIENTE]
Fase 6 → Comercialización (CFDI + onboarding + hardening)         [PENDIENTE]
```

**Detalle completo:** `docs/SIGAH/Plan_de_Trabajo_Maestro_SIGAH.docx`.

---

## 10.5 QA continuo con Playwright (skill `webapp-testing`)

La skill `webapp-testing` (Anthropic, basada en Playwright) es la herramienta clave para pulir el frontend SIGAH antes de venderlo a otros hospitales. Tres usos concretos:

### Pulir botones y flujos

> *"Activa `webapp-testing`. Levanta el frontend local (npm run dev en `sigab-frontend/`). Recorre las 5 pantallas principales — Dashboard, Equipos, Órdenes, Preventivos, Tecnovigilancia. Verifica que cada botón visible responda con su acción esperada y reporta cuáles fallan o tienen feedback confuso."*

### Validar el diseño intuitivo

> *"Usa Playwright para hacer un walkthrough de un usuario nuevo: arranca en login, entra a Equipos, escanea un QR, abre el detalle, crea una orden de servicio. Captura screenshot de cada paso. Identifica fricción: pasos innecesarios, labels ambiguas, botones poco visibles."*

### Tests de regresión visual

> *"Levanta `webapp-testing` y arma una suite de smoke test que abra cada ruta del frontend, espere a que cargue, valide que no haya errores de consola, y guarde screenshot. Si una página dispara un 500 o un error React, marca falla."*

### Cuándo correrla

| Disparador | Qué probar |
|------------|-----------|
| Tras refactorizar un endpoint backend | El componente React que lo consume sigue funcionando. |
| Antes de cada deploy | Smoke test completo de las 9 páginas. |
| Cuando Carlos reporta "esto no se ve bien" | Reproducir el flujo con Playwright, capturar el bug. |
| Antes del onboarding de un nuevo hospital | Probar el flujo en una resolución / navegador distinto. |

### Pre-requisitos

```powershell
cd sigab-frontend
npm install
npm run dev                    # backend corriendo en :8000, frontend en :5173

# En otra terminal, dentro de Claude Code, activa la skill:
# La skill auto-instala Playwright + Chromium si falta.
```

> Esta capacidad se integra al refactor Fase 2: cada vez que se cierre un route refactorizado, se corre `pytest tests/test_tenant_isolation.py` (API) **y** un walkthrough Playwright (UI), para que el aislamiento multi-tenant no rompa pantallas existentes.

---

## 11. Cuando algo falla — troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| `claude: command not found` al abrir terminal | El PATH no incluye la carpeta de npm globals | Cierra y reabre PowerShell; si persiste, agrega `npm config get prefix` al PATH del sistema. |
| `Permission denied (publickey)` en `ssh sigab-bluehost` | La llave pública no está en `~/.ssh/authorized_keys` del VPS | Pegar el contenido de `~/.ssh/sigab_bluehost_ed25519.pub` en el VPS (ver §3.3 del Setup_ClaudeCode_AsusTUF.md). |
| Skill `mysql` falla con `ECONNREFUSED 127.0.0.1:3306` | No hay túnel SSH activo, o el puerto local está ocupado | Levantar `ssh -L 3306:127.0.0.1:3306 sigab-bluehost` en otra terminal. Si 3306 está en uso, usar 3308 y editarlo en `connections.json`. |
| `claude` arranca pero `/skills` muestra solo las del usuario | Estás corriendo `claude` fuera del repo SIGAH | `cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB` antes de correr `claude`. |
| `alembic upgrade` falla con "no such table: hospitales" | No estás en la BD correcta | Verifica `DATABASE_URL` en `database.py` o en `.env` — apuntar a `sigah` (no `sigab` legacy). |
| Tests fallan con `403 Forbidden` masivamente | Los tokens generados en tests no incluyen `tenant_id` | Asegúrate que `create_access_token` reciba `tenant_id` en el dict del user. Ver `tests/test_tenant_isolation.py` líneas 80-95. |
| Backend funciona local pero el frontend no carga datos | CORS, URL del API o JWT vencido | Inspector del navegador: pestaña Network y Console. Si CORS, ajustar `main.py` (cors_origins). |
| `git push` rechazado | Rama protegida o no tienes permisos | `git push -u origin sigah-saas` o crear PR si `main` está protegida. |
| Cambio en CLAUDE.md no se carga en Claude Code | Sesión vieja | Salir con `/exit` y reentrar con `claude`. |
| Necesito recordar dónde está algo y olvidé este doc | — | `cat docs/SIGAH/WORKBOOK_MAESTRO_SIGAH.md` (este archivo). |

---

## 12. Apéndice — índice de todos los documentos del proyecto

| Documento | Para qué |
|-----------|---------|
| `WORKBOOK_MAESTRO_SIGAH.md` ⭐ | **Este archivo.** Lo primero que abres cada día. |
| `Plan_de_Trabajo_Maestro_SIGAH.docx` | Roadmap completo de 7 fases en 24 semanas. |
| `Propuesta_Fiscal_SAT_SIGAH.docx` | S. de R.L. + RESICO PM, hoja de ruta de constitución. |
| `Calculo_de_Costos_Cloud_IA_SIGAH.docx` | Comparativo Hetzner + IA híbrida, 3 escenarios. |
| `Especificacion_Formatos_SIGAH.docx` | Modelo de datos + endpoints para que la app genere los 4 formatos. |
| `Formato_0[1-4]_*.docx` | Plantillas editables: Reporte de Falla, OS Correctivo, Preventivo, Predictivo. |
| `Fase_0_Checklist_Operativo_SIGAH.docx` | Tablero de tareas Fase 0 con responsables y plazos. |
| `Runbook_Provisioning_Hetzner.md` | 12 pasos para levantar el VPS Hetzner desde cero. |
| `Marca_SIGAH.md` | Paleta, tipografía, dominios, brief para diseñador de logo. |
| `Setup_ClaudeCode_AsusTUF.md` | Cómo configuró este Asus TUF (referencia). |
| `Fase_1_README.md` | Cómo aplicar la migración multi-tenant Alembic. |
| `Fase_2_README.md` | Patrón de refactor + checklist de los 20 archivos `routes/`. |

---

## 13. Próximas tres decisiones que toman tú y Carlos

1. **Confirmar opción 2 SuperAdmin** (que ya escogiste). Está lista la migración complementaria `b1c2d3e4f5a6` — se aplica en Fase 3.
2. **Definir presupuesto Fase 0**: ~$36,500 MXN una vez (constitución) + ~$3,500 MXN/mes recurrente (contador + IA + cloud). ¿Va el monto?
3. **Calendarizar arranque Fase 1**: tan pronto como Hetzner esté arriba, ¿quieres que el refactor de los 20 routes lo hagamos en sesiones de 1 archivo/día contigo en línea, o que Claude lo proponga como PRs masivos para que tú revises?

---

**Cuando arranques mañana**, este archivo es lo único que necesitas tener abierto. Todo lo demás lo encuentras desde aquí.

_v1.0 — 17 de mayo 2026. Mantenedor: Gustavo. Actualizar al cierre de cada fase._

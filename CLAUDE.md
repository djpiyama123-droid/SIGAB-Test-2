# SIGAH — Claude Code Project Context

## Proyecto
**Sistema Integral de Gestión de Activos Biomédicos (SIGAH) V2.0**
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
- Páginas en `sigah-frontend/src/pages/` (Dashboard, Equipos, Ordenes, Tecnovigilancia, Copilot, etc.)
- Componentes en `sigah-frontend/src/components/`
- Mejoras visuales, rediseño, accesibilidad, responsive
- Nuevos módulos con UI (formularios, tablas, modales, cards, charts)

**Paleta SIGAH recomendada**: Medical/Clinical — azul IMSS (#006CB7), verde biomédico (emerald-600), alertas (amber/red)
**Estilo base**: Minimalism + Dark Mode compatible, componentes con Tailwind utility classes
**Tipografía**: Inter (UI global) + JetBrains Mono (folios, series, IDs técnicos) + Outfit (display/body en LandingPage pública)

## Estructura del Monorepo (SIGAH = empresa; contiene a SIGAB = app)
```
SIGAH/  (este repo en GitHub: djpiyama123-droid/SIGAH)
├── portal-sigah/   # Portal comercial + WebPanel CEO/Dev (React+TS). Consume API de SIGAB.
│                   #   Deploy: portal-sigah/deploy.ps1 → panel.129-121-100-147.sslip.io
├── sigab-backend/  # API FastAPI de la app SIGAB           ← NO MOVER (VPS depende de ./sigab-backend)
├── sigab-frontend/ # App hospitalaria React 19             ← NO MOVER (VPS)
├── sigab-bot/      # Bot WhatsApp Baileys                  ← NO MOVER (VPS)
├── database/       # Schema + seed MySQL                   ← NO MOVER (VPS)
├── docker-compose.yml  # Stack producción (rutas ./sigab-*) ← NO ROMPER
├── docs/           # INFRAESTRUCTURA-3-MAQUINAS.md, etc.
├── scripts/        # sync-contexto.sh y utilidades
└── CLAUDE.md       # Memoria compartida (fuente de verdad)
```

> **Infraestructura 3 máquinas** (ASUS · ThinkCentre 24/7 · VPS): ver `docs/INFRAESTRUCTURA-3-MAQUINAS.md`.
> GitHub es la fuente de verdad; las 3 máquinas son réplicas vía `git pull`. Tailscale + Syncthing + Ubuntu nativo.

## Módulos Implementados — SIGAB Plataforma Hospitalaria
1. Auth JWT                  `routes/auth.py`         → `/api/auth/*`
2. Equipos                   `routes/equipos.py`      → `/api/equipos`
3. Órdenes de Servicio       `routes/ordenes.py`      → `/api/ordenes`
4. Preventivos / Mant.       `routes/preventivos.py`  → `/api/preventivos` + `/api/preventivos/proximos`
5. Dashboard KPIs            `routes/dashboard.py`    → `/api/dashboard/resumen`, `/api/dashboard/kpis`
6. Alertas                   `routes/alertas.py`      → `/api/alertas`
7. Tecnovigilancia NOM-240   `routes/tecnovigilancia.py` → `/api/tecnovigilancia`
8. SIGAH Copilot IA          `routes/copilot.py`      → `/api/copilot` (desactivable via ENV)
9. Trazabilidad              `routes/trazabilidad.py` → `/api/trazabilidad`
10. Reportes PDF/Excel       `routes/reportes.py`     → `/api/reportes`
11. Auditoría NOM-016        `routes/auditoria.py`    → `/api/auditoria`
12. Checklists               `routes/checklists.py`   → `/api/checklists`
13. Almacén                  `routes/almacen.py`      → `/api/almacen`
14. Metrología               `routes/metrologia.py`   → `/api/metrologia`
15. Capacitaciones           `routes/capacitaciones.py` → `/api/capacitaciones`
16. Reservas                 `routes/reservas.py`     → `/api/reservas`
17. Formatos IMSS            `routes/formatos.py`     → `/api/formatos`
18. OCR / Visión             `routes/ocr.py`          → `/api/ocr`
19. OpenClaw Agente IA       `routes/openclaw.py`     → `/api/openclaw`
20. QR / Inventario          `routes/equipos.py`      → `/api/equipos/qr/*`
21. Admin Global SuperAdmin  `routes/admin.py`        → `/api/admin-*`
22. Eventos SSE              `routes/events.py`       → `/api/v1/events`
23. Bot WhatsApp Twilio      `routes/twilio_whatsapp.py` → `/api/twilio`

## Módulos SIGAB WebPanel (panel.sslip.io → usa API SIGAB)
24. Monitor                  `routes/monitor.py`      → `/api/monitor/status`
25. Tokens API               `routes/tokens.py`       → `/api/tokens`
26. Cerebro / Claude Code    `routes/cerebro.py`      → `/api/cerebro/sesiones`

## 🔒 Estado de Cambios Activos (2026-05-30 — rama feat/sileo-toasts-hermes-context)

### Cambios realizados por Antigravity (Completados y listos para commit)
- **sigab-bot/index.js**: Implementación de `FASE2-OPENCLAW-JWT`. Se añadió la carga de `BOT_API_KEY`, la función de autenticación `botLogin()` para obtener JWT efímero del hospital mediante `POST /api/openclaw/bot-login`, y el wrapper `authPost()` para añadir cabeceras `Authorization: Bearer` y reintentar una vez tras 401 (re-login automático). Las llamadas a `/intake-group` ahora usan `authPost()`. Se añadió el disparador en el arranque cuando `connection === 'open'`.
- **sigab-backend/database.py & config.py**: Añadido soporte explícito de `charset=utf8mb4` en la URL de conexión SQLAlchemy y la configuración aiomysql para prevenir mojibake (commiteado en `c540b44`).
- **Base de Datos (Producción)**: Ejecutado el script `fix_db_encoding.py` directamente en el contenedor del VPS, corrigiendo 623 registros de texto doblemente codificados en las tablas `equipos`, `zonas_mapa` y `ordenes_servicio`.

### Archivos modificados por la sesión WebPanel (SIN commitear aún)
- `sigab-backend/main.py` → CORS expandido + 4 nuevos routers (twilio, monitor, tokens, cerebro)
- `sigab-backend/routes/dashboard.py` → endpoint `GET /kpis` al final
- `sigab-backend/routes/preventivos.py` → endpoint `GET /proximos` al final
- `sigab-backend/routes/monitor.py` → NUEVO archivo (no trackear aún)
- `sigab-backend/routes/tokens.py` → NUEVO archivo (no trackear aún)
- `sigab-backend/routes/cerebro.py` → NUEVO archivo (no trackear aún)

### Cambios de UI/Stitch por Claude Code (SIN commitear aún - en working tree)
- `sigab-frontend/src/pages/Dashboard.jsx` (refactorización de botones Poka-Yoke y NOM-016 con Lucide)
- `sigab-frontend/src/pages/Equipos.jsx` (estandarización de toggle tarjetas/tabla y botones Nuevo Equipo/CSV con Lucide)
- `sigab-frontend/src/pages/Ordenes.jsx` (estandarización de botones con Lucide)

### Orden de commit correcto
1. **Primero**: commitear los 3 archivos de la UI de la sesión de Claude Code (`git commit` con prefijo correspondiente).
2. **Segundo**: commitear los cambios del bot de esta sesión (`sigab-bot/index.js`) con prefijo `[Antigravity]`.
3. NO hacer merge a `main` hasta que ambas sesiones hayan commiteado en sus ramas.

---

## Convenciones
- Todos los textos en **español mexicano** (UI y mensajes)
- Toast notifications con `toast.success/error/loading`
- Colores de estado: emerald=operativo, amber=mantenimiento, red=fuera_servicio, slate=baja
- Máquinas de estado con dict `TRANSICIONES` en backend (patrón establecido)
- Audit trail en tabla `log_actividad` para NOM-016

## Comandos Frecuentes de Desarrollo y Despliegue

### Local (Desarrollo)
- **Backend (FastAPI)**: `cd sigab-backend && uvicorn main:app --reload`
- **Frontend (Vite)**: `cd sigab-frontend && npm run dev`
- **Base de Datos**: `docker compose up -d mysql` (puerto 3306)

### VPS (Producción - Host `sigab-vps`)
- **Acceso rápido**: `ssh sigab-vps` (utiliza la llave `~/.ssh/sigab_vps`)
- **Recompilar frontend estático**: `cd /opt/sigab/sigab-frontend && npm run build`
- **Reiniciar stack de servicios**: `cd /opt/sigab && docker compose up -d --force-recreate`
- **Reiniciar Traefik (Refrescar Socket)**: `docker restart traefik`

---

## ⚡ Reglas Críticas del VPS (Memoria de Agentes)

### 1. Regla del Dominio y Traefik (Evitar Bad Gateway)
- **IMPORTANTE**: La aplicación debe ser accesible a través de ambos dominios: `sigab.129-121-100-147.sslip.io` y `sigah.129-121-100-147.sslip.io`.
- Cualquier modificación en `docker-compose.yml` en los labels de Traefik para backend o frontend **DEBE** incluir ambos hosts. Ejemplo:
  `"traefik.http.routers.sigah-fe.rule=Host(\`129.121.100.147\`) || Host(\`sigab.129-121-100-147.sslip.io\`) || Host(\`sigah.129-121-100-147.sslip.io\`)"`
- Si no se incluyen ambos hosts en Traefik, las peticiones HTTP del dominio que no coincida fallarán inmediatamente con **Bad Gateway (502)** o **404 Not Found**.

### 2. Refresco del Docker Socket
- **SÍNTOMA**: Si el daemon de docker se reinicia o actualiza en la VPS, el bind mount de `/var/run/docker.sock` dentro de Traefik se vuelve **stale** (descriptor de archivo huérfano/roto), lo que causa que Traefik arroje errores de conexión y devuelva `Bad Gateway` para todos los dominios.
- **SOLUCIÓN**: Ejecutar `docker restart traefik` en el VPS. Esto recarga la conexión y restaura la resolución de rutas inmediatamente.

### 3. Credenciales de Base de Datos en Producción
**⚠️ Nunca escribir contraseñas reales en este archivo — es un repositorio público/compartido entre agentes.**
Para cualquier migración de base de datos directa o scripts de mantenimiento en el VPS, usar los datos reales del contenedor:
- **Base de Datos**: `sigab` (nota la 'b')
- **Usuario**: `sigab_user`
- **Contraseña**: rotada 2026-08-19 tras exposición en este archivo — ver gestor de contraseñas / `.env` del VPS (`DB_PASS` en `/opt/sigab/.env`), nunca en texto plano en el repo.
- **Comando de acceso rápido** (sustituir `$DB_PASS` por el valor real leído del `.env`, nunca pegarlo aquí):
  `docker exec -it sigah-mysql mysql -usigab_user -p"$DB_PASS" sigab`

### 4. Sincronización Antigravity & Claude Code
- Ambos agentes deben operar cooperativamente y mantener `CLAUDE.md` como la **fuente de verdad** y memoria compartida del proyecto.
- Cualquier migración de base de datos debe ser versionada bajo `database/migrations/00X_nombre.sql` y ser ejecutada de manera idempotente en el VPS.
- Sincronizar todos los cambios locales haciendo push a `origin` y ejecutando un `git pull` limpio en el VPS (`/opt/sigab`).


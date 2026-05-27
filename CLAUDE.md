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
**Tipografía**: Inter (UI) + Source Sans Pro (data tables)

## Estructura del Proyecto
```
sigah-backend/      # FastAPI routes, services, models
sigah-frontend/     # React pages, components, hooks
migrations/         # SQL migrations (001-006)
sigah-bot/          # Bot de notificaciones
.claude/skills/     # Skills instaladas (ui-ux-pro-max)
```

## Módulos Implementados
1. Autenticación JWT (auth/)
2. Gestión de Equipos (equipos.py / Equipos.jsx)
3. Órdenes de Servicio (ordenes.py / Ordenes.jsx)
4. Mantenimiento Preventivo (preventivos.py / Preventivos.jsx)
5. Alertas + Dashboard KPIs (dashboard.py / Dashboard.jsx)
6. Tecnovigilancia NOM-240 (tecnovigilancia.py / Tecnovigilancia.jsx)
7. SIGAH Copilot IA Local (copilot.py / Copilot.jsx)
8. Trazabilidad NOM-016 (trazabilidad.py / Trazabilidad.jsx)
9. Reportes PDF/Excel (reportes.py / Reportes.jsx)

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
Para cualquier migración de base de datos directa o scripts de mantenimiento en la VPS, usar los datos reales del contenedor:
- **Base de Datos**: `sigab` (nota la 'b')
- **Usuario**: `sigab_user`
- **Contraseña**: `7_ALvv_NEldMfImwdnA6sw`
- **Comando de acceso rápido**:
  `docker exec -it sigah-mysql mysql -usigab_user -p7_ALvv_NEldMfImwdnA6sw sigab`

### 4. Sincronización Antigravity & Claude Code
- Ambos agentes deben operar cooperativamente y mantener `CLAUDE.md` como la **fuente de verdad** y memoria compartida del proyecto.
- Cualquier migración de base de datos debe ser versionada bajo `database/migrations/00X_nombre.sql` y ser ejecutada de manera idempotente en el VPS.
- Sincronizar todos los cambios locales haciendo push a `origin` y ejecutando un `git pull` limpio en el VPS (`/opt/sigab`).


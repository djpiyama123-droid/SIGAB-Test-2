# PROMPT DE ANCLAJE — Entorno SIGAH / SIGAB

> Pega este bloque al iniciar cualquier sesión de Claude Code para trabajar en SIGAH/SIGAB.
> Copia desde la línea `===` hasta el final.

```
=== CONTEXTO MAESTRO SIGAH / SIGAB — LEER ANTES DE ACTUAR ===

IDENTIDAD
- SIGAH = la EMPRESA y el sistema: "Sistema Integral de Gestión de Activos Biomédicos (SIGAH) V2.0".
  Cliente real: Hospital General Regional No.1 IMSS Tijuana. Cumple NOM-016 / NOM-240 / ISO-13485.
- SIGAB = la PLATAFORMA/panel de monitoreo y desarrollo de SIGAH (para mí, Gustavo López Carballo, fundador/CEO).
- Soy bioingeniero; respóndeme en español mexicano, técnico pero directo.

REPO ÚNICO (FUENTE DE VERDAD)
- GitHub: https://github.com/djpiyama123-droid/SIGAB-Test-2.git  (remote: origin)
- En el VPS vive en: /opt/sigab
- El archivo /opt/sigab/CLAUDE.md es la memoria compartida entre Claude Code y Antigravity IDE.
  CONSULTAR SIEMPRE ese CLAUDE.md primero; mantenerlo actualizado tras cambios importantes.

MIS 3 EQUIPOS Y SUS ROLES
- ASUS TUF Gaming A16 (WSL2): desarrollo principal, donde corro Claude Code.
- Lenovo ThinkCentre: equipo secundario de desarrollo / pruebas.
- VPS Bluehost (129.121.100.147, host SSH `sigab-vps` o `sigab-bluehost`, llave ~/.ssh/sigab_vps): PRODUCCIÓN.

STACK REAL (PRODUCCIÓN)
- Backend: FastAPI + Python 3.12 + MySQL 8.0 (puerto 8000). Rutas bajo /api/* (auth, equipos, ordenes,
  dashboard, alertas, preventivos, trazabilidad, tecnovigilancia, metrologia, almacen, copilot, reportes...).
- Frontend cliente: React 19 + Vite + Tailwind (carpeta sigab-frontend, JSX). Build estático servido por nginx.
- Portal marketing: sigah-portal. Monitor de servicios: monitor. Bot WhatsApp (Baileys): sigab-bot.
- IA local: Ollama (puerto 11434, modelos qwen-claw / gemma4-claw). Sin costo de tokens externos.
- Infra: Docker Compose + Traefik (reverse proxy 80/443, TLS Let's Encrypt). 100% on-premise/VPS.

URLS PÚBLICAS
- https://sigab.129-121-100-147.sslip.io      -> dashboard cliente (sigah-frontend) + API en /api
- https://sigah.129-121-100-147.sslip.io       -> portal de marketing (sigah-portal)
- https://monitor.sigah.129-121-100-147.sslip.io -> monitor de servicios
- https://panel.129-121-100-147.sslip.io       -> SIGAB WebPanel (mi panel founder: login gustavo/carlos Sigah2026!,
    monitor, dashboard, inventario con los 751 equipos reales, cerebro de sesiones, tokens). Stack APARTE:
    contenedores sigab-panel (nginx) + sigab-panel-api (Node), artefactos en /opt/sigab-panel/ (NO /opt/sigab).
    Re-deploy: npm run build local -> rsync dist/ y backend/server.js a /opt/sigab-panel/ -> docker restart sigab-panel sigab-panel-api.

DATOS REALES EN MySQL (DB `sigab`, ojo: con 'b')
- 751 equipos, 50 órdenes de servicio, 49 zonas de mapa, 1 hospital, 1 usuario. NO inventar datos mock.
- Acceso: docker exec -it sigah-mysql sh -c 'mysql -usigab_user -p"$MYSQL_PASSWORD" sigab' (la contraseña vive en el .env del VPS, no en claro aquí)
- Migraciones versionadas e idempotentes en database/migrations/00X_nombre.sql

REGLA DE ORO (NO ROMPER PRODUCCIÓN)
- El repo local TypeScript+Node mock NO es producción y NO debe sobrescribir el VPS.
- Nunca reemplazar el stack FastAPI+MySQL del VPS. Cambios nuevos = aditivos (nuevo subdominio/contenedor),
  o integrados DENTRO de SIGAB-Test-2 sobre FastAPI/React-JSX. Confirmar conmigo antes de desplegar.

FLUJO DE TRABAJO (QUÉ CONSULTAR, PROGRAMAR, MOVER, DESPLEGAR)
1. CONSULTAR: leer /opt/sigab/CLAUDE.md y AGENTS.md; entender el módulo a tocar (par .py backend + .jsx frontend).
2. PROGRAMAR EN LOCAL: editar en el repo; backend `uvicorn main:app --reload`, frontend `npm run dev`.
   Para UI invocar la skill ui-ux-pro-max. Paleta: azul IMSS #006CB7, emerald=operativo, amber=mantenimiento,
   red=fuera_servicio, slate=baja. Tipografía Inter + Source Sans Pro. Todo en español mexicano.
3. MOVER EL REPO: commit + push a origin (SIGAB-Test-2). NUNCA --no-verify. Commits descriptivos.
4. DESPLEGAR EN VPS (con mi OK):
   - ssh sigab-vps  &&  cd /opt/sigab  &&  git pull
   - Frontend: cd sigab-frontend && npm run build
   - Stack: docker compose up -d --force-recreate
   - Si hay 502/Bad Gateway: docker restart traefik (socket stale).
5. REGLA TRAEFIK: cualquier label de router en docker-compose.yml DEBE incluir AMBOS hosts
   (sigab.129-... y sigah.129-...) o el dominio que falte da 502/404.

COORDINACIÓN DE AGENTES
- Claude Code y Antigravity IDE cooperan; CLAUDE.md es la memoria compartida y fuente de verdad.
- Para auditorías o trabajo paralelo, lanzar subagentes con alcance claro (auditar SIGAH vs trabajar en SIGAB),
  sin duplicar búsquedas.

ANTES DE CUALQUIER ACCIÓN DESTRUCTIVA O DESPLIEGUE: confirmar conmigo. Medir dos veces, cortar una.

=== FIN CONTEXTO MAESTRO ===
```

# Plan de Deploy a Producción — 3 frentes en sslip.io

> Estado: BORRADOR PARA APROBACIÓN — no ejecutar en VPS hasta OK de Gustavo.
> Fecha: 2026-05-29

## Objetivo
Que estas 3 cosas sean visibles en producción desde sslip.io:
1. **Landing comercial SIGAH** (cliente) → propuesto: `sigah.129-121-100-147.sslip.io`
2. **Panel super-admin Gustavo** (portal-sigah WebPanel) → `panel.129-121-100-147.sslip.io`
3. **App SIGAB hospitalaria** (~800 equipos) → `sigab.129-121-100-147.sslip.io`

---

## Realidad actual de producción (según docker-compose.yml del repo)

| Servicio | Contenedor | Sirve en | Contenido hoy |
|----------|-----------|----------|---------------|
| frontend | `sigah-frontend` (nginx) | `sigab.` Y `sigah.` Y la IP | **app SIGAB hospitalaria** (sigab-frontend/dist) |
| backend | `sigah-backend` (FastAPI) | `sigab.`/`sigah.` `/api` | API SIGAB |
| bot | `sigah-bot` | interno :3000 | WhatsApp |
| mysql | `sigah-mysql` | :3306 | DB sigab (800 equipos) |

**Conclusiones:**
- Hoy `sigah.sslip.io` y `sigab.sslip.io` muestran **lo mismo** (la app hospitalaria).
- El **panel** (`portal-sigah`) **NO está en docker-compose**. Su `deploy.ps1` lo sube por `scp` a `/var/www/sigah` — es un deploy estático separado, probablemente servido por una config de Traefik/nginx que vive en el VPS pero **no está versionada en este repo**.
- `panel.sslip.io` (visto en tus capturas) ya respondía → existe algún arreglo en el VPS que no controlamos desde el repo.

---

## ⚠️ Fase 0 OBLIGATORIA — Discovery del VPS (solo lectura, requiere tu OK)

Antes de cambiar nada hay que ver qué hay realmente en el VPS, porque el repo no refleja toda la config de producción:

```bash
ssh sigab-vps
cd /opt/sigab
git branch --show-current && git remote -v       # rama y remote que usa prod
git log --oneline -3
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'   # contenedores vivos
docker network ls | grep hostedapps              # red de Traefik
# Buscar config de panel.sslip.io
ls -la /var/www/sigah 2>/dev/null                # ¿deploy estático del panel?
docker inspect traefik | grep -i sslip           # rutas Traefik activas
cat /opt/sigab/docker-compose.yml | grep -A2 panel  # ¿hay servicio panel?
```

**Resultado esperado:** saber (a) qué rama corre prod, (b) si panel.sslip.io es estático o dockerizado, (c) la config Traefik real.

---

## Estrategia recomendada (después del discovery)

### Opción recomendada: 3 servicios docker + Traefik por host

Hacer el deploy **aditivo y reproducible** metiendo el panel a docker-compose, en vez de depender del scp manual.

**Mapa de URLs propuesto:**
- `sigab.sslip.io` → app SIGAB hospitalaria (sigab-frontend) — **sin cambios**
- `panel.sslip.io` → portal-sigah build (panel super-admin) — **nuevo servicio docker**
- `sigah.sslip.io` → landing comercial (decisión: ¿misma SPA del portal en ruta `/`, o app SIGAB como hoy?)

### Pasos

1. **[CONFIRMAR]** Discovery del VPS (Fase 0 arriba).
2. Definir el `.env.production` del panel:
   - El panel consume la API de SIGAB. Hoy apunta a `panel.sslip.io` — debe apuntar a `sigab.sslip.io` (donde vive la API) salvo que montemos un proxy `/api` en el propio panel (su `nginx-panel.conf` ya proxya `/api` a `sigab-panel-api:8000`).
3. Agregar servicio `panel` a `docker-compose.yml` (aditivo, sin tocar los existentes):
   ```yaml
   panel:
     image: nginx:alpine
     container_name: sigah-panel
     restart: always
     volumes:
       - ./portal-sigah/dist:/usr/share/nginx/html:ro
       - ./portal-sigah/nginx-panel.conf:/etc/nginx/conf.d/default.conf:ro
     networks: [hostedapps_default]
     labels:
       - "traefik.enable=true"
       - "traefik.docker.network=hostedapps_default"
       - "traefik.http.routers.sigah-panel-s.rule=Host(`panel.129-121-100-147.sslip.io`)"
       - "traefik.http.routers.sigah-panel-s.entrypoints=websecure"
       - "traefik.http.routers.sigah-panel-s.tls=true"
       - "traefik.http.routers.sigah-panel-s.tls.certresolver=challenger"
       - "traefik.http.services.sigah-panel-svc.loadbalancer.server.port=80"
   ```
   > Recordar REGLA: los routers existentes de frontend/backend deben seguir incluyendo `sigab.` Y `sigah.` o dan 502.
4. Build del panel en el VPS:
   ```bash
   cd /opt/sigab/portal-sigah && npm ci && npm run build
   ```
5. Levantar:
   ```bash
   cd /opt/sigab
   git pull <remote> feat/sileo-toasts-hermes-context   # o main si se mergea antes
   cd sigab-frontend && npm run build                    # app SIGAB (por endpoints nuevos del backend)
   docker compose up -d --force-recreate backend panel frontend
   docker restart traefik                                # refrescar socket si 502
   ```
6. Verificación:
   ```bash
   curl -s https://sigab.129-121-100-147.sslip.io/health     # {"status":"ok"}
   curl -s -o /dev/null -w "%{http_code}" https://panel.129-121-100-147.sslip.io
   curl -s https://sigab.129-121-100-147.sslip.io/api/dashboard/kpis -H "Authorization: Bearer <token>"
   ```

---

## Decisiones pendientes para Gustavo

1. **¿Rama a producción?** `feat/sileo-toasts-hermes-context` directo, o merge a `main`/`develop` primero. (Prod corriendo una feature branch no es ideal a largo plazo.)
2. **¿Qué muestra `sigah.sslip.io`?** ¿La landing comercial nueva, o se queda como está (app SIGAB)?
3. **¿`panel.sslip.io` dockerizado** (recomendado, reproducible) **o seguir con scp** a /var/www/sigah?
4. **API del panel:** ¿apunta a `sigab.sslip.io/api` o montamos proxy interno?

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Romper sigab./sigah. al editar Traefik | Mantener AMBOS hosts en routers existentes; solo AGREGAR router de panel |
| Config de panel.sslip.io ya existente en VPS choca con nueva | Discovery primero; no duplicar routers |
| Deploy de feature branch a prod | Decidir merge a main antes |
| 502 tras recreate | `docker restart traefik` (socket stale conocido) |
| Build del panel falla en VPS (memoria 2GB) | Build local + scp del dist como fallback |

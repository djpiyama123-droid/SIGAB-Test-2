# Plan Maestro — Migración de SIGAH/SIGAB del VPS Bluehost al Nodo Edge HP Z840 + IA Híbrida

> **Estado:** Investigación y diagnóstico completados (workflow multi-agente Opus 4.8, 2026-06-07). Listo para implementación física en sitio.
> **Objetivo:** Eliminar la dependencia del VPS Bluehost y consolidar todo el ecosistema (app SIGAB, plataforma SIGAH, bots e IA) en un único nodo on-premise en el hospital: la workstation **HP Z840** del tomógrafo GE Brightspeed, actuando como **server + edge node + IA local**, con acceso a un **LLM multimodal en la nube (MiniMax)** para tareas agénticas avanzadas.
> **Alcance de este documento:** diagnóstico del estado real, decisiones de arquitectura, runbook de implementación paso a paso, y checklist de lo que requiere acceso físico/red al hardware (no ejecutable desde un sandbox remoto).

---

## 0. Resumen ejecutivo

La migración es **viable** y el cimiento local ya existe (Ollama + patrón de cliente httpx + fallback). Pero hay tres bloques de trabajo antes de "poner todo en línea":

1. **Infra:** romper las ataduras al VPS (dominios `*.129-121-100-147.sslip.io` con la IP embebida, Traefik externo compartido, certificados Let's Encrypt que no funcionan en LAN privada) y sustituirlas por un stack autónomo con nginx propio sobre la IP LAN `192.168.1.10`.
2. **Datos:** migrar tres volúmenes críticos del VPS al Z840 — base de datos MySQL (`sigab`), imágenes de equipos (`sigab_uploads`) y la sesión emparejada de WhatsApp (`sigab_bot_auth`).
3. **IA híbrida:** **MiniMax todavía no está en el código** — solo está diseñado en `docs/minimax-workflow/`. Hay que materializar la capa de router (local Ollama ↔ nube MiniMax) y corregir dos bugs que ya rompen el bot hoy.

> ⚠️ **Seguridad de credenciales — acción inmediata:** la API key de MiniMax (`sk-cp-…`) fue compartida en texto plano en una conversación. **Debe rotarse** ("Reset key" en el portal MiniMax) y almacenarse solo como variable de entorno / secreto, nunca en chat ni en el repositorio. Todo este plan asume que la key vive en `.env` con `chmod 600`, fuera de git.

> ⚠️ **Naturaleza de la key `sk-cp`:** es una **Subscription / Token Plan key** (plan "Max", ~5.1 B tokens/mes de M3, 4–5 agentes concurrentes, 1 M de contexto, ventana deslizante de 5 h). Sirve para desarrollo y para un piloto edge de bajo volumen vía gateway. El propio workflow advierte que, al agotarse el pool mensual, las llamadas se detienen; para **producción 24/7 sostenida** lo recomendable es una key `sk-api` (pay-as-you-go) como respaldo. Ver §6.

---

## 1. Arquitectura objetivo (un solo nodo)

```
                        HOSPITAL — LAN 192.168.x.x
 ┌──────────────────────────────────────────────────────────────────────┐
 │                  HP Z840  (192.168.1.10)  — Ubuntu Server 24.04        │
 │                  ex-workstation tomógrafo GE Brightspeed               │
 │                                                                        │
 │   ┌─ nginx (80/443, certs internos) ──────── reverse proxy LAN ──────┐ │
 │   │                                                                  │ │
 │   │   /         → Frontend SIGAB (React, dist/ estático)             │ │
 │   │   /api      → Backend FastAPI  :8000                             │ │
 │   │   /panel    → Portal-SIGAH (React) + backend Node :8001          │ │
 │   └──────────────────────────────────────────────────────────────────┘ │
 │                          │                  │                          │
 │              ┌───────────┘                  └─────────┐                │
 │              ▼                                         ▼                │
 │   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
 │   │  MySQL 8.0 :3306 │   │  Bot WhatsApp    │   │  Gateway IA      │   │
 │   │  DB `sigab`      │   │  Baileys :3000   │   │  (OpenClaw o      │   │
 │   │  + tenant_id     │   │  sesión auth_*   │   │   router FastAPI) │   │
 │   └──────────────────┘   └──────────────────┘   └────────┬─────────┘   │
 │                                                          │             │
 │                                          ┌───────────────┴────────┐    │
 │                                          ▼                        ▼    │
 │                          ┌────────────────────────┐    (salida a nube) │
 │                          │ Ollama :11434 (RTX 5090)│         │         │
 │                          │ qwen2.5 / gemma3 (visión)│        │         │
 │                          └────────────────────────┘         │         │
 └─────────────────────────────────────────────────────────────┼─────────┘
                                                                ▼
                                              ┌──────────────────────────────┐
                                              │  MiniMax (nube)  M3 / M2.7    │
                                              │  multimodal · agéntico         │
                                              │  key sk-cp (pool) / sk-api     │
                                              └──────────────────────────────┘

  Acceso remoto admin: Tailscale (sin abrir puertos al exterior) + SSH desde Asus TUF.
  Telegram @sigab_imss_tj_bot → gateway IA → Ollama/MiniMax (hoy vive en Bluehost; portar).
```

**Principio rector de cumplimiento (NOM-024 / NOM-016 / NOM-240):** los datos clínicos y PHI (expedientes, imágenes DICOM, datos de paciente) se procesan **solo en local** (Ollama, RTX 5090). A la nube MiniMax solo salen tareas **de-identificadas** (consultas normativas, redacción, síntesis de documentos no sensibles). El router debe filtrar/anonimizar antes de la rama nube.

---

## 2. Estado real diagnosticado (qué hay hoy)

### 2.1 Servicios de producción (hoy en VPS, vía `docker-compose.yml`)

| Servicio | Imagen / build | Puerto | Volumen | Rol |
|---|---|---|---|---|
| `sigah-mysql` | `mysql:8.0` | 3306 | `sigah_mysql_data` | BD `sigab` (~800 equipos) |
| `sigah-backend` | build `./sigab-backend` (uvicorn :8000) | 8000 | `sigab_uploads` | API FastAPI, 26+ routers |
| `sigah-bot` | build `./sigab-bot` (Baileys node:20) | 3000 | `sigab_bot_auth` | Bot WhatsApp |
| `sigah-frontend` | `nginx:alpine` + `./sigab-frontend/dist` | — (vía proxy) | — | SPA React |

- **Ollama NO está en el compose**: corre como servicio del **host** (systemd), alcanzado vía `host-gateway:11434`.
- **Traefik NO está en el compose**: es externo y compartido (red `hostedapps_default`), parte del hosting multi-app de Bluehost.
- **Portal-SIGAH NO está en el compose**: se despliega por `scp` aparte (rutas y subdominios ambiguos).
- **`docker-compose.hetzner.yml`** es una variante **autónoma** con su propio contenedor nginx (80/443 + Certbot) — **esta es la mejor base para el edge** porque no depende de Traefik externo.

### 2.2 Componentes de aplicación

- **Backend FastAPI** (`sigab-backend`): arranca `uvicorn main:app :8000`. Variables con prefijo **`SIGAH_*`** (no `SIGAB_*`, el `.env.example` está desactualizado). Multitenancy real: tabla `hospitales` + columna `tenant_id` NOT NULL en todas las tablas de dominio, introducida por migración **Alembic** `a1b2c3d4e5f6_phase_1_multitenancy_init.py` (los `.sql` planos NO la contienen). `get_current_tenant` extrae `tenant_id` del **JWT** (nunca del body) — defensa de aislamiento ya implementada.
- **Frontend SIGAB** (`sigab-frontend`): axios con `baseURL: '/api'` **relativo** → basta servir el `dist/` y proxyear `/api`,`/static`,`/health`,`/docs` al backend en el mismo origen. No hay host hardcodeado. ✅ migración sencilla.
- **Bot WhatsApp** (`sigab-bot`): `node index.js`, Express interno :3000. Sesión en `auth_sigah/` (volumen `sigab_bot_auth`) — **migrar para no re-escanear QR**. Hace `bot-login` contra `/api/openclaw/bot-login` con `BOT_API_KEY`.
- **Portal-SIGAH** (`portal-sigah`): React 19 + su **propio backend Node/Express** que también quiere el **puerto 8000** → **colisión** con FastAPI; reasignar (p.ej. Node a :8001). `.env.production` hardcodea `panel.129-121-100-147.sslip.io` → requiere rebuild con la URL del edge.

### 2.3 Estado de la IA (lo más incompleto)

- **Todo el runtime es Ollama local** (`services/gemma_service.py`, cliente httpx → `/api/chat`). Endpoints: `/api/copilot/*`, `/api/openclaw/*`, `/api/ocr/*`, extractor IMSS. Único "cloud" hoy: Gemini, solo como fallback de OCR.
- **MiniMax: cero referencias en el código.** Existe únicamente como diseño en `docs/minimax-workflow/00..06`.
- **No existe capa de router** (`services/llm_service.py` / `ai_router.py` propuestos en doc 05/03 — ausentes). No hay selector de proveedor ni circuit breaker.
- **OpenClaw es ambiguo**: (a) `routes/openclaw.py` = endpoints del bot WhatsApp, NO un gateway de LLM; (b) "OpenClaw gateway 2026.3.13" en `usg.tpf.mybluehost.me` (Telegram → Ollama) que **no está versionado ni en el compose** — caja negra en Bluehost a portar o reemplazar.

### 2.4 🐞 Bugs que YA rompen el camino (corregir antes de migrar)

1. **`gemma_service.consultar_gemma_no_streaming` no existe** — invocada en `routes/openclaw.py:423,658,695`. Las rutas `ai-chat-bot` e `intake-group` lanzan `AttributeError`. Renombrar a `analizar_no_stream` o definir la función.
2. **`BOT_API_KEY` no se inyecta** al contenedor `bot` en `docker-compose.yml` — el bot arranca sin JWT y `/intake-group` (que lo exige) falla. Añadir la variable al servicio `bot`.

---

## 3. Decisiones de arquitectura para el edge

| Tema | Decisión recomendada | Por qué |
|---|---|---|
| Reverse proxy | **nginx propio** (base `docker-compose.hetzner.yml`), eliminar labels Traefik | No hay Traefik compartido en el hospital |
| TLS | Certs **self-signed** o CA interna del hospital; o `SIGAH_SSL_DISABLED=true` en LAN | Let's Encrypt no valida una IP privada |
| Dominios | `sigab.local` / `sigah.local` vía `/etc/hosts` o DNS interno; o IP directa `192.168.1.10` | sslip.io con IP pública del VPS deja de aplicar |
| Orquestación | **Docker Compose** (reusar healthchecks y orden ya definidos) | Paridad con el VPS, menos sorpresas |
| Ollama | Nativo en el host con la **RTX 5090** (no en contenedor) | Acceso directo a GPU; patrón ya usado |
| Router IA | **FastAPI `services/llm_service.py`** con circuit breaker (preferido) **o** gateway OpenClaw portado | Mantener el ruteo en código auditable y testeable |
| Puerto portal Node | Reasignar a **:8001** | Evitar colisión con FastAPI :8000 |
| Acceso remoto | **Tailscale** + SSH desde Asus TUF; sin abrir puertos al exterior | Seguridad hospitalaria |
| Arranque 24/7 | `restart: always` (Docker) + masking de suspend del host | Nodo siempre disponible |

---

## 4. Runbook de implementación (en sitio, sobre el HP Z840)

> Estos pasos requieren **acceso físico/SSH al Z840 y a la LAN del hospital**. No son ejecutables desde un entorno remoto aislado. Cada bloque es idempotente donde es posible.

### Fase A — Hardware y SO (pre-requisito, ver reporte de re-ingeniería)
- [ ] Purga física de tarjetas propietarias GE (DIP en slot 1, red de reconstrucción en slot 3) y fibra óptica del gantry.
- [ ] Instalar RTX 5090 (slot PCIe x16) + alimentación según balance eléctrico (línea 120 V/15 A dedicada, o migrar a 220 V / fuente auxiliar 80+ Platinum si habrá overclock o GPUs extra).
- [ ] Conector de energía NEMA L5-15 con bloqueo de torsión en J19; **prohibido** compartir la toma con otros equipos.
- [ ] Instalar **Ubuntu Server 24.04 LTS** (Btrfs con subvolúmenes `@`, `@home`, `@var_log`; zswap).

### Fase B — Provisión base del nodo (reutiliza `scripts/setup_lenovo_edge.sh`, corregido)
- [ ] `apt update && upgrade`; instalar `curl git ca-certificates gnupg`.
- [ ] Docker CE + compose-plugin (repo oficial), `systemctl enable docker`.
- [ ] Ollama nativo (`ollama.com/install.sh`); verificar que detecta la RTX 5090 (`nvidia-smi`, drivers + CUDA).
- [ ] `ollama pull qwen2.5:7b-instruct-q4_K_M` y `ollama pull gemma3:4b`; recrear los modelfiles custom `qwen-claw` / `gemma4-claw` / `gemma3-sigah` (si no existen, `_resolve_model()` los enmascara silenciosamente cayendo a otro modelo).
- [ ] Tailscale (`tailscale up`) para acceso admin remoto.
- [ ] Corregir en el script el remote/rama: el repo real es `djpiyama123-droid/SIGAH` (no `gustavo-sigah/sigah`/`sigah-saas`).
- [ ] Resolver el conflicto de puerto 3000 (Open VS Code Server vs bot WhatsApp) — el VS Code Server es opcional en producción.

### Fase C — Migración de datos (VPS → Z840)
- [ ] En el VPS: `docker exec sigah-mysql mysqldump -usigab_user -p<pass> sigab > sigab_backup.sql`.
- [ ] Copiar al Z840 (scp por Tailscale o Syncthing): `sigab_backup.sql`, contenido del volumen `sigab_uploads` (imágenes en `static/uploads`) y `auth_sigah/` (sesión WhatsApp).
- [ ] En el Z840: crear DB `sigab` + usuario `sigab_user`; `mysql … < sigab_backup.sql`.
- [ ] `cd sigab-backend && alembic upgrade head` para garantizar `hospitales` + `tenant_id` (no están en los `.sql` planos).
- [ ] Verificar: `SELECT COUNT(*) FROM equipos;` y que existan `hospitales` y columnas `tenant_id`.

### Fase D — Levantar el stack de aplicación
- [ ] Clonar repo en `/opt/sigab` (unificar ruta; el VPS tenía `/opt/sigab` vs `/opt/sigah` inconsistente).
- [ ] Partir de `docker-compose.hetzner.yml`; quitar labels Traefik; exponer 80/443 vía nginx propio.
- [ ] Crear `.env` (chmod 600, fuera de git) con prefijo **`SIGAH_*`**:
  - `SIGAH_DB_HOST/PORT/USER/PASS/NAME` → MySQL local.
  - `SIGAH_JWT_SECRET` **nuevo y seguro** (`secrets.token_urlsafe`).
  - `SIGAH_PUBLIC_BASE_URL=http://192.168.1.10` (o el host LAN) — los QRs lo embeben.
  - `SIGAH_SSL_DISABLED=true` (LAN).
  - `SIGAH_CORS_EXTRA` con la URL del edge (sustituir los `*.sslip.io`).
  - `BOT_API_KEYS={"hgr1-tijuana":"<clave>"}` y `BOT_API_KEY=<la misma>` en el servicio bot (**corrige Bug #2**).
  - `SIGAH_OLLAMA_HOST=http://host-gateway:11434` (Ollama en el host con la GPU).
- [ ] Aplicar **Bug #1**: definir/renombrar `consultar_gemma_no_streaming` en `gemma_service.py`.
- [ ] `docker compose up -d`; orden por healthchecks: **MySQL → backend (`/health`) → bot → frontend**.
- [ ] `npm run build` del frontend; servir `dist/` por nginx con proxy `/api`→backend:8000.
- [ ] Portal-SIGAH: backend Node a **:8001**, rebuild con `VITE_API_URL` del edge, servir build por nginx en `/panel`.

### Fase E — Bots en línea
- [ ] Bot WhatsApp: con `auth_sigah/` migrado, arranca sin re-escanear; si vacío, `docker logs -f sigah-bot` y escanear QR.
- [ ] Bot Telegram `@sigab_imss_tj_bot`: portar su config desde el OpenClaw de Bluehost (token Telegram + endpoint del gateway) o reimplementar apuntando al router FastAPI local. Hoy es caja negra "no tocar" — decidir portar vs reescribir.
- [ ] Verificar Twilio WhatsApp (`/api/twilio/*`) solo si se usa esa vía (requiere `SIGAH_TWILIO_*`).

### Fase F — IA híbrida (desarrollo, ver §6 y doc 05)
- [ ] Implementar `services/minimax_service.py` (cliente OpenAI-compatible httpx) y `services/llm_service.py` (selector + circuit breaker CLOSED/OPEN/HALF_OPEN).
- [ ] Añadir a `config.py`: `SIGAH_LLM_PROVIDER`, `SIGAH_LLM_FALLBACK_LOCAL`, `SIGAH_MINIMAX_API_KEY`, `SIGAH_MINIMAX_BASE_URL`, `SIGAH_MINIMAX_MODEL`, `SIGAH_MINIMAX_TIMEOUT`, `SIGAH_EDITION`.
- [ ] Migrar `routes/copilot.py` y `routes/openclaw.py` para llamar al router (no a `gemma_service` directo).
- [ ] Implementar el **filtro de de-identificación PHI** antes de la rama nube.
- [ ] Tests `tests/test_llm_service.py` con mocks de nube/local y prueba del fallback nube→local.

### Fase G — Verificación y corte
- [ ] Smoke test extremo a extremo: login → dashboard → crear OS → foto/OCR → copilot → bot WhatsApp → consulta agéntica MiniMax.
- [ ] Verificar aislamiento multitenant (un usuario no ve estudios de otro hospital).
- [ ] Configurar **backups** (no existen hoy): cron `mysqldump` + snapshot de `sigab_uploads` y `auth_sigah`.
- [ ] Apagado controlado del stack en el VPS; ventana de corte y reapuntado de DNS/accesos.
- [ ] Deshabilitar o reapuntar el workflow de GitHub Actions (`VPS_IP`/`VPS_SSH_KEY`) al Z840.

---

## 5. Lo que requiere acceso físico/red (NO ejecutable en remoto)

Este plan se elaboró por investigación del repositorio. **No se puede "poner en línea" desde un entorno aislado** porque exige:
- Acceso SSH/físico al HP Z840 y a la LAN del hospital (192.168.1.x).
- El `mysqldump` y los volúmenes del **VPS vivo** (credenciales reales, sesión WhatsApp).
- La GPU RTX 5090 física para Ollama.
- La API key real de MiniMax (rotada) en el `.env` del nodo.

La parte **sí ejecutable en remoto** (desde la laptop Asus TUF con Claude Code) es el **trabajo de código**: corregir los dos bugs, implementar la capa de router híbrido, ajustar el compose para el edge, y los tests. Eso puede commitearse y luego desplegarse por `git pull` en el Z840.

---

## 6. IA híbrida — gobernanza de la key MiniMax

| Aspecto | `sk-cp` (la que tienes — Token Plan "Max") | `sk-api` (recomendada para prod) |
|---|---|---|
| Facturación | Pool mensual fijo ($50, ~5.1 B tokens M3); al agotarse, **se detiene** | Pay-as-you-go por token |
| Uso ideal | Desarrollo, piloto edge bajo volumen, agentes vía gateway | Motor de producción sostenido |
| Model ID (OpenClaw) | `minimax-portal/MiniMax-M3` | `minimax/MiniMax-M3` |
| Base URL | `https://api.minimax.io/anthropic` o `/v1` | `https://api.minimax.io/v1` (o `/anthropic`) |
| Renovación | Próx. 2026-07-06; ventana deslizante 5 h + semanal | N/A |

**Recomendación:** usar `sk-cp` para arrancar el piloto y el desarrollo; configurar el router con **fallback en cascada**: Ollama local (PHI y rutina, costo cero) → MiniMax `sk-cp` (agéntico/normativo de-identificado) → respaldo `sk-api` o API de pago por evento cuando se agote el pool, para que la tecnovigilancia nunca caiga.

**Cumplimiento:** MiniMax es proveedor en China. No enviar PHI; de-identificar antes de salir; reservar lo clínico al modelo local; valorar DPA con residencia de datos. Esto es coherente con el sello on-premise de SIGAH (NOM-024).

---

## 7. Inconsistencias del repo a resolver (deuda técnica que afecta la migración)

- **Ruta del stack:** `/opt/sigab` (CLAUDE.md, quick_deploy) vs `/opt/sigah` (deploy_to_vps, CI). Unificar a `/opt/sigab`.
- **Prefijo de env:** el código lee `SIGAH_*`; el `.env.example` del backend usa `SIGAB_*` (desactualizado).
- **Nombre de DB:** `sigah` (defaults/dev) vs `sigab` (producción real). El edge debe usar `sigab`.
- **Scripts `start_sigab.sh`/`stop_sigab.sh`:** rutas obsoletas (`sigah-backend` vs carpeta real `sigab-backend`). Usar Docker Compose.
- **`setup_lenovo_edge.sh`:** remote/rama obsoletos (`gustavo-sigah/sigah`/`sigah-saas`).
- **Aliases Ollama** (`qwen-claw`, `gemma4-claw`, `gemma3-sigah`): recrear como modelfiles en el Z840 o el fallback los enmascara.
- **Tres deploy paths divergentes** (Traefik / nginx-de-sistema / scp del panel): consolidar en uno para el edge.

---

## 8. Próximos pasos sugeridos (orden)

1. **Rotar la API key de MiniMax** (acción de seguridad inmediata).
2. **Trabajo de código remoto** (desde Asus TUF, commiteable): corregir Bug #1 y Bug #2; ajustar `docker-compose` edge; implementar router híbrido + tests (Fase F).
3. **Preparar el Z840** (Fases A–B) en sitio.
4. **Migrar datos** (Fase C) en una ventana de mantenimiento.
5. **Levantar stack y bots** (Fases D–E), verificar (Fase G).
6. **Corte del VPS** una vez validado el edge.

---

*Documento generado por workflow de diagnóstico multi-agente (Opus 4.8) sobre el repositorio `djpiyama123-droid/SIGAH`. Las afirmaciones de estado provienen de lectura directa del código; los pasos físicos/de red son recomendaciones a ejecutar en sitio.*

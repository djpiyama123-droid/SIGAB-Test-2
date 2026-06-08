# Nodo Edge Provisional — Lenovo ThinkCentre M720q (mientras se prepara la HP Z840)

> **Decisión (2026-06-07):** la workstation HP Z840 aún **no está preparada** como servidor. El nodo edge se despliega **provisionalmente** en el **Lenovo ThinkCentre M720q** que ya está físicamente en el hospital y operando como nodo 24/7 (Ubuntu 24.04 nativo, acceso por Tailscale SSH). Cuando la Z840 esté lista, la migración es trivial (GitHub es la fuente de verdad: `git pull` + restaurar volúmenes).
>
> Este documento es el **complemento provisional** del plan maestro [`00-PLAN-MAESTRO-MIGRACION-EDGE.md`](./00-PLAN-MAESTRO-MIGRACION-EDGE.md). Las fases de datos, app, bots y verificación (C–G) son idénticas; aquí solo cambia **el hardware y la estrategia de IA**.

---

## 1. Acceso al ThinkCentre (SSH)

- **Modelo:** Lenovo ThinkCentre M720q (SFF), Ubuntu 24.04 nativo, UPS APC.
- **Acceso remoto:** **Tailscale SSH** desde la ASUS TUF (u otra máquina en la tailnet):
  ```bash
  ssh gustavo@thinkcentre            # hostname Tailscale (MagicDNS) — método documentado
  # o por IP de la tailnet:
  ssh gustavo@<IP-100.x.x.x>
  ```
- ⚠️ **La IP literal NO está registrada** en la documentación local ni en el vault Obsidian (`Documents/Obsidian/SIGAH-KB`) — ahí solo aparece la IP del VPS Bluehost (`129.121.100.147`). La IP de la tailnet del ThinkCentre se obtiene **en el propio equipo**:
  ```bash
  tailscale ip -4                    # imprime la IP 100.x.x.x del ThinkCentre
  tailscale status                   # lista todos los nodos de la tailnet y sus IPs
  ```
- **Acción recomendada:** una vez obtenida, **anotarla** en el vault Obsidian (`SIGAH — Inicio.md` y `permanent/arquitectura-sigah.md`) y añadir un alias en `~/.ssh/config` de la ASUS:
  ```sshconfig
  Host thinkcentre-edge
      HostName 100.x.x.x           # o el hostname Tailscale: thinkcentre
      User gustavo
      ServerAliveInterval 60
  ```
  (Hoy `~/.ssh/config` solo tiene hosts del VPS: `sigab-vps`, `sigab-cloud` → `129.121.100.147`. No hay alias para el ThinkCentre.)

---

## 2. Diferencia clave vs. el plan Z840: **no hay RTX 5090**

El M720q es un mini-PC con iGPU Intel (UHD 630), **sin GPU dedicada**. Implicaciones para la IA híbrida:

| Capa | Plan final (Z840 + RTX 5090) | Provisional (ThinkCentre M720q) |
|---|---|---|
| IA local Ollama | Modelos grandes a velocidad de GPU (qwen2.5:7b/14b, gemma3 visión) | **Solo modelos chicos en CPU** (gemma3:4b lento) **o desactivar** Ollama |
| Razonamiento/agéntico | Reparto local ↔ MiniMax | **Apoyarse en MiniMax (nube)** para casi todo lo agéntico |
| Copilot SIGAH | Local | Considerar `SIGAH_DISABLE_COPILOT=1` si la RAM aprieta; usar MiniMax vía router |
| OCR/visión | gemma3:4b local | PaddleOCR local + fallback Gemini/MiniMax (la rama nube ya existe para OCR) |

**Estrategia provisional recomendada:**
1. **MySQL + backend + bot + frontend** corren perfecto en el ThinkCentre (no necesitan GPU). Esta es la parte importante de "poner en línea" la app SIGAB y el ecosistema SIGAH.
2. **Ollama**: instalarlo solo si la RAM lo permite y limitarlo a `gemma3:4b` para OCR/visión ligera. Si va lento o falta RAM, `SIGAH_DISABLE_COPILOT=1` y delegar el copilot a MiniMax.
3. **MiniMax (nube)** cubre el razonamiento agéntico y lo multimodal mientras llega la 5090. Recordar: **de-identificar antes de enviar a la nube** (PHI solo local) y que la key `sk-cp` tiene pool mensual (ver §6 del plan maestro).

---

## 3. Runbook provisional (sobre el ThinkCentre, vía SSH)

Reutiliza el runbook base de [`docs/INFRAESTRUCTURA-3-MAQUINAS.md`](../INFRAESTRUCTURA-3-MAQUINAS.md) §4 (paquetes, Tailscale, masking de suspend) y añade el stack de aplicación:

```bash
# 0. Conectar
ssh gustavo@thinkcentre

# 1. Docker (si no está) — base del stack
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login

# 2. Repo (fuente de verdad)
cd ~ && git clone https://github.com/djpiyama123-droid/SIGAH.git sigah && cd sigah
git checkout fix/bugs-bloqueantes-ia   # incluye los 2 fixes bloqueantes; o main tras el merge

# 3. (Opcional) Ollama solo si hay RAM — modelo chico CPU
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma3:4b

# 4. .env de producción local (chmod 600, FUERA de git)
cp sigab-backend/.env.example .env   # y editar con prefijo SIGAH_*
#   SIGAH_DB_* → MySQL local
#   SIGAH_JWT_SECRET → nuevo y seguro
#   SIGAH_PUBLIC_BASE_URL=http://<IP-LAN-thinkcentre>   (para los QR)
#   SIGAH_SSL_DISABLED=true                              (LAN)
#   SIGAH_DISABLE_COPILOT=1                              (sin GPU; o 0 si Ollama va)
#   SIGAH_OLLAMA_HOST=http://host-gateway:11434          (si se usa Ollama)
#   BOT_API_KEYS={"hgr1-tijuana":"<clave-segura>"}       (Bug #2 — ahora cableado)
#   BOT_API_KEY=<la-misma-clave>                          (Bug #2 — servicio bot)
#   # IA nube (cuando se implemente el router, Fase F):
#   SIGAH_MINIMAX_API_KEY=<key-rotada>  SIGAH_MINIMAX_BASE_URL=https://api.minimax.io/v1

# 5. Migrar datos del VPS (en ventana de mantenimiento)
#    En el VPS:  docker exec sigah-mysql mysqldump -usigab_user -p<pass> sigab > sigab_backup.sql
#    Copiar por Tailscale:  scp sigab_backup.sql gustavo@thinkcentre:~/sigah/
#    Copiar volúmenes sigab_uploads y sigab_bot_auth (sesión WhatsApp) igual.

# 6. Levantar stack (compose adaptado a LAN, sin Traefik — ver nota)
docker compose up -d mysql          # esperar healthy
#    restaurar dump dentro del contenedor, luego:
docker compose up -d backend        # /health
docker compose up -d bot frontend
docker compose logs -f bot          # escanear QR de WhatsApp si auth_sigah está vacío
```

**Nota sobre el reverse proxy:** el `docker-compose.yml` actual trae labels de Traefik del VPS (dominios `*.129-121-100-147.sslip.io`) que **no aplican** en la LAN del hospital. Para el ThinkCentre, partir de `docker-compose.hetzner.yml` (nginx propio) o quitar los labels y exponer puertos directos (8000/3000/80) detrás de un nginx local. Acceso por IP LAN o `thinkcentre.local`.

---

## 4. Cuando la HP Z840 esté lista (migración ThinkCentre → Z840)

Trivial, porque GitHub es la fuente de verdad y los datos viven en volúmenes:
1. Provisionar la Z840 (Fases A–B del plan maestro: purga GE, RTX 5090, Ubuntu, Docker, Ollama+modelos).
2. `git pull` del mismo repo/rama en la Z840.
3. Restaurar los 3 volúmenes (`mysqldump` del ThinkCentre + `sigab_uploads` + `sigab_bot_auth`).
4. Activar la IA local pesada (qwen2.5/gemma3 en la 5090) y reactivar el copilot local (`SIGAH_DISABLE_COPILOT=0`).
5. Apagar el stack del ThinkCentre; reapuntar accesos. El ThinkCentre vuelve a su rol de nodo de desarrollo 24/7.

---

## 5. Estado de los bugs bloqueantes (resueltos en esta rama)

Rama: **`fix/bugs-bloqueantes-ia`** (basada en `feat/landing-sync-2026-06`).

- **Bug #1 — `gemma_service.consultar_gemma_no_streaming` inexistente** (rompía `/api/openclaw/ai-chat-bot` e `/api/openclaw/intake-group`). ✅ Corregido: las 3 llamadas (`openclaw.py:423,658,695`) ahora invocan la función real `analizar_no_stream(prompt)`. `py_compile` OK.
- **Bug #2 — `BOT_API_KEY` no inyectada al contenedor del bot** (además el backend no recibía `BOT_API_KEYS`). ✅ Corregido en `docker-compose.yml`: `BOT_API_KEYS` añadida al servicio `backend` y `BOT_API_KEY` al servicio `bot`, ambas vía `.env`. Los `.env.example` ya documentaban ambas claves.

> Falta (requiere acceso al entorno real): definir los valores en el `.env` del nodo, levantar el stack y validar el flujo `bot-login` extremo a extremo.

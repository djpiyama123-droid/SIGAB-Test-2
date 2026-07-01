# 🖥️ SIGAB — Setup ThinkCentre M720q con Hermes Agent + Tailscale

**Fecha:** 2026-07-01
**Decisión:** Opción A — Tailscale en VPS + ThinkCentre
**Aplica a:** ThinkCentre M720q físico en Conservación / HGR No.1 IMSS Tijuana

---

## 0. Resumen ejecutivo

Este runbook deja el ThinkCentre como nodo 24/7 capaz de correr **Hermes Agent** (Claude Code) contra el repo SIGAB y alcanzar la **VPS Bluehost de producción** (`129.121.99.228`) por la red privada **Tailscale** (100.x.x.x), sin abrir puertos del router.

| Pieza | Estado |
|---|---|
| Tailscale en VPS Bluehost | ✅ binario instalado (`tailscaled` active, esperando auth key) |
| Tailscale en ThinkCentre | ⏳ script idempotente listo en `scripts/install-thinkcentre.sh` |
| Repo SIGAB (rama operador) | `feat/ui-cinematic` · URL: `git@github.com:djpiyama123-droid/SIGAB-Test-2.git` |
| Rama del agente ThinkCentre | `hermes/thinkcentre-<hostname>` |

---

## 1. Pre-requisitos que necesito de ti

### 1.1 Auth key de Tailscale (REQUERIDO)
1. Entra a https://login.tailscale.com/admin/settings/keys
2. **Generate auth key** con estas opciones:
   - Description: `SIGAB-ThinkCentre-2026-07`
   - **Reusable: ON** (la usaremos en la VPS y en el ThinkCentre)
   - **Ephemeral: OFF** (queremos que persista)
   - **Tags: opcional** `tag:sigab`
   - Expiration: 90 días
3. Cópiala con el prefijo `tskey-auth-` y guárdala en un lado seguro. **No la pegues en Telegram** — pásamela solo cuando la vayamos a usar.

### 1.2 Confirmar que el ThinkCentre tiene Ubuntu 24.04 instalado
- Si está en blanco: descarga ISO de https://releases.ubuntu.com/24.04 y bootea.
- Si ya tiene otro SO: respalda y reinstala limpio.

### 1.3 Credenciales que necesita el operador
- Email o cuenta Tailscale del operador (debe estar en el mismo tailnet).
- `ANTHROPIC_API_KEY` para Claude Code (misma del `.env` de la VPS o una nueva).

---

## 2. Activar Tailscale en la VPS (lo hago yo, no toques)

Cuando me pases la auth key:

```bash
sudo tailscale up --ssh --authkey="tskey-auth-XXXXX" --operator=root --accept-routes
```

Eso le da a la VPS:
- IP 100.x.x.x en la malla privada.
- SSH accesible vía Tailscale desde cualquier nodo del tailnet (`ssh usuario@<tailscale-ip>`).
- Capacidad de hacer `tailscale ping thinkcentre` y `tailscale ping asus-tuf`.

Después:
```bash
tailscale ip -4                       # anotar IP Tailscale de la VPS
tailscale status                      # debería verse el nodo nuevo al autenticarse el ThinkCentre
```

---

## 3. Activar Tailscale + Hermes Agent en el ThinkCentre (lo corre el operador)

### 3.1 Opción recomendada — script remoto
Desde el ThinkCentre, una sola línea:

```bash
export TS_AUTHKEY="tskey-auth-XXXXX"
curl -fsSL https://raw.githubusercontent.com/djpiyama123-droid/SIGAB-Test-2/main/scripts/install-thinkcentre.sh \
  | sudo -E bash
```

El script es **idempotente**: si se interrumpe a la mitad, vuélvelo a correr. Continúa donde quedó.

### 3.2 Opción manual — clonar el repo y correrlo
```bash
sudo apt install -y git
git clone https://github.com/djpiyama123-droid/SIGAB-Test-2 /opt/sigab
cd /opt/sigab
export TS_AUTHKEY="tskey-auth-XXXXX"
sudo -E bash scripts/install-thinkcentre.sh
```

### 3.3 Qué hace el script (resumen)
1. Paquetes base + unattended-upgrades.
2. Anti-suspensión 24/7 (`HandleLidSwitch=ignore`, mask de sleep.target).
3. Instala Tailscale y hace `tailscale up --ssh --authkey=...`.
4. Instala Docker + compose plugin.
5. Instala Claude Code vía npm.
6. Clona el repo en `/opt/sigab` y crea rama `hermes/thinkcentre-<hostname>`.
7. Cierra firewall dejando solo Tailscale SSH + puertos SIGAB por la malla.
8. Imprime la IP Tailscale asignada y el resumen final.

Log completo: `/var/log/sigab-thinkcentre-install.log`.

---

## 4. Verificación post-instalación (5 checks)

```bash
# 1) Tailscale vivo
tailscale status                    # debe verse "thinkcentre" en la lista
tailscale ping sigab-vps            # debe responder

# 2) SSH a VPS por Tailscale
ssh sigab-vps 'hostname && tailscale ip -4'
# esperado: hal-server-728683 y la 100.x.x.x de la VPS

# 3) Repo clonado y en la rama correcta
cd /opt/sigab
git branch --show-current            # debe ser hermes/thinkcentre-<hostname>
git log --oneline -1                 # debe ser HEAD de feat/ui-cinematic

# 4) Docker
docker run --rm hello-world          # smoke test

# 5) Claude Code
claude --version
claude login                         # autenticar con ANTHROPIC_API_KEY
```

---

## 5. Operaciones diarias desde el ThinkCentre

### 5.1 Atajo para llegar a la VPS
```bash
# alias recomendado (agregar a /root/.bashrc)
echo 'alias vps="ssh sigab-vps"' >> /root/.bashrc
source /root/.bashrc

vps 'cd /opt/sigab && git log --oneline -5'    # ver qué hizo el operador en prod
vps 'docker ps --format "{{.Names}} {{.Status}}"'  # ver contenedores
vps 'tail -50 /opt/sigab/.sigab-autocycle/STATE.md'  # ver último ciclo de Hermes autocycle
```

### 5.2 Flujo de trabajo estándar
```bash
cd /opt/sigab
git pull                                    # SIEMPRE antes de empezar
git checkout -b feature/mi-cambio
# ... trabajo con `claude` ...
git add -A && git commit -m "feat: ..."
git push -u origin feature/mi-cambio        # PR contra develop
```

### 5.3 Regla de oro — NO TOCAR
- `feat/ui-cinematic` (producción del operador, la usa el HGR).
- `autocycle/ui-cinematic` y `autocycle/v3.0` (las usa Hermes autocycle en la VPS, ver `.sigab-autocycle/STATE.md`).
- `main` (solo se mergea vía PR aprobada por Gustavo).

El ThinkCentre trabaja **siempre** en `hermes/*` y abre PR contra `develop`.

---

## 6. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `tailscale up` se queda colgado | auth key vencida o mal copiada | regenerar key en admin panel |
| ThinkCentre no aparece en `tailscale status` de la VPS | auth key reusable no marcada, o dos nodos con mismo hostname | regenerar con **Reusable: ON** y hostname único |
| `ssh sigab-vps` dice "no route to host" | Tailscale no autenticó aún | `tailscale up --ssh` en la VPS |
| Docker no levanta contenedores | `dockerd` no iniciado | `sudo systemctl start docker && sudo systemctl enable docker` |
| Claude Code dice "auth failed" | `ANTHROPIC_API_KEY` no exportada o inválida | `claude login` o `export ANTHROPIC_API_KEY=...` |
| ThinkCentre se suspende al cerrar la tapa | logind no recargó config | `sudo systemctl restart systemd-logind` |

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Tailscale caído = ThinkCentre aislado | GitHub sigue accesible directo por HTTPS; SSH a VPS se pierde solo, no la capacidad de trabajar local |
| Repo divergente entre ThinkCentre y VPS | regla de oro: `git pull` antes, `git push` después; el round-trip por GitHub reconcilia |
| API key filtrada del `.env` de la VPS al ThinkCentre | usar `claude login` con OAuth en vez de pegar la key; el `.env` de la VPS NUNCA viaja al ThinkCentre |
| ThinkCentre se llena de Docker images | limpieza mensual: `docker system prune -af --volumes` (cron) |

---

## 8. Próximo paso inmediato

**Pásame la auth key de Tailscale (`tskey-auth-XXXXX`)** por un canal seguro (no Telegram, mejor Signal/email/1Password/SSH directo a la VPS) y corro `tailscale up` aquí. Después de eso, el ThinkCentre puede autenticarse y verse en menos de 30 segundos.
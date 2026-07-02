#!/usr/bin/env bash
# ============================================================================
#  install-thinkcentre.sh
#  ----------------------------------------------------------------------------
#  Provisiona un Lenovo ThinkCentre M720q como nodo SIGAB 24/7 con:
#    · Ubuntu 24.04 nativo (no WSL2)
#    · Tailscale SSH hacia la VPS Bluehost de producción
#    · Docker + docker compose plugin
#    · Claude Code (Anthropic) o Hermes Agent CLI
#    · Repo SIGAB clonado desde github.com/djpiyama123-droid/SIGAB-Test-2
#    · Reglas anti-suspensión para 24/7
#    · Health check final hacia la VPS
#
#  Uso:
#    export TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxxxxx
#    export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
#    curl -fsSL https://raw.githubusercontent.com/djpiyama123-droid/SIGAB-Test-2/main/scripts/install-thinkcentre.sh | sudo bash
#    # o localmente:
#    sudo TS_AUTHKEY=... ANTHROPIC_API_KEY=... bash ./install-thinkcentre.sh
#
#  Idempotente: se puede correr varias veces sin romper.
#  Log: /var/log/sigab-thinkcentre-install.log
# ============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

LOG=/var/log/sigab-thinkcentre-install.log
mkdir -p "$(dirname "$LOG")"
exec > >(tee -a "$LOG") 2>&1
echo "=== $(date -Iseconds) install-thinkcentre.sh PID=$$ ==="

# ---------- 0. preflight ----------
require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "ERROR: corre este script con sudo o como root" >&2
    exit 1
  fi
}
require_root

# TS_AUTHKEY solo hace falta si el nodo NO está ya unido al tailnet
# (tailscale status sale con exit 0 solo cuando el backend está Running)
TS_YA_CONECTADO=0
command -v tailscale >/dev/null 2>&1 && tailscale status >/dev/null 2>&1 && TS_YA_CONECTADO=1
if [[ $TS_YA_CONECTADO -eq 0 && -z "${TS_AUTHKEY:-}" ]]; then
  echo "ERROR: variable TS_AUTHKEY no definida y el nodo no está en el tailnet."
  echo "  Genera una auth key reusable en https://login.tailscale.com/admin/settings/keys"
  echo "  y vuelve a correr: export TS_AUTHKEY=tskey-auth-xxxxx && sudo -E bash install-thinkcentre.sh"
  exit 2
fi

# ---------- 1. paquetes base ----------
echo "[1/7] Paquetes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  git curl wget ca-certificates gnupg lsb-release \
  build-essential python3 python3-venv python3-pip \
  unattended-upgrades fail2ban rsync jq vim tmux ufw

# Node: NO usar los paquetes nodejs/npm de Ubuntu (el npm de Ubuntu fuerza un
# downgrade si ya hay nodejs de nodesource — conflicto apt visto en 25.10).
# El nodejs de nodesource ya trae npm embebido.
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version && npm --version

# ---------- 2. anti-suspension 24/7 ----------
echo "[2/7] Anti-suspension 24/7"
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
# logind: ignorar cierre de tapa y boton de power
mkdir -p /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/sigab-24x7.conf <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
HandlePowerKey=ignore
EOF
systemctl restart systemd-logind

# ---------- 3. Tailscale ----------
echo "[3/7] Tailscale"
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
# up con SSH para llegar al ThinkCentre desde cualquier nodo del tailnet.
# Si el nodo ya está unido, `set` habilita SSH sin re-autenticar (no gasta authkey).
if tailscale status >/dev/null 2>&1; then
  echo "  tailscale ya conectado — habilitando Tailscale SSH sin re-auth"
  tailscale set --ssh --accept-routes --operator=root
else
  tailscale up --ssh --authkey="${TS_AUTHKEY}" --accept-routes --operator=root
fi
echo "  IP Tailscale asignada:"
tailscale ip -4
tailscale status | head -5

# ---------- 4. Docker ----------
echo "[4/7] Docker + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
docker --version
docker compose version

# ---------- 5. Claude Code (Anthropic CLI) ----------
echo "[5/7] Claude Code"
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
fi
claude --version

# ---------- 6. Repo SIGAB ----------
echo "[6/7] Clone del repo SIGAB"
REPO_DIR=/opt/sigab
# HTTPS: el repo es público y el ThinkCentre es réplica de solo lectura,
# así no depende de deploy keys. Para pushear ramas hermes/* configurar auth después.
REPO_URL=https://github.com/djpiyama123-droid/SIGAB-Test-2.git

if [[ ! -d "$REPO_DIR/.git" ]]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
git config user.name  "Hermes Agent (ThinkCentre)"
git config user.email "hermes-thinkcentre@sigab.local"
git fetch origin
# El ThinkCentre NO toca feat/ui-cinematic ni autocycle/*. Solo crea su propia rama.
BRANCH="hermes/thinkcentre-$(hostname -s)"
git checkout -B "$BRANCH" origin/feat/ui-cinematic

# CLAUDE.md local del ThinkCentre — apunta a la VPS via Tailscale
mkdir -p /root/.claude
cat > /root/.claude/CLAUDE.md <<EOF
# Hermes Agent — ThinkCentre M720q

Nodo: $(hostname) · IP Tailscale: $(tailscale ip -4)
VPS producción: hostname Tailscale \`sigab-vps\` · IP LAN host: 129.121.99.228

## Comandos clave
- Conectar a VPS:   ssh sigab-vps   (vía Tailscale, sin abrir puertos)
- Traer cambios:    cd /opt/sigab && git pull
- Stack Docker:     docker compose up -d    (opcional; el ThinkCentre normalmente NO levanta la stack, solo la VPS la corre)
- Logs autocycle:   ssh sigab-vps 'tail -f /opt/sigab/.sigab-autocycle/STATE.md'

## Regla de oro
El ThinkCentre es RÉPLICA. La fuente de verdad es GitHub. NUNCA pushear a:
- feat/ui-cinematic (producción operador)
- autocycle/* (ramas del agente headless)
Trabajar SIEMPRE en ramas \`hermes/*\` y PR hacia develop.
EOF

# ---------- 7. firewall + health check ----------
echo "[7/7] Firewall + health check final"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow from 100.64.0.0/10 to any port 22 proto tcp comment "Tailscale SSH"
ufw allow from 100.64.0.0/10 to any port 8000 proto tcp comment "SIGAB backend (LAN Tailscale)"
ufw allow from 100.64.0.0/10 to any port 5173 proto tcp comment "SIGAB frontend (LAN Tailscale)"
ufw --force enable

echo
echo "============================================================"
echo " INSTALACION COMPLETA  $(date -Iseconds)"
echo "============================================================"
echo "Hostname:           $(hostname)"
echo "IP LAN:             $(hostname -I | awk '{print $1}')"
echo "IP Tailscale:       $(tailscale ip -4)"
echo "Repo:               $REPO_DIR  (rama $BRANCH)"
echo "Claude Code:        $(claude --version 2>&1 | head -1)"
echo "Docker:             $(docker --version)"
echo
echo "Proximos pasos:"
echo "  1) En la VPS (yo):  sudo tailscale up --ssh --operator=root"
echo "  2) Verificar par:   ssh sigab-vps 'tailscale status'"
echo "  3) Probar agente:   cd /opt/sigab && claude --version"
echo "  4) Configurar API key: claude login   (usa la ANTHROPIC_API_KEY del .env de la VPS)"
echo "============================================================"
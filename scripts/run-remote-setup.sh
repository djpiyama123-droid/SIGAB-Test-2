#!/usr/bin/env bash
# ============================================================================
#  run-remote-setup.sh
#  ----------------------------------------------------------------------------
#  Orquesta el setup del ThinkCentre desde la VPS Bluehost, vía SSH por
#  Tailscale (100.x.x.x). Requiere que el handshake SSH ya esté hecho
#  (llave pública de la VPS en ~/.ssh/authorized_keys del ThinkCentre).
#
#  Uso:
#    sudo bash scripts/run-remote-setup.sh
#    # o con usuario custom:
#    REMOTE_USER=sigah sudo -E bash scripts/run-remote-setup.sh
#
#  Prereq:
#    tailscale ping sigah-thinkcentre-m720q  → pong
#    ssh sigah-thinkcentre-m720q             → entra sin password
# ============================================================================

set -Eeuo pipefail

REMOTE_HOST=${REMOTE_HOST:-sigah-thinkcentre-m720q}
REMOTE_USER=${REMOTE_USER:-root}
REMOTE_PORT=${REMOTE_PORT:-22}
LOCAL_REPO=/opt/sigab
TS_AUTHKEY_FILE=/root/.sigab-ts-authkey

log() { echo "[$(date -Iseconds)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

log "=== run-remote-setup.sh contra ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT} ==="

# --- 0. auth key (opcional: solo se usa si el ThinkCentre NO está ya en el tailnet) ---
TS_AUTHKEY=""
if [[ -f "$TS_AUTHKEY_FILE" ]]; then
  TS_AUTHKEY=$(cat "$TS_AUTHKEY_FILE")
else
  log "AVISO: no existe $TS_AUTHKEY_FILE — continuando sin authkey (el install la exige solo si el nodo no está unido al tailnet)"
fi

# --- 1. conectividad ---
log "verificando Tailscale ping..."
tailscale ping --c=2 "$REMOTE_HOST" >/dev/null || die "no responde Tailscale ping a $REMOTE_HOST"

# --- 2. handshake SSH ---
log "verificando handshake SSH..."
ssh -o ConnectTimeout=8 -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" 'echo OK' >/dev/null 2>&1 \
  || die "SSH a $REMOTE_USER@$REMOTE_HOST falla. ¿Llave pública de la VPS en authorized_keys?"

# --- 3. copiar script de setup ---
log "copiando $LOCAL_REPO/scripts/install-thinkcentre.sh al ThinkCentre..."
scp "$LOCAL_REPO/scripts/install-thinkcentre.sh" "$REMOTE_USER@$REMOTE_HOST:/tmp/install-thinkcentre.sh"

# --- 4. ejecutar setup remoto ---
log "ejecutando setup remoto (puede tardar 5-15 min)..."
ssh -t "$REMOTE_USER@$REMOTE_HOST" \
  "TS_AUTHKEY='$TS_AUTHKEY' sudo -E bash /tmp/install-thinkcentre.sh" 2>&1 | tee /var/log/sigab-remote-setup.log

# --- 5. verificación post-setup ---
log "verificando estado post-setup..."
ssh "$REMOTE_USER@$REMOTE_HOST" 'tailscale status; echo "---"; docker --version; echo "---"; claude --version; echo "---"; cd /opt/sigab && git log --oneline -3' \
  2>&1 | tee -a /var/log/sigab-remote-setup.log

log "=== setup completo ==="
log "  log remoto: /var/log/sigab-remote-setup.log"
log "  log en el ThinkCentre: /var/log/sigab-thinkcentre-install.log"
#!/bin/bash
# ================================================================
# SIGAH — Deploy rápido (uso diario)
# Solo sube cambios git y reinicia servicios necesarios.
# Prerequisito: SSH key configurada (ver deploy_to_vps.sh)
#
# Uso:
#   bash quick_deploy.sh           # auto-detecta qué cambió
#   bash quick_deploy.sh --backend # fuerza rebuild solo backend
#   bash quick_deploy.sh --frontend # fuerza rebuild solo frontend
#   bash quick_deploy.sh --full    # full redeploy (=deploy_to_vps.sh)
# ================================================================
set -e

VPS_IP="129.121.100.147"
VPS_USER="root"
REMOTE_DIR="/opt/sigab"
SSH_KEY="$HOME/.ssh/sigah_bluehost"
BRANCH="${SIGAH_BRANCH:-feat/sileo-toasts-hermes-context}"
FLAG="${1:-}"

# ── Verificar SSH key ────────────────────────────────────────
if [ ! -f "$SSH_KEY" ]; then
  echo "[ERROR] SSH key no encontrada: $SSH_KEY"
  echo "  Configúrala primero con: bash deploy_to_vps.sh"
  exit 1
fi

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP}"

echo "╔══════════════════════════════════════════════════════╗"
echo "║       SIGAH — Deploy rápido → $VPS_IP        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Detectar qué cambió desde el último deploy ──────────────
if [ "$FLAG" = "--full" ]; then
  bash "$(dirname "$0")/deploy_to_vps.sh"
  exit 0
fi

CHANGED_BACKEND=0
CHANGED_FRONTEND=0

if [ "$FLAG" = "--backend" ]; then
  CHANGED_BACKEND=1
elif [ "$FLAG" = "--frontend" ]; then
  CHANGED_FRONTEND=1
else
  # Auto-detectar por git diff
  LAST_REMOTE=$($SSH "cd $REMOTE_DIR && git rev-parse HEAD 2>/dev/null || echo 'NONE'")
  LOCAL_HEAD=$(git rev-parse HEAD)

  if [ "$LAST_REMOTE" = "$LOCAL_HEAD" ]; then
    echo "[info] El VPS ya está en el commit más reciente ($LOCAL_HEAD)."
    echo "  Usa --backend, --frontend, o --full para forzar."
    exit 0
  fi

  CHANGED_FILES=$(git diff --name-only "$LAST_REMOTE" "$LOCAL_HEAD" 2>/dev/null || echo "UNKNOWN")
  if echo "$CHANGED_FILES" | grep -q "sigab-backend/"; then
    CHANGED_BACKEND=1
  fi
  if echo "$CHANGED_FILES" | grep -q "sigab-frontend/"; then
    CHANGED_FRONTEND=1
  fi
  if [ "$CHANGED_BACKEND" = "0" ] && [ "$CHANGED_FRONTEND" = "0" ]; then
    echo "[info] Solo hay cambios en archivos no-app (docs, scripts, etc.)"
    echo "  Actualizando repo en VPS de todos modos..."
  fi
fi

# ── Paso 1: Subir cambios al VPS vía git ────────────────────
echo "[1/3] Sincronizando código con VPS..."
$SSH "cd $REMOTE_DIR && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH"

# ── Paso 2: Rebuild servicios necesarios ────────────────────
if [ "$CHANGED_BACKEND" = "1" ]; then
  echo "[2/3] Rebuilding backend..."
  $SSH "cd $REMOTE_DIR && docker compose build backend && docker compose up -d backend"
fi

if [ "$CHANGED_FRONTEND" = "1" ]; then
  echo "[2/3] Rebuilding frontend..."
  $SSH "cd $REMOTE_DIR && \
    cd sigab-frontend && \
    npm ci --prefer-offline && \
    npm run build && \
    nginx -t && systemctl reload nginx"
fi

if [ "$CHANGED_BACKEND" = "0" ] && [ "$CHANGED_FRONTEND" = "0" ]; then
  echo "[2/3] Sin rebuild necesario."
fi

# ── Paso 3: Health check ─────────────────────────────────────
echo "[3/3] Health check..."
sleep 2
STATUS=$($SSH "curl -sf http://localhost:8000/health || echo 'FAIL'")
if [ "$STATUS" = "FAIL" ]; then
  echo "[WARN] Backend no responde. Revisa con:"
  echo "  ssh -i $SSH_KEY root@$VPS_IP 'docker compose logs backend --tail=50'"
else
  echo "[OK] Backend: $STATUS"
fi

echo ""
echo "Deploy completado."
echo "  Frontend: http://${VPS_IP}/"
echo "  API:      http://${VPS_IP}/api/health"

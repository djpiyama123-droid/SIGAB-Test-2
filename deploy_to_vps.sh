#!/bin/bash
# ================================================================
# SIGAB — Deploy completo a VPS Bluehost
# Uso (primera vez / setup completo):
#   bash deploy_to_vps.sh
#
# Usa SSH key por defecto: ~/.ssh/sigah_bluehost
# Si no existe la key, ofrece fallback con contraseña.
#
# Para deploy incremental del día a día, usa: bash quick_deploy.sh
# ================================================================
set -e

VPS_IP="129.121.100.147"
VPS_USER="root"
REMOTE_DIR="/opt/sigab"
SSH_KEY="$HOME/.ssh/sigah_bluehost"

# ── Detectar método de autenticación ───────────────────────
if [ -f "$SSH_KEY" ]; then
  SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP}"
  SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=no"
  RSYNC_SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
  echo "[auth] Usando llave SSH: $SSH_KEY"
else
  echo "[auth] No se encontró llave SSH en $SSH_KEY"
  echo "  Para configurarla (recomendado), ejecuta:"
  echo "    ssh-keygen -t ed25519 -C 'sigah-deploy' -f ~/.ssh/sigah_bluehost -N ''"
  echo "    ssh-copy-id -i ~/.ssh/sigah_bluehost.pub root@$VPS_IP"
  echo ""
  if ! command -v sshpass &>/dev/null; then
    echo "[ERROR] Ni SSH key ni sshpass disponibles."
    echo "  Instala sshpass: sudo apt install sshpass"
    exit 1
  fi
  echo -n "Contraseña root del VPS (fallback): "
  read -s VPS_PASS
  echo ""
  SSH="sshpass -p ${VPS_PASS} ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP}"
  SCP="sshpass -p ${VPS_PASS} scp -o StrictHostKeyChecking=no"
  RSYNC_SSH="sshpass -p ${VPS_PASS} ssh -o StrictHostKeyChecking=no"
fi

# ── Generar secretos de producción ──────────────────────────
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
DB_ROOT_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║      SIGAH — Despliegue completo VPS $VPS_IP  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Crear .env para VPS ──────────────────────────────────────
cat > /tmp/sigab_vps.env << EOF
DB_USER=sigab_user
DB_PASS=${DB_PASS}
DB_NAME=sigab
DB_ROOT_PASS=${DB_ROOT_PASS}
SIGAB_JWT_SECRET=${JWT_SECRET}
SIGAB_PUBLIC_BASE_URL=http://${VPS_IP}
SIGAB_CORS_EXTRA=http://${VPS_IP},http://${VPS_IP}:80
SIGAB_OLLAMA_HOST=http://host-gateway:11434
SIGAB_GEMMA_MODEL=gemma3:4b
SIGAB_DISABLE_COPILOT=0
EOF

echo "[1/4] Transfiriendo proyecto al VPS..."
$SSH "mkdir -p ${REMOTE_DIR}"
rsync -az --progress \
  --exclude='sigab-backend/venv' \
  --exclude='sigab-frontend/node_modules' \
  --exclude='sigab-frontend/dist' \
  --exclude='sigab-frontend/.vite' \
  --exclude='*.log' \
  --exclude='.git' \
  --exclude='logs/' \
  -e "$RSYNC_SSH" \
  "$(dirname "$0")/" \
  "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/"

echo "[2/4] Copiando variables de entorno..."
$SCP /tmp/sigab_vps.env "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/.env"
rm /tmp/sigab_vps.env

echo "[3/4] Ejecutando setup en el VPS (5-10 min primera vez)..."
$SSH "bash ${REMOTE_DIR}/vps_setup.sh 2>&1"

echo ""
echo "[4/4] ¡Despliegue completado!"
echo ""
echo "  Frontend: http://${VPS_IP}/"
echo "  API Docs: http://${VPS_IP}/api/docs"
echo "  Health:   http://${VPS_IP}/api/health"
echo ""
echo "  Credenciales admin:"
echo "    Matrícula: ADMIN001"
echo "    Password:  sigab_admin_2026"
echo ""
echo "  Para deploys rápidos del día a día: bash quick_deploy.sh"

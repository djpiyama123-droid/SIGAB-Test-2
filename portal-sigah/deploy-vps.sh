#!/bin/bash
# Deploy SIGAB WebPanel → VPS Bluehost
# Uso: ./deploy-vps.sh [usuario@ip]   (default: root@129.121.100.147)

set -e
VPS=${1:-root@129.121.100.147}
REMOTE_DIR="/var/www/sigah"
DOMINIO="sigab.129-121-100-147.sslip.io"

echo "=== Deploy SIGAB WebPanel → $VPS ==="

# 1. Build del frontend (usa .env.production)
echo "[1/5] Build del frontend..."
npm run build

# 2. Crear estructura remota
echo "[2/5] Preparando directorios remotos..."
ssh "$VPS" "mkdir -p $REMOTE_DIR/dist $REMOTE_DIR/backend"

# 3. Subir frontend y backend
echo "[3/5] Subiendo frontend..."
rsync -avz --delete dist/ "$VPS:$REMOTE_DIR/dist/"
echo "      Subiendo backend..."
rsync -avz --delete --exclude node_modules --exclude .env backend/ "$VPS:$REMOTE_DIR/backend/"

# 4. Configurar backend (.env si no existe, instalar deps, arrancar con pm2)
echo "[4/5] Configurando backend en el VPS..."
ssh "$VPS" bash -s <<EOF
  set -e
  cd $REMOTE_DIR/backend
  if [ ! -f .env ]; then
    echo "Generando .env con JWT_SECRET aleatorio..."
    cat > .env <<ENV
NODE_ENV=production
PORT=8000
JWT_SECRET=\$(openssl rand -hex 32)
CORS_ORIGINS=https://$DOMINIO
EQUIPO_NOMBRE=VPS-Bluehost
ENV
  fi
  npm install --omit=dev
  command -v pm2 >/dev/null || npm install -g pm2
  pm2 restart sigah-api 2>/dev/null || pm2 start server.js --name sigah-api
  pm2 save
EOF

# 5. Recargar nginx
echo "[5/5] Recargando nginx..."
scp nginx.conf "$VPS:/etc/nginx/sites-available/sigah"
ssh "$VPS" "ln -sf /etc/nginx/sites-available/sigah /etc/nginx/sites-enabled/sigah && nginx -t && systemctl reload nginx"

echo ""
echo "Deploy completado."
echo "  URL pública:  https://$DOMINIO"
echo ""
echo "Para HTTPS (primera vez):  ssh $VPS 'certbot --nginx -d $DOMINIO'"

#!/bin/bash
# SIGAB Monitor — arranque rápido
# Uso: ./start.sh [--vps 129.121.100.147] [--sigah-user admin] [--sigah-pass admin123]

cd "$(dirname "$0")"

# Valores por defecto (se pueden sobreescribir con variables de entorno)
export VPS_HOST="${VPS_HOST:-129.121.100.147}"
export SIGAH_BASE="${SIGAH_BASE:-http://$VPS_HOST:8000}"
export BOT_BASE="${BOT_BASE:-http://$VPS_HOST:3000}"
export OLLAMA_BASE="${OLLAMA_BASE:-http://$VPS_HOST:11434}"
export SIGAH_USER="${SIGAH_USER:-admin}"
export SIGAH_PASS="${SIGAH_PASS:-admin123}"
export GITHUB_REPO="${GITHUB_REPO:-djpiyama123-droid/SIGAB-Test-2}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SIGAB Monitor"
echo "  Dashboard: http://localhost:4001"
echo "  VPS:       $VPS_HOST"
echo "  GitHub:    $GITHUB_REPO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Abrir el navegador automáticamente (si hay DISPLAY o es macOS/WSL)
if command -v xdg-open &>/dev/null; then
  (sleep 1.5 && xdg-open http://localhost:4001) &
elif command -v open &>/dev/null; then
  (sleep 1.5 && open http://localhost:4001) &
elif command -v explorer.exe &>/dev/null; then
  # WSL: abrir en Windows
  (sleep 1.5 && explorer.exe http://localhost:4001) &
fi

python3 server.py

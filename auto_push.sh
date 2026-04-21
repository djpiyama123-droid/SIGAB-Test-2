#!/bin/bash
# ================================================================
# SIGAB — Push automático a GitHub
# Uso: bash auto_push.sh "mensaje de commit"
# ================================================================
set -e

MSG="${1:-chore: actualización automática $(date '+%Y-%m-%d %H:%M')}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$REPO_DIR"

# Verificar que hay cambios
if git diff --quiet && git diff --staged --quiet; then
  echo "Sin cambios. Nada que hacer."
  exit 0
fi

git add -A
git commit -m "$MSG"
git push origin main 2>/dev/null || git push origin master

echo ""
echo "Subido a GitHub. El VPS se actualizará automáticamente en el próximo deploy."

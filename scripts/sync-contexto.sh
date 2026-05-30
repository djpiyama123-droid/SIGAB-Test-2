#!/usr/bin/env bash
# ============================================================
# sync-contexto.sh — Sincroniza el repo SIGAH en cualquier máquina
# (ASUS WSL2, ThinkCentre Ubuntu, VPS Bluehost)
#
# Uso:
#   ./scripts/sync-contexto.sh           # pull + status
#   ./scripts/sync-contexto.sh push "msg"  # add + commit + push
#
# Regla: GitHub (repo SIGAH) es la fuente de verdad.
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

BRANCH="$(git branch --show-current)"
HOST="$(hostname)"

echo "════════════════════════════════════════════"
echo "  SIGAH sync — $HOST — rama: $BRANCH"
echo "════════════════════════════════════════════"

if [[ "${1:-}" == "push" ]]; then
  MSG="${2:-"chore(sync): cambios desde $HOST"}"
  echo "→ Agregando y commiteando cambios..."
  git add -A
  if git diff --cached --quiet; then
    echo "  (nada que commitear)"
  else
    git commit -m "$MSG"
  fi
  echo "→ Pushing a origin/$BRANCH..."
  git push origin "$BRANCH"
  echo "✓ Push completo."
else
  echo "→ Pull de origin/$BRANCH..."
  git pull origin "$BRANCH"
  echo ""
  echo "→ Estado actual:"
  git status --short
  echo ""
  echo "→ Últimos commits:"
  git log --oneline -5
fi

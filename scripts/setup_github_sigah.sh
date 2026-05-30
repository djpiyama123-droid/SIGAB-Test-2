#!/bin/bash
# ================================================================
# SIGAH — Setup nuevo repo GitHub + estructura de ramas
# Ejecutar UNA SOLA VEZ desde WSL con gh autenticado
# Prerequisito: gh auth login
# ================================================================
set -e

OWNER="djpiyama123-droid"
REPO="SIGAH"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

echo "╔══════════════════════════════════════════════════════╗"
echo "║        SIGAH — Crear repo GitHub + ramas            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Crear repo en GitHub ──────────────────────────────────
echo "[1/5] Creando repo $OWNER/$REPO en GitHub..."
gh repo create "$OWNER/$REPO" \
  --private \
  --description "SIGAH — Sistema Integral de Gestión de Activos Hospitalarios (SaaS médico IMSS México)" \
  --homepage "https://sigab.129-121-100-147.sslip.io" \
  || echo "  (repo ya existe, continuando)"

# ── 2. Apuntar origin al nuevo repo ─────────────────────────
echo "[2/5] Apuntando origin al nuevo repo..."
git remote set-url origin "https://github.com/$OWNER/$REPO.git" \
  || git remote add origin "https://github.com/$OWNER/$REPO.git"
echo "  origin → https://github.com/$OWNER/$REPO.git"

# ── 3. Push rama principal de trabajo ───────────────────────
echo "[3/5] Push feat/sileo-toasts-hermes-context → develop..."
git checkout feat/sileo-toasts-hermes-context 2>/dev/null || true
git push -u origin feat/sileo-toasts-hermes-context

# ── 4. Crear y push ramas de estructura ─────────────────────
echo "[4/5] Creando ramas de estructura..."

# develop — integración continua
git checkout -b develop 2>/dev/null || git checkout develop
git merge feat/sileo-toasts-hermes-context --no-edit --allow-unrelated-histories 2>/dev/null || true
git push -u origin develop

# main — solo releases estables
git checkout main 2>/dev/null || git checkout -b main
git merge develop --no-edit 2>/dev/null || true
git push -u origin main

# feat/backend-frontend-polish — pulido UI/API
git checkout -b feat/backend-frontend-polish develop 2>/dev/null || true
git push -u origin feat/backend-frontend-polish 2>/dev/null || true

# feat/vps-pipeline — automatización deploy
git checkout -b feat/vps-pipeline develop 2>/dev/null || true
git push -u origin feat/vps-pipeline 2>/dev/null || true

# feat/multitenant-phase3 — siguiente fase multi-tenant
git checkout -b feat/multitenant-phase3 develop 2>/dev/null || true
git push -u origin feat/multitenant-phase3 2>/dev/null || true

# Volver a develop
git checkout develop

# ── 5. Configurar rama default en GitHub ────────────────────
echo "[5/5] Configurando rama default → develop..."
gh repo edit "$OWNER/$REPO" --default-branch develop || true

echo ""
echo "✅ Setup completo!"
echo "   Repo: https://github.com/$OWNER/$REPO"
echo "   Ramas: main (releases) · develop (integración) · feat/*"
echo ""
echo "Siguiente: configurar GitHub Actions Secret para deploy automático:"
echo "  Settings → Secrets → New: BLUEHOST_SSH_KEY (contenido de ~/.ssh/sigah_bluehost)"

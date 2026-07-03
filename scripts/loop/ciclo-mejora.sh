#!/usr/bin/env bash
# ============================================================================
#  ciclo-mejora.sh — Runner del loop de mejora continua SIGAB v4.x
#  Corre en el ThinkCentre vía systemd timer (sigab-loop.timer, cada 6h).
#
#  Flujo: guard de uso → git pull → claude -p (ciclo) → gates → deploy
#  frontend al VPS → smoke post-deploy (rollback automático si falla) →
#  push + espejo SIGAB-v4 → notificación Telegram vía Hermes (best-effort).
#
#  Exit: 0 ciclo ok (con o sin cambios) · 1 gates fallaron · 2 deploy
#  revertido por smoke · 3 error de entorno
# ============================================================================
set -Eeuo pipefail

REPO=/opt/sigab
LOG_DIR=/var/log/sigab-loop
LOCK=/var/run/sigab-loop.lock
VPS=sigab-vps
VPS_DIST=/opt/sigab/sigab-frontend/dist
RAMA=v4.0/piloto-clinica-1
export HOME=${HOME:-/root}

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/ciclo-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1
ln -sf "$LOG" "$LOG_DIR/latest.log"
echo "=== ciclo $(date -Iseconds) ==="

exec 9>"$LOCK"
flock -n 9 || { echo "otro ciclo corriendo; salgo"; exit 0; }

notificar() { # best-effort via gateway OpenClaw/Hermes; nunca falla el ciclo
  curl -fsS --max-time 8 -X POST "${NOTIFY_URL:-http://sigab-vps:8090/v1/notify}" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'channel':'telegram','source':'sigab-loop','text':sys.argv[1]}))" "$1")" \
    >/dev/null 2>&1 || true
}

# ── 0. guard de uso: si Gustavo está usando su plan, saltar el ciclo ──
# claude -p barato: si responde con error de rate limit u overload, saltamos.
GUARD=$(claude -p "responde solo: ok" --max-turns 1 2>&1 || true)
if echo "$GUARD" | grep -qiE "rate.?limit|overload|usage limit|resets at"; then
  echo "plan en uso / rate limited — ciclo saltado"; exit 0
fi

# ── 1. repo al día ──
cd "$REPO"
git fetch origin "$RAMA" --quiet
git checkout -B "$RAMA" "origin/$RAMA" --quiet
BASE=$(git rev-parse --short HEAD)
rm -f CICLO-RESULTADO.md
echo "base: $BASE"

# ── 2. el ciclo de Claude (allowlist restrictiva en .claude/settings.json,
#       instalada desde scripts/loop/settings-loop.json — SIN skip-permissions;
#       todo lo fuera del carril frontend se deniega y el ciclo falla limpio) ──
mkdir -p .claude && cp scripts/loop/settings-loop.json .claude/settings.json
timeout 100m claude -p "$(cat scripts/loop/PROMPT-CICLO.md)" \
  --max-turns 120 || {
    echo "claude termino con error/timeout"; }

ESTADO=$(grep -oP "estado:\s*\K\S+" CICLO-RESULTADO.md 2>/dev/null || echo "desconocido")
echo "estado del ciclo: $ESTADO"
[ "$ESTADO" = "cambios" ] || { echo "sin cambios que desplegar"; git checkout -- . 2>/dev/null || true; exit 0; }

# ── 3. gates ──
NUEVA=$(cat VERSION)
cd sigab-frontend
npm ci --silent
npm run build || { echo "GATE FALLO: build"; notificar "🔴 loop v$NUEVA: build fallo, sin deploy"; exit 1; }
npx vitest run --reporter=basic 2>/dev/null || { echo "GATE FALLO: tests"; notificar "🔴 loop v$NUEVA: tests fallaron, sin deploy"; exit 1; }
grep -aq "anim-cell-pop" dist/assets/Reservas-*.js || { echo "GATE FALLO: calendario ausente"; exit 1; }
grep -alq "prepararVentanaPdf" dist/assets/*.js || { echo "GATE FALLO: fix PDF ausente"; exit 1; }
cd ..

# ── 4. push del trabajo (antes del deploy: nada se despliega sin estar en GitHub) ──
git push origin "$RAMA"
# espejo SIGAB-v4 (snapshot encadenado)
if git remote get-url v4 >/dev/null 2>&1; then
  PREV=$(git ls-remote v4 refs/heads/main | cut -f1)
  SNAP=$(git commit-tree "HEAD^{tree}" ${PREV:+-p $PREV} -m "v$NUEVA — sync loop $(date -I)")
  git push v4 "$SNAP:refs/heads/main" || echo "espejo v4 fallo (no bloquea)"
fi

# ── 5. deploy frontend al VPS con backup ──
TS=$(date +%Y%m%d-%H%M%S)
ssh "$VPS" "cp -r $VPS_DIST $VPS_DIST.bak-$TS"
rsync -a --delete sigab-frontend/dist/ "$VPS:$VPS_DIST/"

# ── 6. smoke post-deploy: rollback automático si falla ──
sleep 3
OK=1
curl -sk -o /dev/null -w "%{http_code}" https://sigab.129-121-100-147.sslip.io/ | grep -q 200 || OK=0
curl -sk https://sigab.129-121-100-147.sslip.io/health | grep -q '"ok"' || OK=0
if [ "$OK" != "1" ]; then
  echo "SMOKE FALLO — rollback automatico"
  ssh "$VPS" "rsync -a --delete $VPS_DIST.bak-$TS/ $VPS_DIST/"
  notificar "🔴 SIGAB v$NUEVA: smoke post-deploy fallo, ROLLBACK automatico aplicado. Ver $LOG"
  exit 2
fi

# ── 7. registro y notificación ──
ssh "$VPS" "printf 'DEPLOY LOOP v%s %s\nbase: %s\nbackup: dist.bak-%s\n' '$NUEVA' \"\$(date -Iseconds)\" '$BASE' '$TS' > /home/cloud/proyectos/DEPLOY_\$(date +%F)_loop-v$NUEVA.md"
# conservar solo los 3 backups mas recientes
ssh "$VPS" "cd $(dirname $VPS_DIST) && ls -dt dist.bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf"
RESUMEN=$(sed -n '3,6p' CICLO-RESULTADO.md 2>/dev/null | tr '\n' ' ' | head -c 300)
notificar "🟢 SIGAB v$NUEVA desplegada por el loop. $RESUMEN — verificar: ver versions.json / panel"
echo "=== ciclo completo: v$NUEVA desplegada ==="

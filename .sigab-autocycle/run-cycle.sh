#!/usr/bin/env bash
set -uo pipefail
REPO=/opt/sigab-v3
SELF=/opt/sigab/.sigab-autocycle
LOGDIR=/var/log/sigab-autocycle
MODEL=MiniMax-M3
CYCLE_TIMEOUT=7200
export IS_SANDBOX=1          # permite --dangerously-skip-permissions corriendo como root
export HOME=/root

TS=$(date +%Y%m%d-%H%M%S)
LOG="$LOGDIR/cycle-$TS.log"
mkdir -p "$LOGDIR"
cd "$REPO" || exit 1
{
  echo "=== SIGAB autocycle START: $(date -Is) (modelo=$MODEL) ==="
  echo "--- health probe (bash, independiente de claude) ---"
  tmux has-session -t sigab-hermes 2>/dev/null && echo "hermes: UP" || echo "hermes: DOWN"
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx openclaw && echo "openclaw: UP" || echo "openclaw: DOWN"
  for u in https://sigah.129-121-100-147.sslip.io/ https://sigab.129-121-100-147.sslip.io/; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$u" 2>/dev/null || echo ERR)
    echo "link $u -> $code"
  done
  echo "--- claude headless cycle ---"
  timeout "$CYCLE_TIMEOUT" claude -p "$(cat "$SELF/PROMPT.md")" \
    --model "$MODEL" \
    --dangerously-skip-permissions < /dev/null
  echo "=== claude exit: $? ==="
  echo "=== END: $(date -Is) ==="
} >> "$LOG" 2>&1
ln -sf "$LOG" "$LOGDIR/latest.log"
# conserva los últimos 60 logs
ls -1t "$LOGDIR"/cycle-*.log 2>/dev/null | tail -n +61 | xargs -r rm -f

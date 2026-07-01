#!/usr/bin/env bash
# ============================================================================
#  tailnet-monitor.sh
#  ----------------------------------------------------------------------------
#  Monitorea el tailnet Tailscale y registra cambios de estado de los nodos
#  críticos. Diseñado para correr vía cron cada 5 minutos.
#
#  Estado:
#    /var/lib/sigab/tailnet-state.json     último snapshot conocido
#    /var/log/sigab/tailnet-monitor.jsonl  log línea-por-línea (timestamped)
#
#  Alertas:
#    OPENCLAW_GATEWAY_URL + OPENCLAW_GATEWAY_TOKEN → POST a /v1/notify
#    Si el gateway falla → log a syslog (LOG_INFO/LOG_ERR)
#
#  Exit codes:
#    0 = estado estable (sin cambios)
#    1 = cambio detectado (online↔offline) — ya se notificó
#    2 = error de tailscale (no se pudo leer estado)
# ============================================================================

set -Eeuo pipefail

STATE_DIR=/var/lib/sigab
STATE_FILE=$STATE_DIR/tailnet-state.json
LOG_FILE=/var/log/sigab/tailnet-monitor.jsonl
LOCK_FILE=/var/run/sigab-tailnet-monitor.lock

# Nodos críticos que siempre deben estar online (hostname Tailscale)
CRITICAL_NODES=(sigab-vps sigah-thinkcentre-m720q)

mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"

# --- lock para evitar carreras con cron ---
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Iseconds) WARN otro monitor corriendo, saliendo" >>"$LOG_FILE"
  exit 0
fi

# --- leer estado actual ---
RAW=$(tailscale status --json 2>&1) || {
  echo "$(date -Iseconds) ERROR tailscale status fallo: $RAW" >>"$LOG_FILE"
  exit 2
}

# --- snapshot anterior ---
PREV=""
[[ -f "$STATE_FILE" ]] && PREV=$(cat "$STATE_FILE")

# --- nuevo snapshot ---
# Tailscale devuelve Self por separado y Peer NO incluye self.
# Normalizamos a una sola lista {hostname_lower: {online, lastSeen, ips}} con
# self incluido, para que las comparaciones prev↔curr sean simétricas.
SNAP=$(echo "$RAW" | jq -c '
  ([
     (.Self // null | if . == null then empty
        else {hostname: .HostName, online: (.Online // true),
              lastSeen: (.LastSeen // "0001-01-01T00:00:00Z"),
              tailscaleIPs: (.TailscaleIPs // [])} end),
     (.Peer // {} | to_entries[] | .value | {
        hostname: .HostName,
        online: (.Online // false),
        lastSeen: (.LastSeen // "0001-01-01T00:00:00Z"),
        tailscaleIPs: (.TailscaleIPs // [])
     })
   ]
   | map( {( (.hostname // "unknown") | ascii_downcase): {
              online: .online, lastSeen: .lastSeen, tailscaleIPs: .tailscaleIPs
            } } )
   | add // {}
) as $nodes
| { selfOnline: (.BackendState == "Running"), peers: $nodes }')

echo "$(date -Iseconds) $SNAP" >>"$LOG_FILE"
echo "$SNAP" >"$STATE_FILE"

# --- si no hay previo, solo inicializar ---
if [[ -z "$PREV" || "$PREV" == "null" ]]; then
  echo "$(date -Iseconds) INFO snapshot inicial guardado"
  exit 0
fi

# --- detectar transiciones online→offline en nodos críticos ---
CHANGED=0
ALERTS=()

for node in "${CRITICAL_NODES[@]}"; do
  # las claves del snapshot están en minúsculas; comparamos en minúsculas
  lnode=$(echo "$node" | tr '[:upper:]' '[:lower:]')
  # OJO: jq `//` trata false como null, así que `false // "unknown"` = "unknown"
  # y las transiciones nunca matchean. tostring preserva el false real.
  prev_state=$(echo "$PREV"  | jq -r ".peers.\"$lnode\".online | if . == null then \"unknown\" else tostring end")
  curr_state=$(echo "$SNAP"  | jq -r ".peers.\"$lnode\".online | if . == null then \"unknown\" else tostring end")
  if [[ "$prev_state" == "true" && "$curr_state" == "false" ]]; then
    CHANGED=1
    ALERTS+=("🔴 $node CAYÓ (online → offline) @ $(date -Iseconds)")
  elif [[ "$prev_state" == "false" && "$curr_state" == "true" ]]; then
    CHANGED=1
    ALERTS+=("🟢 $node VOLVIÓ (offline → online) @ $(date -Iseconds)")
  fi
done

# --- también alertar si el propio nodo perdió backend ---
prev_self=$(echo "$PREV" | jq -r '.selfOnline | if . == null then "unknown" else tostring end')
curr_self=$(echo "$SNAP" | jq -r '.selfOnline | if . == null then "unknown" else tostring end')
if [[ "$prev_self" == "true" && "$curr_self" == "false" ]]; then
  CHANGED=1
  ALERTS+=("⚠️ ESTA VPS perdió conexión con Tailscale backend @ $(date -Iseconds)")
fi

[[ $CHANGED -eq 0 ]] && exit 0

# --- enviar alertas ---
MSG=$(printf '%s\n' "${ALERTS[@]}")
echo "$(date -Iseconds) ALERT: $MSG" >>"$LOG_FILE"

# Intentar OpenClaw si está configurado
if [[ -n "${OPENCLAW_GATEWAY_URL:-}" && -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  curl -fsS --max-time 8 \
    -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$OPENCLAW_GATEWAY_URL/v1/notify" \
    -d "$(jq -nc --arg msg "$MSG" --arg src "tailnet-monitor" \
        '{channel:"telegram", source:$src, text:$msg, priority:"high"}')" \
    >>"$LOG_FILE" 2>&1 || echo "$(date -Iseconds) WARN openclaw notify fallo (continúa)" >>"$LOG_FILE"
fi

exit 1
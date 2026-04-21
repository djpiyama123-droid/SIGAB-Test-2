#!/bin/bash
# ================================================================
# SIGAB — Script de detención
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

echo "Deteniendo SIGAB..."

[[ -f "$LOG_DIR/backend.pid" ]]  && kill "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null  && echo "  Backend detenido"
[[ -f "$LOG_DIR/frontend.pid" ]] && kill "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null && echo "  Frontend detenido"
[[ -f "$LOG_DIR/bot.pid" ]]      && kill "$(cat "$LOG_DIR/bot.pid")" 2>/dev/null      && echo "  Bot WhatsApp detenido"

# Cleanup extra
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "sigab-bot" 2>/dev/null || true

rm -f "$LOG_DIR"/*.pid

echo "SIGAB detenido."

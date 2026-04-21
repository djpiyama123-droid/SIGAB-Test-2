#!/bin/bash
# ================================================================
# SIGAB — Arranque rápido (backend + frontend)
# ================================================================
SIGAB_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Arrancando SIGAB..."

# Backend
cd "$SIGAB_DIR/sigab-backend"
source venv/bin/activate 2>/dev/null || true
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (puerto 8000)"

# Esperar a que el backend arranque
sleep 3

# Frontend
cd "$SIGAB_DIR/sigab-frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (puerto 5173)"

echo ""
echo "SIGAB corriendo:"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios."

# Capturar Ctrl+C y matar ambos procesos
trap "echo 'Deteniendo...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Esperar
wait

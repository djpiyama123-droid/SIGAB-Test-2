#!/bin/bash
# Inicia SIGAH completo en modo desarrollo
echo "=== SIGAH WebPanel — Dev Mode ==="

# Backend
echo "[1/2] Iniciando API en puerto 8000..."
node backend/server.js &
BACKEND_PID=$!
echo "    Backend PID: $BACKEND_PID"
sleep 1

# Frontend
echo "[2/2] Iniciando Vite en puerto 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Portal:  http://localhost:5173"
echo "  API:     http://localhost:8000"
echo ""
echo "  Admin:   gustavo  / Sigah2026!"
echo "  Admin:   carlos   / Sigah2026!"
echo "  Usuario: demo     / demo123"
echo ""
echo "Ctrl+C para detener ambos servicios"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servicios detenidos'" EXIT
wait

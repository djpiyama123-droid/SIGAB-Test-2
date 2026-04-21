#!/bin/bash
# Detener SIGAB
echo "Deteniendo SIGAB..."
pkill -f "uvicorn main:app" 2>/dev/null && echo "Backend detenido" || echo "Backend no corría"
pkill -f "vite" 2>/dev/null && echo "Frontend detenido" || echo "Frontend no corría"
echo "Listo."

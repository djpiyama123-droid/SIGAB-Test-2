#!/bin/bash
# Script de Sincronización del Cerebro de Obsidian (Vault) para Linux/Ubuntu/WSL
# Se programa vía cron cada 15 minutos

OBSIDIAN_PATH="/mnt/c/Users/djpiy/Documents/Obsidian/SIGAH-KB"
# Si corre nativo en Linux, probar ruta local de usuario
if [ ! -d "$OBSIDIAN_PATH" ]; then
    OBSIDIAN_PATH="$HOME/Obsidian/SIGAH-KB"
fi

NODE_NAME=$(hostname)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "=== Iniciando sincronización de Obsidian KB en $TIMESTAMP (Nodo: $NODE_NAME) ==="

if [ ! -d "$OBSIDIAN_PATH" ]; then
    echo "ERROR: El directorio del Vault de Obsidian no existe."
    exit 1
fi

cd "$OBSIDIAN_PATH" || exit 1

# 1. Verificar si es un repo git
if [ ! -d ".git" ]; then
    echo "Inicializando repositorio Git en el Vault..."
    git init
    git branch -M main
    echo "ADVERTENCIA: Configura el remoto usando: git remote add origin <url>"
fi

# 2. Rebase contra origin main
echo "Haciendo pull con estrategia rebase..."
git pull origin main --rebase

# 3. Comprobar si hay cambios locales
if [ -z "$(git status --porcelain)" ]; then
    echo "No hay cambios locales que sincronizar."
else
    echo "Cambios detectados. Sincronizando..."
    git add .
    git commit -m "sync(obsidian): cambios desde nodo $NODE_NAME - $TIMESTAMP"
    git push origin main
    echo "Sincronización completada exitosamente."
fi

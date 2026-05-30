#!/bin/bash
# ── SIGAH Portal Deployment Script (WSL2 / Git Bash) ──
# Construye la aplicación localmente y la sube al VPS de Bluehost vía rsync.

set -e

echo "=========================================================="
echo "🚀 Iniciando despliegue de SIGAH Portal..."
echo "=========================================================="

# 1. Copiar configuración de producción si existe .env.production, si no usar el de la carpeta
if [ -f .env.production ]; then
  echo "📦 Usando .env.production para el build..."
  cp .env.production .env
else
  echo "⚠️  No se encontró .env.production. Asegúrate de configurar .env con las variables de producción."
fi

# 2. Construir la aplicación
echo "🏗️  Construyendo assets de producción (npm run build)..."
npm run build

# 3. Crear directorio en el servidor si no existe
echo "📂 Asegurando el directorio en el VPS..."
ssh sigab-bluehost "mkdir -p /opt/sigab/sigah-portal/dist"

# 4. Transferir los archivos
echo "📤 Subiendo archivos vía rsync a sigab-bluehost..."
rsync -avz --delete dist/ sigab-bluehost:/opt/sigab/sigah-portal/dist/

echo "=========================================================="
echo "✨ ¡Despliegue completado con éxito!"
echo "🌐 Portal marketing:  https://sigah.129-121-100-147.sslip.io"
echo "🌐 Dashboard cliente: https://sigab.129-121-100-147.sslip.io"
echo "🌐 Monitor servicios: https://monitor.sigah.129-121-100-147.sslip.io"
echo "=========================================================="

# ── SIGAH Portal Deployment Script (Windows PowerShell) ──
# Construye la aplicación localmente y la sube al VPS de Bluehost vía SCP.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando despliegue de SIGAH Portal desde Windows PowerShell..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Copiar configuración de producción si existe
if (Test-Path .env.production) {
    Write-Host "📦 Usando .env.production para el build..." -ForegroundColor Yellow
    Copy-Item .env.production .env -Force
} else {
    Write-Host "⚠️ No se encontró .env.production. Asegúrate de configurar .env con las variables de producción." -ForegroundColor Yellow
}

# 2. Construir la aplicación
Write-Host "🏗️ Construyendo assets de producción (npm run build)..." -ForegroundColor Yellow
npm run build

# 3. Asegurar directorio en el servidor
Write-Host "📂 Asegurando el directorio en el VPS..." -ForegroundColor Yellow
ssh sigab-bluehost "mkdir -p /var/www/sigah"

# 4. Transferir los archivos usando SCP recursivo
Write-Host "📤 Subiendo archivos vía SCP..." -ForegroundColor Yellow
scp -r dist/* sigab-bluehost:/var/www/sigah/

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✨ ¡Despliegue completado con éxito!" -ForegroundColor Green
Write-Host "🌐 URL Pública: http://129.121.100.147" -ForegroundColor Green
Write-Host "🌐 URL Segura: https://sigah.129-121-100-147.sslip.io" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# ================================================================
# SIGAB — Script de arranque rápido (Windows PowerShell)
# Hospital General Regional No. 1 — IMSS Tijuana
# ================================================================

$ErrorActionPreference = "Stop"

$RESET_DB = $args -contains "--reset-db"
$NO_BOT = $args -contains "--no-bot"

$SCRIPT_DIR = $PSScriptRoot
$PROJECT_DIR = Split-Path $SCRIPT_DIR -Parent
$LOG_DIR = Join-Path $PROJECT_DIR "logs"
$BACKEND_DIR = Join-Path $PROJECT_DIR "sigab-backend"
$FRONTEND_DIR = Join-Path $PROJECT_DIR "sigab-frontend"
$BOT_DIR = Join-Path $PROJECT_DIR "sigab-bot"

$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "sigab_user" }
$DB_PASS = if ($env:DB_PASS) { $env:DB_PASS } else { "sigab_pass_2026" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "sigab" }

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SIGAB — Sistema de Gestión de Activos Biomédicos" -ForegroundColor Cyan
Write-Host "  HGR No.1 IMSS Tijuana — On-Premise (Windows)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

# ── 1. Verificar MySQL ─────────────────────────────────────────
Write-Host "`n[1/5] Verificando MySQL..." -ForegroundColor Yellow
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Host "MySQL no encontrado en el PATH. Por favor instala MySQL Server 8.0." -ForegroundColor Red
    exit 1
}

# Intentar conectar
$mysql_test = & mysql -u $DB_USER "-p$DB_PASS" -e "SELECT 1;" $DB_NAME 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se puede conectar a MySQL con $DB_USER@$DB_NAME" -ForegroundColor Red
    Write-Host "Verifica que el servicio esté corriendo y las credenciales sean correctas."
    exit 1
}
Write-Host "    MySQL: OK" -ForegroundColor Green

# ── 2. Aplicar schema y seed ───────────────────────────────────
Write-Host "`n[2/5] Aplicando esquema de base de datos..." -ForegroundColor Yellow
if ($RESET_DB) {
    Write-Host "    Modo --reset-db: recreando tablas..."
    cmd /c "mysql -u $DB_USER -p$DB_PASS $DB_NAME < $PROJECT_DIR\database\sigab_schema.sql"
    cmd /c "mysql -u $DB_USER -p$DB_PASS $DB_NAME < $PROJECT_DIR\database\seed_data.sql"
    Write-Host "    Schema + Seed: OK" -ForegroundColor Green
} else {
    cmd /c "mysql -u $DB_USER -p$DB_PASS $DB_NAME < $PROJECT_DIR\database\sigab_schema.sql"
    Write-Host "    Schema: OK (sin cambios si ya existía)" -ForegroundColor Green
}

# ── 3. Iniciar Backend FastAPI ─────────────────────────────────
Write-Host "`n[3/5] Iniciando backend FastAPI..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.CommandLine -like "*uvicorn main:app*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Set-Location $BACKEND_DIR

if (-not (Test-Path "venv")) {
    Write-Host "    Creando virtualenv..."
    python -m venv venv
}

# Activar venv y ejecutar
$env:SIGAB_DB_HOST = "127.0.0.1"
$env:SIGAB_DB_PORT = "3306"
$env:SIGAB_DB_USER = $DB_USER
$env:SIGAB_DB_PASS = $DB_PASS
$env:SIGAB_DB_NAME = $DB_NAME

Write-Host "    Instalando dependencias backend..."
.\venv\Scripts\pip.exe install -r requirements.txt -q

if (-not (Test-Path "static\uploads")) { New-Item -ItemType Directory -Path "static\uploads" | Out-Null }

Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" -WindowStyle Hidden
Write-Host "    Backend iniciado en segundo plano (Puerto 8000)" -ForegroundColor Green

# ── 4. Iniciar Frontend React ──────────────────────────────────
Write-Host "`n[4/5] Iniciando frontend React..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Set-Location $FRONTEND_DIR

if (-not (Test-Path "node_modules")) {
    Write-Host "    Instalando dependencias npm..."
    npm install
}

Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WindowStyle Hidden
Write-Host "    Frontend iniciado en segundo plano (Puerto 5173)" -ForegroundColor Green

# ── 5. Iniciar Bot WhatsApp ────────────────────────────────────
if (-not $NO_BOT -and (Test-Path $BOT_DIR)) {
    Write-Host "`n[5/5] Iniciando SIGAB Bot (WhatsApp)..." -ForegroundColor Yellow
    Set-Location $BOT_DIR
    if (-not (Test-Path "node_modules")) {
        Write-Host "    Instalando dependencias del bot..."
        npm install
    }
    Start-Process -FilePath "node.exe" -ArgumentList "index.js" -WindowStyle Hidden
    Write-Host "    Bot WhatsApp iniciado en segundo plano" -ForegroundColor Green
}

Set-Location $PROJECT_DIR

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  SIGAB activo - Resumen" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard:    http://localhost:5173"
Write-Host "  Modo TV:      http://localhost:5173/tv"
Write-Host "  API Docs:     http://localhost:8000/docs"
Write-Host ""
Write-Host "  Nota: Los procesos corren en segundo plano (ocultos)."
Write-Host "  Para detenerlos use el Administrador de Tareas o stop_sigab.ps1"
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green

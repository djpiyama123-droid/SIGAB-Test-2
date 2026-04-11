# ================================================================
# SIGAB — Script de detención (Windows PowerShell)
# ================================================================

Write-Host "Deteniendo procesos de SIGAB..." -ForegroundColor Yellow

# Detener Uvicorn (Backend)
$backend = Get-Process | Where-Object { $_.Modules.ModuleName -contains "python.exe" -and $_.CommandLine -like "*uvicorn*" }
if ($backend) {
    $backend | Stop-Process -Force
    Write-Host "  Backend detenido" -ForegroundColor Green
}

# Detener Vite (Frontend)
$frontend = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.CommandLine -like "*vite*" }
if ($frontend) {
    $frontend | Stop-Process -Force
    Write-Host "  Frontend detenido" -ForegroundColor Green
}

# Detener Node (Bot)
$bot = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.CommandLine -like "*sigab-bot*" }
if ($bot) {
    $bot | Stop-Process -Force
    Write-Host "  Bot detenido" -ForegroundColor Green
}

# Alternativa más agresiva si los anteriores fallan
Get-Process | Where-Object { $_.CommandLine -like "*uvicorn main:app*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.CommandLine -like "*bin\vite.js*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "SIGAB detenido." -ForegroundColor Cyan

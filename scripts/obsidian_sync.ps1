# Script de Sincronización del Cerebro de Obsidian (Vault) para Windows
# Se ejecuta cada 15 minutos en la terminal física (ASUS TUF o Lenovo ThinkCentre)

$ObsidianPath = "C:\Users\djpiy\Documents\Obsidian\SIGAH-KB"
$NodeName = $env:COMPUTERNAME
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Output "=== Iniciando sincronización de Obsidian KB en $Timestamp (Nodo: $NodeName) ==="

if (-not (Test-Path $ObsidianPath)) {
    Write-Warning "El directorio del Vault de Obsidian no existe en: $ObsidianPath"
    exit 1
}

Push-Location $ObsidianPath

try {
    # 1. Verificar si es un repositorio git
    if (-not (Test-Path ".git")) {
        Write-Output "Inicializando repositorio Git en el Vault..."
        git init
        git branch -M main
        # El remote se puede configurar manualmente, pero lo dejamos listo
        Write-Warning "¡Recuerda configurar el repositorio remoto usando 'git remote add origin <url>'!"
    }

    # 2. Obtener los cambios del servidor remoto
    Write-Output "Haciendo pull con estrategia rebase para integrar notas..."
    git pull origin main --rebase

    # 3. Verificar cambios locales
    $status = git status --porcelain
    if ($null -eq $status -or $status -eq "") {
        Write-Output "No hay cambios locales nuevos que sincronizar."
    } else {
        Write-Output "Detectados cambios locales. Preparando commit..."
        
        # 4. Agregar archivos modificados y nuevos
        git add .

        # 5. Generar commit con nombre del nodo y timestamp
        $CommitMsg = "sync(obsidian): cambios desde nodo $NodeName - $Timestamp"
        git commit -m $CommitMsg
        
        # 6. Empujar los cambios al repositorio central
        Write-Output "Subiendo cambios a GitHub..."
        git push origin main
        
        Write-Output "Sincronización completada exitosamente."
    }
}
catch {
    Write-Error "Error durante la sincronización: $_"
}
finally {
    Pop-Location
}

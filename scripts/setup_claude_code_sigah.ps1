#requires -Version 5.1
<#
.SYNOPSIS
    Setup de Claude Code para SIGAH en una Asus TUF A16 (Windows 11).

.DESCRIPCION
    1. Verifica/instala Node.js y Claude Code (npm i -g @anthropic-ai/claude-code).
    2. Clona el repo SIGAH (si no existe).
    3. Copia las skills oficiales de Anthropic al perfil de usuario (~/.claude/skills/),
       de modo que esten disponibles en cualquier proyecto, no solo en SIGAH.
    4. Configura SSH para el VPS Bluehost (instancia SIGAB) y para el servidor
       Hetzner de SIGAH cuando este listo.
    5. Verifica que Claude Code vea todas las skills.

.NOTAS
    - Ejecutar como usuario normal (no Administrador, salvo el paso de Node si falta).
    - Pre-requisitos: git, npm (Node 18+) ya instalados.
    - Reemplazar las variables al inicio si la ruta del repo cambia.
#>

$ErrorActionPreference = "Stop"

# ── Configuracion ─────────────────────────────────────────────────────
$RepoPath       = "$env:USERPROFILE\Desktop\Bioingeneria\SIGAB"
$UserSkillsDir  = "$env:USERPROFILE\.claude\skills"
$SshDir         = "$env:USERPROFILE\.ssh"
$AnthropicSkills = @(
    "pdf", "docx", "xlsx", "pptx",
    "web-artifacts-builder", "frontend-design",
    "skill-creator", "mcp-builder", "claude-api",
    "brand-guidelines", "doc-coauthoring", "internal-comms",
    "canvas-design", "theme-factory"
)

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  SIGAH - Setup de Claude Code para Asus TUF A16"          -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# ── Paso 1: dependencias base ─────────────────────────────────────────
Write-Host "`n[1/6] Verificando Node.js y npm..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  Node.js no esta instalado. Descarga e instala desde https://nodejs.org (LTS)." -ForegroundColor Red
    exit 1
}
Write-Host "  Node: $(node -v)" -ForegroundColor Green
Write-Host "  npm:  $(npm -v)" -ForegroundColor Green

# ── Paso 2: Claude Code CLI ───────────────────────────────────────────
Write-Host "`n[2/6] Verificando Claude Code CLI..." -ForegroundColor Yellow
$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
    Write-Host "  Instalando @anthropic-ai/claude-code globalmente..." -ForegroundColor Yellow
    npm install -g "@anthropic-ai/claude-code"
} else {
    Write-Host "  Claude Code ya instalado: $(claude --version 2>&1 | Select-Object -First 1)" -ForegroundColor Green
}

# ── Paso 3: skills de Anthropic al perfil de usuario ──────────────────
Write-Host "`n[3/6] Instalando skills oficiales de Anthropic en $UserSkillsDir ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $UserSkillsDir | Out-Null

$tmp = Join-Path $env:TEMP "anthropic-skills"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone --depth 1 https://github.com/anthropics/skills.git $tmp | Out-Null

foreach ($s in $AnthropicSkills) {
    $src = Join-Path $tmp "skills\$s"
    $dst = Join-Path $UserSkillsDir $s
    if (Test-Path $src) {
        if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
        Copy-Item -Recurse $src $dst
        Write-Host "  + $s" -ForegroundColor Green
    } else {
        Write-Host "  - $s (no encontrada en el repo)" -ForegroundColor DarkYellow
    }
}

# ── Paso 4: SSH config (Bluehost + Hetzner) ───────────────────────────
Write-Host "`n[4/6] Configurando SSH (Bluehost + Hetzner)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $SshDir | Out-Null
$sshConfigSrc = Join-Path $RepoPath ".claude\ssh\config.sigah"
$sshConfigDst = Join-Path $SshDir "config"

if (-not (Test-Path $sshConfigSrc)) {
    Write-Host "  No se encontro $sshConfigSrc. Salta este paso." -ForegroundColor DarkYellow
} else {
    $alreadyHasSigab = $false
    if (Test-Path $sshConfigDst) {
        $alreadyHasSigab = (Select-String -Path $sshConfigDst -Pattern "sigab-bluehost" -Quiet)
    }
    if ($alreadyHasSigab) {
        Write-Host "  ~/.ssh/config ya contiene 'sigab-bluehost' - no se duplica." -ForegroundColor Green
    } else {
        "`n# ─── Inicio config SIGAH (autogenerado por setup_claude_code_sigah.ps1) ───" | Add-Content $sshConfigDst
        Get-Content $sshConfigSrc | Add-Content $sshConfigDst
        "# ─── Fin config SIGAH ───`n" | Add-Content $sshConfigDst
        Write-Host "  Anexado a $sshConfigDst" -ForegroundColor Green
    }

    # Generar llave SSH para Bluehost si no existe
    $keyPath = Join-Path $SshDir "sigab_bluehost_ed25519"
    if (-not (Test-Path $keyPath)) {
        Write-Host "  Generando llave SSH para Bluehost (Enter para passphrase vacia)..." -ForegroundColor Yellow
        ssh-keygen -t ed25519 -f $keyPath -C "gustavo@sigah.mx (sigab-bluehost)"
        Write-Host "  Llave generada en $keyPath" -ForegroundColor Green
        Write-Host "  Copia la llave publica al servidor Bluehost:" -ForegroundColor Cyan
        Write-Host "    type $($keyPath).pub" -ForegroundColor White
        Write-Host "  Y pegala en /root/.ssh/authorized_keys del VPS." -ForegroundColor Cyan
    } else {
        Write-Host "  Llave $keyPath ya existe." -ForegroundColor Green
    }
}

# ── Paso 5: connections.json de la skill MySQL ────────────────────────
Write-Host "`n[5/6] Configurando skill mysql..." -ForegroundColor Yellow
$mysqlDir = Join-Path $RepoPath ".claude\skills\mysql"
$ex = Join-Path $mysqlDir "connections.example.sigah.json"
$cfg = Join-Path $mysqlDir "connections.json"
if (Test-Path $ex) {
    if (Test-Path $cfg) {
        Write-Host "  $cfg ya existe (no se sobreescribe)." -ForegroundColor Green
    } else {
        Copy-Item $ex $cfg
        Write-Host "  Copiado a connections.json. Editalo para agregar passwords reales." -ForegroundColor Yellow
        Write-Host "  $cfg" -ForegroundColor White
    }
}

# ── Paso 6: verificacion ──────────────────────────────────────────────
Write-Host "`n[6/6] Verificacion final..." -ForegroundColor Yellow
$projSkills = Get-ChildItem (Join-Path $RepoPath ".claude\skills") -Directory -ErrorAction SilentlyContinue
$userSkills = Get-ChildItem $UserSkillsDir -Directory -ErrorAction SilentlyContinue
Write-Host "  Skills a nivel proyecto (.claude\skills): $($projSkills.Count)" -ForegroundColor Green
$projSkills | ForEach-Object { Write-Host "    - $($_.Name)" }
Write-Host "  Skills a nivel usuario (~/.claude/skills): $($userSkills.Count)" -ForegroundColor Green
$userSkills | ForEach-Object { Write-Host "    - $($_.Name)" }

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  Setup completado." -ForegroundColor Green
Write-Host "  Siguiente:" -ForegroundColor Cyan
Write-Host "    1. cd $RepoPath" -ForegroundColor White
Write-Host "    2. claude              # arrancar Claude Code en el repo" -ForegroundColor White
Write-Host "    3. /skills             # ver lista de skills disponibles" -ForegroundColor White
Write-Host "    4. ssh sigab-bluehost  # conectar al VPS (tras copiar la llave publica)" -ForegroundColor White
Write-Host "===========================================================" -ForegroundColor Cyan

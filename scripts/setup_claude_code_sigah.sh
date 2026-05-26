#!/usr/bin/env bash
# Setup de Claude Code para SIGAH en Linux / macOS / WSL.
# Equivalente Linux del setup_claude_code_sigah.ps1.
#
# Uso:
#   chmod +x scripts/setup_claude_code_sigah.sh
#   ./scripts/setup_claude_code_sigah.sh

set -euo pipefail

REPO_PATH="${REPO_PATH:-$HOME/Desktop/Bioingeneria/SIGAH}"
USER_SKILLS_DIR="$HOME/.claude/skills"
SSH_DIR="$HOME/.ssh"
ANTHROPIC_SKILLS=(
  pdf docx xlsx pptx
  web-artifacts-builder frontend-design
  skill-creator mcp-builder claude-api
  brand-guidelines doc-coauthoring internal-comms
  canvas-design theme-factory
)

c_green=$'\033[0;32m'; c_yellow=$'\033[1;33m'; c_red=$'\033[0;31m'; c_cyan=$'\033[0;36m'; c_reset=$'\033[0m'
say()  { printf "%s\n" "$*"; }
ok()   { printf "${c_green}  + %s${c_reset}\n" "$*"; }
warn() { printf "${c_yellow}  ! %s${c_reset}\n" "$*"; }
err()  { printf "${c_red}  - %s${c_reset}\n" "$*"; }
step() { printf "\n${c_yellow}[%s] %s${c_reset}\n" "$1" "$2"; }

echo "${c_cyan}===========================================================${c_reset}"
echo "${c_cyan}  SIGAH - Setup de Claude Code para Linux / WSL${c_reset}"
echo "${c_cyan}===========================================================${c_reset}"

# 1. Node + npm
step "1/6" "Verificando Node.js y npm..."
command -v node >/dev/null || { err "Node.js no instalado. Instala desde https://nodejs.org"; exit 1; }
ok "Node: $(node -v)   npm: $(npm -v)"

# 2. Claude Code CLI
step "2/6" "Verificando Claude Code CLI..."
if command -v claude >/dev/null; then
  ok "Claude Code: $(claude --version 2>&1 | head -1)"
else
  warn "Instalando @anthropic-ai/claude-code..."
  npm install -g "@anthropic-ai/claude-code"
fi

# 3. Skills Anthropic a nivel usuario
step "3/6" "Instalando skills oficiales de Anthropic en $USER_SKILLS_DIR ..."
mkdir -p "$USER_SKILLS_DIR"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git clone --depth 1 https://github.com/anthropics/skills.git "$tmp/anthropic-skills" >/dev/null 2>&1
for s in "${ANTHROPIC_SKILLS[@]}"; do
  src="$tmp/anthropic-skills/skills/$s"
  dst="$USER_SKILLS_DIR/$s"
  if [ -d "$src" ]; then
    rm -rf "$dst"
    cp -r "$src" "$dst"
    ok "$s"
  else
    warn "$s no encontrada en el repo"
  fi
done

# 4. SSH (Bluehost + Hetzner)
step "4/6" "Configurando SSH ..."
mkdir -p "$SSH_DIR" && chmod 700 "$SSH_DIR"
ssh_src="$REPO_PATH/.claude/ssh/config.sigah"
ssh_dst="$SSH_DIR/config"
if [ ! -f "$ssh_src" ]; then
  warn "No existe $ssh_src - se omite."
else
  if grep -q 'sigah-bluehost' "$ssh_dst" 2>/dev/null; then
    ok "~/.ssh/config ya contiene 'sigah-bluehost' - no se duplica."
  else
    {
      echo ""
      echo "# --- Inicio config SIGAH (autogenerado por setup_claude_code_sigah.sh) ---"
      cat "$ssh_src"
      echo "# --- Fin config SIGAH ---"
    } >> "$ssh_dst"
    chmod 600 "$ssh_dst"
    ok "Anexado a $ssh_dst"
  fi
fi

key="$SSH_DIR/sigah_bluehost_ed25519"
if [ ! -f "$key" ]; then
  warn "Generando llave SSH para Bluehost (Enter para passphrase vacia)..."
  ssh-keygen -t ed25519 -f "$key" -C "gustavo@sigah.mx (sigah-bluehost)"
  echo "${c_cyan}  Copia la llave publica al servidor:${c_reset}"
  echo "    ssh-copy-id -i $key.pub <USUARIO>@129.121.100.147"
  echo "${c_cyan}  o pegala manualmente en /root/.ssh/authorized_keys del VPS:${c_reset}"
  cat "$key.pub"
else
  ok "Llave $key ya existe."
fi

# 5. connections.json de skill mysql
step "5/6" "Configurando skill mysql..."
mysql_dir="$REPO_PATH/.claude/skills/mysql"
ex="$mysql_dir/connections.example.sigah.json"
cfg="$mysql_dir/connections.json"
if [ -f "$ex" ]; then
  if [ -f "$cfg" ]; then
    ok "$cfg ya existe (no se sobreescribe)."
  else
    cp "$ex" "$cfg" && chmod 600 "$cfg"
    warn "Copiado a connections.json. Editalo para agregar passwords reales:"
    echo "    $cfg"
  fi
fi

# 6. Verificacion
step "6/6" "Verificacion final..."
proj_skills=$(ls -d "$REPO_PATH/.claude/skills/"*/ 2>/dev/null | wc -l)
user_skills=$(ls -d "$USER_SKILLS_DIR/"*/ 2>/dev/null | wc -l)
ok "Skills a nivel proyecto: $proj_skills"
ls "$REPO_PATH/.claude/skills/" 2>/dev/null | sed 's/^/    - /'
ok "Skills a nivel usuario: $user_skills"
ls "$USER_SKILLS_DIR" 2>/dev/null | sed 's/^/    - /'

echo ""
echo "${c_cyan}===========================================================${c_reset}"
echo "${c_green}  Setup completado.${c_reset}"
echo "${c_cyan}  Siguientes pasos:${c_reset}"
echo "    1. cd $REPO_PATH"
echo "    2. claude              # arranca Claude Code en el repo"
echo "    3. /skills             # ver lista de skills"
echo "    4. ssh sigah-bluehost  # conectar al VPS (despues de copiar la llave publica)"
echo "${c_cyan}===========================================================${c_reset}"

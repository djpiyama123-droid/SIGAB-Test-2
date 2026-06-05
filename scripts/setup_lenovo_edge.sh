#!/bin/bash
# ==============================================================================
# RECETA DE INSTALACIÓN Y APROVISIONAMIENTO: EDGE NODE (Lenovo ThinkCentre)
# Proyecto: SIGAH/SIGAB v2.0
# Ubicación: Hospital General Regional (IMSS)
# ==============================================================================

set -e

# Configuración de colores para salida elegante
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;30m' # No Color
CLEAR='\033[0m'

echo -e "${BLUE}======================================================================${CLEAR}"
echo -e "${GREEN}    INICIANDO APROVISIONAMIENTO DE EDGE NODE (Lenovo ThinkCentre)     ${CLEAR}"
echo -e "${BLUE}======================================================================${CLEAR}"

# 1. Verificar si corre como root o sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}ERROR: Este script debe ser ejecutado con privilegios de administrador (sudo).${CLEAR}"
  exit 1
fi

# 2. Actualización de paquetes locales
echo -e "\n${YELLOW}[1/6] Actualizando repositorios y paquetes del sistema...${CLEAR}"
apt-get update && apt-get upgrade -y
apt-get install -y curl git apt-transport-https ca-certificates gnupg lsb-release

# 3. Instalación de Docker CE y Docker Compose
echo -e "\n${YELLOW}[2/6] Instalando Docker CE y Docker Compose...${CLEAR}"
if ! [ -x "$(command -v docker)" ]; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Iniciar y habilitar servicio
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✔ Docker instalado con éxito.${CLEAR}"
else
    echo -e "${GREEN}✔ Docker ya se encuentra instalado.${CLEAR}"
fi

# 4. Instalación de Ollama (Servidor LLM Local)
echo -e "\n${YELLOW}[3/6] Instalando Ollama (Motor de Modelos Locales)...${CLEAR}"
if ! [ -x "$(command -v ollama)" ]; then
    # Descargar e instalar Ollama vía script oficial
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✔ Ollama instalado y corriendo como servicio.${CLEAR}"
else
    echo -e "${GREEN}✔ Ollama ya se encuentra instalado.${CLEAR}"
fi

# 5. Descarga de modelos ligeros optimizados para programación y visión médica
echo -e "\n${YELLOW}[4/6] Descargando modelos locales en Ollama...${CLEAR}"
echo -e "${BLUE}- Descargando qwen2.5:14b (Razonamiento y código)...${CLEAR}"
ollama pull qwen2.5:14b

echo -e "${BLUE}- Descargando gemma3:4b (Asistente visual para OCR de equipos)...${CLEAR}"
ollama pull gemma3:4b

echo -e "${GREEN}✔ Modelos locales descargados con éxito.${CLEAR}"

# 6. Configuración de Open VS Code Server (Open Code) en Docker
echo -e "\n${YELLOW}[5/6] Aprovisionando contenedor de Open VS Code Server...${CLEAR}"
mkdir -p /opt/opencode
cat > /opt/opencode/docker-compose.yml << 'EOF'
version: '3.8'

services:
  open-code:
    image: lscr.io/linuxserver/open-vscode-server:latest
    container_name: open_code_server
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Tijuana
      - CONNECTION_TOKEN=sigah_secure_token_2026
    volumes:
      - /opt/sigah-workspace:/workspace
    ports:
      - 3000:3000
    restart: unless-stopped
EOF

cd /opt/opencode
docker compose up -d
echo -e "${GREEN}✔ Open VS Code Server iniciado en el puerto 3000.${CLEAR}"
echo -e "${BLUE}Configura tu extensión de LLM apuntando a Ollama en: http://host.docker.internal:11434 o la IP local.${CLEAR}"

# 7. Clonando repositorio en rama sigah-saas
echo -e "\n${YELLOW}[6/6] Clonando repositorio SIGAH en el Workspace local...${CLEAR}"
mkdir -p /opt/sigah-workspace
if [ ! -d "/opt/sigah-workspace/.git" ]; then
    git clone -b sigah-saas https://github.com/gustavo-sigah/sigah.git /opt/sigah-workspace || true
    echo -e "${GREEN}✔ Repositorio clonado en rama sigah-saas.${CLEAR}"
else
    echo -e "${GREEN}✔ Workspace existente detectado.${CLEAR}"
fi

echo -e "${BLUE}======================================================================${CLEAR}"
echo -e "${GREEN}   ¡APROVISIONAMIENTO DE LENOVO THINKCENTRE COMPLETADO CON ÉXITO!     ${CLEAR}"
echo -e "${BLUE}======================================================================${CLEAR}"

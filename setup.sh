#!/bin/bash
# ================================================================
# SIGAH — Script de Instalación Automática para Ubuntu
# HGR No.1 IMSS Tijuana — Bioingeniería Xochicalco
# ================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SIGAH_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Leer passwords de entorno o prompt ───────────────────────────
if [ -z "${DB_ROOT_PASS:-}" ]; then
    read -r -s -p "Introduce DB_ROOT_PASS (password root de MySQL): " DB_ROOT_PASS
    echo ""
fi
if [ -z "${DB_ROOT_PASS:-}" ]; then
    echo -e "${RED}ERROR: DB_ROOT_PASS no puede estar vacío.${NC}"
    exit 1
fi

if [ -z "${DB_PASS:-}" ]; then
    read -r -s -p "Introduce DB_PASS (password del usuario sigah_user): " DB_PASS
    echo ""
fi
if [ -z "${DB_PASS:-}" ]; then
    echo -e "${RED}ERROR: DB_PASS no puede estar vacío.${NC}"
    exit 1
fi

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   SIGAH — Instalación Automática           ║${NC}"
echo -e "${GREEN}║   Sistema de Gestión de Activos Biomédicos  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar Ubuntu ───────────────────────────────────────
echo -e "${YELLOW}[1/9] Verificando sistema...${NC}"
if ! command -v apt &> /dev/null; then
    echo -e "${RED}Este script requiere Ubuntu/Debian con apt.${NC}"
    exit 1
fi
echo "  OK: $(lsb_release -ds 2>/dev/null || echo 'Linux')"

# ── 2. Actualizar paquetes ────────────────────────────────────
echo -e "${YELLOW}[2/9] Actualizando paquetes del sistema...${NC}"
sudo apt update -qq
sudo apt install -y -qq curl wget git build-essential software-properties-common > /dev/null 2>&1
echo "  OK: Paquetes base instalados"

# ── 3. Instalar MySQL 8.0 ────────────────────────────────────
echo -e "${YELLOW}[3/9] Instalando MySQL 8.0...${NC}"
if ! command -v mysql &> /dev/null; then
    sudo apt install -y -qq mysql-server mysql-client > /dev/null 2>&1
    sudo systemctl start mysql
    sudo systemctl enable mysql
    echo "  OK: MySQL instalado y arrancado"
else
    echo "  OK: MySQL ya está instalado ($(mysql --version | head -c 50))"
fi

# Configurar usuario y bases de datos
echo -e "${YELLOW}[4/9] Configurando bases de datos...${NC}"
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASS}';" 2>/dev/null || true

mysql -u root -p"${DB_ROOT_PASS}" -e "
CREATE DATABASE IF NOT EXISTS sigah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS dummyequipomedicoimss CHARACTER SET utf8mb3;
CREATE USER IF NOT EXISTS 'sigah_user'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS 'sigah_user'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON sigah.* TO 'sigah_user'@'localhost';
GRANT ALL PRIVILEGES ON sigah.* TO 'sigah_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON dummyequipomedicoimss.* TO 'sigah_user'@'localhost';
GRANT ALL PRIVILEGES ON dummyequipomedicoimss.* TO 'sigah_user'@'127.0.0.1';
FLUSH PRIVILEGES;
" 2>/dev/null

echo "  OK: Bases de datos y usuario creados"

# Importar esquemas
echo -e "${YELLOW}[5/9] Importando esquemas y datos...${NC}"
cd "$SIGAH_DIR"

# Esquema fresco de SIGAH
if [ -f database/sigah_schema_fresh.sql ]; then
    mysql -u sigah_user -p"${DB_PASS}" sigah < database/sigah_schema_fresh.sql 2>/dev/null
    echo "  OK: Esquema SIGAH importado"
fi

# Migraciones
for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
        mysql -u sigah_user -p"${DB_PASS}" sigah < "$migration" 2>/dev/null || true
        echo "  OK: Migración $(basename $migration)"
    fi
done

# Seed data
if [ -f database/seed_data.sql ]; then
    mysql -u sigah_user -p"${DB_PASS}" sigah < database/seed_data.sql 2>/dev/null || true
fi

# BD real del hospital (si existe el archivo)
BD_REAL=$(find "$SIGAH_DIR" -name "BaseDeDatos*.sql" -o -name "basededatos*.sql" 2>/dev/null | head -1)
if [ -n "$BD_REAL" ]; then
    echo "  Importando BD real: $(basename $BD_REAL)"
    mysql -u sigah_user -p"${DB_PASS}" dummyequipomedicoimss < "$BD_REAL" 2>/dev/null || true
    echo "  OK: BD real importada"
fi

# ── 6. Instalar Node.js 18 ───────────────────────────────────
echo -e "${YELLOW}[6/9] Instalando Node.js 18...${NC}"
if ! command -v node &> /dev/null || [[ "$(node -v)" != v18* && "$(node -v)" != v20* && "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y -qq nodejs > /dev/null 2>&1
fi
echo "  OK: Node $(node -v), npm $(npm -v)"

# ── 7. Instalar frontend ─────────────────────────────────────
echo -e "${YELLOW}[7/9] Instalando dependencias del frontend...${NC}"
cd "$SIGAH_DIR/sigah-frontend"
npm install --loglevel=error 2>&1 | tail -3
echo "  OK: Frontend listo"

# ── 8. Instalar backend ──────────────────────────────────────
echo -e "${YELLOW}[8/9] Instalando dependencias del backend...${NC}"
sudo apt install -y -qq python3 python3-pip python3-venv > /dev/null 2>&1

cd "$SIGAH_DIR/sigah-backend"

# Crear venv si no existe
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install --upgrade pip -q

# Instalar dependencias core (sin IA pesada)
pip install -q \
    fastapi==0.115.0 \
    "uvicorn[standard]==0.30.0" \
    aiomysql==0.2.0 \
    python-multipart==0.0.9 \
    aiofiles==24.1.0 \
    "qrcode[pil]==8.0" \
    Pillow==10.4.0 \
    reportlab==4.2.5 \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    bcrypt==4.0.1 \
    openpyxl==3.1.5 \
    httpx==0.27.0 \
    "sse-starlette>=1.8.0" \
    sqlmodel \
    asyncmy \
    pymysql

echo "  OK: Backend listo"

# Crear .env si no existe
if [ ! -f .env ]; then
    JWT=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')
    cat > .env << ENVEOF
SIGAH_DB_HOST=127.0.0.1
SIGAH_DB_PORT=3306
SIGAH_DB_USER=sigah_user
SIGAH_DB_PASS=${DB_PASS}
SIGAH_DB_NAME=sigah
SIGAH_SSL_DISABLED=true
SIGAH_JWT_SECRET=${JWT}
SIGAH_PUBLIC_BASE_URL=http://localhost:5173
ENVEOF
    echo "  OK: .env creado"
fi

# ── 9. Migrar datos reales ───────────────────────────────────
echo -e "${YELLOW}[9/9] Migrando datos reales del hospital...${NC}"
cd "$SIGAH_DIR"
if [ -f database/migrate_real_data.py ]; then
    python3 database/migrate_real_data.py 2>&1 || echo "  (Migración omitida — se puede ejecutar manualmente)"
fi

deactivate 2>/dev/null || true

# ── Resumen ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       INSTALACIÓN COMPLETADA               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Para arrancar SIGAH:"
echo ""
echo -e "  ${YELLOW}Terminal 1 (Backend):${NC}"
echo -e "    cd $SIGAH_DIR/sigah-backend"
echo -e "    source venv/bin/activate"
echo -e "    uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo -e "  ${YELLOW}Terminal 2 (Frontend):${NC}"
echo -e "    cd $SIGAH_DIR/sigah-frontend"
echo -e "    npm run dev"
echo ""
echo -e "  ${GREEN}Abrir en el navegador:${NC} http://localhost:5173"
echo -e "  ${GREEN}API Docs:${NC}             http://localhost:8000/docs"
echo ""
echo -e "  O usar el script rápido:"
echo -e "    ${YELLOW}./start_sigah.sh${NC}"
echo ""

#!/usr/bin/env bash
# =============================================================================
# fix_multitenant_vps.sh — Aplica Fase 1 Multi-Tenant en VPS Bluehost
# =============================================================================
# Subir por scp:
#   scp scripts/fix_multitenant_vps.sh root@VPS:/tmp/fix.sh
# Ejecutar en VPS:
#   bash /tmp/fix.sh
# =============================================================================
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/sigab}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-sigab-mysql}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-sigab-backend}"
DB_NAME="${DB_NAME:-sigab}"

line() { echo "──────────────────────────────────────────────────────────────"; }

line
echo "  SIGAH — Fix Multi-Tenant (Fase 1)"
line

# --- 1. Verificar containers vivos -------------------------------------------
echo "[1/7] Verificando containers..."
docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$" \
  || { echo "ERROR: container $MYSQL_CONTAINER no encontrado"; exit 1; }
docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$" \
  || { echo "ERROR: container $BACKEND_CONTAINER no encontrado"; exit 1; }
echo "  OK: ambos containers corriendo"

# --- 2. Aplicar archivos del fix (modelo Usuario + migración SQL) ------------
echo "[2/7] Verificando archivos del fix..."
USUARIO_PY="$REPO_DIR/sigab-backend/models/usuario.py"
MIGRACION="$REPO_DIR/database/migrations/007_fase1_multitenant.sql"

if [ ! -s "$USUARIO_PY" ]; then
  echo "ERROR: $USUARIO_PY no existe o está vacío"
  echo "       Sube el archivo por scp antes de ejecutar este script."
  exit 1
fi

if [ ! -s "$MIGRACION" ]; then
  echo "ERROR: $MIGRACION no existe o está vacío"
  echo "       Sube el archivo por scp antes de ejecutar este script."
  exit 1
fi

# Verificar que usuario.py incluye tenant_id (sanity check)
if ! grep -q "tenant_id" "$USUARIO_PY"; then
  echo "ERROR: $USUARIO_PY no contiene 'tenant_id'. ¿Subiste la versión correcta?"
  exit 1
fi
echo "  OK: usuario.py contiene tenant_id"
echo "  OK: migración 007 tiene $(wc -l < $MIGRACION) líneas"

# --- 3. Aplicar migración SQL (idempotente) ----------------------------------
echo "[3/7] Aplicando migración SQL 007 (idempotente)..."
# La password se lee DENTRO del container donde MYSQL_ROOT_PASSWORD ya está definida.
# Esto evita pasar la password por la shell del host (más seguro).
docker exec -i "$MYSQL_CONTAINER" sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" '"$DB_NAME"'' \
  < "$MIGRACION" || { echo "ERROR aplicando migración"; exit 1; }
echo "  OK: migración aplicada"

# --- 4. Verificar estado de DB post-migración --------------------------------
echo "[4/7] Verificando estado post-migración..."
docker exec "$MYSQL_CONTAINER" sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -t '"$DB_NAME"' -e "
SELECT '\''Equipos tenant=1'\''  AS metrica, COUNT(*) AS valor FROM equipos WHERE tenant_id=1
UNION ALL SELECT '\''Usuarios tenant=1'\'',  COUNT(*) FROM usuarios WHERE tenant_id=1
UNION ALL SELECT '\''Órdenes tenant=1'\'',   COUNT(*) FROM ordenes_servicio WHERE tenant_id=1
UNION ALL SELECT '\''Hospitales'\'',         COUNT(*) FROM hospitales;
"'

# --- 5. Copiar modelo Usuario actualizado al container ------------------------
echo "[5/7] Copiando usuario.py actualizado al container backend..."
docker cp "$USUARIO_PY" "$BACKEND_CONTAINER":/app/models/usuario.py
echo "  OK: modelo actualizado en el container"

# --- 6. Restart backend para que recargue el modelo --------------------------
echo "[6/7] Reiniciando backend..."
docker restart "$BACKEND_CONTAINER" >/dev/null
sleep 8

# Esperar a que esté healthy
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    echo "  OK: backend respondiendo en /health"
    break
  fi
  echo "  ... esperando backend ($i/10)"
  sleep 3
done

# --- 7. Probar endpoint que daba 403 -----------------------------------------
echo "[7/7] Probando endpoint /api/dashboard/resumen con JWT que ya incluye tenant_id..."
ADMIN_TOKEN=$(docker exec "$BACKEND_CONTAINER" python3 -c "
from auth.jwt_handler import create_access_token
print(create_access_token({'id':5,'rol':'admin','matricula':'ADMIN001','tenant_id':1}))
" 2>/dev/null || echo "")

if [ -n "$ADMIN_TOKEN" ]; then
  RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
    "http://localhost:8000/api/dashboard/resumen")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "http://localhost:8000/api/dashboard/resumen")
  echo "  HTTP $HTTP_CODE"
  echo "  Respuesta (primeros 400 chars):"
  echo "$RESPONSE" | head -c 400
  echo ""
fi

line
if [ "${HTTP_CODE:-000}" = "200" ]; then
  echo "  ✅ FIX OK. Refresca https://sigab.129-121-100-147.sslip.io"
  echo "     y cierra/abre sesión para que el frontend reciba el nuevo JWT."
else
  echo "  ⚠️  El endpoint todavía no devuelve 200. Mira los logs:"
  echo "     docker logs --tail 50 $BACKEND_CONTAINER"
fi
line

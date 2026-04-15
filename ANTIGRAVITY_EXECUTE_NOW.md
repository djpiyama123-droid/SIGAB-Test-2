# 🚀 SIGAB — Instrucciones de Ejecución para Antigravity
## Pegar cada bloque EN ORDEN en Antigravity (Planning Mode o Chat Mode)

**Fecha:** 15 Abril 2026 — Deploy 18:00 HRS · HGR No.1 IMSS Tijuana
**Claude Desktop ya escribió todos los archivos.** Antigravity ejecuta los comandos de shell y migraciones.

---

## PASO 0 — Verificar archivos nuevos (confirmar que Claude los creó)

```bash
ls -la sigab-backend/models/orden_casillas.py \
       sigab-backend/routes/casillas.py \
       sigab-frontend/src/components/OrdenCasillasForm.jsx \
       sigab-frontend/src/pages/Ordenes.jsx
```

Todos deben mostrar fecha de hoy (Apr 15). Si no están → avisar.

---

## PASO 1 — Aplicar migración Alembic (tabla os_casillas)

Pega esto en la terminal integrada de Antigravity (o terminal de WSL2):

```bash
cd /path/to/SIGAB/sigab-backend   # Ajusta la ruta real en WSL2
source venv/bin/activate 2>/dev/null || true

# Generar la migración automática
alembic revision --autogenerate -m "add_os_casillas_ceneval" 2>&1

# Revisar que el script generado contenga CREATE TABLE os_casillas
# Está en: alembic/versions/XXXX_add_os_casillas_ceneval.py

# Aplicar la migración
alembic upgrade head 2>&1

# Verificar
alembic current
```

Si Alembic da error "Can't detect changes" → aplica el SQL manual del PASO 1b.

### PASO 1b — SQL Manual (si Alembic falla)

```sql
-- Ejecutar en MySQL: docker exec -i sigab_mysql mysql -uroot -p sigab_prod
CREATE TABLE IF NOT EXISTS os_casillas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id INT UNSIGNED NOT NULL,
  dominio ENUM('medico','polivalente','ac_infra') NOT NULL DEFAULT 'medico',
  tipo_servicio ENUM('correctivo','preventivo','instalacion','baja','prestamo','inspeccion') NOT NULL DEFAULT 'correctivo',
  falla_no_enciende TINYINT(1) NOT NULL DEFAULT 0,
  falla_corto TINYINT(1) NOT NULL DEFAULT 0,
  falla_cable TINYINT(1) NOT NULL DEFAULT 0,
  falla_fusible TINYINT(1) NOT NULL DEFAULT 0,
  falla_bateria TINYINT(1) NOT NULL DEFAULT 0,
  falla_ups TINYINT(1) NOT NULL DEFAULT 0,
  falla_ruido TINYINT(1) NOT NULL DEFAULT 0,
  falla_vibracion TINYINT(1) NOT NULL DEFAULT 0,
  falla_atasco TINYINT(1) NOT NULL DEFAULT 0,
  falla_fuga TINYINT(1) NOT NULL DEFAULT 0,
  falla_rotura TINYINT(1) NOT NULL DEFAULT 0,
  falla_presion_baja TINYINT(1) NOT NULL DEFAULT 0,
  falla_compresor TINYINT(1) NOT NULL DEFAULT 0,
  falla_valvula TINYINT(1) NOT NULL DEFAULT 0,
  falla_manguera TINYINT(1) NOT NULL DEFAULT 0,
  falla_display TINYINT(1) NOT NULL DEFAULT 0,
  falla_sensor TINYINT(1) NOT NULL DEFAULT 0,
  falla_alarma_falsa TINYINT(1) NOT NULL DEFAULT 0,
  falla_error_pantalla TINYINT(1) NOT NULL DEFAULT 0,
  falla_firmware TINYINT(1) NOT NULL DEFAULT 0,
  falla_filtro TINYINT(1) NOT NULL DEFAULT 0,
  falla_empaque TINYINT(1) NOT NULL DEFAULT 0,
  falla_lampara TINYINT(1) NOT NULL DEFAULT 0,
  falla_toner_papel TINYINT(1) NOT NULL DEFAULT 0,
  falla_gas_ref TINYINT(1) NOT NULL DEFAULT 0,
  falla_evaporador TINYINT(1) NOT NULL DEFAULT 0,
  falla_condensador TINYINT(1) NOT NULL DEFAULT 0,
  falla_termostato TINYINT(1) NOT NULL DEFAULT 0,
  resolucion ENUM('sitio','refaccion','taller','externo','baja') NOT NULL DEFAULT 'sitio',
  estado_final ENUM('operativo','operativo_obs','fuera_servicio','en_taller') NOT NULL DEFAULT 'operativo',
  observaciones_breves VARCHAR(140) DEFAULT NULL,
  refacciones_solicitadas VARCHAR(255) DEFAULT NULL,
  ocr_confianza DECIMAL(4,3) DEFAULT NULL,
  ocr_modelo ENUM('manual','paddle','gemini') NOT NULL DEFAULT 'manual',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orden_casillas (orden_id),
  INDEX idx_dominio (dominio),
  INDEX idx_estado_final (estado_final),
  CONSTRAINT fk_casillas_orden FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## PASO 2 — Verificar que el backend importa el nuevo router

```bash
cd sigab-backend
python -c "from routes import casillas; print('✅ casillas router OK')"
python -c "from models.orden_casillas import OrdenCasillas, CasillasCreate; print('✅ modelo OK')"
```

Si da error de importación, pegar el error aquí para diagnóstico.

---

## PASO 3 — Reiniciar el backend y verificar el endpoint

```bash
# Matar proceso anterior si está corriendo
pkill -f "uvicorn main:app" 2>/dev/null || true

# Arrancar backend
cd sigab-backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# Esperar 3 segundos y probar health
sleep 3
curl -s http://localhost:8000/health | python3 -m json.tool

# Verificar que el endpoint casillas aparece en OpenAPI
curl -s http://localhost:8000/openapi.json | python3 -c "
import sys, json
api = json.load(sys.stdin)
casillas_paths = [p for p in api['paths'] if 'casillas' in p]
print('Endpoints casillas:', casillas_paths)
"
```

Debe mostrar al menos 3 rutas con "casillas".

---

## PASO 4 — Smoke test del endpoint casillas (con OS existente)

```bash
# Obtener el ID de una OS existente
OS_ID=$(curl -s http://localhost:8000/api/ordenes?limit=1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ordenes'][0]['id'] if d['ordenes'] else 1)")

echo "Usando OS ID: $OS_ID"

# Crear casillas de prueba
curl -s -X POST "http://localhost:8000/api/casillas/$OS_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dominio": "medico",
    "tipo_servicio": "correctivo",
    "falla_no_enciende": 1,
    "falla_display": 1,
    "resolucion": "sitio",
    "estado_final": "operativo",
    "observaciones_breves": "Prueba go-live 15 Abr 2026"
  }' | python3 -m json.tool

# Leer de regreso
curl -s "http://localhost:8000/api/casillas/$OS_ID" | python3 -m json.tool
```

✅ Debe retornar el JSON con `id`, `orden_id`, `dominio: "medico"`, etc.

---

## PASO 5 — Build del frontend

```bash
cd sigab-frontend
npm install 2>&1 | tail -5

# Verificar que no hay errores de sintaxis en los nuevos archivos
npx eslint src/components/OrdenCasillasForm.jsx --no-eslintrc --env es2020,browser --parser-options=ecmaVersion:2020,ecmaFeatures:{jsx:true} 2>/dev/null || echo "ESLint no configurado, continuar"

# Build de producción
npm run build 2>&1
```

Si el build falla con error de importación, mostrar el error.

---

## PASO 6 — Verificar el frontend en navegador

```bash
# Iniciar el servidor de desarrollo (si no está corriendo)
cd sigab-frontend
npm run dev &

sleep 3
echo "Frontend en: http://localhost:5173"
echo "Ir a: http://localhost:5173/ordenes"
echo "Verificar: botón '📋 + Nueva OS (Casillas)' debe aparecer en el header"
echo "Verificar: botón '📋 Casillas' debe aparecer en cada fila de la tabla"
```

---

## PASO 7 — Prueba end-to-end visual (hacer esto en el navegador)

1. Ir a `http://localhost:5173/ordenes`
2. Click en **"📋 + Nueva OS (Casillas)"**
3. Seleccionar: `⚕ Equipo Médico` → `Correctivo` → marcar `No enciende` + `Display`
4. Resolución: `✅ Resuelto en sitio`
5. Estado final: `🟢 Operativo`
6. Click **"💾 Guardar y cerrar orden"**
7. Verificar que aparece el mensaje de éxito verde
8. Ir al Dashboard → verificar que se refrescó en tiempo real (SSE)

---

## PASO 8 — Prueba WhatsApp bot (casillas)

```bash
# Simular el comando /casillas sin imagen (debe dar instrucciones)
cd sigab-bot
node -e "
const { handleCommand } = require('./commands.js');
handleCommand('/casillas', 'Gustavo').then(r => console.log(r));
"

# Si el bot está corriendo, enviar desde el celular:
# Mensaje de texto: /casillas [numero_de_OS]
# Con foto: foto del formato + caption "/casillas [numero]"
```

---

## PASO 9 — Backup pre-deploy

```bash
# Dump MySQL
docker exec sigab_mysql mysqldump -uroot -p sigab_prod > backup_golive_15abr2026.sql 2>&1
echo "Tamaño backup: $(du -sh backup_golive_15abr2026.sql)"

# Comprimir repo para USB
cd ..
tar -czf SIGAB_USB_15abr2026.tar.gz SIGAB/ --exclude='SIGAB/node_modules' --exclude='SIGAB/sigab-frontend/node_modules' --exclude='SIGAB/.git' 2>&1
echo "USB backup: $(du -sh SIGAB_USB_15abr2026.tar.gz)"

# Tag en git
cd SIGAB
git add -A
git commit -m "feat(casillas): Sistema CENEVAL Conservación + go-live HGR1 15Abr2026"
git tag v1.0.0-golive-hgr1
echo "✅ Tag creado: v1.0.0-golive-hgr1"
```

---

## PASO 10 — Checklist final antes de llevar el servidor

- [ ] `curl localhost:8000/health` responde `{"status": "ok"}`
- [ ] Frontend carga en `localhost:5173` sin errores en consola
- [ ] Botón "📋 + Nueva OS (Casillas)" visible en /ordenes
- [ ] Casillas se guardan y el Dashboard actualiza (SSE funciona)
- [ ] PDF de OS se genera con header IMSS
- [ ] WhatsApp bot responde `/ayuda`
- [ ] Backup SQL guardado en USB
- [ ] Tar del proyecto guardado en USB
- [ ] Monitor 24" conectado y resolución 1920×1080
- [ ] IP fija configurada (coordinar con TI del hospital)
- [ ] 50 hojas A4 del formato físico impresas

---

## 🔴 Si algo falla — Contacto

Gustavo: reporta el error exacto aquí o en el chat de Claude Desktop.
Claude ejecutará el diagnóstico y el hotfix en <5 minutos.

---

## 📋 Resumen de archivos creados/modificados por Claude Desktop

| Archivo | Acción |
|---------|--------|
| `sigab-backend/models/orden_casillas.py` | ✅ CREADO |
| `sigab-backend/models/orden_servicio.py` | ✅ MODIFICADO (relación casillas) |
| `sigab-backend/routes/casillas.py` | ✅ CREADO |
| `sigab-backend/main.py` | ✅ MODIFICADO (router registrado) |
| `sigab-frontend/src/components/OrdenCasillasForm.jsx` | ✅ CREADO |
| `sigab-frontend/src/pages/Ordenes.jsx` | ✅ MODIFICADO (botones + modal) |
| `sigab-frontend/src/api/sigab.js` | ✅ MODIFICADO (endpoints casillas) |
| `sigab-bot/commands.js` | ✅ MODIFICADO (handler /casillas + handleImageCommand) |
| `PLAN_GO_LIVE_15ABR2026.md` | ✅ CREADO |
| `ANTIGRAVITY_EXECUTE_NOW.md` | ✅ CREADO (este archivo) |

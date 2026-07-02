# Piloto HGR No.1 — Kit de herramientas

> **Lo que hay aquí:** todo lo que necesitas para hacer el levantamiento de
> los 751+ equipos del hospital esta semana, importar los nuevos a SIGAB,
> y generar las etiquetas QR la próxima semana.
>
> **Cliente:** HGR No.1 IMSS Tijuana · **Operador:** Gustavo López Carballo
> **Sponsor:** Carlos Grave (Jefe Conservación)

## Estructura

```
piloto_hgr1/
├── README.md                                  ← este archivo
├── scripts/
│   ├── descargar_751_y_armar_excel.py         ← PASO 1: bajar 751 de prod + Excel pre-llenado
│   └── batch_labels_pdf.py                    ← PASO 4: generar PDF A4 con N etiquetas QR
├── dashboard/
│   └── dashboard_levantamiento.html           ← PASO 3: dashboard manual de avance
└── backlog-endpoints/                          ← para merge en SIGAB (rama aislada)
    └── equipos_batch_endpoint.py              ← 2 endpoints nuevos: batch QR + import Excel
```

---

## PASO 1 — Bajar los 751 de prod y armar el Excel

**Cuándo:** ANTES del lunes 23 (mejor: el domingo 22 en la noche).
**Tiempo:** 2-5 minutos.
**Riesgo:** 🟢 read-only contra prod (solo GET).

### 1.1 Obtén tu token de SIGAB

En tu terminal (con internet), corre:

```bash
curl -X POST https://sigab.129-121-100-147.sslip.io/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"matricula":"ADMIN001","password":"sigah_admin_2026"}'
```

Copia el valor de `access_token` de la respuesta.

### 1.2 Corre el script

```bash
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAB/piloto_hgr1/scripts
python3 descargar_751_y_armar_excel.py --token "PEGA_TU_TOKEN_AQUI"
```

Si no tienes `openpyxl` y `reportlab` instalados:
```bash
pip install --user --break-system-packages openpyxl reportlab
```

### 1.3 Qué se genera

- `levantamiento_2026-06.xlsx` (~250KB) — 4 hojas:
  - **Instrucciones** (la primera, léeme)
  - **Levantamiento** (la activa al abrir) — 751 filas pre-llenadas
  - **Stats** — distribución por piso, estado, área, tipo
  - **Pendientes_Nuevos** — para anotar los equipos nuevos
- `equipos_backup_2026-06-23.json` — backup crudo por si algo falla
- `estado_descarga.txt` — log con timestamp

### 1.4 Qué haces con el Excel

1. Ábrelo en tu laptop o tablet.
2. Lee la hoja **Instrucciones** (5 minutos).
3. Ve a la hoja **Levantamiento**.
4. Recorre piso por piso. Solo llena:
   - `estaba_en_piso` → ✓ / ✗ / ?
   - `observaciones_campo` → notas del recorrido
   - `conciliado_sigab` → si estaba en SIGAB pero no aparece, cámbialo a NO
5. Si encuentras equipos NUEVOS, anótalos en la hoja **Pendientes_Nuevos**.

---

## PASO 2 — Recorrido del hospital (lunes 23 - viernes 27)

Sigue el calendario del plan. Tips:

- **Empieza por las áreas críticas** (UCI, Urgencias, Quirófano, Imagen).
- Lleva el Excel en la tablet o imprime solo las hojas de Levantamiento.
- Si un equipo no tiene serie legible, asigna `HGR-EC-NXX` como código interno.
- Si un equipo está en SIGAB prod pero NO aparece físicamente, **avísale a Hermes** (puede ser un traslado no documentado o un error histórico).

---

## PASO 3 — Dashboard de avance (al final de cada día)

**Cuándo:** al final de cada día del recorrido.
**Tiempo:** 2 minutos.

### 3.1 Abre el dashboard

Doble click en `dashboard/dashboard_levantamiento.html` — se abre en tu navegador.

### 3.2 Registra el día

Click en "📝 Actualizar manualmente", llena:
- Piso/área
- Cuántos visitaste
- Cuántos encontraste en SIGAB
- Cuántos NUEVOS
- Cuántos marcaste BAJA
- Cuántos FALTANTES en físico
- Notas del día

Click en "💾 Registrar día". El dashboard se actualiza.

### 3.3 Sincroniza entre laptop y tablet

- Click en "🔄 Sincronizar entre dispositivos"
- **Exportar** en este dispositivo → te descarga un JSON
- **Importar** en el otro dispositivo → sube ese JSON

Los datos se guardan en `localStorage` del navegador (no en servidor).

---

## PASO 4 — Importar equipos NUEVOS a SIGAB (cuando termines el recorrido)

**Cuándo:** el viernes 27 al final del día, o el sábado 28.
**Tiempo:** 5 minutos.
**Riesgo:** 🟡 requiere endpoint nuevo en prod (pendiente merge).

### 4.1 Opción A — vía API directa (cuando el endpoint esté en prod)

```bash
curl -X POST https://sigab.129-121-100-147.sslip.io/api/equipos/importar-excel \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d @pendientes.json
```

Donde `pendientes.json` lo exportas desde Excel con la macro o manualmente.

### 4.2 Opción B — uno por uno por la UI

Si el endpoint no está listo, usa la UI de SIGAB:
1. Login en `https://sigab.129-121-100-147.sslip.io`
2. Equipos → "+ Nuevo equipo"
3. Llena los datos de cada fila de "Pendientes_Nuevos"
4. Listo, SIGAB le asigna ID + QR automáticamente

### 4.3 Endpoint nuevo

El endpoint `POST /api/equipos/importar-excel` está en `backlog-endpoints/equipos_batch_endpoint.py`. 
**Estado:** código listo, sin merge. Pendiente:
- Revisión por ti
- Branch `feat/import-excel` 
- PR a `pulido/2026-06-16`
- Deploy a prod

---

## PASO 5 — Generar etiquetas QR para impresión (semana 30 jun - 4 jul)

**Cuándo:** el lunes 30 jun en la mañana.
**Tiempo:** 5 minutos por hoja de 21 etiquetas.
**Riesgo:** 🟢 read-only.

### 5.1 Si el endpoint nuevo está en prod

```bash
# 1 hoja con 21 etiquetas
curl -o etiquetas_p1.pdf "https://sigab.129-121-100-147.sslip.io/api/equipos/qr/labels-batch?ids=1,2,3,...,21&formato=a4" \
  -H "Authorization: Bearer TU_TOKEN"

# 1 etiqueta por página (formato A6, todas concatenadas en 1 PDF)
curl -o etiquetas_a6.pdf "https://sigab.129-121-100-147.sslip.io/api/equipos/qr/labels-batch?ids=1,2,3&formato=a6" \
  -H "Authorization: Bearer TU_TOKEN"
```

**Total:** 751 equipos / 21 por hoja = **~36 hojas A4** (~50KB cada una).

### 5.2 Si el endpoint NO está en prod (plan B)

Usa el script `scripts/batch_labels_pdf.py` que funciona local:

```bash
# 1. Exporta los equipos desde prod a un JSON
# (puedes reusar el JSON del PASO 1: equipos_backup_2026-06-23.json)
# Si necesitas uno fresco:
curl -H "Authorization: Bearer TU_TOKEN" \
  "https://sigab.129-121-100-147.sslip.io/api/equipos/?limit=1000" \
  -o /tmp/equipos.json

# 2. Genera el PDF
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAB/piloto_hgr1/scripts
python3 batch_labels_pdf.py --equipos /tmp/equipos.json --output /tmp/etiquetas.pdf
```

### 5.3 Imprimir

- **Impresora de etiquetas Zebra/Brother** (si tienes): directo, no recortar.
- **Hojas A4 con etiquetas autoadhesivas** (Avery 5163 o similar): imprime, despega, pega.
- **Impresora normal + cinta**: imprime en A4, recorta por las líneas punteadas, pega con cinta.

### 5.4 Endpoint nuevo

El endpoint `GET /api/equipos/qr/labels-batch` está en `backlog-endpoints/equipos_batch_endpoint.py`.
**Estado:** código listo, sin merge. Pendiente lo mismo que el del PASO 4.

---

## Resumen: qué necesitas que yo haga todavía

| # | Tarea | Estado | Quién |
|---|-------|--------|-------|
| 1 | Descargar 751 + Excel | ✅ Listo | Tú lo corres con tu token |
| 2 | Recorrido hospital | 📅 Esta semana | Tú |
| 3 | Dashboard manual | ✅ Listo | Tú lo abres y actualizas |
| 4 | Importar nuevos | ⏳ Endpoint en `backlog-endpoints/` | Merge + deploy pendiente |
| 5 | Generar QR | ✅ Listo (script local) / ⏳ endpoint en `backlog-endpoints/` | Tú lo corres / merge pendiente |
| 6 | Auditoría 10 equipos | 📅 Viernes 4 jul | Tú |

**El merge de los 2 endpoints (4 y 5) requiere tu OK.** Cuando me digas, los paso a una rama limpia `feat/piloto-hgr1-batch-endpoints` y los dejo listos para que Claude Code los despliegue.

---

## Contacto

Si algo falla:
- Dashboard: avísame qué muestra vs qué debería
- Excel: mándame screenshot del error
- Endpoint: avísame qué URL + qué error HTTP
- Servidor: `ssh sigab-bluehost` y ver logs

**Hermes en Telegram** (@sigahhermesbot) — el chat que estás leyendo ahora.

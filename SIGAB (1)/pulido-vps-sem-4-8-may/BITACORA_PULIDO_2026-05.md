# BITÁCORA SIGAB — Semana de pulido 4 al 8 de mayo de 2026

**Branch objetivo:** `feature/pulido-vps-sem-4-8-may` (a crear desde HEAD de `main`).
**Repo:** `djpiyama123-droid/SIGAB-Test-2`.
**VPS:** `sigab-vps` (Bluehost) — `https://sigab.129-121-100-147.sslip.io/`.
**Demo final:** viernes 8-may, en vivo a directivos.

---

## ⚠️ Aviso crítico sobre el contexto de ejecución de esta sesión

Esta ejecución (sigab-pulido-vps-sem1-arranque, programada para 5-may-2026) corrió en un **sandbox Linux desconectado del VPS de producción** y sin credenciales de push al repo. Concretamente:

| Asumido por el SKILL                                | Realidad de esta ejecución                                                               |
|-----------------------------------------------------|------------------------------------------------------------------------------------------|
| `hostname` debería decir `sigab-vps`                | `hostname` = `claude` (contenedor `fervent-practical-carson`)                            |
| Acceso SSH a la VPS para tocar `~/hostedapps`       | No hay `~/.ssh` con llaves; no hay host `sigab-vps` configurado                          |
| `git push` directo a `feature/pulido-vps-sem-4-8-may` en GitHub | No hay token/PAT cargado en el sandbox                                          |
| Reiniciar `uvicorn`/`nginx` si es necesario         | Imposible — sandbox no tiene control sobre el VPS                                        |
| `~/backups-sigab-2026-04-21/` para preservar        | No existe en este filesystem                                                             |

**Lo que sí se pudo hacer y se hizo:**
- Clonar el repo público (`git clone --depth 1`) y leer todo el código actual.
- Hacer `curl` read-only contra la URL pública (con allowlist de red del sandbox) — el sitio responde HTTP 200, frontend Vite y backend `uvicorn` están arriba.
- Auditoría estática completa del módulo `equipos`, generación del patch quirúrgico y del test de regresión, redacción de la matriz de defectos.

**Lo que el usuario debe hacer manualmente (o delegar a una sesión con SSH):**
1. Conectarse al VPS `sigab-vps`.
2. Crear la branch `feature/pulido-vps-sem-4-8-may` y aplicar los entregables que dejé en `pulido-vps-sem-4-8-may/`.
3. Correr el test, hacer el commit con el mensaje convencional y pushear.
4. Atender el hallazgo P0-01 antes del demo.

Por reglas del SKILL ("si encuentras algo inesperado, detente y reporta antes de actuar") esta ejecución se limita a **producir entregables** y **dejar este checkpoint**, no a alterar nada en remoto.

---

## Lunes 4-may — Auditoría estática end-to-end

### Tareas completadas

1. **Confirmación del contexto de ejecución.** Documentado el delta sandbox vs VPS arriba. Curl a `/`, `/docs`, `/openapi.json`, `/api/equipos/` ejecutados desde el sandbox.
2. **Mapeo del backend.** Localizado `routes/equipos.py` (660 líneas) y el modelo `models/equipo.py` (50 líneas). Entendida la cadena de auth (`get_current_user_optional`, `require_action`, `allowed_update_fields`).
3. **Lectura del schema de `equipos`.** Identificadas columnas legacy candidatas a deprecar (no se modificó nada): `vida_util_anios`, `numero_contrato`, `qr_code_path`, `fecha_instalacion`.
4. **Patch quirúrgico del bug `ubicacion`.** Adaptado al código real (el SKILL asume un `datos: Pydantic` con atributo `ubicacion_fisica` que **no existe** — el handler real usa `data: dict` y el modelo no tiene `ubicacion_fisica`). Diff generado en `01_patch_equipos_ubicacion.py.diff`. Test pytest en `02_test_equipos_ubicacion_bugfix.py`. **No aplicado al remoto** (sin acceso de push).
5. **Matriz de defectos.** Documentada en `03_matriz_defectos_lunes_4may.md` con clasificación P0/P1/P2/P3, items huérfanos por verificar live, y diagnóstico estructural de `equipos`.

### Tareas pendientes (para martes o para sesión con SSH)

- Crear la rama `feature/pulido-vps-sem-4-8-may` en el VPS y aplicar el patch + test.
- Verificar manualmente las 14 rutas de la SPA con un usuario `biomedico` real (no posible sin sesión interactiva en navegador).
- Ejecutar `pytest` en el VPS para confirmar que el patch no rompe nada.
- Atender P0-01 (ver más abajo).

### Decisiones de diseño que el usuario debe conocer

1. **Adapté la receta del patch del SKILL al código real.** La instrucción literal era:
   ```python
   if datos.ubicacion is None and (datos.area or datos.ubicacion_fisica):
       partes = [p for p in [datos.area, datos.piso, datos.ubicacion_fisica] if p]
       datos.ubicacion = " · ".join(partes)
   ```
   El handler real recibe `data: dict`, no un Pydantic, y el modelo `Equipo` no tiene `ubicacion_fisica`. La adaptación derivada (ver `01_patch_*.diff`) hace lo mismo en espíritu pero contra el `dict updates`, y añade dos casos defensivos: (a) si llega `ubicacion=""` también se cubre, (b) si no hay `area`/`piso` para derivar, se borra la clave en lugar de nullificar la ubicación previa.

2. **Decidí NO aplicar el fix también en el frontend en este commit.** La causa raíz se ataja en backend (es donde se viola la constraint). El blindaje frontend (P2-02 de la matriz) lo dejo como cambio separado para mantener commits atómicos: `style(equipos)` o `fix(equipos-frontend)` en su propio diff.

3. **No toqué `~/backups-sigab-2026-04-21/`** — no existía en este sandbox, no había nada que preservar.

### Riesgos detectados que pueden afectar el resto de la semana

- **🚨 RIESGO ALTO — P0-01 (data leak sin auth) puede manchar el demo del viernes.** Si un asistente del demo abre devtools y hace `fetch('/api/equipos/')` sin token, le sale el catálogo entero. Recomiendo abordarlo **antes** que cualquier P3 cosmético. La solución es de una sola línea (cambiar la dependencia o validar `if not user`).
- **Riesgo medio — feature freeze cerca del demo.** Si los fixes acumulan deuda en frontend (P2 múltiples), conviene priorizar P0+P1 y dejar P2/P3 para la siguiente iteración.
- **Riesgo medio — el test pytest asume fixtures (`client`, `auth_headers_admin`, `equipo_existente`).** El repo no tiene aún `sigab-backend/tests/conftest.py` visible. La rutina de continuación deberá crearlo o adaptar el test a las fixtures reales que existan.

### Pregunta para el usuario

> ¿Tapamos el P0-01 en este mismo branch `feature/pulido-vps-sem-4-8-may` (commit aparte `fix(security): require auth on GET /api/equipos`) o lo pongo en un branch propio `hotfix/equipos-auth` para mergearlo a main directo? Mi recomendación: hotfix branch separado, deploy hoy mismo, demo del viernes a salvo.

---

## Martes 5-may — P0 hotfix preparado, P1 baja/edición y mapeo de errores

### Confirmación de contexto (igual que arranque)

La rutina `sigab-pulido-vps-sem1-continuacion` corrió a las ~13:24 UTC (≈5 h después del arranque) en el **mismo sandbox sin SSH a `sigab-vps` ni credenciales de push a GitHub**. Verificado:
- `hostname` = `claude` (contenedor `friendly-upbeat-bohr`).
- `ssh sigab-vps` → "Could not resolve hostname". `ls ~/.ssh` → no existe.
- `curl https://sigab.129-121-100-147.sslip.io/` → HTTP 200. Backend y frontend siguen arriba.
- **Confirmado en vivo el P0-01:** `curl -s https://sigab.../api/equipos/` (sin token) sigue devolviendo el catálogo completo. El leak no se ha tapado.

Esta ejecución, como la del lunes, produce **entregables locales** (diffs + tests) y deja checkpoint. NO modificó nada en remoto.

### Validación adicional — los diffs aplican limpios

Antes de cerrar el día reapliqué los 4 diffs en una clone fresca de `main` (commit `10bfc43`) en orden secuencial:

```
--- 01_patch_equipos_ubicacion.py.diff ---     APPLIES_OK
--- 04_hotfix_equipos_auth.py.diff ---         APPLIES_OK
--- 06_patch_delete_equipo_409_y_put_integrity.py.diff --- APPLIES_OK
--- 08_patch_frontend_ubicacion_defense.jsx.diff --- APPLIES_OK

git diff --stat:
 sigab-backend/routes/equipos.py              | 82 ++++++++++++++++++++++++++--
 sigab-frontend/src/components/EquipoForm.jsx | 12 +++-
 2 files changed, 87 insertions(+), 7 deletions(-)
```

Los diffs ya están en formato `git format-patch` (con `From`, `Subject`, índices SHA y mensajes de commit canónicos), así que basta con `git am pulido-vps-sem-4-8-may/0X_*.diff` (preserva autoría y mensaje) o `git apply` + commit manual si se prefiere. Aplicar **en el orden 01 → 04 → 06 → 08** porque las líneas del backend cambian entre patches.

### Tareas completadas (entregables nuevos)

1. **Hotfix P0-01 — auth obligatoria en listado y catálogos**
   - Diff: `04_hotfix_equipos_auth.py.diff`. Cambia `Depends(get_current_user_optional)` → `Depends(get_current_user)` en `GET /api/equipos/`, y agrega `Depends(get_current_user)` a `GET /api/equipos/areas/catalogo` y `GET /api/equipos/zonas/catalogo` (este último también estaba sin auth — descubrimiento al revisar el archivo completo, no estaba en la matriz del lunes).
   - Test de regresión: `05_test_equipos_auth_required.py` — 6 casos: sin token (401), token mal formado (401), token válido biomedico (200), catálogo áreas sin token (401), catálogo zonas sin token (401), QR público sin token sigue 200 (regresión inversa).
   - **Decisión:** mantengo el hotfix DENTRO de la branch `feature/pulido-vps-sem-4-8-may` (commit `fix(security): require auth on listar/catalogo de equipos`) en lugar de un branch `hotfix/equipos-auth` separado, **a menos que Gustavo conteste lo contrario en la pregunta del lunes**. Razón: el demo es viernes, el hotfix se prueba con el mismo pytest suite del resto de la semana, y separar la branch añade riesgo de divergencia.

2. **P1 — Editar y dar de baja sin IntegrityError opaco**
   - Diff: `06_patch_delete_equipo_409_y_put_integrity.py.diff`.
     - `DELETE /api/equipos/{id}`: pre-flight para detectar relaciones bloqueantes (trazabilidad NOM-016, preventivos activos, reservas) → **409 Conflict** con detalle accionable y sugerencia de "estado=baja" en lugar de eliminar. Captura `IntegrityError` de respaldo. Limpia también `alertas.equipo_id` (que era huérfano antes).
     - `PUT /api/equipos/{id}`: captura `IntegrityError` y mapea a **400** con `detail` legible (P2-01). El frontend ya lee `err.response.data.detail` así que el toast queda accionable sin más cambios.
   - Test: `07_test_baja_y_edicion_p1.py` — 8 casos cubriendo:
     - Edición ubicación derivada (refuerzo del patch lunes).
     - Edición ubicación=null sin area/piso → no nullifica.
     - DELETE limpio (sin relaciones) → 200.
     - DELETE con trazabilidad → 409 con mención a "trazabilidad" y "baja".
     - DELETE con preventivo activo → 409.
     - DELETE inexistente → 404.
     - PUT con serie duplicada → 400 (no 500 opaco).
     - DELETE con rol biomedico → 403 (defensa de roles intacta).

3. **P2-02 — Defensa frontend (`EquipoForm.jsx`)**
   - Diff: `08_patch_frontend_ubicacion_defense.jsx.diff`. Antes del `Object.fromEntries`, si `ubicacion` está vacío y hay `area`/`piso`, deriva `ubicacion = "<area> · <piso>"` en el cliente. Comentario incrustado explica la dependencia con el backend (P1-01).
   - **No es bloqueante** — el backend ya cubre el caso. Es UX/limpieza.

4. **Hallazgo nuevo `[verificar live]`** — `GET /api/equipos/zonas/catalogo` también está sin auth (no estaba listado en la matriz del lunes). Ya cubierto por el diff `04`.

### Decisiones de diseño que el usuario debe conocer

1. **DELETE de equipo con trazabilidad → 409, no 500 ni soft-delete automático.** La trazabilidad es histórica y por NOM-016 no se elimina. Devolvemos un mensaje claro recomendando cambiar el estado a `baja` en lugar de eliminar físicamente. Si Gustavo prefiere implementar un soft-delete formal (columna `deleted_at`) lo dejo como Alembic separado para la próxima iteración — **no antes del demo**.

2. **`alertas.equipo_id` se nullifica al borrar.** Antes del patch, si un equipo tenía alerta huérfana el `await session.delete(equipo)` fallaría con FK violation aunque las relaciones bloqueantes no aplicaran. Ahora se limpia explícitamente en el bloque `try`.

3. **Ningún cambio de schema (Alembic) en este martes.** Todo lo de hoy es lógico/quirúrgico. Si el usuario quiere `CHECK CONSTRAINT` de enums (P3-03) o `ondelete CASCADE` por convención, es trabajo de jueves o post-demo.

4. **El test `07_*` agrega fixtures nuevas** que no existen aún en el repo: `auth_headers_jefe`, `equipo_simple`, `equipo_con_trazabilidad`, `equipo_con_preventivo_activo`, `equipo_serie_duplicada_target`. Si la rutina del miércoles no es interactiva, voy a tener que producir también un `conftest.py` mínimo. **Pendiente para próxima sesión.**

### Riesgos detectados

- **🚨 RIESGO ALTO sin cambios — el P0-01 sigue en producción.** Por reglas del SKILL no aplico nada al remoto. Cada hora que pasa con `/api/equipos/` público es exposición acumulada. Recomendación: en la próxima sesión interactiva, aplicar PRIMERO el diff `04` y desplegar.
- **Riesgo medio — el patch DELETE introduce 3 selects pre-flight.** En la práctica son `COUNT(*)` con índice, debería estar bajo 50 ms por equipo. Para el demo de viernes es invisible. Si en futuro hay flota mucho mayor, considerar materializar un flag `tiene_relaciones_bloqueantes`.
- **Riesgo medio — los tests asumen httpx async + fixtures que aún no existen.** Sin `conftest.py` real, `pytest` va a fallar con "fixture not found" en lugar de fallar por el bug. Crear el `conftest.py` mínimo es **bloqueante** para que martes-jueves valgan algo en CI.

### Pregunta concreta para el usuario (responder antes de mañana)

> **¿Cómo prefieres aplicar el bundle del martes en el VPS cuando tengas SSH?**
>
> Opción A (recomendada): un solo branch `feature/pulido-vps-sem-4-8-may` con commits separados — `fix(equipos)` para ubicacion (lunes), `fix(security): require auth on listar/catalogo` (martes A), `fix(equipos): preflight 409 on delete and 400 on PUT integrity` (martes B), `style(equipos-frontend): derive ubicacion in client` (martes C). Mergear el viernes a `main` con tag `v1.1.0-vps-pulido`.
>
> Opción B: el hotfix de seguridad en branch propio `hotfix/equipos-auth-leak` y mergear a `main` HOY mismo, dejando el resto del paquete en `feature/pulido-vps-sem-4-8-may`. Esto deja el demo del viernes a salvo aún si algo del feature branch no se termina a tiempo.
>
> Mi voto: **Opción B** dado el tiempo que el endpoint lleva expuesto. Respondeme y la próxima sesión interactiva lo ejecuta exactamente como decidas.

---

## CHECKPOINT PARA RUTINA DE CONTINUACIÓN

> **Lee esto primero, próxima rutina (miércoles 6-may o sesión interactiva con SSH).**

### Estado actual

- **Último commit en remoto del repo (`main`):** `10bfc43 feat: enable QRBatch module, fix QR label URLs to use server origin`. NI lunes NI martes empujaron nada.
- **Branch `feature/pulido-vps-sem-4-8-may`:** **NO creada todavía** en el remoto.
- **P0-01 sigue ACTIVO en producción** (verificado por curl 5-may 13:24 UTC).
- **Archivos de entregables (en `pulido-vps-sem-4-8-may/` del workspace local de Gustavo):**
  - `01_patch_equipos_ubicacion.py.diff` — patch P1-01 lunes (ubicacion).
  - `02_test_equipos_ubicacion_bugfix.py` — test P1-01.
  - `03_matriz_defectos_lunes_4may.md` — auditoría inicial.
  - **NUEVOS martes:**
  - `04_hotfix_equipos_auth.py.diff` — hotfix P0-01 + P2-04.
  - `05_test_equipos_auth_required.py` — test del hotfix.
  - `06_patch_delete_equipo_409_y_put_integrity.py.diff` — DELETE 409 / PUT 400.
  - `07_test_baja_y_edicion_p1.py` — suite P1 martes.
  - `08_patch_frontend_ubicacion_defense.jsx.diff` — defensa cliente P2-02.
  - `BITACORA_PULIDO_2026-05.md` — este archivo.

### En qué tarea exacta me quedé

**Última cosa hecha:** producir y dejar el bundle martes (5 archivos nuevos) más esta sección de checkpoint. Sin commit, sin push, sin aplicación al VPS.

**Próxima cosa pendiente** (en orden):

1. **Esperar respuesta del usuario** a la pregunta sobre Opción A vs B (ver sección "Pregunta concreta" arriba).
2. **Aplicar bundle lunes+martes en VPS** (sólo posible con SSH):
   ```bash
   ssh sigab-vps
   cd ~/hostedapps/SIGAB-Test-2
   git fetch origin && git checkout main && git pull
   git checkout -b feature/pulido-vps-sem-4-8-may   # o hotfix/equipos-auth-leak para B

   # Aplicar diffs en orden:
   git apply pulido-vps-sem-4-8-may/01_patch_equipos_ubicacion.py.diff
   git apply pulido-vps-sem-4-8-may/04_hotfix_equipos_auth.py.diff
   git apply pulido-vps-sem-4-8-may/06_patch_delete_equipo_409_y_put_integrity.py.diff
   git apply pulido-vps-sem-4-8-may/08_patch_frontend_ubicacion_defense.jsx.diff

   # Colocar tests:
   mkdir -p sigab-backend/tests
   cp pulido-vps-sem-4-8-may/02_test_equipos_ubicacion_bugfix.py sigab-backend/tests/
   cp pulido-vps-sem-4-8-may/05_test_equipos_auth_required.py sigab-backend/tests/
   cp pulido-vps-sem-4-8-may/07_test_baja_y_edicion_p1.py sigab-backend/tests/

   # Crear/extender sigab-backend/tests/conftest.py con fixtures:
   #   client, auth_headers_biomedico, auth_headers_jefe,
   #   equipo_existente, equipo_simple, equipo_con_trazabilidad,
   #   equipo_con_preventivo_activo, equipo_serie_duplicada_target
   # (esta tarea NO está en los diffs, hay que escribirla in-situ con la BD de pruebas).

   # Correr pytest, verificar 14/14 verdes.
   # Smoke en URL pública: rebuild frontend, redeploy backend.
   # Commits convencionales individuales (uno por diff aplicado).
   # Push -u origin <branch>.
   ```
3. **Miércoles 6-may — VISUAL/UX (SOLO CSS/JSX/Tailwind).** No tocar backend. Aplicar identidad SIGAB (Montserrat/Open Sans, cobalt #1B4F72, teal #2E86AB), homologar botones y modales, estados de carga, responsive 1366/768/375. Capturas antes/después en `docs/evidencia-visual/`. Si la rutina sigue sin SSH, producir los diffs CSS/JSX y un README con capturas mock.

### Qué falta para cerrar martes

- **Producir un `conftest.py` mínimo** (sigue siendo entregable pendiente; en mi siguiente sesión lo agrego como `09_conftest_minimo.py` si no me lo dan a mano).
- **Aplicar todo lo de lunes+martes en el VPS** (necesita SSH).
- **Smoke manual con usuario `biomedico` real** del flujo: edición de equipo con `ubicacion=""` + `area`/`piso` poblados → debe persistir derivado.
- **Re-curl del listado SIN token después de aplicar el hotfix** → debe retornar 401.

### Descubrimientos / contexto que la próxima sesión debe conocer

- **`/api/equipos/zonas/catalogo` también estaba sin auth.** No aparecía en la matriz del lunes. Ya cubierto por el diff `04`.
- **`alertas.equipo_id` se quedaba huérfano al borrar un equipo** — antes del patch `06`, si había alertas el DELETE explotaba con FK violation no documentada. Ya cubierto.
- **`trazabilidad`, `preventivos_programados`, `reservas`** tienen FK NOT NULL a `equipos.id` SIN `ON DELETE CASCADE`. Por eso el DELETE necesita pre-flight 409. **No conviertas estos FKs a CASCADE** sin una decisión explícita del usuario — la trazabilidad NOM-016 no debe borrarse al borrar el equipo.
- **El frontend ya lee `err.response.data.detail`** en `EquipoForm.jsx:171`. El mapeo backend `IntegrityError → 400` con detalle ya cierra el ciclo P2-01 sin más cambios de UI.
- **Sigo sin credenciales de push.** Si la próxima rutina tampoco las tiene, debe limitarse a producir entregables y avisar a Gustavo.
- **Memoria persistente actualizada** (`spaces/.../memory/sigab_scheduled_task_constraints.md`): documentado el patrón sandbox-vs-VPS por si Gustavo programa una tercera ejecución.

### Si la próxima rutina está bloqueada igual

Repetir el patrón: confirmar delta arriba, generar entregables localmente, actualizar bitácora, dejar checkpoint, avisar al usuario.

---

*Actualizado por la ejecución `sigab-pulido-vps-sem1-continuacion` del 5-may-2026 ~13:24 UTC.*

---

## CHECKPOINT INICIAL (lunes — preservado para auditoría)

> **Lee esto primero, rutina sigab-pulido-vps-sem1-continuacion.**

### Estado actual

- **Último commit en remoto del repo (`main`):** `10bfc43 feat: enable QRBatch module, fix QR label URLs to use server origin`. Esta sesión NO empujó nada.
- **Branch `feature/pulido-vps-sem-4-8-may`:** **NO creada todavía** en el remoto. La debes crear tú al arrancar.
- **Archivos de entregables generados (en la carpeta `pulido-vps-sem-4-8-may/` del workspace local del usuario):**
  - `01_patch_equipos_ubicacion.py.diff` — diff listo para `git apply`.
  - `02_test_equipos_ubicacion_bugfix.py` — pytest a colocar en `sigab-backend/tests/`.
  - `03_matriz_defectos_lunes_4may.md` — auditoría y clasificación.
  - `BITACORA_PULIDO_2026-05.md` — este archivo.

### En qué tarea exacta me quedé

**Tarea inmediata pendiente:** crear la branch en el VPS y aplicar el patch.

Pasos exactos para retomar (asumiendo que la rutina de continuación SÍ tiene acceso SSH al VPS o se ejecutará con Gustavo presente):

```bash
ssh sigab-vps
cd ~/hostedapps/SIGAB-Test-2     # ajustar ruta real al repo en el VPS
git fetch origin
git checkout main && git pull
git checkout -b feature/pulido-vps-sem-4-8-may

# Copiar/recibir los archivos desde el workspace local de Gustavo:
#   pulido-vps-sem-4-8-may/01_patch_equipos_ubicacion.py.diff
#   pulido-vps-sem-4-8-may/02_test_equipos_ubicacion_bugfix.py
#   pulido-vps-sem-4-8-may/BITACORA_PULIDO_2026-05.md
# (vía scp, vía panel del VPS, o pegando el contenido a mano).

# Aplicar el diff
git apply pulido-vps-sem-4-8-may/01_patch_equipos_ubicacion.py.diff

# Colocar el test
mkdir -p sigab-backend/tests
cp pulido-vps-sem-4-8-may/02_test_equipos_ubicacion_bugfix.py sigab-backend/tests/

# Colocar la bitácora en la raíz del repo
cp pulido-vps-sem-4-8-may/BITACORA_PULIDO_2026-05.md ./

# Si no hay conftest.py, crearlo o adaptar el test a las fixtures existentes.
cd sigab-backend && pytest tests/test_equipos_ubicacion.py -v

# Smoke manual: con un usuario biomedico real, editar un equipo dejando
# ubicacion vacío y llenando area/piso. Verificar que el PUT responde 200
# y que en la BD ubicacion = "<area> · <piso>".

# Commit y push
cd .. && git add .
git commit -m "fix(equipos): derive ubicacion from granular fields when not provided"
git push -u origin feature/pulido-vps-sem-4-8-may
```

### Qué falta para completar la tarea del lunes

1. Confirmar al usuario el plan para tapar **P0-01** (security leak en `GET /api/equipos/`). Sin esto el demo del viernes está en riesgo.
2. Hacer el smoke manual del fix `ubicacion` con usuario `biomedico`.
3. Marcar lunes como cerrado en bitácora y arrancar martes (P1-02 y campaña anti-regresiones).

### Descubrimientos / contexto que la siguiente ejecución debe conocer

- **El SKILL describe la firma del PUT como `datos.ubicacion_fisica`.** En el código real ese campo **NO existe** ni en el modelo ni en el set de campos editables. El patch fue adaptado. No reviertas la adaptación si vuelves a leer el SKILL literal.
- **El listado de equipos `/api/equipos/` está PÚBLICO** (P0-01). Si un curl externo te da datos sin token, no es un bug del sandbox: es real. Tratarlo con prioridad.
- **El frontend convierte strings vacíos a `null` antes de enviar PUT.** Eso es lo que dispara el bug de `ubicacion`. Una mejora futura (P2-02) sería que el frontend también derive `ubicacion` de `area`/`piso` antes de enviar, pero NO es bloqueante: el backend ahora lo cubre.
- **La columna `ubicacion` es `NOT NULL` por diseño en `models/equipo.py:18` (`ubicacion: str`).** No la conviertas en `Optional[str]` — eso requeriría migración Alembic y rompe consultas existentes (`Equipo.ubicacion.contains(buscar)`).
- **No hay `~/backups-sigab-2026-04-21/`** en el filesystem del sandbox; el SKILL menciona preservarlo, pero no aplica aquí. En el VPS real sí debe seguir intacto hasta el 11-may según el SKILL.
- **No tengo credenciales para `git push`.** Si la rutina de continuación tampoco las tiene, debe limitarse a preparar entregables y avisar a Gustavo igual que esta ejecución.

### Si la rutina de continuación está bloqueada igual que esta

Producir un reporte similar y avisar a Gustavo con un mensaje del estilo:

> "El plan semanal asume que estoy SSH-conectado al VPS, pero esta sesión corrió en un sandbox sin esa conexión. Dejé los entregables en `pulido-vps-sem-4-8-may/`. Para arrancar la semana real, necesito que abras una sesión interactiva (Cowork con SSH habilitado al VPS, o ejecutes los pasos del CHECKPOINT manualmente)."

---

*Generado automáticamente por la ejecución `sigab-pulido-vps-sem1-arranque` del 5-may-2026 ~08:35 UTC.*

# SIGAH — Goal `all tests pass`: baseline, diagnóstico y fix verificado

> Fecha: 2026-06-01 · Rama de los tests: `feat/sileo-toasts-hermes-context` · Backend: `sigab-backend`

## TL;DR

- **`all tests pass` hoy = suite pytest del backend** (`sigab-backend/tests/`, 5 archivos). Frontend y portal-sigah **no tienen tests**. No hay workflow de CI de tests (solo `deploy.yml`).
- La suite **requiere MySQL** (`sigah_test`), no corre en SQLite. Para el baseline levanté un MySQL desechable en Docker (`:3307`).
- **Baseline inicial: 12 passed, 1 xfailed, 11 errors.**
- **Tras mi fix de fixtures (verificado): 0 errors. Quedan 6 failures de UNA sola causa raíz.**
- Esa causa raíz (`AuditService` abre su propia sesión) es justo lo que ataca el worktree existente **`fix-tenant-tests-session`** → no lo dupliqué para no colisionar. Dejo el fix listo y el diagnóstico exacto.

---

## 1. Estado del baseline (sin tocar nada)

```
12 passed, 1 xfailed, 11 errors  (en 15.6s)
```

Los 11 errores eran `IntegrityError (1048, "Column 'tenant_id' cannot be null")` durante el **setup de fixtures**.

### Causa raíz: drift de schema multi-tenant
- Los modelos evolucionaron a **multi-tenant**: `Equipo.tenant_id` es **FK NOT NULL → `hospitales.id`** (sin default), y `Usuario.tenant_id` es NOT NULL (con `default=1`).
- El `conftest.py` se escribió **antes** de esa migración: los fixtures `_nuevo_equipo`, `_crear_usuario`, etc. no setean `tenant_id`.
- `test_tenant_isolation.py` pasaba porque crea sus propios `Hospital`+`Usuario`+`Equipo` con `tenant_id` explícito; los demás tests usan los fixtures compartidos.

---

## 2. Fix aplicado (verificado en aislamiento, sin tocar el checkout)

Modificaciones a `sigab-backend/tests/conftest.py` (patch completo en `conftest-tenant-fix.patch`):

1. Nuevo fixture `tenant` que crea un `Hospital` (campos obligatorios: `slug`, `razon_social`, `nombre_corto`) y devuelve su id.
2. `_crear_usuario(...)` y `_nuevo_equipo(...)` reciben `tenant_id` y lo asignan.
3. Los fixtures `usuario_biomedico`, `usuario_jefe`, `equipo_simple`, `equipo_existente`, `equipo_con_trazabilidad`, `equipo_con_preventivo_activo`, `equipo_serie_duplicada_target` dependen de `tenant` y propagan `tenant_id`.
4. `_bearer(...)` ahora incluye `tenant_id` en el JWT (coherencia con `get_current_tenant`).
5. Fixtures que faltaban y rompían `test_equipos_ubicacion.py`: **`usuario_admin`**, **`auth_headers_admin`** (rol `admin`, válido con edit+delete) y **`equipo_existente_con_ubicacion`**.

### Resultado tras el fix
```
17 passed, 1 xfailed, 6 failed   (0 errors)
```
→ Recuperados los 8 tests que fallaban por `tenant_id` y eliminados los 3 errores por fixtures faltantes (se convirtieron en failures de la causa raíz #3).

---

## 3. Los 6 failures restantes: UNA sola causa raíz (no es bug de producto en runtime real)

Todos ocurren en endpoints **mutadores** (`PUT`/`DELETE /api/equipos/{id}`) que escriben auditoría NOM-016.

**Origen:** `services/audit_service.py::AuditService.log_event(...)` se invoca **sin pasar `session`**, por lo que abre su **propia** sesión con `async_session_maker` (`AsyncSessionLocal`). En los tests, el fixture `client` sobreescribe `get_async_session` con una sesión **transaccional con rollback** (datos *flushed* pero **no commiteados**). La sesión nueva del audit:
- no ve el `Usuario`/`Equipo` no commiteado → **FK 1452** (`log_auditoria_nom016.usuario_id → usuarios.id`, `Cannot add or update a child row`).
- vive en **otro event loop** → `"Task ... attached to a different loop"` (HTTP 500).

Síntomas exactos:
| Test | Síntoma |
|------|---------|
| `test_put_ubicacion_vacia_se_deriva_de_area_y_piso` | FK fail `log_auditoria_nom016.usuario_id` → 400 |
| `test_put_ubicacion_null_sin_area_ni_piso_no_nullifica` | `Task attached to a different loop` → 500 |
| `test_delete_equipo_sin_relaciones_ok` | FK 1452 al borrar → 409 |
| `test_put_equipo_ubicacion_none_se_deriva_de_area_y_piso` | mismo (loop) |
| `test_put_equipo_ubicacion_none_y_sin_area_piso_preserva_actual` | mismo (FK) |
| `test_put_equipo_ubicacion_explicita_se_respeta` | 500 (loop) |

> Nota: en producción real esto **no falla** porque los datos sí están commiteados; es una incompatibilidad entre la estrategia transaccional del harness y que el audit abra su propia conexión.

### Fix recomendado para llegar a verde total (elegir UNO)
- **Opción A (producto, preferida y más correcta para atomicidad NOM-016):** pasar `session=session` a `AuditService.log_event(...)` en TODAS las llamadas de los routers mutadores (equipos PUT/DELETE y demás). Hace la auditoría atómica con la mutación y elimina la conexión/loop paralelos. Verificar que `_execute_log` no haga `commit()` propio cuando recibe sesión externa (usar `flush()` y dejar el commit al request).
- **Opción B (solo test):** en `conftest.py`, monkeypatchear `services.audit_service.AsyncSessionLocal` (y cualquier `async_session_maker` directo) para que use una factory ligada a la **misma conexión** del test, en el **mismo loop**. Más frágil.

**Recomendación:** Opción A, **coordinada con el worktree `fix-tenant-tests-session`** que ya trabaja esta área (hay cambios sin commitear en `conftest.py` y `test_tenant_isolation.py`). Evitar editar el checkout compartido en paralelo.

---

## 4. Cómo reproducir el baseline (MySQL desechable)

```bash
# Levantar MySQL de pruebas aislado
docker run -d --name sigah-test-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpw -e MYSQL_DATABASE=sigah_test \
  -e MYSQL_USER=sigah -e MYSQL_PASSWORD=sigah -p 3307:3306 \
  mysql:8.0 --default-authentication-plugin=mysql_native_password
docker exec sigah-test-mysql mysql -uroot -prootpw \
  -e "GRANT ALL ON sigah_test.* TO 'sigah'@'%'; FLUSH PRIVILEGES;"

# Correr la suite
cd sigab-backend
SIGAH_TEST_DATABASE_URL="mysql+asyncmy://sigah:sigah@127.0.0.1:3307/sigah_test" \
SIGAH_SSL_DISABLED=true \
venv/bin/python -m pytest tests/ -q
```

## 5. Recomendaciones de proceso para el goal
1. Aplicar `conftest-tenant-fix.patch` en la rama correcta (coordinar con `fix-tenant-tests-session`).
2. Aplicar Opción A al audit → verde total.
3. Añadir **workflow de CI** (`.github/workflows/tests.yml`) que levante MySQL service y corra pytest en cada PR — hoy no existe y por eso el drift pasó inadvertido.
4. A futuro: tests para la nueva capa de proveedor IA MiniMax (ver doc 05) con mocks, sin requerir API key.

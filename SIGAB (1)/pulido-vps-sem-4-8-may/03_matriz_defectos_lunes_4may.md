# Matriz de defectos — Auditoría estática lunes 4-may-2026

**Alcance:** rama `main` del repo `djpiyama123-droid/SIGAB-Test-2`, commit HEAD `10bfc43` (clonado depth=1).
**Modo:** auditoría estática del código fuente + smoke read-only de la URL pública. **No** se ejecutó la UI en navegador desde esta sesión (sandbox sin acceso interactivo a la SPA autenticada). Los items marcados `[verificar live]` requieren validación manual en sesión con Gustavo.

---

## P0 — Bloqueante crítico de seguridad (descubrimiento incidental)

### P0-01 Listado de equipos accesible sin autenticación
- **Endpoint:** `GET /api/equipos/` (`sigab-backend/routes/equipos.py:302`).
- **Causa:** la dependencia es `Depends(get_current_user_optional)`, que retorna `None` cuando no hay header `Authorization`. La ruta no comprueba `if user is None` y ejecuta el query igual.
- **Evidencia (HTTP, 5-may-2026 08:35 UTC):**
  ```
  $ curl -s https://sigab.129-121-100-147.sslip.io/api/equipos/
  HTTP/2 200
  {"equipos":[{"marca":"SOL-BAT", ... "qr_token":"0bdb867b34a5f9d8", ... }, ...]}
  ```
  Se obtuvieron **datos sensibles de equipos médicos** (serie, inventario, marca, modelo, área, piso, fotos, qr_token) sin presentar credencial alguna.
- **Impacto:** fuga de inventario completo del HGR No. 1; los `qr_token` permiten construir URLs públicas a la vista de equipo (`/equipo/<token>`) sin pasar por login.
- **Severidad:** P0 — debe taparse antes del demo del viernes 8.
- **Fix sugerido:** cambiar la dependencia por `get_current_user` (estricta) o, si se necesita un modo público, validar `if not user` y devolver una proyección sin campos confidenciales (`CAMPOS_CONFIDENCIALES` ya está definido en `auth/permissions.py`).

> **Nota:** este hallazgo NO estaba en el plan del lunes; surgió al smoke-testear los endpoints. Se reporta y NO se explota más allá de la verificación mínima.

---

## P1 — Bloqueantes funcionales

### P1-01 IntegrityError al editar equipo si `ubicacion` queda vacío
- **Endpoint:** `PUT /api/equipos/{id}` (`routes/equipos.py:484`).
- **Causa raíz (cadena completa):**
  1. `models/equipo.py:18` declara `ubicacion: str` → columna `NOT NULL` en MySQL.
  2. `EquipoForm.jsx:142-144` convierte string vacío a `null` antes del PUT:
     ```js
     const payload = Object.fromEntries(
       Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
     );
     ```
  3. `routes/equipos.py:496` filtra por keys (`k in campos_permitidos`) pero **no** filtra valores `None`. `ubicacion` está en `CAMPOS_BIOMEDICO_EDITABLES` y `CAMPOS_EDITABLES_TODOS`, así que pasa el filtro.
  4. `setattr(equipo, "ubicacion", None)` → `session.commit()` → `1048: Column 'ubicacion' cannot be null`.
- **SQL de la traza (provista por usuario):**
  ```
  UPDATE equipos SET ubicacion=%s, estado=%s, fecha_ultimo_mantenimiento=%s
  WHERE equipos.id=%s    -- (None,'en_mantenimiento','2026-02-23',422)
  ```
- **Patch quirúrgico:** ver `01_patch_equipos_ubicacion.py.diff` (preparado, NO aplicado al remoto). La adaptación frente a la receta del SKILL fue necesaria porque:
  - El handler usa `data: dict`, no un Pydantic `datos` con atributos.
  - El modelo no expone `ubicacion_fisica`; se derivan partes de `area` y `piso`.
  - Se contempla el caso `ubicacion=None` sin `area`/`piso` para no nullificar la ubicación existente.
- **Test de regresión:** `02_test_equipos_ubicacion_bugfix.py`.

### P1-02 Posibles handlers asíncronos sin manejo de error en frontend `[verificar live]`
- **Síntoma:** múltiples páginas (`Ordenes.jsx`, `Copilot.jsx`, `QRBatch.jsx`) tienen 6-13 botones cada una con varios `toast.error` pero la auditoría estática no garantiza que cada `catch` capture el error y restaure el estado del botón.
- **Acción para martes:** mapear cada `onClick` async con `try/finally` que reinicie el spinner/disabled.
- Pendiente de validación interactiva.

---

## P2 — Funcional pero deficiente

### P2-01 `EquipoForm.jsx` — feedback ambiguo en errores 5xx del backend
- En `routes/equipos.py:516` cualquier excepción se traduce a `500 — Error al actualizar: <repr>`. El frontend muestra un toast genérico ("Error al guardar"). El usuario nunca verá el `IntegrityError` real.
- **Mitigación:** en backend, mapear `IntegrityError` → 400 con detalle accionable; en frontend, leer `err.response.data.detail` y mostrarlo.

### P2-02 `EquipoForm.jsx` — defensa client-side faltante para el bug P1-01
- Una vez aplicado el fix backend, conviene también blindar el frontend para que **no envíe `ubicacion: null`** cuando hay `area`/`piso`. Se evitan round-trips innecesarios.
- **Cambio sugerido (no aplicado):**
  ```js
  // antes del Object.fromEntries
  if (!form.ubicacion?.trim() && (form.area || form.piso)) {
    form.ubicacion = [form.area, form.piso].filter(Boolean).join(' · ');
  }
  ```

### P2-03 `Ordenes.jsx` y `Copilot.jsx` — alta densidad de botones (13 y 12)
- Posibles confusiones de UX por densidad. Marcar para QA con Gustavo: ¿algún botón duplica acción? ¿algún CTA secundario debería estar en menú overflow?

### P2-04 Catálogo `/api/equipos/areas/catalogo` también sin auth
- **Endpoint:** `GET /api/equipos/areas/catalogo` (`routes/equipos.py:88`). No hay `Depends` de auth en absoluto.
- **Severidad:** P2 (datos menos sensibles, pero igualmente no debería exponer la lista distinta de áreas/pisos sin login).

---

## P3 — Cosmético

### P3-01 Header del título — dos archivos `README` duplicados
- `README.md` y `README_INSTALACION.md` se solapan en alcance. Consolidar.

### P3-02 Carpeta `scratch/` y `antigravity_skills/` versionadas
- Ruido en el repo. Mover a `.gitignore` o a `docs/internal/`.

### P3-03 Iconografía estado/criticidad — inconsistencia heredada
- `models/equipo.py` define `estado: str` libre y `criticidad: str` libre. UI asume `operativo|en_mantenimiento|baja` y `media|alta|baja`. Sin enum a nivel DB no hay garantía. **`[verificar live]`** y considerar `CHECK CONSTRAINT` en migración futura (no aplicar antes del demo).

---

## Botones huérfanos (estática)

No se detectó ningún `onClick` con cuerpo vacío o `() => {}` en el grep grueso. **`[verificar live]`** martes — pendiente recorrer 14 rutas con la SPA real:

| Página            | Buttons | Toast.err | Verif. live pendiente |
|-------------------|---------|-----------|------------------------|
| Alertas           | 3       | 3         | sí                     |
| Almacén           | 5       | 1         | sí                     |
| Analítica         | 1       | 1         | sí                     |
| AuditPage         | 2       | 4         | sí                     |
| Capacitaciones    | 1       | 1         | sí                     |
| ChecklistPage     | 3       | 4         | sí                     |
| Copilot           | 12      | 4         | sí (densidad)          |
| Dashboard         | 3       | 0         | sí                     |
| Equipos           | 5       | 1         | sí                     |
| Metrología        | 2       | 1         | sí                     |
| Órdenes           | 13      | 6         | sí (densidad)          |
| Preventivos       | 2       | 2         | sí                     |
| QRBatch           | 7       | 2         | sí                     |
| QRScanner         | 4       | 0         | sí                     |
| Reportes          | 1       | 1         | sí                     |
| Tecnovigilancia   | 3       | 1         | sí                     |
| Trazabilidad      | 0       | 1         | sí                     |
| TVDashboard       | 0       | 0         | público                |
| EquipoPublico     | 0       | 0         | público (vía QR)       |
| Login             | 1       | 0         | sí                     |

---

## Diagnóstico estructural — `equipos` (1 de 15 tablas)

`models/equipo.py` versión actual:

| Campo                          | Tipo en SQLModel                | Nullable | Origen UI         | Comentario                                |
|--------------------------------|---------------------------------|----------|-------------------|-------------------------------------------|
| id                             | INTEGER unsigned, PK auto       | no       | -                 | OK                                        |
| serie                          | str (unique, index)             | no       | EquipoForm        | OK                                        |
| inventario                     | str?                            | sí       | EquipoForm        | OK (legacy `Clave` migrado)               |
| nombre                         | str                             | no       | EquipoForm        | OK                                        |
| marca                          | str                             | no       | EquipoForm        | OK                                        |
| modelo                         | str                             | no       | EquipoForm        | OK                                        |
| **ubicacion**                  | **str (NOT NULL)**              | **no**   | EquipoForm        | ⚠️ origen del bug P1-01                   |
| piso                           | str?                            | sí       | EquipoForm        | OK                                        |
| area                           | str?                            | sí       | EquipoForm        | OK                                        |
| fotos                          | str? (json string)              | sí       | upload aparte     | revisar serialización (`[verificar live]`)|
| estado                         | str (default `operativo`)       | no       | EquipoForm        | sin enum DB (P3-03)                       |
| criticidad                     | str (default `media`)           | no       | EquipoForm        | sin enum DB (P3-03)                       |
| fecha_instalacion              | date?                           | sí       | -                 | sólo migración legacy                      |
| fecha_ultimo_mantenimiento     | date?                           | sí       | EquipoForm        | OK                                        |
| fecha_proximo_mantenimiento    | date?                           | sí       | EquipoForm        | OK                                        |
| vida_util_anios                | int?                            | sí       | -                 | UI no lo expone — **legacy candidato**    |
| numero_contrato                | str?                            | sí       | -                 | UI muestra `numero_contrato_servicio`; `numero_contrato` parece duplicado/legacy |
| proveedor_servicio             | str?                            | sí       | EquipoForm        | OK                                        |
| qr_code_path                   | str?                            | sí       | -                 | El QR ahora se genera on-the-fly por `qr_token`; **legacy candidato** |
| created_at                     | datetime, NOT NULL              | no       | -                 | OK                                        |
| updated_at                     | datetime, NOT NULL              | no       | -                 | OK                                        |
| zona_id                        | int? (FK zonas_mapa)            | sí       | EquipoForm/mapa   | OK                                        |
| pos_x, pos_y                   | float (default 50.0)            | no       | mapa interactivo  | OK                                        |
| imagen_url                     | str?                            | sí       | upload aparte     | OK                                        |
| tipo_equipo                    | str (default `otro`)            | no       | EquipoForm        | OK                                        |
| clase_cofepris                 | str (default `II`)              | no       | EquipoForm        | OK                                        |
| fecha_compra                   | date?                           | sí       | EquipoForm        | OK                                        |
| numero_contrato_servicio       | str?                            | sí       | EquipoForm        | OK                                        |
| qr_token                       | str? (index)                    | sí       | server-generated  | OK                                        |

**Columnas legacy candidatas a deprecar (no acción inmediata):** `vida_util_anios`, `numero_contrato`, `qr_code_path`, `fecha_instalacion`. Se proponen para revisión mártes/miércoles, NO antes del demo.

---

## Items que requieren ejecución en VPS o en sesión asistida

Estos no se pudieron completar desde el sandbox por falta de SSH a `sigab-vps` y de credenciales de push a GitHub:

1. `git checkout -b feature/pulido-vps-sem-4-8-may` desde `main`.
2. Aplicar `01_patch_equipos_ubicacion.py.diff` con `git apply`.
3. Colocar `02_test_equipos_ubicacion_bugfix.py` en `sigab-backend/tests/`.
4. Ejecutar `pytest sigab-backend/tests/test_equipos_ubicacion.py` (debe pasar tras patch).
5. Smoke manual en URL pública con un usuario `biomedico` real.
6. Commit: `fix(equipos): derive ubicacion from granular fields when not provided`.
7. `git push origin feature/pulido-vps-sem-4-8-may`.
8. Decidir cómo cerrar el P0-01 antes de ampliar la rama.

Todos los archivos preparados están en `pulido-vps-sem-4-8-may/`.

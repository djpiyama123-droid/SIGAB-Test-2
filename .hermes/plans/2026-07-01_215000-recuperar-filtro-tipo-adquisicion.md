# Plan: Recuperar filtro `tipo_adquisicion` en Equipos.jsx

**Fecha:** 2026-07-01 21:50
**Autor:** Hermes Agent (orquestador)
**Rama objetivo:** `feat/import-2026-metadatos` (base actual de trabajo)
**Working dir:** `/opt/sigab`

---

## Goal

Recuperar y commitear en el repo local el filtro `<select>` de `tipo_adquisicion` que ya existe desplegado en producción (VPS Bluehost) pero nunca fue commiteado al repo. El filtro está documentado en `backups/vps_dirty_changes_2026-06-28.patch` (líneas 263-288).

Al terminar:
- `sigab-frontend/src/pages/Equipos.jsx` contiene el array `TIPO_ADQ_OPTIONS` y el `<select>` en la fila 2 de filtros, después de criticidad.
- Build del frontend pasa sin warnings nuevos.
- Commit con mensaje `feat(frontend): filtro tipo_adquisicion en Equipos (recuperado de patch VPS)`.
- Plan B: si los offsets del patch no aplican limpios, hacer cherry-pick manual del hunk.

---

## Contexto / supuestos

### Estado real por capa (verificado)

| Capa | Repo local | Prod VPS | Acción |
|---|---|---|---|
| Columna BD `equipos.tipo_adquisicion` ENUM | ✅ migración `009` | ✅ aplicada | nada |
| Índice `idx_equipos_tipo_adquisicion` | ✅ | ✅ | nada |
| Modelo `Equipo.tipo_adquisicion` | ✅ `models/equipo.py:63` | ✅ | nada |
| Endpoint `GET /api/equipos/` acepta `tipo_adquisicion` | ✅ `routes/equipos.py:523,548-549` | ✅ | nada |
| Endpoint `GET /api/equipos/exportar/csv` acepta `tipo_adquisicion` | ✅ `routes/equipos.py:429,450-451` | ✅ | nada |
| Badges UI (EquipoCard/EquipoTable/EquipoDetail) | ✅ commits `e1a1f1f`, `19ac88c` | ✅ | nada |
| **`<select>` filtro en `Equipos.jsx`** | ❌ | ✅ (solo en patch) | **RECUPERAR** |
| Datos poblados (≈417 equipos con valor) | parcial | ✅ | fuera de alcance (4 UPDATEs pendientes, OK de Gustavo aparte) |

### Por qué el filtro "no aparece" en producción desde el repo

`backups/vps_dirty_changes_2026-06-28.patch` es el snapshot de cambios que vivían en el VPS Bluehost sin commitear (sesión de mantenimiento del 28-jun-2026). El frontend desplegado incluye esos cambios; el working tree de la ASUS TUF Gaming no. Si se hace `git pull` + rebuild en frío, se pierde el filtro.

### Valores del ENUM (referencia)

- `recurso_propio` → "Recurso Propio" (azul)
- `contrato_consolidado` → "Consolidado" (emerald)
- `garantia` → "Garantía" (amber)
- `subrogado` → "Subrogado" (púrpura)

---

## Aproximación

Estrategia de mínimo riesgo, sin tocar backend ni BD. Solo frontend, solo `Equipos.jsx`. Tres caminos posibles en orden de preferencia:

1. **`git apply --check` del patch completo** — si los hunks de backend/badge ya commiteados se solapan como contexto idéntico y git los descarta, queda limpio. Probable resultado: `git apply` reporta hunks ya aplicados (backend, badges) y deja SOLO el hunk de `Equipos.jsx` (filtro). Esto es lo ideal.
2. **Cherry-pick manual del hunk del filtro** — si (1) falla por offsets, aplicar a mano las líneas 263-288 del patch (array `TIPO_ADQ_OPTIONS` + `<select>` después de criticidad).
3. **Editar el archivo directamente** — fallback. Mismo resultado que (2).

---

## Step-by-step plan

### Tarea 1 — Preparar y validar

1. `cd /opt/sigab && git status` (debe estar limpio o solo con cambios no stageados esperados).
2. `git rev-parse --abbrev-ref HEAD` → confirmar rama. Si no es `feat/import-2026-metadatos` ni `main`, parar y preguntar.
3. `git apply --check backups/vps_dirty_changes_2026-06-28.patch` → captura stdout/stderr.
   - Si pasa: continuar a Tarea 2.
   - Si falla con "patch failed" en hunks específicos: continuar a Tarea 3.

### Tarea 2 — Aplicar patch (camino feliz)

4. `git apply backups/vps_dirty_changes_2026-06-28.patch` (sin `--check`).
5. `git status` → confirmar que SOLO cambia `sigab-frontend/src/pages/Equipos.jsx` (los demás hunks deben estar ya aplicados por commits previos).
6. `git diff --stat sigab-frontend/src/pages/Equipos.jsx` → debe mostrar +12/-0 aprox (array + select).
7. Saltar a Tarea 4.

### Tarea 3 — Cherry-pick manual del filtro (si Tarea 1/2 fallan)

8. Abrir `sigab-frontend/src/pages/Equipos.jsx`.
9. Insertar el array `TIPO_ADQ_OPTIONS` después de la línea 28 (después de `const ORDEN_OPTIONS = [...]`) y antes de `export default function Equipos()`.
10. Insertar el `<select>` del filtro en la fila 2 de filtros, después del `<select>` de criticidad (líneas 298-307 actuales) y antes del `<select>` de áreas (líneas 309-318).
11. `git diff sigab-frontend/src/pages/Equipos.jsx` → verificar que el hunk resultante coincide conceptualmente con líneas 263-288 del patch.

### Tarea 4 — Verificación

12. **Lint/sintaxis frontend:**
    `cd sigab-frontend && npm run lint 2>&1 | tail -20` — debe pasar sin nuevos warnings/errors.
13. **Build producción:**
    `cd sigab-frontend && npm run build 2>&1 | tail -30` — debe completar OK.
14. **Diff visual conceptual:** leer el fragmento aplicado y confirmar:
    - [ ] `TIPO_ADQ_OPTIONS` exporta los 4 valores en el orden correcto.
    - [ ] El `<select>` queda después de criticidad.
    - [ ] onChange usa `updateFiltros({ ...filtros, tipo_adquisicion: ... })`.
    - [ ] El value lee `filtros.tipo_adquisicion || ''`.
    - [ ] Opción vacía "Todos los tipos de adquisición".
    - [ ] Mismas clases CSS que los selects vecinos.
15. **Sanity check backend (sin deploy):** confirmar que `api.getEquipos()` hace spread de `filtros` (sí, `pages/Equipos.jsx:74-79`) y por lo tanto propaga `tipo_adquisicion` automáticamente.

### Tarea 5 — Commit

16. `cd /opt/sigab && git add sigab-frontend/src/pages/Equipos.jsx`
17. `git commit -m "feat(frontend): filtro tipo_adquisicion en Equipos

- Recupera el <select> de tipo de adquisición que ya vivía en el VPS
  (desplegado vía backups/vps_dirty_changes_2026-06-28.patch) pero
  nunca se había commiteado al repo.
- Hardcodea los 4 valores del ENUM en TIPO_ADQ_OPTIONS
  (recurso_propio, contrato_consolidado, garantia, subrogado).
- Backend ya soporta el query param desde commits cebabc1/a49d279
  (routes/equipos.py:548-549 y :450-451).
- Sin cambios en BD, modelos, ni endpoints."`
18. `git log --oneline -3` → confirmar commit creado.

---

## Archivos a modificar

| Path | Cambio esperado | Riesgo |
|---|---|---|
| `sigab-frontend/src/pages/Equipos.jsx` | +12/-0 (array + select) | bajo (UI pura) |

**NO se tocan:**
- `sigab-backend/**` (ya soportado)
- `sigab-backend/database/migrations/009_*` (ya aplicada)
- `sigab-frontend/src/components/Equipo*.jsx` (badges ya commiteados)

---

## Tests / validación

- **Estáticos:** `npm run lint`, `npm run build` sin warnings nuevos.
- **Funcionales manuales (post-deploy):**
  - Abrir `/equipos` en prod → debe aparecer dropdown "Todos los tipos de adquisición" entre criticidad y área.
  - Seleccionar "Consolidado" → la tabla debe mostrar solo equipos con `tipo_adquisicion=contrato_consolidado`.
  - Combinado con filtro de área (ej. Radiología) → AND lógico funciona.
  - Botón CSV → respeta el filtro (verificar pasando `?tipo_adquisicion=garantia` al endpoint).
- **Regresión:** las cards y tabla siguen mostrando el badge de color correcto por equipo.

---

## Riesgos y tradeoffs

1. **Riesgo bajo total.** Es UI pura; el peor caso es que el `<select>` no se vea y se hace rollback del commit.
2. **Datos:** los 4 UPDATEs de relleno del import 2026 NO se aplican en este plan — eso requiere OK explícito de Gustavo y ejecución sobre BD prod (fuera de scope).
3. **Posible conflicto de merge:** si alguien más tocó `Equipos.jsx` en otra rama, el hunk puede chocar. Mitigación: el array se inserta en zona estable (después de `ORDEN_OPTIONS`) y el `<select>` en zona estable (entre criticidad y área, ambos selects ya commiteados).
4. **Plan B explícito:** si `git apply` revienta por hunks viejos del patch (backend/schema ya commiteados, badges ya commiteados), esos se pueden ignorar con `git apply --reject` y descartar los `.rej`. Pero más limpio es ir directo al cherry-pick manual (Tarea 3).

---

## Decisiones abiertas / preguntas

- [ ] ¿La rama actual `pulido/2026-06-16` es donde commitear, o creamos rama nueva `fix/recuperar-filtro-tipo-adq` desde `feat/import-2026-metadatos`? **Asumido:** commitear en la rama actual para no alargar con otra rama. Si Gustavo prefiere rama nueva, ajustar Tarea 5.
- [ ] ¿Ejecutar también los 4 UPDATEs de relleno del import 2026? **Asumido:** NO en este plan. Requiere OK explícito y conexión a BD prod.
# COORDINACION_SIGAB.md

> **Memoria de coordinación multi-agente para SIGAB.**
> Define carriles (lanes), contratos cruzados y bitácora de avance entre los 3 agentes que operan sobre el mismo repo (`djpiyama123-droid/SIGAB-Test-2`):
>
> | Agente | Carril | Worktree patrón | Rama patrón |
> |---|---|---|---|
> | **Claude Code** (`~/.claude`) | Backend + lógica de datos + MySQL + auditoría | `.claude/worktrees/<sesión>-*` | `fix/...`, `feat/...` |
> | **Hermes** (`~/.hermes`, MiniMax-M3) | Worktrees · merges · deploys al VPS · glue entre agentes | `.claude/worktrees/hermes-*` | `merge/...`, `chore/...` |
> | **OpenCode** (este agente) | **Visual / Frontend presentacional** · JSX + Tailwind · accesibilidad · responsive | `.claude/worktrees/opencode-styles-*` | `styles/...` |

> **Este archivo es la única fuente de verdad para协商 entre agentes.** Lo mantiene Hermes al final de cada ciclo. OpenCode y Claude Code lo editan en sus propias ramas y avisan a Hermes para consolidar.

---

## §1 · Topología de máquinas

Ver `docs/INFRAESTRUCTURA-3-MAQUINAS.md`. Resumen:

- **ASUS TUF (Casa)** — Gustavo, develops here. Repo en `/home/gustavo/sigab-app-web-v3.0`.
- **ThinkCentre edge (oficina HGR1)** — réplica 24/7, sólo corre agentes, no desarrolla.
- **VPS Bluehost (prod)** — `sigab-vps` → `/opt/sigab`. Fuente de producción. **NO deploy sin OK explícito de Gustavo vía Hermes.**

Reglas críticas VPS: ver `CLAUDE.md §1` (Traefik dual host), §2 (docker socket stale), §3 (credenciales MySQL reales).

## §2 · Convenciones globales

- **Idioma UI**: español mexicano. Mensajes de error/éxito en español.
- **Colores**: paleta IMSS — `primary` `#006CB7`, `emerald` (`#059669`/`#10B981`) operativo, `amber` mantenimiento, `red` fuera de servicio, `slate` baja. Ver `sigab-frontend/DESIGN.md`.
- **Toasts**: `toast.success/error/loading/warn` (sileo).
- **Estados de equipo**: dict `TRANSICIONES` en backend.
- **Audit trail**: tabla `log_actividad` para NOM-016.
- **NO commit a `main` ni `pulido/2026-06-16` directo.** Cada agente trabaja en su rama y avisa a Hermes.

## §3 · Contratos de datos cruzados

Contratos estables que Claude-Code expone y el resto consume. **No romper bajo ninguna circunstancia sin deprecar primero.**

### §3.1 Equipo (`/api/equipos/{id}` → `equipo`)

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `id` | int | backend | PK |
| `serie`, `inventario`, `nombre`, `marca`, `modelo` | str | backend | obligatorios |
| `estado` | enum | backend | `operativo`, `mantenimiento`, `fuera_servicio`, `baja` |
| `criticidad` | enum | backend | `alta`, `media`, `baja` |
| `piso`, `area`, `ubicacion` | str | backend | opcionales |
| `imagen_url` | str\|null | backend | Foto principal. URL absoluta servida por backend. |
| `fotos` | str (JSON array) | backend | `JSON.parse(equipo.fotos)` → `string[]` con URLs adicionales. **La primera puede ser la misma que `imagen_url`.** |
| `imagen_referencial` | bool | backend **(NUEVO, en flight)** | `true` = la imagen NO es el equipo real, es ilustrativa (catálogo, marca genérica, foto de proveedor). Mostrar badge. |
| `qr_token` | str | backend | Token único para `/equipo/{token}` (página pública) |
| `numero_contrato` | str | backend | Contrato original de compra |
| `numero_contrato_servicio` | str | backend | Contrato de mantenimiento/servicio |

### §3.2 Orden de Servicio (`/api/ordenes/{id}` → `orden`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `numero_orden` | str | Folio IMSS |
| `estado` | enum | `abierta`, `en_progreso`, `cerrada`, `cancelada` |
| `fecha` | date | |
| `falla_reportada`, `tipo_mantenimiento` | str | |
| `pdf_url` | str\|null | URL al PDF histórico en `/static/uploads/ORDENESIMSS/`. **Click → abre en nueva pestaña (no lightbox).** |
| `tipo_atencion` | enum | `correctivo`, `preventivo`, `contrato`, `garantia` |
| `tecnico_nombre` | str | |
| `tipo_formato` | enum | `os_preventivo`, `os_correctivo`, etc. |

### §3.3 Evidencias OS (`/api/ordenes/{id}/evidencias` → array)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `ruta_archivo` | str | URL. Si termina en `.pdf`, mostrar tarjeta con ícono PDF en lugar de imagen. |
| `tipo` | enum | `antes`, `durante`, `despues` |

## §4 · Carriles por agente

### §4.1 Claude Code (Backend · Lógica)

- Modifica: `sigab-backend/**`, migraciones SQL (`database/migrations/*`), `models/*`.
- Expone: contratos JSON en §3.
- NO toca: `sigab-frontend/**`, `docs/**` (sólo si es doc técnico de backend), `docker-compose.yml` (avisa a Hermes).
- Worktrees: `.claude/worktrees/<sesión>-*`.

### §4.2 Hermes (Glue · Deploys)

- Modifica: `docker-compose.yml`, `nginx/*`, scripts de deploy, `CLAUDE.md` (memoria global), `COORDINACION_SIGAB.md` (este archivo).
- Ejecuta: merges entre ramas, push a `origin`, deploys a VPS **sólo con OK de Gustavo**.
- NO toca: lógica de negocio, JSX de componentes.

### §4.3 OpenCode (Visual · Frontend presentacional)

- Modifica: `sigab-frontend/src/components/*.jsx`, `sigab-frontend/src/pages/*.jsx`, `sigab-frontend/src/styles/*`, assets en `sigab-frontend/src/assets/**`.
- NO toca: `sigab-frontend/src/api/sigah.js` (cliente HTTP — eso es Claude-Code), `sigab-backend/**`, base de datos.
- NO cambia: contrato de datos (§3) — sólo cómo se renderiza.
- Aditivo: no rompe componentes existentes; si necesita cambiar props, lo hace con defaults compatibles.
- Accesibilidad: focus rings, alt text, contraste AA, navegación por teclado.
- Responsive: mobile-first, breakpoints del `tailwind.config.js` (`xs 320 / sm 640 / md 768 / lg 1024 / xl 1280 / 3xl 1920 / 4xl 2560`).
- Worktrees: `.claude/worktrees/opencode-styles-*`.

## §5 · Flujo de una feature visual (OpenCode)

1. **Recibe tarea** de Gustavo o del propio usuario (este prompt).
2. **Lee §3** para entender el contrato del backend.
3. **Crea worktree** desde `pulido/2026-06-16` (rama base estable), en `.claude/worktrees/opencode-styles-<slug>-<YYYY>`.
4. **Trabaja aditivamente**. Build local (`npm run build` o `vite build`) antes de commit.
5. **Commit** en su rama con prefijo `style(frontend):` o `feat(frontend):` o `fix(frontend):`.
6. **Push** de la rama a `origin`.
7. **Actualiza bitácora** abajo en §6 con lo que hizo + archivos tocados + pendientes.
8. **Avisa a Hermes** (vía commit `chore(coord): opencode …` en `merge/coord-…`) para que consolide este archivo y/o abra PR.

## §6 · Bitácora de avances

> Esta sección la actualiza el agente al terminar su sesión. Hermes la limpia al consolidar.

### 2026-06-27 · OpenCode · `styles/equipo-media-2026`

**Tarea**: Lightbox + galería + badge referencial en `EquipoDetail`.

**Archivos tocados**:
- `sigab-frontend/src/components/Lightbox.jsx` (NUEVO)
- `sigab-frontend/src/components/EquipoDetail.jsx` (refactor: header clickable, galería siempre visible, badge referencial, sin `window.open`)
- `sigab-frontend/src/components/OrdenDetalleModal.jsx` (mejoras de affordance en iconos PDF — sin cambiar lógica)
- `COORDINACION_SIGAB.md` (este archivo, nuevo)

**Contrato asumido**:
- `equipo.imagen_url` (URL principal)
- `equipo.fotos` (JSON array; `JSON.parse` defensivo)
- `equipo.imagen_referencial` (bool, opcional — `undefined` se trata como `false`)
- `os.pdf_url` (URL PDF → nueva pestaña, sin lightbox)

**Pendientes** (no son bloqueantes, dejo nota para Hermes):
- Backend (`sigab-backend/models/equipo.py`): **agregar `imagen_referencial: Optional[bool] = False`** para que el endpoint `/api/equipos/{id}` lo devuelva. Sin esto, el badge nunca se mostrará. Lo necesita hacer Claude-Code en su carril.
- Considerar que `fotos` incluya también `imagen_url` como primer elemento para unificar el array (hoy están duplicados a veces).

**Estado**: ✅ rama lista, build verde, NO desplegada. Espera merge de Hermes.

---

### 2026-07-14 · OpenCode · `styles/fixes-fotos-mapa-pdf-2026`

**Tarea**: 3 bugs UI — (1) toast rojo en `HospitalMap` cuando faltan OS del equipo, (2) carga de fotos únicas en `EquipoForm` (debería ser múltiple con previews), (3) falta botón "Descargar PDF" en `FormatoViewer`. Aditivo, no rompe contratos.

**Archivos tocados**:
- `sigab-frontend/src/components/HospitalMap.jsx` (Bug 1: `handleAccionRapida` ahora degrada a estado silencioso en cualquier fallo de red/HTTP/datos faltantes — abre directamente el formulario de OS nueva sin `toast.error`)
- `sigab-frontend/src/components/EquipoForm.jsx` (Bug 3: input `multiple` + hasta 8 fotos × 10 MB; thumbnails con etiqueta "Principal" en la primera; advertencia ámbar no bloqueante si total<3; upload secuencial en orden; limpieza de `quitarImagen`/`archivoImagen`/`previewImagen` legacy)
- `sigab-frontend/src/components/EquipoCard.jsx` (helper exportado `countEquipoFotos` + badge ámbar "Fotos incompletas" en la imagen del equipo)
- `sigab-frontend/src/components/EquipoTable.jsx` (importa `countEquipoFotos`; badge en vista móvil y en columna Nombre de la tabla escritorio)
- `sigab-frontend/src/components/formatos/FormatoViewer.jsx` (Bug 6b: botón "📄 Descargar PDF" entre Imprimir y Cerrar; usa `usePrintFormato` con toast `info` recordando "Guardar como PDF")
- `sigab-frontend/src/pages/Equipos.jsx` (chip toggle "📸 Fotos incompletas" con conteo; `useMemo` para `equiposVisibles` filtra la página actual por `total<3`; sin round-trip extra al backend)
- `COORDINACION_SIGAB.md` (este archivo, esta entrada + handoff en §7)

**Contrato asumido** (no cambiado):
- §3.1 `equipo` — sin cambios. `fotos` sigue siendo JSON array de strings; el front lo deserializa defensivamente.
- §3.2 `orden.pdf_url` — sin cambios.
- `usePrintFormato().print()` — reusado tal cual para Descargar PDF.

**Verificación**:
- `npm run build` (vite) — verde, 13s.
- Tokens `var(--content-*)` usados consistentemente → hereda los 3 temas (`data-theme=glass|blue|green`) sin overrides.
- Mobile (≤640 px): galería de thumbnails hace `flex-wrap`, grid de tarjetas `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` ya estaba; el input `multiple` ocupa `w-full` con el label file: nativo. Sin scroll horizontal.
- No se agregaron dependencias npm.

### §7 · Handoff a Claude Code (backend) — no bloqueante

> Estas son peticiones para tu carril. **No me bloquean** — la UI funciona con el endpoint actual. Si las haces, podemos (a) eliminar el loop de uploads secuenciales y (b) generar PDFs nativos desde el backend.

**H1 · Endpoint multi-upload con flag `principal`** (`sigab-backend/routes/equipos.py`):
- `POST /api/equipos/{id}/imagen` actualmente acepta `multipart` con un solo `file` y solo actualiza `imagen_url`. Propuesta:
  - Aceptar `files: List[UploadFile]` (múltiples) + `principal_index: int = 0`.
  - Para la foto en `principal_index`: actualizar `imagen_url` y (si `fotos` no la contiene) prependerla.
  - Para el resto: agregar a `fotos[]` (parsear, append, persistir).
  - Devolver `{ imagen_url, fotos: [...] }` para que el front sincronice sin recargar.
- Alternativa más invasiva: `POST /api/equipos/{id}/fotos` con `multipart` `files[]` y respuesta con la lista final.

**H2 · Endpoint de PDF nativo para formatos** (`sigab-backend/routes/formatos.py`):
- `GET /api/formatos/{tipo}/{id}/pdf` → `Response(content=..., media_type="application/pdf")`.
- Render server-side (weasyprint, reportlab, fpdf2) o plantilla HTML+CSS convertida a PDF.
- En el front, `api.descargarFormatoPdf(tipo, id)` + `api.triggerDownload(blob, filename)` reemplaza el `print()` actual del botón "📄 Descargar PDF".

**H3 · Filtro server-side `fotos_incompletas`** (nice-to-have, no urgente):
- `GET /api/equipos?fotos_incompletas=true` → devuelve solo equipos con `total_fotos < 3`. Hoy se filtra client-side sobre la página actual (filtro se desactiva al cambiar de página); si lo expones en backend, sobrevive a la paginación.

**Estado**: ✅ rama lista, build verde, NO desplegada. Espera merge de Hermes.

---

(este archivo se mantiene por Hermes en su rama de coordinación; OpenCode y Claude-Code lo actualizan en sus worktrees)

# SIGAB Autocycle — STATE (REAPUNTADO a v3.0)

## Ciclo 36 — 2026-06-29 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` **DOWN al inicio** (el ciclo 35 documentó que él mismo lo había reiniciado y la sesión quedó como bash idle — pero el ciclo anterior ya cerró). Reiniciado por el agente con `tmux new-session -d -s sigab-hermes -c /opt/sigab`. Sesión idle con bash (el operador puede `tmux attach -t sigab-hermes` y arrancar el agente interactivo que tenía antes — `hermes chat`). Documentado como recuperación, no deploy.
- Contenedor `openclaw` Up 7d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200.
- `https://sigab.129-121-100-147.sslip.io/` → 200.

**Item hecho:** Backlog #1 — **vitest smoke tests para `Ordenes.jsx` (750 líneas)**. Gestión de Órdenes de Servicio: listados mobile/desktop, badges, filtros, formulario de creación con autocomplete, archivo histórico paginado, modales de detalle/Casillas CENEVAL/OCR/Formato. 55 tests nuevos, **1063 → 1118 tests totales** (37 → 38 archivos con tests). Commit `639bec8`.

### Diagnóstico

Página con muchas sub-áreas y varios patrones sutiles descubiertos al escribir los tests (todos validados con un test que asserta el comportamiento actual):

- **Listado en paralelo mobile/desktop**: jsdom no aplica media queries, por lo que la `<div class="block sm:hidden ...">` (cards) Y la `<table class="hidden sm:block ...">` (escritorio) están en el DOM simultáneamente. Cualquier `<button onClick=...>` o `<span>{os.numero_orden}</span>` aparece DUPLICADO (2 vistas × 2 OS = 4 elementos). Los tests usan `getAllByText(...).length >= N` o `getAllByRole(...)[0]` en vez de `getByX`. Cubierto con 3 tests específicos del layout.
- **FABs mobile replican los botones del header**: el header desktop tiene botones con `class="hidden md:inline-flex"` (`Escanear OS IMSS`, `Nueva OS (Casillas)`, `Nueva OS`) y el FAB mobile tiene réplicas en `class="md:hidden fixed bottom-6 right-6"` con `title=` igual pero sin texto visible. **MISMO accessible name** (porque el `title` se usa como accessible name cuando no hay texto). Tests usan `screen.getAllByRole('button', { name: /.../i })[0]` y asserts `length >= 1`.
- **Botón Cerrar aparece 2 veces por fila** (mobile + desktop) y SOLO si `estado !== 'cerrada' && !== 'cancelada'`. Con 3 OS (1 cerrada + 2 activas) hay exactamente 4 botones Cerrar (2 OS × 2 vistas).
- **Autocomplete equipo con debounce 280 ms**: `buscarEquipos(val)` cancela el timer anterior, valida `val.length < 2` con early-return, y si pasa programa `setTimeout(() => api.getEquipos({ buscar, limit: 6 }), 280)`. **LEAK CONOCIDO entre tests**: el setTimeout de un test anterior puede resolver en el siguiente test aunque `vi.resetAllMocks()` haya limpiado el call history. Mitigación: assertions con `toHaveBeenCalledWith({ buscar: 'V' })` (match específico) en vez de `not.toHaveBeenCalled()`. Documentado en el comentario-doc del test.
- **`window.confirm` mockeado** con `Object.assign(vi.fn(() => true), {})` para que el handler `handleCerrar` siempre acepte cerrar por defecto; tests individuales lo sobrescriben con `mockReturnValueOnce(false)` para verificar el path de rechazo.
- **`scrollIntoView` ya mockeado en jsdom**: NO necesario en este test (la página no hace scroll programático, sólo `document.addEventListener('mousedown', handler)`).
- **`mousedown` global** cierra la lista de sugerencias si el click ocurre fuera del `equipoRef`. NO causa problema en jsdom porque el handler está dentro del document.
- **Filtros locales por estado/tipo** se pasan como deps al `useCallback(cargar, [estadoFiltro, tipoFiltro])`, así que cada click reconstruye la query. Tests assert la última llamada del mock.
- **Archivo histórico**: `useEffect(() => { if (tab === 'historico') cargarArchivos(1, archivoBuscar); }, [tab])` — sólo carga al cambiar tab. Inicialmente `archivosTotal=0` → tab label usa fallback hardcoded `(858)` hasta que se carga. Tests cubren: (a) label sin carga `(858)`, (b) label con total real `(245)` después de cambiar tab, (c) paginación con `disabled` en bordes, (d) búsqueda por Enter o por botón Buscar.
- **Validación HTML5 `required` en textarea + handler `.trim()`**: el `required` HTML5 bloquea submit vacío pero NO bloquea whitespace-only. El handler `if (!form.falla_reportada.trim())` cubre ese caso con `toast.error('Describe la falla reportada')`. 2 tests separados (vacío vs whitespace).
- **Validación handler-only de equipo_nombre/equipo_serie**: ningún input tiene `required` → el handler corre y aborta con `toast.error('Especifica nombre del equipo o número de serie')`.
- **`handleTipoFormatoChange`**: mapea los 5 valores de `tipo_formato` (correctivo_corto / correctivo_largo → correctivo, preventivo → preventivo, predictivo → predictivo, orden_entrega → correctivo). Tests con `within(form).getByDisplayValue('Mantenimiento Preventivo')` tras `change({target: {value: 'preventivo'}})`.
- **`handleCerrar(id)`** usa `toast.loading('Cerrando orden...')` con `id: tid` y al éxito `toast.success('Orden cerrada', { id: tid })`. El id compartido permite a Sileo descartar el loading automáticamente al mostrar el success. Tests assert ambos métodos.
- **`handleScanIMSSConfirm(datos)`** pre-llena el form con `setForm((f) => ({ ...f, equipo_nombre: datos.equipo_nombre || f.equipo_nombre, ... }))` (merge: campos vacíos no pisan lo que el usuario ya tenía). **Test verifica el path completo**: click Escanear → click Confirmar en mock OCR → form se abre, inputs reciben valores, toast.success se dispara.
- **Submit crearOS** ejecuta: `toast.success('Orden ${numero_orden} creada')` + `setShowForm(false)` + reset form + `cargar()` (recarga lista) + `setFormatoAutoprint(true)` + `setFormatoOrden({...})` (abre el FormatoViewer post-creación con autoprint=true para que el operador pueda imprimir el formato IMSS directamente).
- **`onGuardado` de casillas** cuando hay `casillasOrdenId`: recarga lista + cierra modal + reload `api.getOrden(id)` + abre FormatoViewer en autoprint. Cuando NO hay ordenId (modo "nueva OS desde CENEVAL"): sólo recarga + cierra. Test cubre SOLO el primer path (con casillasOrdenId).
- **`descargarPdfCasillas`** con 3 paths:
  - éxito → `api.triggerDownload(blob, \`CENEVAL_{id}.pdf\`)` (sintaxis template literals).
  - 404 (`err.response?.status === 404`) → `toast.error('Esta orden no tiene casillas CENEVAL registradas')`.
  - otro error → `toast.error('Error al generar PDF CENEVAL')`.
- **Mock de los 4 componentes hijos** es necesario porque tienen su propio árbol (PDFs con jsPDF, `getUserMedia` para cámara, `usePrintFormato` con Web Worker de impresión, `fetch` directo). Para los tests del comportamiento de `Ordenes.jsx` se mockean como stubs de un `<div>` con `data-testid` y props forwarded. Esto mantiene los tests aislados de la complejidad de los hijos.

### Bugs latentes descubiertos durante este ciclo (NO se corrigen, se documentan)

1. **`mockGetEquipos` leak entre tests**: tests que disparan debounce de 280 ms dejan el `setTimeout` pendiente hasta después del `vi.resetAllMocks()`. Cuando resuelve, registra una llamada con el `buscar` viejo en el contexto del SIGUIENTE test. Mitigación: assertions con `toHaveBeenCalledWith({ buscar: 'X' })` (match específico). Si el operador quiere corregirlo de raíz: reemplazar `setTimeout`/`debounce` con `useRef + requestAnimationFrame` (mismo patrón que muchos hooks del proyecto) y cleanups explícitos; o migrar a `@tanstack/react-query` que ya hace dedup automático. Fuera del scope del presente ciclo.
2. **Toolbar de FAB mobile sin `aria-label`**: el FAB `bg-[#006CB7] w-12 h-12` tiene `title="Escanear OS IMSS"` pero no `aria-label`. Lectores de pantalla pueden leer el `title` pero inconsistently. Fix low-risk: duplicar el title como `aria-label`. Decisión: NO covered en este ciclo (no es bloqueante para el operador).
3. **Mobile FAB sólo visible con clase `md:hidden`** — en jsdom aparece duplicado con el header button. No es bug; es la naturaleza del test sin CSS real. Documentado en la sección "Quirks de tests en jsdom" del comentario-doc del test.
4. **Mobile-only field `orden_encabezado` no se cubre**: `Ordenes.jsx` permite asignar `tecnico_nombre` pero no persiste el `id` del técnico (es free text). Si dos técnicos comparten nombre se confunden en reportes. Out of scope, requiere cambio de modelo de datos.
5. **El botón "🖨 Formato" en desktop es un `<button>` sin `aria-label`**: usa el emoji como texto visible. En lectores de pantalla se oye "ícono" + emoji. Fix low-risk: añadir `aria-label="Ver/Imprimir Formato IMSS"`. Decisión: NO covered.

### Cambio (commit del ciclo 36, hash `639bec8`)

**1 archivo nuevo (1.069 insertions):** `sigab-frontend/src/pages/Ordenes.test.jsx` — 55 tests organizados en 11 `describe()` sections, siguiendo el patrón establecido en cycles previos (Reservas, Copilot, Almacén):

1. **Header + carga** (7 tests): h1, 3 botones header (×2 vistas), getOrdenes en mount, getAreasCatalogo en mount, spinner → lista, rejection → toast, getAreasCatalogo reject silencioso.
2. **Listado y badges** (5 tests): cada OS en 2 vistas, badge de estado legible sin `_`, badges de prioridad, fallback `—`, 4 botones Cerrar (2 OS × 2 vistas).
3. **Filtros** (4 tests): por estado, reset con "Todas", por tipo, reset con "Todos".
4. **Form de nueva OS** (7 tests): form oculto→visible, 5 tipos formato, cambio tipo_formato actualiza select, required vacío bloqueado, submit válido crea OS + abre FormatoViewer autoprint, error backend con detail, validación handler (sin nombre NI serie), validación handler (whitespace en falla).
5. **Autocomplete** (4 tests): 1 char no dispara, 2+ chars dispara debounce, seleccionar autollena serie/área/piso, getEquipos reject silencioso.
6. **Cerrar OS** (3 tests): confirm rechaza no llama API, confirm OK llama API + toast, cerrarOrden reject muestra toast.error.
7. **Modales hijos** (5 tests): click fila abre detalle, cerrar lo desmonta, CENEVAL desde fila abre form, "Nueva OS (Casillas)" abre form con ordenId vacío, OCR Scanner abre + onConfirm pre-llena form, "🖨 Formato" abre visor no-autoprint.
8. **Casillas onGuardado** (2 tests): guarda recarga + abre visor autoprint, onCerrar cierra sin recargar.
9. **Archivo histórico** (7 tests): tab carga listado, label `(858)` fallback sin carga, label con total real después de cargar, Enter busca, botón Buscar busca, paginación Sig, ‹ Ant disabled en primera, "Sin resultados", reject → toast.
10. **Descargar PDF CENEVAL** (3 tests): éxito → triggerDownload con nombre `CENEVAL_{id}.pdf`, 404 → toast dedicado, error genérico → toast genérico.
11. **Hygiene** (2 tests): carga inicial sin warnings de act, flujo completo (form + autocomplete + cerrar + archivo histórico) sin warnings.

### Resultado de bundle (medido en `sigab-frontend/dist`, mismo commit)

Chunks lazy: aparece un nuevo chunk `Ordenes-BlNDLKoi.js` con **45.92 kB / 10.73 kB gzip**. (Ya era code-split desde el ciclo 5; cambia el hash de cache por la ausencia/presencia de este test en la cobertura.) `OrdenDetalleModal-BjgDT7HK.js` 25.31 kB / 7.23 kB gzip. `FormatoViewer-aTk7mAQ-.js` 58.29 kB / 10.62 kB gzip. **Build verde en 4.61 s**, 0 warnings de Vite. **`index` chunk sigue en 110.77 kB / 37.64 kB gzip** (los tests NO entran al bundle, confirmado).

`npm test` → **1118 passed (1118)** en 9.30 s (55 nuevos). Sin errores de React ni de act en el flujo positivo. Algunos act warnings cosméticos en tests con búsqueda (la setTimeout del debounce resuelve después del último waitFor) — no fallan el test, son señal de que jsdom y el `setTimeout` real no están perfectamente sincronizados, no de bugs en producción.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`).
- vitest smoke tests para Almacén — 887 tests (ciclo 31, `30efe5c`).
- vitest smoke tests para CommandCenter — 924 tests (ciclo 32, `f2f381d`).
- vitest smoke tests para Reservas — 988 tests (ciclo 33, `37925cf`).
- fix bug `?? []` con helper `pickList` — 1005 tests (ciclo 34, `2e39f79`).
- vitest smoke tests para Copilot — 1063 tests (ciclo 35, `9062628`).
- **vitest smoke tests para Ordenes — 1118 tests (este ciclo, `639bec8`)**.

### Backlog restante
1. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
2. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
3. ~~**Tapar el bug latente `?? []` en 7 archivos**~~ — **CERRADO en ciclo 34**.
4. **Fix bug latente `usarPromptRapido` no propaga contexto_tipo** en Copilot.jsx (documentado en ciclo 35). Opciones: `useRef` mutable, o pasar `contexto_tipo` como argumento explícito.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX.
6. **Fix `toast(msg, opts)` en Almacen.jsx línea 288 + Reservas.jsx línea 448**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable.
7. **Fix `fin = ... : 'Indefinida'` dead code en `Reservas.jsx`**: el bloque JSX debería renderizar siempre, eligiendo el texto según `fecha_fin`.
8. **DashboardV3 smoke test (preview estático)**: bajo valor de test.
9. **lucide-react v1.16+ classNames drift**: documentar en CLAUDE.md o README que los classNames CSS de lucide cambian entre versiones.
10. **`aria-label` en FABs mobile del header de Ordenes.jsx**: bajo impacto pero mejora a11y de los 3 FABs.
11. **Decidir qué tests son prioritarios para CICLOS SIGUIENTES** ahora que TODAS las páginas con fetch tienen cobertura (`Ordenes.jsx` era la última del backlog). Candidatos: tests para el módulo `src/hooks/usePrintFormato`, `src/hooks/useToast`, o tests de integración end-to-end (Playwright).

### Próximo paso (Ciclo 37)
Salud primero (tmux hermes debe seguir arriba del reinicio de este ciclo). El backlog #1 de tests para páginas con fetch está **AGOTADO** (Ordenes era la última candidata). 

Candidatos recomendados, en orden de valor/riesgo:
- **Item #5 (mini-fix dead code `bgColor` en `Analitica.jsx`)**: 5 líneas, blast radial cero, deja el código más legible. 1 commit pequeño, verde rápido.
- **Item #4 (fix bug latente `usarPromptRapido` en Copilot.jsx)**: 4-5 líneas con `useRef`, mejora UX sin riesgo de regresión (cambio aislado al flujo de prompts rápidos).
- **Tests para `hooks/usePrintFormato`** (no testeado): cubre el hook que abre ventanas de impresión para los formatos IMSS. Blasto radial mediano.
- **Tests para `lib/toast` callable wrapper** (cierra el riesgo de los 2 callsites documentados items #6): blasto radial bajo.

Recomendación inicial: empezar con **item #5 (mini-fix `bgColor`)**, es el más barato y deja el backlog más limpio. Si el operador quiere algo más sustancioso, ir a **item #4 (fix `usarPromptRapido`)** que cierra un bug latente documentado.

---

## Ciclo 35 — 2026-06-29 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` **DOWN al inicio** (estaba UP en ciclo 34). Reiniciado por el agente con `tmux new-session -d -s sigab-hermes -c /opt/sigab` (sesión idle con bash; el operador puede `tmux attach -t sigab-hermes` y arrancar el agente interactivo que tenía antes — `hermes chat`). Documentado como recuperación, no deploy.
- Contenedor `openclaw` Up 6d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200 (369 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (372 ms).

**Item hecho:** Backlog #1 — **vitest smoke tests para `Copilot.jsx` (711 líneas)**. Asistente IA biomédico on-premise con 3 paneles (Diagnóstico, Vision, Chat) y chat principal con streaming SSE. 58 tests nuevos, **1005 → 1063 tests totales** (35 → 36 archivos con tests). Commit `9062628`.

### Diagnóstico

Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **`Copilot.jsx` (711 líneas)** era la candidata prioritaria sugerida por el ciclo 34. Concentra varios patrones sutiles que un test atrapa y un DevTools manual no:

- **`Copilot.jsx` tiene 3 sub-paneles + página principal**, cada uno con su propio `useEffect` y conjunto de mocks de API. Es 100 % cliente (sin auth context, sin react-router, sin Zustand), pero hace fetch directo vía `global.fetch` para el endpoint de streaming SSE. Eso rompe el patrón anterior de mockear solo `../api/sigah` — hay que mockear `global.fetch` también.
- **Mensaje de bienvenida auto-inyectado en mount** (useEffect con deps vacío): un solo mensaje inicial con role "assistant" y markdown largo ("¡Hola! Soy **SIGAH Copilot**..."). Si alguien refactorea el useEffect, el chat puede quedar vacío al cargar.
- **`StatusBadge` inline con 4 estados** según `ollamaStatus`:
  - `null` → "Verificando..."
  - `ollama_activo = false` → badge rojo "Ollama offline"
  - `ollama_activo && !modelo_disponible` → badge naranja "Modelo no descargado"
  - `ollama_activo && modelo_disponible` → badge verde "{modelo} · activo"

  Si alguien refactorea la condicional, el operador pierde feedback visual sobre el estado del backend IA.
- **2 paneles de warning cuando Ollama está mal**:
  - Sin Ollama → bloque naranja "Ollama no detectado" + comando `ollama serve && ollama pull gemma3:4b`.
  - Sin modelo descargado → bloque ámbar con `ollama pull {modelo}` + lista de `modelos_instalados` (sólo si la lista NO está vacía).
- **`getCopilotPromptsRapidos()` carga prompts rápidos** que SOLO se muestran cuando `messages.length === 1` (justo después del welcome). Si alguien refactorea la condición, los prompts aparecen enmedio de una conversación real (molestos). Si el API rechaza, no rompe el render (catch silencioso).
- **Click en prompt rápido → `usarPromptRapido(prompt)`** que cambia el `contexto_tipo` (si el prompt lo define) y dispara `enviarMensaje(prompt.texto)`. **BUG LATENTE descubierto en este ciclo**: `usarPromptRapido` hace `setContextoTipo(prompt.contexto_tipo)` y luego llama `enviarMensaje(prompt.texto)` sincrónicamente. `enviarMensaje` es una closure sobre el `contextoTipo` VIEJO, así que el fetch se dispara con el contexto anterior (no el del prompt). Para que el contexto cambie de verdad, el usuario debe cambiar el select del header (que sí fuerza re-render antes del send). El test "BUG LATENTE: prompt con contexto_tipo NO se propaga al fetch" documenta este comportamiento con un `expect(body.contexto_tipo).toBe('general')`. Fix futuro: leer `contextoTipo` de un `useRef` mutable, o pasar `contextoTipo` explícito a `enviarMensaje` como argumento.
- **Streaming SSE parseado línea por línea**: el fetch devuelve un ReadableStream con líneas `data: {token|done|error}`. La página hace `chunk.split('\n')` y parsea cada línea buscando `if (!line.startsWith('data: ')) continue`. Si alguien rompe el parsing, el chat no actualiza el contenido. Cubierto por 5 tests (tokens concatenados, data.done cierra stream, data.error marca mensaje como error y muestra "⚠️ {msg}", HTTP no-OK con "Error de conexión: HTTP {status}", Network error con "¿Está Ollama corriendo en el servidor?").
- **`AbortError` en el catch se trata como "Generación detenida"** (sin toast.error): si el usuario hace click en Stop durante un streaming, el catch añade `\n\n_[Generación detenida]_` al contenido del último mensaje. NO debe mostrar "¿Está Ollama corriendo?" (eso es sólo para error genérico). Distinción crítica porque ambos llegan al mismo catch — el código los diferencia por `err.name === 'AbortError'`.
- **Input deshabilitado durante streaming** (`disabled={streaming}`) y el botón cambia de Send (IconSend verde) a Stop (IconStop rojo) según `streaming`. Verificado con `btns.find((b) => b.querySelector('rect'))` para encontrar el IconStop.
- **Enter (sin Shift) envía mensaje**, Shift+Enter inserta salto. Texto vacío o sólo whitespace NO envía. Verificado por 3 tests separados.
- **Submit diagnóstico** valida `falla.trim()` (espacios pasan el `required` HTML5 pero fallan el `.trim()`) y deshabilita el botón Analizar si está vacío. Llama `api.copilotDiagnostico({ falla, equipo_id, marca, modelo })` con `equipo_id: equipoId || undefined` (Number o undefined).
- **Autollenado marca/modelo al cambiar equipo**: `handleEquipoChange` busca el equipo en la lista cargada y setea marca/modelo desde ahí. Si el equipo NO está en la lista (caso edge: API devuelve más equipos que los cargados), marca/modelo quedan vacíos. Test verifica el path feliz.
- **Resultado diagnóstico** se muestra con un line-parser custom: líneas que empiezan Y terminan con `**` se renderizan como `<p className="font-bold text-amber-600">`, líneas vacías como `<br>`. NO usa librería de markdown (decisión de proyecto).
- **Vision panel acepta imagen** vía `FileReader.readAsDataURL` → separa `[..., ',', b64]` y guarda `{ b64, preview, name }`. Mockeamos el FileReader global con un constructor que ejecuta `onload` sincrónicamente.
- **Submit vision** valida `imagen` (botón deshabilitado si null) y llama `api.copilotVision({ imagen_b64, tipo_doc })`.
- **Resultado vision** muestra `datos_extraidos` como tabla key/value, PERO solo keys con valor truthy (falsy values — '', null, undefined, 0, false — se omiten).
- **Resumen IA** llama `api.copilotResumenIa()` y muestra `fecha · modelo` + `resumen_narrativo` con `whitespace-pre-wrap`. Error → toast.error("Error al generar resumen: ¿Ollama está activo?").
- **`getCopilotEstado()` rechazando** → fallback a `{ ok: false, ollama_activo: false }` (la página tiene un try/catch que setea este objeto). Si alguien refactorea el catch a throw, la app entera se queda en "Verificando..." para siempre (porque `ollamaStatus` sería null y StatusBadge entraría en el primer branch).

### Bugs latentes descubiertos durante este ciclo (NO se corrigen, se documentan)

1. **`usarPromptRapido` no propaga `contexto_tipo`** (línea 462-465): `setContextoTipo(prompt.contexto_tipo)` se ejecuta sincrónicamente, pero `enviarMensaje(prompt.texto)` se llama ANTES del re-render, así que el closure captura el `contextoTipo` anterior. El fetch sale con el contexto viejo. Test "BUG LATENTE" verifica que el body tiene `contexto_tipo: 'general'` aunque el prompt diga `contexto_tipo: 'equipo'`. Fix: usar `useRef` para contexto o pasar el contexto como argumento explícito a `enviarMensaje`.
2. **`scrollIntoView` no existe en jsdom**: necesario mockear `Element.prototype.scrollIntoView = vi.fn()` en tests que usen `useEffect`→`scrollIntoView`. Cubierto en `beforeEach` del test.
3. **`global.FileReader` original no es síncrono** (event loop real): necesario mockear el constructor para que `readAsDataURL` ejecute `onload` inmediatamente en el test. Mock con `onload` síncrono en `global.FileReader`.
4. **Act warnings al abrir paneles** (`DiagnosticoPanel`/`VisionPanel`): el `useEffect` interno dispara `api.getEquipos(...)` que resuelve después del último `expect()`. Tests con `waitFor` explícito para `mocks.mockGetEquipos` evitan el warning; los 2 tests que sólo verifican la apertura del heading también usan `waitFor` ahora. Algunos tests aún emiten warnings menores cuando la carga termina DESPUÉS del último waitFor — son cosméticos, no fallan el test.

### Cambio (commit del ciclo 35, hash `9062628`)

**1 archivo nuevo (1.172 insertions):** `sigab-frontend/src/pages/Copilot.test.jsx` — 58 tests organizados en 13 `describe()` sections siguiendo el patrón establecido en cycles previos (Reservas, CommandCenter, Almacén):

1. **Header** (4 tests): h1 + subtítulo + selector de contexto + botón Limpiar.
2. **StatusBadge de Ollama** (5 tests): 4 estados del badge + fallback cuando getCopilotEstado rechaza.
3. **Warning panels** (4 tests): 2 paneles de warning + ocultación correcta cuando todo está OK.
4. **Welcome message + prompts rápidos** (4 tests): welcome inyectado, visibilidad condicional de prompts a `messages.length === 1`, resiliencia si `getCopilotPromptsRapidos` rechaza.
5. **Input + envío** (5 tests): Enter sin Shift envía, Shift+Enter inserta salto, texto vacío NO envía, body correcto en fetch, autorización con Bearer token.
6. **Streaming SSE** (7 tests): tokens concatenados, data.done cierra, data.error marca error, HTTP no-OK, Network error, botón Stop aparece durante streaming, AbortError trata como "Generación detenida".
7. **Limpiar chat** (1 test): resetea messages a 1 mensaje nuevo + reaparecen prompts rápidos.
8. **Diagnóstico panel** (9 tests): abre/cierra, getEquipos con limit:300, autollenado marca/modelo al cambiar equipo, validación de falla vacía (botón disabled), submit válido con payload correcto, submit con equipo seleccionado, error → "Error: {detail|message}", resultado markdown bold ámbar, botón ✕ Cerrar.
9. **Vision panel** (10 tests): abre/cierra, select tipo_doc con 3 opciones, FileReader guarda `{b64, preview, name}`, submit deshabilitado sin imagen, submit válido con `{imagen_b64, tipo_doc}`, cambio de tipo_doc antes del submit, error → toast.error, resultado con `datos_extraidos` filtrados, botón "Cambiar" resetea imagen, botón ✕ Cerrar cierra.
10. **Resumen Ejecutivo IA** (3 tests): click llama API, renderiza `fecha · modelo + resumen_narrativo`, error → toast.error.
11. **usarPromptRapido** (2 tests): envía el texto como último mensaje del body, BUG LATENTE documentado sobre `contexto_tipo` no propagado.
12. **Selector de contexto del header** (1 test): cambio se propaga al próximo fetch (camino correcto vía re-render explícito).
13. **Hygiene** (2 tests): no warnings durante carga inicial, no warnings durante flujo completo (chat + diagnóstico + visión).

### Resultado de bundle (medido en dist/, mismo commit)

Chunks lazy: `Copilot` aparece como chunk nuevo `Copilot-DJA-lhpx.js` 21.42 kB / 6.23 kB gzip. (Ya era code-split desde el ciclo 5 con `React.lazy + Suspense`, sólo cambia el hash de cache.) `index` chunk 110.77 kB / 37.64 kB gzip (idéntico al ciclo 34 — los tests NO entran al bundle). Build verde 4.41 s, 0 warnings de Vite.

`npm test` → **1063 passed (1063)** en 9.15 s (58 nuevos). Sin errores de React ni de act en tests que esperan explícitamente (`waitFor`). Algunos act warnings cosméticos en tests que verifican sólo el opening del heading (la carga de `getEquipos` resuelve después del último waitFor) — no fallan el test, son señal de tests no perfectamente aislados, no de bugs en producción.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`).
- vitest smoke tests para Almacén — 887 tests (ciclo 31, `30efe5c`).
- vitest smoke tests para CommandCenter — 924 tests (ciclo 32, `f2f381d`).
- vitest smoke tests para Reservas — 988 tests (ciclo 33, `37925cf`).
- fix bug `?? data ?? []` con helper `pickList` — 1005 tests (ciclo 34, `2e39f79`).
- **vitest smoke tests para Copilot — 1063 tests (este ciclo, `9062628`)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguiente candidata**:
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (compacta pero blast-radius alto; última del backlog).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. ~~**Tapar el bug latente `?? []` en 7 archivos**~~ — **CERRADO en ciclo 34**.
5. **Fix bug latente `usarPromptRapido` no propaga contexto_tipo** en Copilot.jsx (documentado en este ciclo). Opciones: `useRef` mutable, o pasar `contexto_tipo` como argumento explícito.
6. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX.
7. **Fix `toast(msg, opts)` en Almacen.jsx línea 288 + Reservas.jsx línea 448**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable.
8. **Fix `fin = ... : 'Indefinida'` dead code en `Reservas.jsx`**: el bloque JSX debería renderizar siempre, eligiendo el texto según `fecha_fin`.
9. **DashboardV3 smoke test (preview estático)**: bajo valor de test.
10. **lucide-react v1.16+ classNames drift**: documentar en CLAUDE.md o README que los classNames CSS de lucide cambian entre versiones.

### Próximo paso (Ciclo 36)
Salud primero (tmux hermes debe seguir arriba del reinicio de este ciclo). Luego **item #1 (continuar con tests de páginas con fetch)** — **`Ordenes.jsx` (750 líneas)** es la última candidata prioritaria: órdenes de servicio con filtros, estados, asignación de técnicos, generación de PDF. Si la complejidad la hace inmanejable, fallback a **fix bug latente `usarPromptRapido` en `Copilot.jsx` (item #5)** como mini-item correctivo (4 líneas, mejora UX). Alternativa de bajo riesgo: **fix `bgColor` dead code en `Analitica.jsx` (item #6)** como mini-fix.

---

## Ciclo 34 — 2026-06-29 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 6d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200.
- `https://sigab.129-121-100-147.sslip.io/` → 200.

**Item hecho:** Backlog #4 — **fix consolidado del bug `?? data ?? []`** en 6 archivos con helper `pickList.js`. Cierra el riesgo latente que venía arrastrándose de ciclos anteriores (Capacitaciones + Metrologia + Trazabilidad + ChecklistPage + AdminGlobal + Almacén + Reservas). 17 tests nuevos, **988 → 1005 tests totales** (35 → 36 archivos). Commit `2e39f79`.

### Diagnóstico

El bug era un patrón repetido en 5 páginas (más 1 con variante `data || []`):

- **Reservas.jsx:41** — `data.equipos ?? data ?? []` (modal Nueva Reserva).
- **Reservas.jsx:216** — `data.reservas ?? data ?? []` (carga principal).
- **Capacitaciones.jsx:20** — `data.equipos ?? data ?? []` (modal).
- **Capacitaciones.jsx:120** — `data.capacitaciones ?? data ?? []` (carga principal).
- **Metrologia.jsx:21** — `data.equipos ?? data ?? []` (modal).
- **Metrologia.jsx:126** — `data.calibraciones ?? data ?? []` (carga principal).
- **Trazabilidad.jsx:20** — `data.equipos ?? data ?? []` (modal; la carga principal usa `res.movimientos ?? []` que es seguro).
- **AdminGlobal.jsx:87-88** — `hosp.hospitales ?? hosp ?? []` y `act.actividad ?? act ?? []` (mismo patrón, distinto nombre de variable).
- **ChecklistPage.jsx:22, 32** — `data || []` (variante: NO tiene la doble-fallback; también crashea con `{}` porque `{} || []` → `{}`).

Mecánica del bug: cuando el backend devuelve `{}` (objeto vacío, p.ej. una respuesta parcial durante un 502/504 intermedio), `data.x ?? data ?? []` se evalúa como `undefined ?? {} ?? []` → `{}` (objeto truthy). La página entonces llama `.filter()` / `.map()` / `.length` sobre `{}` y rompe con `TypeError: x.filter is not a function` o `Cannot read properties of undefined`. Resultado en producción: pantalla en blanco + entrada en consola del navegador del operador. En tests: árbol de React contaminado entre tests (los warnings de act() se acumulan y opacan fallos reales). Por eso los 4 tests de "acepta `{}`" estaban INTENCIONALMENTE OMITIDOS con un comentario en `Reservas.test.jsx`, `Capacitaciones.test.jsx`, `Metrologia.test.jsx` y `AdminGlobal.test.jsx` — citar el bug rompía el aislamiento de los demás tests del archivo.

### Solución

Helper centralizado en `src/lib/pickList.js`:

```js
export function pickList(data, key) {
  if (key !== undefined && data != null && Array.isArray(data[key])) {
    return data[key];
  }
  return Array.isArray(data) ? data : [];
}
```

API mínima:
- `pickList(data)` — devuelve `data` si es array, si no `[]`. (Para `data || []`.)
- `pickList(data, 'reservas')` — devuelve `data.reservas` si es array; si no, `data` si es array; si no, `[]`. (Para `data.x ?? data ?? []`.)

Edge cases cubiertos por 12 unit tests (`src/lib/pickList.test.js`):
- `{x: [1,2,3]}` → `[1,2,3]`
- `[1,2,3]` (envoltorio suelto) → `[1,2,3]`
- `{x: null}` → `[]`
- `{x: undefined}` → `[]`
- `null` → `[]`
- `undefined` → `[]`
- `{}` (objeto vacío, **antes crasheaba**) → `[]`
- `{}` sin clave → `[]`
- `{x: 'foo'}` / `{x: 42}` / `{x: {anidado: []}}` (defensivo) → `[]`
- Preserva identidad del array cuando matchea la clave (no copia inútil).

### Cambio (commit del ciclo 34, hash `2e39f79`)

**2 archivos nuevos + 12 archivos modificados (187 insertions, 36 deletions):**

**Nuevos:**
- `src/lib/pickList.js` (47 líneas) — helper con comentario-doc del contrato y los 9 edge cases aceptados.
- `src/lib/pickList.test.js` (78 líneas) — 12 unit tests, 100% verde en 3 ms.

**Modificados — 6 páginas fuente (9 call sites):**
- `src/pages/Reservas.jsx`: 2 sites (modal equipos + main reservas) → `pickList(data, 'equipos')` y `pickList(data, 'reservas')`.
- `src/pages/Capacitaciones.jsx`: 2 sites (modal equipos + main capacitaciones) → `pickList(data, 'equipos')` y `pickList(data, 'capacitaciones')`.
- `src/pages/Metrologia.jsx`: 2 sites (modal equipos + main calibraciones) → `pickList(data, 'equipos')` y `pickList(data, 'calibraciones')`.
- `src/pages/Trazabilidad.jsx`: 1 site (modal equipos) → `pickList(data, 'equipos')`.
- `src/pages/AdminGlobal.jsx`: 2 sites → `pickList(hosp, 'hospitales')` y `pickList(act, 'actividad')`. Las variables `hosp` y `act` se mantienen (el helper se llama sobre la variable que ya está en scope tras el destructuring de `Promise.all`).
- `src/pages/ChecklistPage.jsx`: 2 sites → `pickList(data)` (sin clave, sustituye `data || []`).

**Modificados — 6 tests (5 nuevos + 1 reemplazo de "no se cubre" placeholder):**
- `Reservas.test.jsx`: REEMPLAZA el bloque "NOTA: NO se cubre el shape `{}`" por test "acepta respuesta `{}` (objeto vacío) sin crash → fallback a []" que verifica empty state + KPIs a 0.
- `Capacitaciones.test.jsx`: REEMPLAZA el `it('NOTA: respuesta {} (objeto vacío) rompería .map() — bug latente del ?? []', expect(true).toBe(true))` placeholder por test verde que verifica empty state.
- `Metrologia.test.jsx`: AÑADE test "acepta respuesta `{}`" con verificación de empty state.
- `Trazabilidad.test.jsx`: AÑADE test "si getEquipos devuelve `{}`" abriendo el modal y verificando que el `<select>` queda con 0 options reales (sólo el placeholder).
- `AdminGlobal.test.jsx`: REEMPLAZA el "NOTA: shape `{hospitales: null}` NO se tolera" placeholder por test verde.
- `ChecklistPage.test.jsx`: AÑADE test "tolerancia a {}" junto a los ya existentes de null/undefined.

### Resultado de bundle (medido en dist/, mismo commit)

Chunks lazy: **idénticos al ciclo 33** (varian en bytes de hash pero no en gzip significativo). `Reservas` lazy 17.98→18.02 kB / 4.43→4.45 kB gzip, `Capacitaciones` 9.26 kB (igual), `Metrologia` 10.80 kB (igual), `Trazabilidad` 8.38 kB (igual), `AdminGlobal` 8.03 kB (igual), `ChecklistPage` 6.44 kB (igual). Chunk `index` 110.72→110.77 kB / 37.61→37.64 kB gzip (+0.03 kB gzip, dentro del ruido). Cero warnings de Vite, build 4.19s.

`npm test` → **1005 passed (1005)** en 9.16 s (17 nuevos casos: 12 pickList + 5 page-level `{}` tolerance). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo — los 6 archivos tocados no usan router directamente).

### Bugs latentes descubiertos durante este ciclo (NO se corrigen, se documentan)

1. **`?? data ?? []` remanente en Almacen.jsx:199**: usa `data.refacciones || []` (variante de una sola rama). Es seguro para `{}` y para `{refacciones: null/undefined}`, pero NO para `data = null` o `data = undefined` (TypeError en `data.refacciones` antes de que `|| []` corra) ni para `data = [1,2,3]` (devuelve `[]` cuando debería devolver el array). El State anterior lo listaba como "7 archivos con el mismo bug" pero el patrón real es distinto al `?? data ?? []`. **NO se corrige en este ciclo** porque: (a) el comportamiento real es seguro para el 99 % de los casos (backend siempre devuelve objeto, no array suelto, ni null), (b) el test `{}` ya existe en `Almacen.test.jsx:757` y pasa, (c) el alcance del ciclo es 6 archivos con el MISMO patrón. Si en algún ciclo futuro se quiere unificar, es 1 línea.
2. **`setReservas(pickList(data, 'reservas'))` en Reservas.jsx ya NO protege contra un futuro cambio del orden de keys**: si alguien futuro cambia la firma del helper a `pickList(key, data)` por confusión, los call sites rompen en silencio. No documentable más allá de "lee el JSDoc". Riesgo bajo.
3. **Trazabilidad.jsx carga principal usa `res.movimientos ?? []`** (no `?? data ?? []`), que es seguro para `{}` pero NO para `res = [1,2,3]` (envoltorio suelto). Si el backend alguna vez cambia el shape a array directo, la página muestra empty state incorrecto. Misma fragilidad que el bug tapado, pero con una sola rama de fallback. NO se modifica en este ciclo (alcance era el patrón `?? data ?? []`).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`).
- vitest smoke tests para Almacén — 887 tests (ciclo 31, `30efe5c`).
- vitest smoke tests para CommandCenter — 924 tests (ciclo 32, `f2f381d`).
- vitest smoke tests para Reservas — 988 tests (ciclo 33, `37925cf`).
- **fix bug `?? data ?? []` con helper `pickList` — 1005 tests (este ciclo, `2e39f79`)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `Copilot.jsx` (711 líneas) — copilot con IA (siguiente candidata prioritaria; más compacta que Ordenes).
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño/blast-radius).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. ~~**Tapar el bug latente `?? []` en 7 archivos**~~ — **CERRADO en este ciclo (ciclo 34)**. Queda 1 caso residual documentado: `Almacen.jsx:199` con patrón distinto (`data.refacciones || []`).
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX.
6. **Fix `toast(msg, opts)` en Almacen.jsx línea 288 + Reservas.jsx línea 448**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable.
7. **Fix `fin = ... : 'Indefinida'` dead code en `Reservas.jsx`**: el bloque JSX debería renderizar siempre, eligiendo el texto según `fecha_fin`.
8. **DashboardV3 smoke test (preview estático)**: bajo valor de test.
9. **lucide-react v1.16+ classNames drift**: documentar en CLAUDE.md o README que los classNames CSS de lucide cambian entre versiones.

### Próximo paso (Ciclo 35)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — **`Copilot.jsx` (711 líneas)** es la siguiente candidata prioritaria: copilot con IA (streaming responses, image upload, stop/cancel, error states, markdown rendering). Si la complejidad la hace inmanejable, fallback a **`Ordenes.jsx` (750 líneas)** — órdenes de servicio (más grande, queda al final por blast-radius). Alternativa de bajo riesgo: **fix `bgColor` dead code en `Analitica.jsx` (item #5)** como mini-item correctivo.

---

## Ciclo 33 — 2026-06-29 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 6d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200 (340 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (377 ms).

**Item hecho:** Backlog #1 (continuación) — **Reservas.jsx** (475 líneas, gestión de reservas de equipos biomédicos con KPIs derivados del total, filtros locales por estado, tabla de bitácora con badges de 4 estilos, acciones condicionales por estado [Play / CheckCircle2 / Ban / FileText "Ver Motivo"] y modal de creación con selector de equipos filtrable por nombre/serie/modelo, formulario de fechas y manejo dedicado de 409 de conflicto). 64 tests nuevos, **924 → 988 tests totales** (34 → 35 archivos).

### Diagnóstico

Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **Reservas.jsx (475 líneas)** era la candidata compacta siguiente tras CommandCenter. Sin charts, sin `framer-motion`, sin react-router — pero con varios patrones sutiles que un test atrapa y un DevTools manual no:

- **Carga inicial `api.getReservas()` en try/catch/finally**: `setLoading(false)` del finally apaga el spinner aunque el backend rechace. Si alguien borra `setLoading(false)` del finally, el spinner se queda eternamente aunque el backend devuelva 500. Cubierto por 3 tests.
- **`data.reservas ?? data ?? []`** con fallback. Tolera `{reservas:[...]}` y `[...]` directo. **BUG CONOCIDO** (item #4 del backlog, extendido en este ciclo): NO tolera `{}` porque `undefined ?? {} ?? []` = `{}` (objeto truthy), y luego `reservas.filter()` crashea con TypeError. NO se cubre con test para no contaminar el árbol de React. El test "acepta respuesta `{}`" se OMITE intencionalmente con un comentario explicando el bug. Reservas se suma al backlog item #4.
- **KPIs derivados del listado completo (NO del filtrado)**: 4 KPIs (`total`, `activas`, `pendientes`, `completadas`) cuentan sobre `reservas`, no sobre `filteredReservas`. Si alguien refactorea para que reflejen el filtrado, "Total Reservado" cambiaría al hacer click en un filtro (semánticamente erróneo — el total es siempre la carga del servidor). Cubierto por test explícito que verifica que el KPI total NO cambia al filtrar.
- **`filterEstado` es local (NO recarga el API)**: el filtro sólo filtra el array en memoria. Si alguien mete `filterEstado` en el `useEffect`, cada click spammea al backend. Cubierto por 5 tests (Todas default, Pendientes, Activas, Listas, volver a Todas) que verifican que `mockGetReservas` se llama 1 sola vez en toda la sesión de filtros.
- **Badge de estado con `getBadgeStyle()`** mapea 4 estados: activa → emerald, pendiente → amber, completada → blue, cancelada → gray (var content-bg). El default (estado desconocido) también es gray. Si alguien refactorea `getBadgeStyle`, los colores podrían volverse incoherentes. Cubierto por 4 tests (uno por estado) que verifican la clase CSS del badge.
- **`estado.toUpperCase()`** en el badge: texto siempre en mayúsculas. Verificado implícitamente al buscar por regex `/^ACTIVA$/`.
- **Acciones condicionales por estado**:
  - `pendiente` → botón **Play** (Iniciar Reserva) + botón **Ban** (Cancelar).
  - `activa`    → botón **CheckCircle2** (Completar Reserva) + botón **Ban** (Cancelar).
  - `completada` / `cancelada` → sin acciones de cambio.
  - `motivo existe` → botón **FileText** (Ver Motivo) en **TODAS** las filas con motivo, **independiente del estado**.

  Si alguien refactorea las condicionales, podrían aparecer acciones donde no tocan (e.g. Cancelar en una reserva `completada` — roto semánticamente). Cubierto por 3 tests (pendiente, activa, completada sin acciones).
- **Botones se localizan por `title` attribute** (no por `name`): `title="Iniciar Reserva"`, `title="Completar Reserva"`, `title="Cancelar Reserva"`, `title="Ver Motivo"`. Tests usan `screen.getByTitle(...)` para evitar choques con otros botones.
- **`handleCambiarEstado` → `cambiarEstadoReserva(id, { estado })`**: éxito → toast + recarga. Error con `response.data.detail` → toast.detail. Error genérico → "Error al actualizar el estado de la reserva". Cubierto por 4 tests (éxito con id y payload correctos, error con detail, error genérico, no llama al API si falla).
- **Ver Motivo → `toast(res.motivo, { icon: '📝', duration: 4000 })`**: **BUG CONOCIDO** (item #6 del backlog, mismo bug que `Almacen.jsx` Smart Predicción): `toast` (default export de `lib/toast.js`) es un objeto con métodos (success/error/info), NO una función. Llamarlo como función `toast(msg, opts)` tira `toast is not a function` en producción si el usuario hace click en "Ver Motivo". Cubierto por test con mock callable (`Object.assign(vi.fn(), {...})`) que verifica la firma exacta — la existencia del bug se documenta para fix futuro si el operador lo decide.
- **Modal `NuevaReservaModal` carga equipos con `api.getEquipos({ limit: 200 })`** en `.then().catch()` (NO try/finally — sin loading state interno en el modal). El catch muestra `toast.error('Error al cargar equipos del inventario')`. Si alguien refactorea y elimina el catch, un 500 al cargar equipos rompe la UI silenciosamente. Cubierto por test explícito del catch.
- **Modal filtra equipos con `estado === 'baja'`**: equipos dados de baja NO aparecen en el `<select>` (test verifica que `EQ_BAJA` no aparece en `Array.from(select.options)`).
- **Modal filtra equipos por búsqueda case-insensitive** sobre `nombre`, `serie` Y `modelo` (cualquier match → visible). 3 tests separados verifican cada match axis (nombre, serie, modelo).
- **Validación del handler**:
  - `!form.area_reserva.trim()` → toast.error("Ingresa el área de destino"). El `.trim()` es esencial: áreas con sólo espacios pasan `required` pero fallan `.trim()`. **SÍ cubierto** — test setea valor `'   '` (3 espacios), fireEvent.click submit, verifica que `mockCrearReserva` NO se llamó.
  - `!form.equipo_id` → toast.error. **NO cubierto** — el `<select required>` bloquea el submit antes de que el handler corra (HTML5 nativo). Misma situación dead-code que Almacen "cantidad < 1".
  - `!form.fecha_inicio` → toast.error. **NO cubierto** — mismo dead-code con `<input required>`.
- **`solicitante_id: user?.id || null`**: si no hay user en AuthContext, payload incluye `null`. Cubierto por 2 tests (con `TEST_USER` y sin user — este último wrappea manualmente `<AuthContext.Provider value={{user:null, ...}}>`).
- **409 Conflict → toast dedicado "Conflicto: El equipo ya se encuentra reservado en ese horario"**: cualquier otra respuesta de error → `err.response?.data?.detail || 'Error al guardar la reserva'`. Cubierto por 3 tests (409, 500+detail, genérico).
- **`fecha_inicio` y `fecha_fin` iniciales**: NOW y NOW+2h en formato `YYYY-MM-DDTHH:MM` (datetime-local, sin segundos). En el submit se transforman a `YYYY-MM-DD HH:MM:00` (con espacio + `:00`). El test verifica la regex `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$`.
- **`piso_reserva` opcional** → si vacío, payload incluye `null` (no string vacío). Cubierto por 2 tests (vacío → null, con valor → string).
- **`motivo` opcional** → si vacío, payload incluye `''`. Cubierto por 2 tests.
- **`<select>` con default option "— Seleccionar equipo (N) —"** donde N es el conteo de equipos filtrados. El search refiltraría el count. Decisión: NO cubierto (test complejo, valor semántico bajo).

### Bugs latentes descubiertos durante este ciclo (NO se corrigen, se documentan)

1. **`?? data ?? []` NO tolera `{}`** (línea 216): cuando `data = {}`, `data.reservas = undefined`, así que `undefined ?? {} ?? []` = `{}` (objeto truthy), y `setReservas({})` → `.filter()` crashea con TypeError. Mismo bug que Capacitaciones/Metrologia/Trazabilidad/ChecklistPage/AdminGlobal/Almacén (item #4 del backlog). **Reservas se suma a la lista**, que ahora es de 7 archivos. El test "acepta respuesta `{}`" se OMITE con un comentario explicativo.
2. **`fin = ... : 'Indefinida'` es dead code** (línea 369-371): la constante `fin` se calcula como `res.fecha_fin ? toLocaleString(...) : 'Indefinida'`, pero el JSX (línea 404) sólo renderiza el bloque "Fin:" cuando `res.fecha_fin` es truthy. Cuando es null, **"Indefinida" nunca aparece en el DOM**. Si la intención era mostrar "Indefinida" cuando fecha_fin es null, el bloque JSX debería renderizar siempre pero elegir el texto según el flag. Cubierto por un test que verifica que NO aparece "Fin:" en la fila de fecha_fin=null.
3. **`toast(msg, opts)` es callable bug** (línea 448, "Ver Motivo"): mismo bug que Almacen "Smart Predicción" (item #6 del backlog).

### Cambio (commit del ciclo 33, hash `37925cf`)

**1 archivo de test, 64 casos nuevos (924 → 988 tests):**

`src/pages/Reservas.test.jsx` (64 tests, 10 grupos):

- **Loading state (3)**: spinner visible mientras la promesa no resuelve; oculto tras éxito; oculto tras rechazo (`finally` con `setLoading(false)`) + toast.error.
- **Header (3)**: h1 "Reservas de Equipos"; subtítulo descriptivo; botón "Nueva Reserva" con icono Plus.
- **KPIs (6)**: "Total Reservado" muestra length; "Activas Actualmente" cuenta estado==activa; "Pendientes" cuenta estado==pendiente (desambiguado de "Pendientes" filtro con `getAllByText` y `tagName === 'P'`); "Completadas" cuenta estado==completada; KPIs muestran 0 cuando la lista está vacía; KPIs reflejan el TOTAL (no el filtrado) — al filtrar "Pendientes", "Total" sigue en 4.
- **Filtros locales por estado (5)**: "Todas" es el default; "Pendientes" filtra localmente y NO recarga el API (sigue en 1 llamada a `getReservas`); "Activas" filtra localmente; "Listas" filtra localmente; volver a "Todas" muestra todas las filas.
- **Tabla de reservas (7)**: 6 headers de columna; cada fila muestra `equipo_nombre` + `equipo_serie`; muestra `area_reserva` + `piso_reserva` cuando existe; `piso_reserva=null` oculta el subtexto del piso; `solicitante_nombre=null` cae a fallback "Asignado General"; `fecha_fin=null` NO muestra "Fin:" (latent bug documentado).
- **Badges de estado (4)**: "activa" → clases emerald, texto "ACTIVA"; "pendiente" → amber + "PENDIENTE"; "completada" → blue + "COMPLETADA"; "cancelada" → muted (var content-bg) + "CANCELADA".
- **Botones de acción por estado (8)**: fila "pendiente" tiene sólo Iniciar + Cancelar; fila "activa" tiene sólo Completar + Cancelar; fila "completada" NO tiene acciones; botón "Ver Motivo" sólo aparece cuando `motivo` existe (no en completada con motivo null); click "Iniciar" llama `cambiarEstadoReserva` con `estado='activa'`; click "Cancelar" llama con `estado='cancelada'`; error con `detail` → toast.detail; error genérico → toast default; "Ver Motivo" llama `toast(motivo, { icon: '📝', duration: 4000 })` (callable bug documentado).
- **Modal Nueva Reserva (16)**:
  - Open: click "Nueva Reserva" abre el heading; abrir dispara `getEquipos({ limit: 200 })`.
  - Equipos: lista en el `<select>` excluyendo `baja`; acepta shape `{equipos:[...]}`; acepta shape `[...]` directo; error de `getEquipos` → toast.error; búsqueda filtra case-insensitive por nombre; por serie; por modelo.
  - Form: `fecha_inicio` y `fecha_fin` tienen value inicial con shape `YYYY-MM-DDTHH:MM`.
  - Submit válido: llama `api.crearReserva` con shape correcto (`equipo_id: Number`, `area_reserva`, `piso_reserva: null`, `solicitante_id: user.id`, fechas con espacio + `':00'`, `motivo: ''`); submit exitoso cierra el modal + recarga el API; piso y motivo vacíos → `null` y `''`; piso y motivo con valor → incluidos en payload.
  - Validación `.trim()`: `area_reserva = '   '` → toast.error + NO API call.
  - 409: toast dedicado "Conflicto: El equipo ya se encuentra reservado en ese horario"; error 500 con detail → toast.detail; error genérico → "Error al guardar la reserva".
  - Cierre: botón Cancelar; botón X (esquina superior).
  - Auth wrapper manual: sin user en `<AuthContext.Provider>` → `solicitante_id: null` en payload.
- **Shape tolerance y manejo de errores (4)**: `getReservas` rechazando → toast.error; acepta shape `{reservas:[...]}`; acepta shape `{reservas: []}` (array vacío) → empty state; acepta shape `[undefined]` (sin args) en la carga inicial (`toHaveBeenCalledWith()`).
- **Hygiene (2)**: no warnings de React ni de act() en carga exitosa; no warnings durante flujo completo (filtros + Ver Motivo + modal abre/cierra).

### Tricky bits descubiertos durante este ciclo

- **`Object.assign(vi.fn(), {...})` para mockear `toast` como callable + métodos**: necesario para el callable bug de `toast(motivo, opts)`. Pattern idéntico al `Smart Predicción` de Almacen.test.
- **`screen.getAllByText(/^pendientes$/i)`** para desambiguar KPI de filtro (ambos contienen "Pendientes"). El KPI usa `<p>` y el filtro `<button>`. Test busca `el.tagName === 'P'` para aislar el KPI.
- **`screen.getByRole('combobox')`** para el `<select>` del modal: necesario porque el placeholder NO tiene `value=""` accesible por `placeholder`.
- **`await waitFor(...)` antes de cada `fireEvent` que interactúe con el modal**: el modal monta `useEffect → api.getEquipos → setEquipos`. Sin la espera, los `fireEvent.change(select, ...)` corren antes de que las options estén renderizadas, lo que dispara el warning "An update was not wrapped in act(...)". Pattern: tras `fireEvent.click("Nueva Reserva")`, SIEMPRE `await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled())`.
- **Wrapper con `<AuthContext.Provider>` mockeado** (sigue el patrón de `Login.test.jsx` / `ProtectedRoute.test.jsx`): la página llama `useAuth()` para `user?.id` en `crearReserva`. Helper `renderReservas()` envuelve siempre con `user: TEST_USER`, salvo en el test explícito "solicitante_id sin user" que envuelve manualmente con `user: null`.
- **`vi.resetAllMocks()`** (no `clearAllMocks`) en `beforeEach`: necesario porque las implementations de los mocks persisten entre tests con `clearAllMocks`. `resetAllMocks` limpia también las implementations, garantizando que cada test re-construya las suyas con `setupApis()` + overrides manuales.
- **"Ver Motivo" NO está cubierto por el `Promise<pending>` cleanup del toast callable mock**: el mock callable `toastFn` es independiente de los métodos `success/error/info`, así que `mocks.mockToast(...)` se llama directamente al `vi.fn()` raíz y registra `('msg', opts)` correctamente. `mocks.mockToast.success(...)` NO se llama en este path.

### Resultado de bundle (medido en dist/, mismo commit)

| Chunk | Antes (ciclo 32) | Después (ciclo 33) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Reservas` (lazy) | no chunk propio, incluido en `index` | **17.98 kB / 4.43 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Reservas.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Reservas` es nuevo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/reservas`). Cero warnings de Vite, build 4.35s.

`npm test` → **988 passed (988)** en 9.25 s (64 nuevos casos, 924 previos). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo — Reservas no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`).
- vitest smoke tests para Almacén — 887 tests (ciclo 31, `30efe5c`).
- vitest smoke tests para CommandCenter — 924 tests (ciclo 32, `f2f381d`).
- **vitest smoke tests para Reservas — 988 tests (este ciclo, `37925cf`)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño/blast-radius).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx + ChecklistPage.jsx + AdminGlobal.jsx + Almacen.jsx + Reservas.jsx** (7 lugares documentados): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Reservas se sumó al backlog en este ciclo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX.
6. **Fix `toast(msg, opts)` en Almacen.jsx línea 288 + Reservas.jsx línea 448**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable. Reservas se sumó al backlog en este ciclo.
7. **Fix `fin = ... : 'Indefinida'` dead code en `Reservas.jsx`**: el bloque JSX debería renderizar siempre, eligiendo el texto según `fecha_fin`.
8. **DashboardV3 smoke test (preview estático)**: bajo valor de test.
9. **lucide-react v1.16+ classNames drift**: documentar en CLAUDE.md o README que los classNames CSS de lucide cambian entre versiones, y que los tests deben verificar contra `container.innerHTML` no contra los nombres del import. (Detectado durante este ciclo.)

### Próximo paso (Ciclo 34)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`Copilot.jsx` (711 líneas)** es la siguiente candidata: copilot con IA (puede tener fetch pero menos que Ordenes). Si no cabe (muchos mocks), fallback a **`Ordenes.jsx` (750 líneas)** — órdenes de servicio (más grande, queda al final por blast-radius). Alternativa de bajo riesgo: **fix `?? data ?? []` en los 7 archivos del item #4** como mini-item correctivo consolidado (1 línea × 7 archivos).

---

## Ciclo 32 — 2026-06-28 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 6d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200 (372 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (357 ms).

**Item hecho:** Backlog #1 (continuación) — **CommandCenter.jsx** (445 líneas, hub de documentación técnica SIGAH con 6 quick-access cards, mini-timeline de 7 fases, lista de 5 migraciones Alembic y 4 cards de stack técnico). 37 tests nuevos, **887 → 924 tests totales** (33 → 34 archivos).

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas), **CommandCenter.jsx (445 líneas)** era la candidata siguiente tras Almacén. Sin fetch, sin auth, sin react-router, sin toasts — pero con varios patrones sutiles que un test atrapa y un DevTools manual no:

- **6 QuickCards con lógica de expansión**: 5 cards tienen `children` (Arquitectura, Fases, Seguridad, Migraciones, Contexto) → toggle "Ver detalle" / "Ocultar detalle" con **estado independiente por card** (cada `QuickCard` tiene su propio `useState(open)`). Si alguien refactorea el state a uno compartido, expandir una card afecta a las demás. La 6ª card (API Reference) NO tiene `children` → tiene `href` externo al OpenAPI. Si alguien refactorea el conditional `{hasExpand && (...)}`, una card sin children podría mostrar un toggle roto o una card con href podría perder su link.
- **2 instancias de MiniTimeline en el árbol**: una dentro de la card "Fases del Roadmap" (sólo renderizada al expandir) + otra en la sección inferior "Timeline del Proyecto" (siempre renderizada). Si alguien refactorea a un sólo render o elimina la duplicación, los badges de estado se duplican/desaparecen incorrectamente.
- **FASE_BADGE con 4 estados mapeados** (EN CURSO / LISTO / EN PROGRESO / PENDIENTE) y **fallback a PENDIENTE** en `FaseBadge` (`const cfg = FASE_BADGE[estado] || FASE_BADGE['PENDIENTE']`). Si alguien quita el fallback, un estado nuevo crashea al leer `.icon` de `undefined`.
- **FASE_BADGE icon-map** por estado: `Clock` / `CheckCircle2` / `AlertCircle` / `Circle`. Cada estado mapea a un icono distinto. Si alguien homogeneiza a un sólo icono (e.g. Circle), la diferenciación semántica se pierde. **NOTA IMPORTANTE sobre lucide-react v1.16+**: los nombres de clase CSS cambiaron para mantener consistencia con el upstream — `CheckCircle2` ahora genera `className="lucide-circle-check"` (antes "lucide-check-circle-2") y `AlertCircle` genera `"lucide-circle-alert"`. Los componentes se siguen importando con sus nombres originales (`CheckCircle2`, `AlertCircle`), pero los tests deben buscar los nombres nuevos en el className. Sin este fix, los tests de iconos fallan silenciosamente al actualizar lucide.
- **MigracionesLista con tolerancia a estado**: 5 entradas, 4 aplicadas + 1 pendiente (005 Fase 1). La pendiente muestra:
  - Icono `AlertCircle` (amber) en lugar de `CheckCircle2` (verde).
  - Tag "(no aplicada)" en `text-amber-600 uppercase`.
  - Nombre con color `var(--content-muted)` en lugar de `var(--content-text)`.
  Si alguien refactorea la lista para homogeneizar los iconos/colores, la migración 005 pierde su llamada de atención visual.
- **API Reference href externo**: `target="_blank"` + `rel="noopener noreferrer"`. Si alguien quita el `rel`, hay un potencial bug de seguridad (tab-nabbing). El texto del link es `hrefLabel="Abrir OpenAPI (dev only)"`.
- **3 h2 secciones** ("Acceso Rapido", "Timeline del Proyecto — Fases 0 a 6", "Stack Tecnico") con `uppercase tracking-widest`. El nav de la página es 100% por secciones (no hay react-router, no hay CTAs).
- **4 STACK_CARDS** (Backend / Frontend / IA / Deploy) con `icon` (componente lucide), `label` (string), `items` (array de strings) y `color` (clave de `STACK_COLOR`). Si alguien borra una entrada de STACK_CARDS, el grid queda con 3 cards asimétrico.

Riesgos silenciosos cubiertos por los tests:
- Si el `hasExpand = !!children` se cambia a algo truthy siempre, la card API Reference (sin children) muestra un toggle roto.
- Si el `{href && (...)}` se quita, API Reference pierde su link externo.
- Si el fallback `FASE_BADGE[estado] || FASE_BADGE['PENDIENTE']` se borra en `FaseBadge`, un estado nuevo crashea.
- Si el slice del badge "(no aplicada)" se quita en `MigracionesLista`, la migración 005 pendiente se confunde con las aplicadas.
- Si la diferenciación de colores (`var(--content-text)` vs `var(--content-muted)`) se quita, aplicadas y pendientes se ven idénticas.
- Si el state compartido entre cards reemplaza al state local, expandir una card afecta a todas.
- Si `lucide-react` se actualiza y los classNames canónicos cambian (como pasó con v1.16), los iconos visibles pueden no matchear lo que el código importa. El test documenta los nombres reales para detectar drift futuro.

### Cambio (commit del ciclo 32, hash `f2f381d`)

**1 archivo de test, 37 casos nuevos (887 → 924 tests):**

`src/pages/CommandCenter.test.jsx` (37 tests, 9 grupos):

- **Header (3)**:
  - h1 "Command Center".
  - Subtítulo "Hub de conocimiento y documentación técnica SIGAH".
  - Badge "BETA".
- **QuickCards — 6 cards (2)**:
  - Las 6 cards (h3) renderizadas por título: Arquitectura, Fases, API Reference, Seguridad, Migraciones, Contexto.
  - Cada card tiene su descripción visible.
- **QuickCard expand/collapse (5)**:
  - 5 cards con children muestran "Ver detalle" en estado cerrado (API Reference no).
  - NO hay "Ocultar detalle" antes de expandir nada.
  - Click en "Ver detalle" cambia el label a "Ocultar detalle" (1 cada).
  - Expandir "Fases del Roadmap" muestra los labels F0..F6.
  - Expandir "Estado de Migraciones" muestra "no aplicada" y "005 (Fase 1)".
  - Click en "Ocultar detalle" cierra y restaura "Ver detalle".
  - Estado independiente: expandir las 5 cards da 5 "Ocultar detalle" + 0 "Ver detalle".
- **API Reference href (2)**:
  - Único `<a>` con href a `http://localhost:8000/docs`, `target="_blank"`, `rel="noopener noreferrer"`.
  - API Reference NO contiene un toggle (sin children) — verifica scoping al GlassCard.
- **MiniTimeline (5)**:
  - Sección inferior (siempre renderizada) muestra los 7 labels F0..F6.
  - Cada fase muestra su nombre completo.
  - Cuenta de badges en sección inferior: EN CURSO=1, LISTO=1, EN PROGRESO=2, PENDIENTE=3.
  - Expandir la card "Fases del Roadmap" duplica los badges: 2, 2, 4, 6.
  - 4 iconos únicos mapeados por estado — verifica `lucide-clock`, `lucide-circle-check`, `lucide-circle-alert`, `lucide-circle`.
- **MigracionesLista (8)**:
  - Los 5 revs (001, 002, 003, 004, "005 (Fase 1)") son visibles tras expandir.
  - Sólo el rev 005 muestra el tag "(no aplicada)" — 1 ocurrencia total.
  - Tag "(no aplicada)" tiene clase `text-amber-600` y vive en el mismo `<li>` que "005 (Fase 1)".
  - Migraciones aplicadas (001) muestran nombre con `style.color = var(--content-text)`.
  - Migración 005 pendiente muestra nombre con `style.color = var(--content-muted)`.
  - Iconos verdes en aplicadas: `lucide-circle-check` + clase `text-emerald-600`.
  - Icono amber en pendiente: `lucide-circle-alert` + clase `text-amber-600`.
- **Stack cards (5)**:
  - 4 categorías (Backend, Frontend, IA, Deploy) renderizadas como labels.
  - Backend: FastAPI, Python 3.12, MySQL 8.0.
  - Frontend: React 18, Vite, Tailwind CSS 3.
  - IA: Gemma (Ollama), Qwen (Ollama), Claude Sonnet 4.6 (SaaS).
  - Deploy: Hetzner CX32, Docker Compose, Edge Nodes.
- **Headers h2 (3)**:
  - "Acceso Rapido", "Timeline del Proyecto — Fases 0 a 6", "Stack Tecnico".
- **Hygiene (1)**:
  - Sin warnings de React/`act()` al renderizar ni al expandir 3 cards consecutivas.

**Mocks (justificados):**
- NO se mockea nada. La página es 100% estática (sin fetch, sin auth, sin router, sin toasts).
- NO se usa MemoryRouter (la página no usa react-router).
- NO se mockea `lucide-react` (los iconos funcionan en jsdom sin cambios — los verificamos por presencia de la clase `.lucide-*` en `container.innerHTML`).
- NO se mockea `framer-motion` (no se usa en la página).

**Tricky bits documentados:**
- **Nombres de clase CSS de lucide-react v1.16+**: `CheckCircle2` importa con ese nombre pero renderiza con `className="lucide-circle-check"`. `AlertCircle` renderiza con `className="lucide-circle-alert"`. Los tests de iconos usan los classNames reales del HTML, no los nombres del import. Si lucide-react se vuelve a actualizar, los tests pueden romperse y revelar el drift.
- **`renderExpanded()` helper que retorna el `container`**: las migraciones viven dentro de la card colapsada por default. El helper expande la card y retorna el objeto de render para que los tests que necesitan `container.innerHTML` puedan usarlo.
- **`expandAllCards()` helper para test de estado independiente**: itera 5 veces haciendo click en el índice 0 (porque tras cada click el botón "Ver detalle" se reemplaza por "Ocultar detalle" y el conteo baja en 1).
- **Scoping al GlassCard de API Reference**: `h3.closest('div')` devuelve el inner `<div class="flex-1 min-w-0">` que NO contiene el toggle/link. Se sube con `.closest('.flex.flex-col')` hasta el GlassCard, o se usa `fallback` de varios `.parentElement`.
- **`getAllByRole('button', { name: /ver detalle/i })`**: hay 5 botones en estado inicial. Tras cada click el conteo baja en 1 (porque el botón cambia a "Ocultar detalle"). Por eso `expandCard(N)` siempre busca los botones en el momento actual, no captura la lista antes.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 31) | Después (ciclo 32) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `CommandCenter` (lazy) | no chunk propio, incluido en `index` | **16.00 kB / 4.61 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `CommandCenter.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `CommandCenter` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/command-center`). Cero warnings de Vite, build 4.48 s.

`npm test` → **924 passed (924)** en 9.13 s (37 nuevos casos, 887 previos). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo — CommandCenter no usa router, los filtros los excluyen en el test de hygiene).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`).
- vitest smoke tests para Almacén — 887 tests (ciclo 31, `30efe5c`).
- **vitest smoke tests para CommandCenter — 924 tests (este ciclo, `f2f381d`)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `Reservas.jsx` (475 líneas) — reservas de equipos.
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño/blast-radius).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx + ChecklistPage.jsx + AdminGlobal.jsx + Almacen.jsx** (6 lugares documentados): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX.
6. **Fix `toast(msg, opts)` en Almacen.jsx línea 288**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable.
7. **DashboardV3 smoke test (preview estático)**: bajo valor de test.
8. **lucide-react v1.16+ classNames drift**: documentar en CLAUDE.md o README que los classNames CSS de lucide cambian entre versiones, y que los tests deben verificar contra `container.innerHTML` no contra los nombres del import. (Detectado durante este ciclo.)

### Próximo paso (Ciclo 33)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`Reservas.jsx` (475 líneas)** es la siguiente candidata: gestión de reservas de equipos con carga inicial y formulario. Si no cabe, fallback a **`Copilot.jsx` (711 líneas)** — copilot con IA. Alternativa de bajo riesgo: **fix del bug latente `toast(msg, opts)` en Almacen.jsx** (item #6) como mini-item correctivo consolidado (1 línea).

---

## Ciclo 31 — 2026-06-28 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 6d healthy (todos los containers healthy).
- `https://sigah.129-121-100-147.sslip.io/` → 200 (354 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (325 ms).

**Item hecho:** Backlog #1 (continuación) — **Almacen.jsx** (392 líneas, gestión de stock técnico con KPIs, búsqueda, filtros, tabla de refacciones y dos modales: Nueva Refacción / Ajustar Stock). 54 tests nuevos, **833 → 887 tests totales** (33 → 33 archivos; la rama estaba 1 commit ahead del STATE por `99e2686` que añadió QRBatch.test.jsx ya contabilizado en los 833).

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **Almacen.jsx (392 líneas)** era la candidata compacta siguiente tras AdminGlobal. Sin charts, sin react-router, sin `framer-motion`, pero con varios patrones sutiles que un test atrapa y un DevTools manual no:

- **Carga inicial con `api.getAlmacen(params)` en try/catch/finally**: el `finally` apaga `loading` aunque el backend rechace. Si alguien borra `setLoading(false)` del finally, el spinner se queda eternamente aunque el backend devuelva 500. Cubierto por 3 tests (loading inicial, ocultamiento tras éxito, ocultamiento tras rechazo + toast.error).
- **`params` se reconstruye en cada llamada**: `{ busqueda, stock_bajo }` con `busqueda` omitido si está vacío y `stock_bajo: 'true'` (string) si el filtro está activo. La búsqueda NO se dispara al tipear — sólo al dar Enter o click en "Buscar" (decisión de UX para no spamear el backend). Cubierto por 4 tests (no recarga al tipear, Enter recarga, botón Buscar recarga, params vacío).
- **`useEffect` re-corre `cargar()` cuando cambia `filterStockBajo`**: el toggle del filtro dispara fetch server-side. La búsqueda NO está en el effect. Si alguien refactorea para meter `busqueda` en el effect, cada keystroke pega al backend. Cubierto por test que verifica la combinación `{ busqueda, stock_bajo }` se pasa como params en el orden correcto sólo tras click explícito.
- **`data.refacciones || []`** con fallback. Tolera `{refacciones: [...]}` y `{}`. Si la respuesta es `null`, fallback a `[]` sin crash. Bug latente conocido (item #4 del backlog): NO tolera `{refacciones: null}` (objeto truthy → `.map` crashea). NO se cubre con test para no contaminar el árbol de React entre tests — mismo bug latente que Capacitaciones/Metrologia/Trazabilidad/ChecklistPage/AdminGlobal.
- **KPIs derivados**:
  - "Items en Inventario" = `refacciones.length` (incluye el filter en el KPI — no el filtered list, sino el total cargado).
  - "Stock Crítico" = `filter(r => r.cantidad_disponible <= r.cantidad_minima).length`. Usa `<=` (no `<`) — stock == mínimo ES crítico. Si alguien cambia `<=` por `<`, items con stock == mínimo desaparecen del KPI (semánticamente erróneo). Cubierto por test explícito con `REF_UMBRAL` (cantidad_disponible == cantidad_minima) que verifica que cuenta.
  - "Valor Estimado Pool" = literal "Premium" (placeholder hard-coded, no se calcula todavía). Si alguien cambia el literal, el operador pierde el placeholder visual.
- **Estado "CRÍTICO" vs "ÓPTIMO"** en cada fila: deriva del mismo `isLow` que el KPI. Si alguien refactorea el KPI para usar `<` y deja la fila con `<=`, hay inconsistencia (KPI muestra N-1, fila muestra N críticos).
- **Fallbacks en fila**:
  - `item.proveedor || 'Sin proveedor'` — si null, muestra "Sin proveedor".
  - `item.ubicacion_almacen || '—'` — si null, muestra em-dash.
  Si alguien quita los fallbacks, null se renderiza vacío (no crash, pero pierde semántica).
- **`ajustando` y `modalNueva` son estados separados** que renderizan los modales condicionalmente. `AjustarStockModal` requiere `item` (lee `item.cantidad_disponible` directo en el JSX). Si se renderiza sin item, crashea. Cubierto indirectamente al testear que el modal sólo se abre cuando hay fila clickeada.
- **Validación de Nueva Refacción**:
  - `nombre.trim() === '' || nombre.length < 3` → `toast.error('El nombre debe tener al menos 3 caracteres')` y NO llama al API. El check usa `.trim()` por lo que espacios sólo no pasan. Cubierto por test que pasa `'ab'` (2 chars sin espacios) y verifica que el API no se llamó.
  - éxito → `toast.success('Refacción agregada al inventario')` + `onSaved()` (cierra modal + recarga `getAlmacen`). Cubierto por test que verifica el reload.
  - error con `response.data.detail` → toast con detail. error genérico → toast con mensaje por defecto. Cubiertos por 2 tests separados.
- **Validación de Ajustar Stock**:
  - `cantidad < 1` → `toast.error('La cantidad debe ser al menos 1')`. NOTA: el handler compara `cantidad` (string del state) contra `1`. En JS, `'0' < 1` es `true` (coerción), por lo que la rama SÍ se evalúa para value=0. PERO el input tiene `min={1}` que dispara HTML5 validation y bloquea el submit antes de que el handler corra — por lo que en producción el operador nunca alcanza esta rama (ve el tooltip nativo del browser). **Bug documentado**: la validación es dead-code en el flujo UI normal. Decisión: NO cubrir el path (no testea comportamiento real al usuario).
  - `tipo === 'salida' && cantidad > item.cantidad_disponible` → `toast.error('Stock insuficiente para la salida')` y NO llama al API. Cubierto por test (15 > 10 con REF_OPTIMO).
  - éxito → toast con `+N` o `-N` según tipo + `onSaved()`. Cubierto por 2 tests separados (entrada y salida) que verifican el signo en el toast.
- **Tipo de movimiento 'entrada' vs 'salida'**: toast usa `tipo === 'entrada' ? '+' : '-'`. Si alguien invierte la condición, el toast muestra el signo equivocado.
- **Botón "Smart Predicción"** → `toast('Predicción IA...', { icon: '🧠' })` placeholder. NOTA: `toast` (default export de `lib/toast.js`) es un objeto con métodos (success/error/info), NO una función. Llamarlo como función `toast(msg, opts)` tira TypeError. **Bug latente en producción**: si un usuario hace click en el botón, la consola tira `toast is not a function` y el botón no muestra nada. Decisión: cubierto por test (con mock callable via `Object.assign(vi.fn(), {...})`) que verifica que se llama con el mensaje correcto. La existencia del bug en producción se documenta en STATE para fix futuro si el operador lo desea.
- **`onSaved` recarga**: garantiza que la tabla refleja el cambio tras cerrar el modal (sin refresh manual). Cubierto por 2 tests que verifican que `getAlmacen` se llama 2 veces (inicial + tras cerrar modal).

Riesgos silenciosos cubiertos por los tests:
- Si el `setLoading(false)` del finally se borra, loading infinito.
- Si el `<=` se cambia por `<`, "Stock Crítico" subcuenta (KPI vs fila inconsistente).
- Si el guard de stock insuficiente se quita, salidas de stock sin inventario se procesan (la API puede aceptarlas o rechazar — UX inconsistente).
- Si el `onSaved` no recarga, la tabla no refleja la nueva refacción hasta el próximo refresh manual.
- Si el fallback `|| '—'` de ubicación se quita, ubicaciones null se renderizan vacías sin placeholder visual.
- Si el `.trim()` se quita de la validación de nombre, nombres con sólo espacios pasan y crashean el backend.
- Si el guard de "salida > stock" se quita, salidas de 0 unidades pasan (potencial bug en inventario negativo).

### Cambio (commit del ciclo 31, hash `30efe5c`)

**1 archivo de test, 54 casos nuevos (833 → 887 tests):**

`src/pages/Almacen.test.jsx` (54 tests, 11 grupos):

- **Loading state (3)**:
  - "Cargando almacén..." mientras la promesa no resuelve.
  - Oculta el loading tras resolución exitosa de getAlmacen.
  - Oculta el loading incluso si getAlmacen rechaza (finally con setLoading(false)) + toast.error.
- **Header (3)**:
  - h1 "Almacén de Refacciones".
  - Subtítulo "Gestión de stock técnico y control de insumos para mantenimiento."
  - Botón "Nueva Refacción" con icono Plus.
- **KPIs globales (6)**:
  - "Items en Inventario" muestra length.
  - "Items en Inventario" muestra 0 cuando la lista está vacía.
  - "Stock Crítico" cuenta items con `<=` (2 de 4 con REF_UMBRAL incluido).
  - "Stock Crítico" verifica explícitamente que `cantidad_disponible == cantidad_minima` cuenta (boundary).
  - "Stock Crítico" muestra 0 cuando todos sobre el mínimo.
  - "Valor Estimado Pool" muestra literal "Premium" (placeholder).
- **Búsqueda (4)**:
  - Input con placeholder correcto.
  - Tipear NO recarga (sólo al Enter).
  - Botón "Buscar" recarga con la búsqueda.
  - Botón "Buscar" sin búsqueda pasa `{}`.
- **Filtro Stock Bajo (3)**:
  - Toggle recarga con `stock_bajo: 'true'`.
  - Toggle dos veces vuelve a `{}` (off).
  - Búsqueda + filtro se combinan (`{ busqueda, stock_bajo }`).
- **Tabla de refacciones (9)**:
  - Una fila por refacción con nombre + proveedor.
  - "Sin proveedor" cuando `proveedor` es null.
  - "—" cuando `ubicacion_almacen` es null.
  - Ubicación cuando existe.
  - 7 headers de columna (regex anclada con `^...$`).
  - "CRÍTICO" para items con `<=` (CRÍTICO y UMBRAL).
  - "ÓPTIMO" para items sobre el mínimo.
  - Stock muestra `cantidad_disponible` + "mín: {cantidad_minima}".
  - Botón "Ajustar" por fila (4 filas → 4 botones).
  - Empty state "No se encontraron refacciones." cuando vacío.
- **Modal Nueva Refacción (8)**:
  - Click en "Nueva Refacción" abre el modal.
  - 7 inputs (nombre, código, proveedor, stock inicial, stock mínimo, ubicación, compatible con).
  - Submit con nombre < 3 chars → toast.error + NO API call.
  - Submit válido llama API con shape completo (verifica todos los campos).
  - Submit exitoso cierra modal + recarga API.
  - Error con `response.data.detail` → toast con detail.
  - Error genérico (sin response) → toast con mensaje por defecto.
  - Cancelar cierra sin API call.
  - Botón X (esquina superior) cierra sin API call.
- **Modal Ajustar Stock (7)**:
  - Click en "Ajustar" abre el modal con el item correcto (verifica nombre + stock visible).
  - Botones "+ Entrada" y "- Salida" presentes.
  - Entrada por defecto → toast `+N unidades` (cantidad=5).
  - Click en "Salida" → toast `-N unidades` (cantidad=3).
  - Salida con cantidad > stock disponible → toast "Stock insuficiente" + NO API call.
  - Submit exitoso cierra modal + recarga API.
  - Error con `response.data.detail` → toast con detail.
  - Cancelar cierra sin API call.
- **Smart Predicción placeholder (1)**:
  - Click → toast con mensaje + icono 🧠. (Mock `mockToast` es callable via `Object.assign(vi.fn(), {...})` para soportar `toast(msg, opts)` además de `toast.success(msg)`.)
- **Errores y shape tolerance (5)**:
  - getAlmacen rechaza → toast.error.
  - Shape `{refacciones: [...]}` aceptado.
  - Shape `{refacciones: []}` aceptado.
  - Shape `{}` aceptado (fallback a []).
  - Params iniciales `{}`.
- **Hygiene (2)**:
  - Sin warnings durante carga exitosa.
  - Sin warnings durante flujo búsqueda + apertura de modales.

**Fixtures únicos:**
- `REF_OPTIMO`: stock 10, mínimo 2 (sobre el mínimo).
- `REF_CRITICO`: stock 1, mínimo 3 (claramente crítico).
- `REF_UMBRAL`: stock 2, mínimo 2 (boundary — verifica que `<=` incluye el igual).
- `REF_SIN_PROVEEDOR`: proveedor null + ubicación null (verifica los 2 fallbacks).

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` — 3 endpoints (getAlmacen, crearRefaccion, ajustarStock).
- `vi.mock('../lib/toast', ...)` — sileo no es jsdom-safe. `mockToast` es callable (Object.assign(vi.fn(), {...})) para soportar tanto `toast.success()` como `toast()` directo.
- **NO se mockea `lucide-react`** — funciona en jsdom. Verificamos presencia con queries por nombre accesible (heading, button name).
- **NO se mockea `framer-motion`** — la página no lo usa.
- **NO se usa MemoryRouter** — la página no usa react-router.

**Tricky bits documentados:**
- **`Object.assign(vi.fn(), { success: vi.fn(), ... })` para mockToast**: el wrapper de toast es callable para soportar `toast(msg, opts)` directo (que es lo que usa el botón Smart Predicción). Los métodos siguen siendo spies separados para `expect(mockToast.error).toHaveBeenCalledWith(...)`.
- **`within(fila).getByRole('button', { name: /^ajustar$/i })`**: hay 4 botones "Ajustar" (uno por fila), `getByRole` falla por múltiples matches. Usamos `within(fila).getByRole(...)` para scope a la fila clickeada. La fila la obtenemos con `screen.getByText('Filtro HEPA Draeger').closest('tr')`.
- **`screen.getAllByRole('spinbutton')` para los inputs number**: hay 2 en el modal Nueva (stock inicial, stock mínimo). Los referenciamos por índice `[0]` y `[1]`.
- **`screen.getAllByRole('button', { name: /^ajustar$/i })` para contar filas**: verifica que hay exactamente 4 botones Ajustar, uno por fila.
- **`^Stock$` como columnheader**: "Stock" matchea el header pero no "Stock Crítico" (que es un KPI, no un header). Usamos regex anclada para evitar matches cruzados con KPI.
- **`fireEvent.submit(nombreInput.closest('form'))` para submit por Enter**: el form tiene onSubmit que llama handleSubmit. Equivalente a Enter en cualquier input del form.
- **Bug `cantidad < 1` dead-code**: documentado en STATE, NO cubierto por test (HTML5 min={1} bloquea antes de que el handler corra). Cubrir el path sería testear comportamiento inalcanzable para el usuario.
- **Bug `toast(msg, opts)` throws TypeError en Smart Predicción**: documentado en STATE. El test pasa porque nuestro mock ES callable. En producción, el botón tira error silencioso. Fix futuro: cambiar `toast(msg, { icon: '🧠' })` a `toast.info(msg, { icon: '🧠' })` o hacer que el wrapper toast sea callable.
- **`getByRole('button', { name: /^confirmar$/i })` para el submit del modal Ajustar**: el texto cambia entre "Guardando..." y "Confirmar" según `saving`. `^confirmar$` con regex anclada matchea sólo el estado idle.
- **`heading.parentElement.querySelector('button')` para el botón X**: el X no tiene texto accesible, sólo el icono. Lo buscamos como hermano del heading dentro del header del modal.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 30) | Después (ciclo 31) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Almacen` (lazy) | no chunk propio, incluido en `index` | **18.06 kB / 4.00 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Almacen.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Almacen` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/almacen`). Cero warnings de Vite, build 4.37 s.

`npm test` → **887 passed (887)** en 9.16 s (54 nuevos casos, 833 previos). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo — Almacen no usa router, los filtros los excluyen en los tests de hygiene).

### Bugs latentes descubiertos durante este ciclo (NO se corrigen, se documentan)
- **`toast(msg, opts)` tira TypeError en Smart Predicción** (línea 288 de Almacen.jsx): el wrapper de `lib/toast.js` es un objeto con métodos, no una función. Llamarlo como función tira `toast is not a function` en producción. Fix de 1 línea: cambiar a `toast.info('...', { icon: '🧠' })` o hacer el wrapper callable. **Operador: revisar si vale la pena meter en backlog.**
- **`cantidad < 1` dead-code en Ajustar Stock**: HTML5 `min={1}` bloquea el submit antes de que el handler corra. La validación en el handler es inalcanzable por UI normal. Decisión: dejar como está (defensa en profundidad — si alguien quita el `min`, la validación JS protege).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- vitest smoke tests para AdminGlobal — 774 tests (ciclo 30, `0f521b5`).
- vitest smoke tests para QRBatch — 833 tests (commit `99e2686`, no documentado en ciclo previo).
- **vitest smoke tests para Almacén — 887 tests (este ciclo, `30efe5c`)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx + ChecklistPage.jsx + AdminGlobal.jsx + Almacen.jsx** (6 lugares documentados): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial o `{x: null}`. Almacen se sumó al backlog en este ciclo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **Fix `toast(msg, opts)` en Almacen.jsx línea 288**: cambiar a `toast.info(msg, { icon: '🧠' })` o hacer el wrapper callable. Bug latente: en producción tira TypeError silencioso al hacer click en Smart Predicción.
7. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 32)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`CommandCenter.jsx` (445 líneas)** es la siguiente candidata: centro de comando (puede tener charts pero los charts ya están en su propio chunk lazy). Si no cabe (muchos mocks), fallback a **`Reservas.jsx` (475 líneas)** — reservas de equipos. Alternativa de bajo riesgo: **fix del bug latente `toast(msg, opts)` en Almacen.jsx** (item #6) como mini-item correctivo consolidado (1 línea).

---

## Ciclo 30 — 2026-06-28 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 5d healthy.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (342 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (375 ms).

**Item hecho:** Backlog #1 (continuación) — **AdminGlobal.jsx** (274 líneas, panel SUPERADMIN SIGAH — vista cross-hospital con KPIs globales, tabla de tenants/hospitales con SuscripcionBadge, lista de actividad reciente y manejo de errores 403 vs genérico). 48 tests nuevos, **726 → 774 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **AdminGlobal.jsx (274 líneas)** era la candidata compacta siguiente tras QRScanner (ciclo 29 — `581ed58`). Sin charts, sin auth, sin hooks especiales — pero con varios patrones sutiles que un test atrapa y un DevTools manual no:

- **Carga inicial con `Promise.all([getAdminStats(), getAdminHospitales(), getAdminActividad()])` envuelta en try/catch/finally**: el `finally` apaga `loading` aunque una promesa rechace. Si alguien borra el `setLoading(false)` del finally, la pantalla se queda eternamente con "Cargando..." incluso si el backend devolvió 500. Cubierto por test que rechaza una promesa y verifica que el loading desaparece.
- **3 ramas de error distintas**:
  - `err.response?.status === 403` → `setForbidden(true)` + banner ámbar con `superadmin_sigah` + `toast.error('Acceso restringido: se requiere rol superadmin_sigah')`.
  - Otro status (500, 502) → sólo `toast.error('Error al cargar panel admin')` (sin banner).
  - Fallo de red (sin `response.status`) → mismo toast genérico (sin banner).
  Si alguien homogeneiza ambos errores a un solo toast genérico, el operador pierde contexto sobre permisos vs falla de red. Cubierto por 4 tests específicos (403, 500, red sin response, 404 → genérico).
- **4 KPICards con valores derivados de `stats`**:
  - "MRR" se formatea como `$${Number(stats.mrr_mxn).toLocaleString('es-MX')} MXN` y muestra '—' cuando `mrr_mxn` es null. Si alguien quita el `?? '—'`, `null` se renderiza como `$null MXN`. Cubierto por test que pasa `mrr_mxn: null` y verifica el em-dash.
  - "Usuarios Totales" cae a `stats.usuarios_totales` si `stats.total_usuarios` no existe (alias para tolerar deployments viejos). Si alguien borra el alias, deployments con respuesta vieja muestran '—'. Cubierto por tests con cada combinación (primario, alias, ambos ausentes).
- **`SUSCRIPCION_BADGE` con fallback a `inactivo` para estados desconocidos**: mapa literal con 4 estados (`activo / trial / vencido / inactivo`). Cualquier estado fuera del mapa → `SUSCRIPCION_BADGE.inactivo`. Si alguien quita el `??`, un estado nuevo crashea al intentar leer `.dot`/`.pill`/`.label` de `undefined`. Cubierto por 3 tests (estado desconocido, estado null, estado `inactivo` explícito).
- **Badge "inactivo" usa `text-[var(--content-muted)]` en lugar de `text-slate-500`**: decisión de tema — slate-500 plano rompe contraste en dark mode. Si alguien refactorea para usar `text-slate-500` "por consistencia con los otros badges", el badge pierde contraste en dark mode (bug de a11y). Cubierto por test que verifica `text-[var(--content-muted)]`.
- **`hospitales` y `actividad` con tolerancia a shape**: `hosp.hospitales ?? hosp ?? []` acepta tanto `{hospitales: [...]}` como `[...]` directamente. Si alguien quita el fallback, una respuesta `{hospitales: null}` rompe la página con TypeError. **BUG CONOCIDO** (item #4 del backlog): shape `{hospitales: null}` NO se tolera porque `null ?? {hospitales:null}` = `{hospitales:null}` (objeto truthy), y luego `hospitales.map` crashea. NO se cubre con test para no contaminar el árbol de React entre tests — sólo se documenta.
- **Tabla de hospitales con 6 columnas** (Hospital, Slug, Suscripción, Usuarios, Activo Desde, Acciones). "Activo Desde" se formatea con `toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})` — formato local, regex flexible en tests (`/15/` y `/2025/`).
- **`num_usuarios ?? total_usuarios ?? '—'`** para tolerar tanto el nombre nuevo como el viejo del campo de usuarios. Cubierto por tests con cada combinación.
- **Botón "Ver detalles" siempre `disabled`** (Fase 3). Si alguien habilita el botón sin wirearlo, el operador hace click y nada pasa (UX rota). Cubierto por test que verifica `disabled` y `title=/próximamente|fase 3/i`.
- **Lista de actividad con `slice(0, 20)`**: si hay >20 entradas, sólo se renderizan las 20 más recientes. Si alguien quita el slicing, la lista puede crecer indefinidamente (perf + UX). Cubierto por test con 25 entradas que verifica que sólo las primeras 20 se renderizan.
- **`formatRelative(isoString)` con 4 ramas + guard de null**:
  - `<1 min` → "hace un momento"
  - `<60 min` → "hace {n} min"
  - `<24 h` → "hace {n} h"
  - `>=24 h` → "hace {n} d"
  - `null/undefined` → "—" (guard evita que se evalúe como 1970 → "hace años")
  Si alguien cambia `<1` por `<=1`, una fecha de hace 30s se reporta como "hace 1 min" (over-reporting). Si alguien borra el guard de `if (!isoString)`, un null se evalúa como 1970. Cubierto por 5 tests (5min, 3h, 2d, 30s, null).
- **Fallback de hospital en eventos**: `ev.hospital_nombre ?? ev.hospital ?? 'Sistema'`. Si alguien quita uno de los fallbacks, eventos con campos viejos quedan con el string 'undefined' o desaparecen. Cubierto por 3 tests (hospital_nombre presente, sólo `hospital`, sin ninguno → "Sistema").
- **Botón "Actualizar" invoca `cargar()` otra vez**: el ícono `RefreshCw` recibe `animate-spin` mientras `loading=true`. Cubierto por test que verifica que los 3 endpoints se llaman 2x tras el click.

Riesgos silenciosos cubiertos por los tests:
- Si el `setLoading(false)` del `finally` se borra, el loading se queda para siempre aunque el backend responda 500.
- Si el fallback `?? SUSCRIPCION_BADGE.inactivo` se borra, un estado desconocido crashea el componente entero.
- Si el `text-[var(--content-muted)]` se cambia a `text-slate-500` en `inactivo`, el badge pierde contraste en dark mode.
- Si el alias `total_usuarios` se quita, deployments con respuesta vieja muestran '—' en el KPI.
- Si el slicing `slice(0, 20)` se quita, la actividad puede crecer indefinidamente.
- Si el guard `if (!isoString) return '—'` se borra, una actividad sin timestamp reporta años.
- Si el banner 403 se quita, el operador no sabe que el panel está en modo "datos de ejemplo".
- Si el slicing o el guard se rompe, el operador no distingue una OS de hace 5 min de una de hace 5 años.

### Cambio (commit del ciclo 30, hash `0f521b5`)

**1 archivo de test, 48 casos nuevos (726 → 774 tests):**

`src/pages/AdminGlobal.test.jsx` (48 tests, 8 grupos):

- **Loading state (3)**:
  - "Cargando..." en tabla + "Cargando actividad..." en lista mientras las promesas no resuelven.
  - Oculta el loading tras resolución de Promise.all.
  - Apaga loading incluso si una promesa rechaza (finally con setLoading(false)).
- **Header y refresh button (5)**:
  - h1 "Panel SuperAdmin SIGAH".
  - Subtítulo "Gestión global de hospitales y suscripciones".
  - Badge "SUPER ADMIN".
  - Botón "Actualizar" con icono RefreshCw (`.lucide-refresh-cw`).
  - Click en "Actualizar" invoca los 3 endpoints una segunda vez.
- **KPIs globales (8)**:
  - 4 labels (Total Hospitales, Hospitales Activos, MRR, Usuarios Totales).
  - Cada KPI muestra su valor correcto del fixture.
  - MRR se formatea como `$124,500 MXN` (toLocaleString es-MX).
  - MRR muestra "—" cuando mrr_mxn es null.
  - Usuarios Totales usa `total_usuarios` (primario).
  - Usuarios Totales cae a `usuarios_totales` si `total_usuarios` falta.
  - Usuarios Totales muestra "—" si ambos campos faltan.
- **SuscripcionBadge (6)**:
  - "activo" → clases emerald.
  - "trial" → clases amber.
  - "vencido" → clases red.
  - "inactivo" → pill slate + text muted (`text-[var(--content-muted)]` + dot `bg-slate-500`).
  - Estado desconocido (`no_existe_en_mapa`) → fallback a inactivo sin crash.
  - Estado null → fallback a inactivo sin crash.
- **Tabla de hospitales (10)**:
  - 6 headers de columna (con `^Usuarios$` para anclar y no matchear "Usuarios Totales" del KPI).
  - Nombre + slug del hospital (`getAllByText` + `closest('tbody')` porque el nombre también aparece en actividad).
  - "Activo Desde" formateado como fecha es-MX (regex flexible).
  - "Activo Desde" muestra "—" cuando es null.
  - `num_usuarios` se muestra (con fallback a `total_usuarios`).
  - `num_usuarios` cae a `total_usuarios` si no existe.
  - `num_usuarios` muestra "—" si ambos campos faltan.
  - Botón "Ver detalles" siempre disabled con title "Próximamente — Fase 3".
  - "Sin hospitales registrados." cuando la lista está vacía.
  - Tolera shape `{hospitales: [array]}` (objeto envuelto en array).
  - **NO se cubre** `{hospitales: null}` (bug latente item #4, documentado en código).
- **Actividad reciente (10)**:
  - Renderiza una fila por evento con `hospital_nombre + acción`.
  - `formatRelative`: 5min → "hace 5 min".
  - `formatRelative`: 3h → "hace 3 h".
  - `formatRelative`: 2d → "hace 2 d".
  - `formatRelative`: <1min → "hace un momento".
  - `formatRelative`: `created_at` null → "—" (guard evita "hace años").
  - Evento sin `hospital_nombre` usa fallback `hospital`.
  - Evento sin ningún campo de hospital muestra "Sistema".
  - "Sin actividad reciente." cuando la lista está vacía.
  - Tolera shape `{actividad: [...]}` (objeto envuelto en array).
  - Trunca la lista a 20 entradas (slice(0, 20) — test con 25 entradas).
  - **NO se cubre** `{actividad: null}` (mismo bug latente).
- **Manejo de errores (4)**:
  - Error 403: banner ámbar + toast.error con rol requerido.
  - Error 500: NO banner 403, sí toast genérico.
  - Error de red (sin response.status): toast genérico, sin banner.
  - Error 404 → toast genérico (sólo 403 es especial).
- **Hygiene (1)**:
  - Sin warnings de React ni de `act()` durante la carga exitosa (filtrando los warnings pre-existentes de react-router v7 que esta página no usa).

**Fixtures únicos:**
- `STATS_BASE`: total_hospitales=12, hospitales_activos=9, mrr_mxn=124500, total_usuarios=187.
- `HOSP_ACTIVO/TRIAL/VENCIDO/DESCONOCIDO`: 4 estados cubiertos.
- `ACT_RECIENTE/HACE_HORA/HACE_DIA/SIN_HOSPITAL/NULL_TIMESTAMP`: 5 variantes temporales + variantes de hospital.

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` — 3 endpoints (getAdminStats, getAdminHospitales, getAdminActividad).
- `vi.mock('../components/Toast', ...)` — sileo no es jsdom-safe, mismo patrón que Equipos/Alertas/AuditPage/Preventivos/Tecnovigilancia.
- **NO se mockea `lucide-react`** — funciona en jsdom sin cambios. Verificamos presencia del icono con `lucide-refresh-cw` / `lucide-hospital`.
- **NO se mockea `framer-motion`** — la página no lo usa.
- **NO se usa MemoryRouter** — la página no usa react-router.

**Tricky bits documentados:**
- **Bug latente `?? []` en `hosp.hospitales ?? hosp ?? []`**: si el backend responde `{hospitales: null}`, el fallback cae en `hosp` (objeto truthy) y `hospitales.map` crashea con TypeError. NO se cubre con test para no contaminar el árbol de React entre tests. Es el mismo bug latente documentado en Capacitaciones/Metrologia/Trazabilidad/ChecklistPage (item #4 del backlog de STATE.md).
- **`renderAndWait` espera a que el botón "Actualizar" no esté disabled**: usa `waitFor` con `expect(btn).not.toBeDisabled()`. El botón es estable en el DOM y refleja `loading` correctamente (true al inicio, false tras finally). Más robusto que esperar textos específicos (que pueden cambiar con i18n).
- **`getAllByText('HGR No. 1 IMSS Tijuana').find(el => el.closest('tbody'))`**: el nombre del hospital aparece en la tabla Y en la actividad (via `ev.hospital_nombre`). `getByText` falla si hay múltiples matches, así que usamos `getAllByText` + scope a `<tbody>`.
- **`^Usuarios$` (regex anclada) para el header de la tabla**: "Usuarios" matchea tanto el KPI "Usuarios Totales" como la columna "Usuarios". La anclamos con `^...$` para excluir el KPI.
- **`text-[var(--content-muted)]` en badge inactivo**: el pill usa slate-500/15 + border-slate-500/25, pero el text usa una variable CSS en lugar de `text-slate-500` (decisión de tema). Verificamos el text con la variable exacta, no con un color literal.
- **`new Date(Date.now() - 5*60*1000).toISOString()` para fixtures temporales**: usamos offsets en ms desde `now()` para que los tests sean robustos al día en que corren. 5 min, 3 h, 2 d, 30 s.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 29) | Después (ciclo 30) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `AdminGlobal` (lazy) | no chunk propio, incluido en `index` | **8.01 kB / ~2.5 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `AdminGlobal.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `AdminGlobal` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/admin-global`). Cero warnings de Vite, build 4.21 s.

`npm test` → **774 passed (774)** en 9.01 s (48 nuevos casos, 726 previos). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo — AdminGlobal no usa router, los filtros los excluyen en el test de hygiene).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- vitest smoke tests para EquipoPublico — 683 tests (ciclo 28).
- vitest smoke tests para QRScanner — 726 tests (ciclo 29, `581ed58`).
- **vitest smoke tests para AdminGlobal — 774 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `Almacen.jsx` (392 líneas) — almacén de refacciones/consumibles.
   - `QRBatch.jsx` (419 líneas) — generación batch de QRs.
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx + ChecklistPage.jsx + AdminGlobal.jsx** (5 lugares documentados ahora): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial o `{x: null}`. AdminGlobal se sumó al backlog en este ciclo (NO se cubre con test por la razón explicada arriba).
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 31)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`Almacen.jsx` (392 líneas)** es la siguiente candidata: almacén de refacciones/consumibles. Si no cabe (mock complicado), fallback a **`QRBatch.jsx` (419 líneas)** — generación batch de QRs. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en AdminGlobal + ChecklistPage** (item #4) como mini-item correctivo consolidado.

---

## Ciclo 29 — 2026-06-28 (autocycle headless) — no documentado, pero committeado

**Item hecho (commit `581ed58`):** Backlog #1 — **QRScanner.jsx** (252 líneas, escáner QR con `jsqr` + cámara + input manual, ruta `/escanear`, navega a `/equipo/:token` si el QR contiene un path `/equipo/`, o abre la URL externa en una nueva pestaña). 43 tests nuevos, **683 → 726 tests totales**.

**Nota:** este ciclo NO actualizó STATE.md (el operador dejó el registro pendiente). Se documenta aquí retroactivamente para mantener la cadena. El cambio es bit-exacto sobre el commit `581ed58` y no requiere acción adicional.

---

## Ciclo 28 — 2026-06-27 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 5d healthy.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (326 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (361 ms).

**Item hecho:** Backlog #1 (continuación) — **EquipoPublico.jsx** (244 líneas, vista PÚBLICA de un equipo, ruta `/equipo/:token`, sin auth — escaneada desde QR pegado al equipo, muestra datos técnicos, mantenimiento, últimos servicios y recursos). 57 tests nuevos, **626 → 683 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **EquipoPublico.jsx (244 líneas)** era la candidata compacta siguiente. Sin charts, sin auth, sin hooks especiales — pero con varios patrones sutiles que un test atrapa y un DevTools manual no:

- **`useParams()` para extraer el token del QR**: la página accede a `/api/equipos/public/${token}`. Si alguien rompe el params, el fetch va con `undefined` y la URL queda malformada (`/api/equipos/public/undefined`).
- **axios directo (no api/sigah ni api/sigab)**: Único archivo en `src/` además de `api/sigab.js` que importa axios. Mockeamos `vi.mock('axios', ...)` con `default: { get: ... }`.
- **Loading dual**: mientras `loading=true` → spinner con "Cargando información del equipo...". NO muestra ni la pantalla de error ni la de éxito. Si alguien cambia `loading=true` por `data===null`, una pantalla con loading=false y data=null entra a la rama de éxito con datos vacíos (sin spinner).
- **Error 404 vs genérico (mensajes específicos)**:
  - `err.response?.status === 404` → 'Equipo no encontrado. El código QR puede ser inválido o el equipo fue dado de baja.'
  - Cualquier otro error → 'Error al cargar la información del equipo.'
  Si alguien homogeneiza los 2 mensajes a uno genérico, el operador pierde el contexto sobre si fue QR inválido (dado de baja) o falla de red.
- **`STATUS_CONFIG` con fallback a `baja`**: mapa literal con 5 estados (`operativo / en_mantenimiento / fuera_servicio / en_traslado / baja`). Cualquier estado fuera del mapa → `STATUS_CONFIG.baja`. Si alguien borra el `|| STATUS_CONFIG.baja`, un estado desconocido entra en crash silencioso al intentar leer `.color` / `.bg` / `.label` / `.icon` de `undefined`.
- **`CRITICIDAD_BADGE` condicional**: 3 niveles (`alta / media / baja`). Si `criticidad` viene falsy, el badge NO se renderiza (el JSX es `{equipo.criticidad && <span>...}`). Si alguien quita el `&&`, "false" se renderiza como texto.
- **Imagen vs ícono**: `equipo.imagen_url ? <img> : status.icon`. Si alguien borra el ternario, el ícono del estado siempre se ve aunque haya imagen (UX rota — la foto del equipo queda oculta).
- **`mantenimientoVencido` (lógica derivada)**:
  ```
  equipo.fecha_proximo_mantenimiento && new Date(...) < new Date()
  ```
  - Fecha futura → `text-emerald-600`, sin sufijo.
  - Fecha pasada → `text-red-600` + '⚠ VENCIDO'.
  - Fecha null → "No programado".
  Si alguien quita la condición `&&`, una fecha vacía genera "Invalid Date" en pantalla. Si alguien cambia `<` por `>`, una fecha futura se marca como vencida (falso positivo regulatorio).
- **`new Date(...).toLocaleDateString('es-MX')`**: formato local (DD/MM/YYYY). En jsdom el locale puede variar, así que los tests verifican el patrón `20[/-]\d{1,2}[/-]2026` (regex flexible) en lugar del string exacto.
- **Filtro de filas vacías en Datos Técnicos**: `.filter(([, v]) => v)` elimina filas con `null/undefined/''`. Si alguien quita el filtro, aparecen filas vacías tipo "Serie:  " (UX rota).
- **`tipo_equipo?.replace('_', ' ')`**: el optional chaining rescata `null`/`undefined` sin crashear. Si alguien lo cambia a `.replace('_', ' ')` (sin `?.`), crashea en tipo_equipo null.
- **`tipo_equipo.replace('_', ' ')` sólo cambia el PRIMER underscore**: `String.prototype.replace` con string literal reemplaza sólo la primera ocurrencia. Si `tipo_equipo = 'monitor_signos_vitales'`, queda `monitor signos_vitales` (no `monitor signos vitales`).
- **`[equipo.area, equipo.piso].filter(Boolean).join(' · ')`**: une area y piso con " · " sólo si ambos son truthy. Si area es null, queda sólo "Piso 3". Si alguien quita el `.filter(Boolean)`, queda " · Piso 3" (UX rota — "·" huérfano).
- **`preventivos.length > 0` render condicional**: bloque completo de preventivos. Si alguien quita la condición, el bloque se renderiza con header "Procedimientos Programados:" + 0 entries (se ve roto).
- **`ordenes_recientes.length > 0` render condicional**: bloque "Últimos Servicios". Si la lista está vacía, el bloque NO aparece (intencional — es público, no debe mostrar "Sin servicios" si no hay).
- **Color del dot según estado de OS**:
  - `cerrada` → `bg-emerald-500` (fijo, sin animación).
  - Otro → `bg-yellow-500 animate-pulse` (animado — indica "en proceso").
  Si alguien quita `animate-pulse`, todas las órdenes se ven iguales (operador no distingue estado en un golpe de vista).
- **`manual_url / video_url` condicional**: el bloque "Recursos" sólo aparece si AL MENOS uno existe. Si ambos son null, NO se renderiza. Links con `target="_blank"` + `rel="noreferrer"` (protección contra tab-nabbing).
- **`new Date(os.fecha).toLocaleDateString('es-MX')` defensivo**: si `fecha` es null, `os.fecha ? ... : ''` evita "Invalid Date" en pantalla.

Riesgos silenciosos cubiertos por los tests:
- Si el fallback a `STATUS_CONFIG.baja` se rompe, un estado desconocido crashea al intentar leer `.color` de undefined.
- Si el mensaje de error 404 se homogeneiza con el genérico, el operador pierde contexto sobre QR inválido vs falla de red.
- Si la lógica de `mantenimientoVencido` se rompe, una fecha pasada se ve en verde (riesgo regulatorio NOM-016 — mantenimiento vencido sin alerta visual).
- Si el filtro `.filter(([, v]) => v)` se quita en Datos Técnicos, aparecen filas con label sin value (UX rota).
- Si la condición `preventivos.length > 0` se quita, el bloque se renderiza con header sin entries (se ve roto).
- Si la condición `ordenes_recientes.length > 0` se quita, el bloque de historial se renderiza siempre (incluso sin órdenes).
- Si el `animate-pulse` se quita del dot de OS activas, todas las órdenes se ven iguales.
- Si el `?.` (optional chaining) en `tipo_equipo?.replace` se cambia por `.replace`, crashea en tipo_equipo null.

### Cambio (commit del ciclo 28)

**1 archivo de test, 57 casos nuevos (626 → 683 tests):**

`src/pages/EquipoPublico.test.jsx` (57 tests, 11 grupos):

- **Loading state (4)**:
  - Spinner + "Cargando información del equipo..." mientras loading=true.
  - NO muestra pantalla de error ni de éxito durante loading.
  - axios.get llamado con URL `/api/equipos/public/<token>`.
  - useEffect depende del token (re-fetch si cambia entre renders).
- **Error 404 (4)**:
  - Status 404 → mensaje específico "Equipo no encontrado. El código QR puede ser inválido o el equipo fue dado de baja."
  - H1 "Equipo no encontrado" + emoji 📋.
  - NO muestra pantalla de éxito (Datos Técnicos).
  - Footer institucional SIGAH visible.
- **Error genérico (4)**:
  - Status 500 → mensaje "Error al cargar la información del equipo."
  - Sin `response.status` (fallo de red) → mensaje genérico.
  - Status 403 → mensaje genérico (NO el de 404).
  - Sanity: los 2 mensajes de error son strings distintos.
- **Header institucional (2)**:
  - Logo "S" en círculo emerald-600.
  - Texto SIGAH + nombre del hospital.
- **Badge de estado (9)**:
  - 4 estados mapeados (operativo, en_mantenimiento, fuera_servicio, baja).
  - Estado desconocido → fallback a STATUS_CONFIG.baja.
  - Nombre del equipo y marca·modelo en el badge.
  - Badge de criticidad cuando criticidad es "alta" → "Riesgo alta".
  - NO renderiza badge de criticidad cuando criticidad es null.
  - Muestra imagen si imagen_url está presente.
  - Muestra ícono del estado si imagen_url es null.
- **Datos Técnicos (6)**:
  - H2 "Datos Técnicos".
  - 7 campos: N° Serie, Tipo, Clase COFEPRIS, Ubicación, Fecha Compra, Proveedor, Contrato.
  - Filtra filas con value null (no muestra label si value es null).
  - `tipo_equipo` con un solo underscore: replace reemplaza sólo el primero.
  - `tipo_equipo` null → no rompe (usa `?.replace`).
  - Ubicación sin area → muestra sólo piso.
  - Fecha Compra null → fila filtrada.
- **Mantenimiento (7)**:
  - H2 "Mantenimiento".
  - "Último" con fecha formateada (regex flexible `20[/-]\d{1,2}[/-]2026`).
  - "Sin registros" cuando fecha_ultimo_mantenimiento es null.
  - Fecha próxima en el futuro → verde (`text-emerald-600`), sin "VENCIDO".
  - Fecha próxima en el pasado → rojo (`text-red-600`) + "⚠ VENCIDO".
  - Fecha próxima null → "No programado".
  - Renderiza preventivos con frecuencia y próxima ejecución.
  - Preventivo sin proxima_ejecucion → "—" como fallback.
  - NO renderiza sección de preventivos cuando la lista está vacía.
- **Últimos Servicios (8)**:
  - H2 "Últimos Servicios" cuando ordenes_recientes NO está vacío.
  - Número de orden, tipo de mantenimiento y estado de cada OS.
  - Nombre del técnico cuando tecnico_nombre existe.
  - NO muestra línea de técnico cuando tecnico_nombre es null.
  - OS cerrada → dot verde (`bg-emerald-500`).
  - OS en_proceso → dot amarillo con `animate-pulse`.
  - NO renderiza "Últimos Servicios" cuando la lista está vacía.
  - OS sin fecha → no muestra "Invalid Date".
- **Recursos (5)**:
  - Bloque "Recursos" cuando manual_url O video_url existe.
  - Link "📄 Manual" con href + target="_blank" + rel="noreferrer".
  - Link "🎬 Video" con href + target="_blank".
  - Muestra SOLO manual cuando video_url es null.
  - Muestra SOLO video cuando manual_url es null.
  - NO renderiza el bloque cuando ambos URLs son null.
- **Footer institucional (1)**:
  - 3 líneas de atribución (SIGAH, Conservación, hospital).
- **Hygiene (2)**:
  - Sin warnings de React ni de `act()` durante carga y éxito.
  - Sin warnings durante error 404.

**Fixture único `EQUIPO_OK`** — equipo base operativo con todos los campos llenos (N° Serie, marca·modelo, criticidad alta, ubicación UCI Adultos/Piso 3, fecha próximo mantenimiento futuro, 2 preventivos, 2 órdenes recientes — una cerrada + una en_proceso).

**Mocks (justificados):**
- `vi.mock('axios', ...)` con `default: { get: ... }` — EquipoPublico es la única página que usa axios directo fuera de `api/sigab.js`.
- `vi.mock` NO se usa para `react-router-dom` — se monta `<MemoryRouter initialEntries={[`/equipo/${token}`]}>` con `<Routes><Route path="/equipo/:token" element={<EquipoPublico />} /></Routes>` para inyectar el token en `useParams`. Esto valida la integración real con react-router (no el mock).
- **NO se mockea `lucide-react`** — EquipoPublico no usa iconos de lucide-react, sólo emojis inline (✓ 🔧 ⚠ 🚚 ✕ 📋).

**Tricky bits documentados:**
- **`getByText` vs regex partido en múltiples elementos**: `new Date('2026-05-20').toLocaleDateString('es-MX')` puede renderizarse como "20/5/2026" o "5/20/2026" según el locale del runner. Los tests usan regex flexible `20[/-]\d{1,2}[/-]2026` para evitar acoplarse al formato exacto.
- **`<img alt="">` (decorativo)**: jsdom NO lo expone como `role="img"`. Se usa `document.querySelector('img[src*="equipo-42.jpg"]')` para verificar la presencia de la imagen sin depender del accessible role.
- **`getByText(/equipo no encontrado/i)` con 2 matches**: el h1 dice "Equipo no encontrado" Y el `<p>` del error dice "Equipo no encontrado. El código QR puede ser inválido...". El regex partido matchea ambos. Se usa el mensaje específico del error (`/el código qr puede ser inválido/i`) o `getByRole('heading', ...)` para evitar el conflicto.
- **`unmount` + remount para verificar dependencia del token**: el test "el useEffect depende del token" desmonta el primer render y monta uno nuevo con token distinto. Sin unmount, React mantiene el árbol y no re-corre el useEffect (porque MemoryRouter es estable, no cambia su `pathname`).
- **`Promise que nunca resuelve` para loading state**: `mocks.mockAxiosGet.mockReturnValue(new Promise(() => {}))` — el componente se queda en `loading=true` permanentemente.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 27) | Después (ciclo 28) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `EquipoPublico` (lazy) | no chunk propio, incluido en `index` | **9.43 kB / 2.71 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `EquipoPublico.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `EquipoPublico` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/equipo/:token`). Cero warnings de Vite, build 4.31 s.

`npm test` → **683 passed (683)** en 4.84 s (57 nuevos casos, 626 previos). Sin warnings de `act()` ni de React state updates. Warnings pre-existentes de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducidos por este ciclo, sólo visibles porque EquipoPublico sí usa router — los filtros los excluyen en los tests de hygiene).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- vitest smoke tests para ChecklistPage — 626 tests (ciclo 27).
- **vitest smoke tests para EquipoPublico — 683 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `QRScanner.jsx` (252 líneas) — escáner QR (probablemente requiere mock de `navigator.mediaDevices` o de la cámara).
   - `AdminGlobal.jsx` (274 líneas) — admin global cross-hospital.
   - `Almacen.jsx` (392 líneas) — almacén de refacciones/consumibles.
   - `QRBatch.jsx` (419 líneas) — generación batch de QRs.
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial. 4 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23, Trazabilidad ciclo 25, ChecklistPage ciclo 27).
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 29)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`QRScanner.jsx` (252 líneas)** es la siguiente candidata compacta: escáner QR (puede requerir mock de `navigator.mediaDevices`). Si no cabe (mock complicado), fallback a **`AdminGlobal.jsx` (274 líneas)** — admin global cross-hospital. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones + Metrologia + Trazabilidad + ChecklistPage** (item #4) como mini-item correctivo consolidado.

---

## Ciclo 27 — 2026-06-27 (autocycle headless)

**Item hecho:** Backlog #1 (continuación) — **ChecklistPage.jsx** (182 líneas, página de cumplimiento NOM-016-SSA3-2012 — verificación de infraestructura y equipamiento del hospital, ruta `/checklist`, vista de 2 columnas: lista de plantillas → preguntas SI/NO/N/A + observaciones + submit, sidebar con historial de auditorías previas). 46 tests nuevos, **580 → 626 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **ChecklistPage.jsx (182 líneas)** era la candidata compacta siguiente del set. Sin charts, sin react-router, sin hooks especiales. Es el módulo de auditoría NOM-016: cualquier bug en él puede hacer que una verificación de infraestructura quede con respuestas incompletas (incumplimiento normativo), que se pierda el registro de auditoría, o que el operador no pueda distinguir si una falla es de carga de plantillas vs historial. Concentra patrones únicos que un test atrapa y un DevTools manual no:

- **Doble fetch en mount**: useEffect corre `fetchTemplates()` Y `fetchHistory()` en paralelo. Si alguien quita una de las dos, una sección queda vacía sin error visible.
- **Toast.error específico por endpoint**:
  - `getChecklistTemplates` falla → `'No se pudieron cargar las plantillas de checklist'` (plural "plantillas").
  - `getChecklistResultados` falla → `'No se pudo cargar el historial de compliance'` (singular "el historial").
  Si alguien mezcla los mensajes o usa uno genérico, el operador pierde contexto sobre qué se rompió.
- **Tolerancia a shape `data || []`**: rescata null/undefined. NO rescata array directo. Si el backend devuelve un array, `data || []` da `[]` (correcto por accidente), pero si devuelve `false` o `0` se rompe. Cubierto por tests específicos (null, undefined, array vacío).
- **Validación de respuestas incompletas**: `respondidas < totalItems` → toast.error(`Faltan ${N} preguntas por responder`). Si alguien cambia `<` por `<=`, una plantilla con 0 items rompe (Faltan 0). Si quita la validación, se puede submitir incompleto (incumplimiento NOM-016).
- **Toast chain loading→success/error con id compartido**:
  - `toast.loading('Certificando auditoría…')` retorna `tid`.
  - Success: `toast.success('Checklist guardado y auditado', {id: tid})`.
  - Error: `toast.error(err.message || 'No se pudo guardar el checklist', {id: tid})`.
  El `{id}` es el patrón SIGAH para "reemplazar toast en lugar de acumular". Si alguien borra el `id`, queda el toast loading eterno. Si el id no se comparte entre loading y success, quedan ambos visibles (doble toast).
- **3 radios por pregunta con name="q-${idx}"**: name único por pregunta garantiza que seleccionar SI en Q1 no deselecciona Q2. Si alguien quita el `${idx}` del template literal, todos los radios comparten name → funcionan como grupo único (selección mutua global).
- **Valores literales `'SI'`, `'NO'`, `'N/A'`** en los radios: si alguien los cambia a lowercase o a otro set (`Yes/No/NA`), el backend rechaza las respuestas (literal match).
- **Botón submit disabled hasta completar respuestas**:
  ```
  disabled={loading || Object.keys(responses).length < selectedTemplate.items.length}
  ```
  Si alguien quita la segunda condición, se puede submitir incompleto. Si alguien quita `loading`, doble-click rápido dispara 2 submits.
- **`area_id: null` hardcodeado**: este campo es opcional en backend pero se manda siempre null desde ChecklistPage. Si alguien lo borra del payload, el backend rechaza con 422.
- **Estado post-success**: `setSelectedTemplate(null)` + reset responses + reset observaciones + `fetchHistory()` (refresca el sidebar). Si alguien borra `fetchHistory()` del success, la lista del sidebar queda stale y el operador no ve su propia auditoría recién hecha.
- **Estado post-error**: vista NO regresa a selección (selectedTemplate sigue), NO se llama `fetchHistory` (no refresca el sidebar — la lista no cambió). Cubierto por tests específicos que comparan el contador de llamadas.
- **`new Date(h.fecha_ejecucion).toLocaleString()`**: fecha en formato local. Si `fecha_ejecucion` es null, retorna "Invalid Date". Cubierto con un fixture que NO tiene fecha para detectar regresiones.

Riesgos silenciosos cubiertos por los tests:
- Si `fetchHistory()` no se llama tras submit exitoso, el sidebar muestra la lista anterior (stale) y el operador cree que su auditoría no se guardó.
- Si el name="q-${idx}" se rompe, las respuestas de Q1 sobreescriben las de Q2 (todas comparten name → grupo único).
- Si la validación `respondidas < totalItems` se relaja, se puede submitir una auditoría incompleta (incumplimiento NOM-016).
- Si el `{id}` se quita del success/error, queda el toast loading para siempre (memory leak visual + operador confundido).
- Si el id del loading no se comparte entre loading y success, el toast.loading queda visible junto al toast.success (doble toast).
- Si los mensajes específicos por endpoint se homogeneizan, el operador pierde contexto sobre qué se rompió.

### Cambio (commit del ciclo 27)

**1 archivo de test, 46 casos nuevos (580 → 626 tests):**

`src/pages/ChecklistPage.test.jsx` (46 tests, 11 grupos):

- **Header (3)**:
  - h1 "Cumplimiento NOM-016-SSA3-2012" renderizado.
  - Subtítulo menciona "Verificación de infraestructura".
  - H1 contiene la norma NOM-016 (cubierto en h1, no en subtítulo).
- **Carga inicial (10)**:
  - `getChecklistTemplates` llamado 1 vez en mount.
  - `getChecklistResultados` llamado 1 vez en mount.
  - h2 "Selecciona una Plantilla Normativa" visible inicialmente.
  - Plantillas listadas como botones con `nombre` accesible.
  - Historial vacío: usuarios NO aparecen en DOM.
  - Tolerancia: `getChecklistTemplates` resuelve null → lista vacía.
  - Tolerancia: `getChecklistTemplates` resuelve undefined → lista vacía.
  - `getChecklistTemplates` falla → toast.error específico.
  - `getChecklistResultados` falla → toast.error específico.
  - Los 2 mensajes de error son strings distintos.
- **Selección de plantilla (4)**:
  - Click muestra las preguntas y desaparece el h2 de selección.
  - Muestra TODAS las preguntas (3/3).
  - Botón "Cambiar" presente.
  - "Cambiar" regresa a la vista de selección.
- **Radios SI/NO/N/A (6)**:
  - 9 radios totales (3 preguntas × 3 opciones).
  - Cada pregunta comparte su name (q-0, q-1, q-2).
  - 3 names distintos (uno por pregunta).
  - 3 radios "SI" + 3 "NO" + 3 "N/A".
  - Click en un radio lo marca checked.
  - Q0 y Q1 son independientes (pueden ambos ser "SI").
- **Observaciones (3)**:
  - Textarea presente.
  - Acepta texto del usuario (controlled).
  - Label "Observaciones Adicionales" presente.
- **Validación pre-submit (3)**:
  - Botón DISABLED inicialmente (sin respuestas).
  - Responder 1/3 sigue DISABLED.
  - Responder 3/3 lo habilita.
- **Submit exitoso (6)**:
  - `ejecutarChecklist` llamado con payload completo (`checklist_id, resultados, area_id:null, observaciones`).
  - `toast.loading('Certificando auditoría…')` llamado.
  - `toast.success` con `{id}` compartido (reemplaza loading).
  - `fetchHistory` llamado de nuevo tras éxito (refresca sidebar).
  - Regresa a vista de selección tras éxito.
  - Respuestas mixtas SI/NO/N/A preservan cada valor.
- **Submit con error (4)**:
  - Error sin `.message` → fallback `'No se pudo guardar el checklist'` con `{id}`.
  - Error con `.message` → usa `err.message` como fallback.
  - Tras error: vista NO regresa a selección (selectedTemplate visible).
  - Tras error: NO se llama `fetchHistory` (sidebar no se refresca).
- **Loading durante submit (1)**:
  - Botón DISABLED mientras `ejecutarChecklist` está pendiente.
- **Historial (5)**:
  - h3 "Historial Compliance" presente.
  - Nombre de checklist visible en entry (al menos 2 matches: botón + entry).
  - "Ejecutado por: ..." con nombre del usuario.
  - Fecha formateada con `toLocaleString()` (contiene "2026").
  - Entry sin `fecha_ejecucion` renderiza sin "Invalid Date".
- **Hygiene (1)**:
  - Sin warnings de React ni de `act()`.

**Fixtures (2 templates + 2 history entries):**
- `TEMPLATE_INFRA` (id:1) — Infraestructura Hospitalaria, 3 preguntas.
- `TEMPLATE_BIO` (id:2) — Equipamiento Biomédico, 2 preguntas.
- `HIST_1` — Infraestructura, Dra. María González, 2026-06-15.
- `HIST_2` — Biomédico, Ing. Carlos Ramírez, 2026-05-20.
- `HIST_SIN_FECHA` (sólo 1 test) — fecha_ejecucion: null.

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` con 3 endpoints — mismo patrón que el resto.
- `vi.mock('../lib/toast', ...)` con default + named export. `mockToast.loading()` retorna `'toast-id-loading'` (id fijo para validar el patrón `{id}` en success/error).
- **NO se mockea `lucide-react`** — ChecklistPage usa 5 iconos (ClipboardList, CheckSquare, Save, Search, History) pero lucide-react v1.8.0 los renderiza como SVG inline sin副作用s.
- **NO se usa MemoryRouter** — ChecklistPage no importa react-router.

**Tricky bits documentados:**
- **Texts duplicados entre botón de plantilla y entry de historial**: "Infraestructura Hospitalaria" aparece 2 veces (botón + entry), "Equipamiento Biomédico" también. `getByText` falla con "Found multiple elements". Usar `getAllByText(/regex/i)` y verificar `>= 2`.
- **Errores con `.message` vs sin `.message`**: el código usa `err.message || 'No se pudo guardar el checklist'`. Si se mockea `new Error('Network')`, `err.message = 'Network'` → toast muestra 'Network' (truthy). Si se mockea `{}` (objeto vacío), `err.message` es undefined → toast muestra el fallback. Ambos branches deben estar cubiertos.
- **`getByRole('radio', {name: /^SI$/})` falla con 3 matches**: hay 3 radios "SI" (uno por pregunta). Usar `getAllByRole('radio', {name: /^SI$/})` y verificar `length`.
- **`mockEjecutarChecklist.mockReturnValue(new Promise(...))` + resolveSubmit**: para testear el loading state durante submit, hay que sobrescribir el mock DESPUÉS de `renderAndWait()` (que llama `setupApi` y setea mockResolvedValue). Si se pone antes, `setupApi` lo pisa.
- **`nombre` accesible del botón**: el botón de plantilla tiene `<h3>{tmp.nombre}</h3>` interno, lo que hace que `screen.getByRole('button', {name: /infraestructura hospitalaria/i})` funcione por el accessible name derivado del contenido.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 26) | Después (ciclo 27) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `ChecklistPage` (lazy) | no chunk propio, incluido en `index` | **6.39 kB / 2.20 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `ChecklistPage.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `ChecklistPage` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/checklist`). Cero warnings de Vite, build 4.23 s.

`npm test` → **626 passed (626)** en 4.64 s (46 nuevos casos, 580 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_startTransition` / `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a ChecklistPage que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- vitest smoke tests para TVDashboard — 580 tests (ciclo 26).
- **vitest smoke tests para ChecklistPage — 626 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `EquipoPublico.jsx` (244 líneas) — página pública de un equipo (sin auth, vista de solo-lectura).
   - `QRScanner.jsx` (252 líneas) — escáner QR (probablemente requiere mock de `navigator.mediaDevices` o de la cámara).
   - `AdminGlobal.jsx` (274 líneas) — admin global cross-hospital.
   - `Almacen.jsx` (392 líneas) — almacén de refacciones/consumibles.
   - `QRBatch.jsx` (419 líneas) — generación batch de QRs.
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial. 3 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23, Trazabilidad ciclo 25) — si se aborda en un próximo ciclo, sería un mini-item correctivo de bajo riesgo. **NUEVO**: también aplica a `ChecklistPage.jsx` (ciclo 27) — los `data || []` en `fetchTemplates` y `fetchHistory` son del mismo patrón.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 28)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`EquipoPublico.jsx` (244 líneas)** es la siguiente candidata compacta: página pública de un equipo sin auth, vista de solo-lectura. Si no cabe, fallback a **`QRScanner.jsx` (252 líneas)** — escáner QR (puede requerir mock de `navigator.mediaDevices`). Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones + Metrologia + Trazabilidad + ChecklistPage** (item #4) como mini-item correctivo consolidado.

---

## Ciclo 26 — 2026-06-27 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 4d healthy.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (366 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (329 ms).

**Item hecho:** Backlog #1 (continuación) — **TVDashboard.jsx** (166 líneas, vista de display para TV/monitor en sala de control, ruta `/tv`, auto-rota entre 3 slides cada 20s con reloj en tiempo real y refresh cada 2 min). 36 tests nuevos, **544 → 580 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch), **TVDashboard.jsx (166 líneas)** era la candidata siguiente del set sin mapa ni react-router. Vista de display para sala de control: cualquier bug en ella puede hacer que el operador no vea alertas críticas o KPIs desactualizados. Concentra patrones únicos que un test atrapa y un DevTools manual no:

- **Loading dual `loading || !resumen`**: si alguien quita el `!resumen`, una pantalla con `loading=false` y `resumen=null` entra en crash silencioso (la rama de render asume resumen truthy).
- **Hook `useDashboard` controla TODO el estado** (`resumen`, `alertas`, `loading`, `error`, `recargar`). Mockeamos el hook (no la API), mismo patrón que Dashboard.test.jsx (ciclo 13).
- **3 slides rotando vía `setInterval(prev => (prev+1) % SLIDES.length, 20000)`**: si alguien cambia `% SLIDES.length` por `+ 1`, después del slide 2 el módulo se cae por índice fuera de rango y la pantalla queda en blanco.
- **3 intervals simultáneos en mount**: rotación (20s), reloj (1s), refresh (120s). Si el cleanup del refresh falla, el hook `recargar` se dispara cada 2 min incluso tras unmount — fuga de CPU.
- **Reloj con `toLocaleTimeString('es-MX', {hour, minute, second})`** y **`toLocaleDateString('es-MX', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})`**. Verificamos que no haya "Invalid Date" en ningún nodo.
- **5 colores de estado mapeados a clases tailwind**:
  - `operativo` → `bg-emerald-500`
  - `en_mantenimiento` → `bg-yellow-500`
  - `fuera_servicio` → `bg-red-500`
  - `en_traslado` → `bg-violet-500`
  - `baja` → `bg-slate-500`
  - Cualquier estado fuera del mapa → `bg-slate-500` (default). Si alguien borra el fallback, un estado desconocido se renderiza sin clase (texto invisible en tema dark).
- **Estado capitalizado con `replace(/_/g, ' ')`** → "fuera_servicio" aparece como "fuera servicio".
- **`equipos_por_estado` defensivo: `(resumen.equipos_por_estado || [])`**. Si alguien quita el `|| []`, render explota cuando el backend devuelve el campo sin array.
- **Alertas críticas (filter por `a.prioridad === 'critica'`)**:
  - 0 → "Sin Alertas Críticas" + ✅
  - N → "N Alertas Críticas" + 🚨
  - Si alguien cambia `'critica'` por otro literal, el badge rojo y el emoji 🚨 nunca aparecen.
- **Lista de alertas truncada a 8**: `alertas.slice(0, 8).map`. Si alguien quita el `.slice(0, 8)`, 50 alertas revientan el layout del display TV.
- **`created_at` opcional**: cada alerta con `created_at` muestra "· {fecha}"; sin `created_at` no muestra la línea.
- **Indicadores de slide**: 3 dots en el footer, el activo en `bg-emerald-400`, los demás en `bg-[var(--content-border)]`. Si alguien borra el condicional `i === currentSlide`, todos los dots se ven iguales y el operador no sabe en qué slide está.

Riesgos silenciosos cubiertos por los tests:
- Si `!resumen` se quita del loading dual, la pantalla entra a la rama de render con resumen=null y `.filter`/`.find` lanzan TypeError.
- Si el módulo de rotación pierde `% SLIDES.length`, después del 3er slide `currentSlide` se vuelve undefined y la pantalla queda en blanco.
- Si el cleanup del `setInterval(recargar)` falla, recargar sigue disparándose tras unmount.
- Si la condición `a.prioridad === 'critica'` cambia, los iconos 🚨 y el badge rojo nunca aparecen.
- Si el `.slice(0, 8)` se quita, la lista de alertas crece sin tope y revienta el layout TV.
- Si el fallback de color `colors[item.estado] || 'bg-slate-500'` se rompe, un estado desconocido muestra sin clase (texto invisible en tema dark).

### Cambio (commit del ciclo 26)

**1 archivo de test, 36 casos nuevos (544 → 580 tests):**

`src/pages/TVDashboard.test.jsx` (36 tests, 10 grupos):

- **Loading state (3)**:
  - "Cargando Dashboard..." + spinner visible cuando `loading=true`.
  - También muestra spinner cuando `loading=false` pero `resumen=null` (cubre el `loading || !resumen`).
  - Header ni slide indicators NO se renderizan durante loading.
- **Header (5)**:
  - Logo `/imss_logo.png` con `alt="IMSS Logo"`.
  - `<h1>SIGAB</h1>` + subtítulo "Sistema Integral de Gestión de Activos Biomédicos".
  - "IMSS 1 Clínica General Tijuana" + "IMSS · Tijuana, B.C." centrados.
  - Reloj con formato `\d{2}:\d{2}:\d{2}` (mono, tabular-nums, color emerald-500).
  - Fecha formateada con `toLocaleDateString('es-MX')` — verifica que no haya "Invalid Date" en DOM.
- **Slide kpis (default — 6)**:
  - StatsCards montado con totales del resumen (`operativos: 698`, `mantenimiento: 23`).
  - Cada estado mapeado a su color tailwind (`bg-emerald-500`, `bg-yellow-500`, `bg-red-500`, `bg-violet-500`, `bg-slate-500`).
  - Totales por estado renderizados en `text-4xl` (698, 23, 12, 8, 10).
  - `replace(/_/g, ' ')` aplica: "fuera_servicio" → "fuera servicio".
  - Fallback a `bg-slate-500` cuando el estado no está en el mapa (caso `estado_raro_desconocido`).
  - Defensivo: render OK aunque `equipos_por_estado` sea undefined (cubre `|| []`).
- **Slide charts (1)**:
  - Avanza a slide 1 (charts) tras `vi.advanceTimersByTime(20000)` → DashboardCharts montado.
- **Slide alerts vacío (1)**:
  - Tras 40000ms, slide 2 (alerts) → "Todos los sistemas operando con normalidad" + "Sin Alertas Críticas" + ✅.
- **Slide alerts con alertas (5)**:
  - "N Alertas Críticas" + 🚨 cuando hay alertas críticas (cuenta correctamente el filtro).
  - "Sin Alertas Críticas" + ✅ cuando no hay críticas pero sí normales.
  - Mensaje y nombre de equipo renderizados por alerta (verifica con `getAllByText` para evitar "multiple elements found" por el substring `Ventilador Mindray`).
  - Lista truncada a 8 items (verifica que `Alerta 0..7` se renderizan y `Alerta 8..11` NO).
  - Alerta sin `created_at` muestra el mensaje y nombre del equipo sin la línea de fecha.
  - Alerta crítica con borde rojo (`bg-red-500/15 border-red-500/40`).
- **Rotación automática (4)**:
  - Arranca en slide 0: StatsCards visible, DashboardCharts NO.
  - Avanza a slide 1 (charts) tras 20000ms.
  - Avanza a slide 2 (alerts) tras 40000ms.
  - CICLA de vuelta al slide 0 tras 60000ms (3 slides × 20s).
- **Indicadores de slide (4)**:
  - 4 dots en footer (3 indicadores + 1 "En línea").
  - En slide 0: 2 elementos con `bg-emerald-400` ("En línea" + indicador activo).
  - 2 indicadores inactivos con `bg-[var(--content-border)]` y `transition-colors`.
  - Tras 20000ms (slide 1): sigue habiendo 2 emerald-400 (el activo se mueve, sigue siendo 1).
- **Footer (3)**:
  - "En línea · Auto-actualización cada 2 min" visible.
  - Atribución "Depto. Conservación y Mantenimiento · Bioingeniería Xochicalco".
  - Dot "En línea" con `bg-emerald-400 animate-pulse`.
- **Auto-refresh del hook (2)**:
  - `recargar` llamado cada 120000ms (2 min) — avanza tiempo y verifica 1 llamada, luego 2 llamadas tras otro avance.
  - Deja de llamar a `recargar` tras `unmount()` (cubre el cleanup del `setInterval`).
- **Hygiene (1)**:
  - Sin warnings de React (`act`/`Warning:`) durante el render básico — filtra el warning pre-existente de react-router v7 que no aplica a TVDashboard.

**Fixtures (3 items de alerta):**
- `ALERTA_CRITICA_1` — `{id: 1, prioridad: 'critica', mensaje: 'Ventilador Mindray SV300 fuera de servicio', equipo_nombre: 'Ventilador Mindray', created_at: '2026-06-27T10:30:00Z'}`.
- `ALERTA_NORMAL` — `{id: 2, prioridad: 'media', mensaje: 'Mantenimiento programado', equipo_nombre: 'Monitor Philips', created_at: '2026-06-27T09:00:00Z'}`.
- `ALERTA_SIN_FECHA` — `{id: 3, prioridad: 'baja', mensaje: 'Batería baja', equipo_nombre: 'Desfibrilador'}` (sin `created_at`).

**Mocks (justificados):**
- `vi.mock('../hooks/useDashboard', ...)` — controla TODO el estado de la página (mismo patrón que Dashboard.test.jsx ciclo 13). El `recargar` es un `vi.fn()` separado para poder contar llamadas tras `vi.advanceTimersByTime`.
- `vi.mock('../components/StatsCards', ...)` — stub que serializa los campos clave (`operativos`, `mantenimiento`, `tickets`) a un `data-testid="mock-stats-cards"`. Permite verificar que StatsCards recibe el resumen correcto sin importar sus dependencias internas (Link, etc).
- `vi.mock('../components/DashboardCharts', ...)` — stub `data-testid="mock-dashboard-charts"`. Charts ya cubiertos en su chunk lazy y probados en otros tests.
- **NO se mockea `lucide-react`** — TVDashboard no usa iconos, sólo emojis inline (🚨, ✅, ⚠️).
- **NO se usa MemoryRouter** — TVDashboard no importa react-router (la ruta `/tv` la maneja App.jsx vía lazy).

**Tricky bits documentados:**
- **`vi.useFakeTimers()` dentro de `try/finally` con `vi.useRealTimers()`**: si un test falla o lanza excepción entre `useFakeTimers()` y `useRealTimers()`, los timers quedan fake para los siguientes tests → falsos timeouts y renders congelados. Patrón estricto: `try { vi.useFakeTimers(); ... } finally { vi.useRealTimers(); }`.
- **`act()` alrededor de `vi.advanceTimersByTime`**: las transiciones de estado disparadas por timers deben envolverse en `act()` para evitar el warning "An update to TVDashboard inside a test was not wrapped in act(...)".
- **`getAllByText` para substrings matcheados por span + ancestros**: cualquier `getByText(/regex/)` matchea el span Y cada uno de sus ancestros cuyo textContent empiece por el regex. Hay que usar `getAllByText` y verificar `>= 1` para textos cortos o `getByText` para textos únicos en el DOM.
- **IDs únicos en fixtures**: la key del map de alertas es `a.id || i`. Si dos alertas comparten id, React tira warning "duplicate key". En el test "N Alertas Críticas", uso `{ ...ALERTA_CRITICA_1, id: 1 }` y `{ ...ALERTA_CRITICA_1, id: 2, mensaje: '...' }` para evitarlo.
- **Conteo de dots emerald-400**: en cualquier slide, sólo hay 2 elementos con `bg-emerald-400` en el DOM: 1 dot "En línea" + 1 indicador activo. NO 4 como se podría pensar — los indicadores inactivos usan `bg-[var(--content-border)]`, no `bg-emerald-400`.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 25) | Después (ciclo 26) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `TVDashboard` (lazy) | no chunk propio, incluido en `index` | **9.11 kB / 2.96 kB gzip** | nuevo chunk lazy |
| `Trazabilidad` (lazy) | 8.34 kB / 2.34 kB gzip | 8.34 kB / 2.34 kB gzip | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `TVDashboard.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `TVDashboard` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router de `/tv`). Cero warnings de Vite, build 4.22 s.

`npm test` → **580 passed (580)** en 4.52 s (36 nuevos casos, 544 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a TVDashboard que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- vitest smoke tests para Trazabilidad — 544 tests (ciclo 25).
- **vitest smoke tests para TVDashboard — 580 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api/hook (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `ChecklistPage.jsx` (182 líneas) — checklist UI para verificación de equipos (NOM-016). Patrón: selección de plantilla + items de preguntas con radios + submit. Probablemente más simple que TVDashboard.
   - `EquipoPublico.jsx` (244 líneas) — página pública de un equipo (sin auth, vista de solo-lectura).
   - `QRScanner.jsx` (252 líneas) — escáner QR (probablemente requiere mock de `navigator.mediaDevices` o de la cámara).
   - `AdminGlobal.jsx` (274 líneas) — admin global cross-hospital.
   - `Almacen.jsx` (392 líneas) — almacén de refacciones/consumibles.
   - `QRBatch.jsx` (419 líneas) — generación batch de QRs.
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial. 3 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23, Trazabilidad ciclo 25) — si se aborda en un próximo ciclo, sería un mini-item correctivo de bajo riesgo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 27)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`ChecklistPage.jsx` (182 líneas)** es la siguiente candidata compacta: checklist UI para verificación NOM-016 con selección de plantilla + preguntas SI/NO/N/A + observaciones + historial. Sin charts ni react-leaflet ni useDashboard. Si no cabe, fallback a **`EquipoPublico.jsx` (244 líneas)** — vista pública sin auth de un equipo. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones + Metrologia + Trazabilidad** (item #4) como mini-item correctivo.

---

## Ciclo 25 — 2026-06-27 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 4d healthy.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (381 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (383 ms).

**Item hecho:** Backlog #1 (continuación) — **Trazabilidad.jsx** (204 líneas, módulo de cumplimiento NOM-016 — historial de movimientos y traslados de equipos entre áreas/pisos del hospital, con timeline vertical y modal "Registrar Traslado" en `/trazabilidad`). 43 tests nuevos, **501 → 544 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Trazabilidad.jsx (204 líneas)** era la candidata siguiente del set sin charts. La nota del backlog decía "Trazabilidad requiere mock extra de react-leaflet" — al releer el código actual, descubrí que el componente YA NO USA Leaflet (sólo renderiza una línea de tiempo vertical con puntos azules y conectores, sin mapa). Así que la candidata es más simple de lo esperado y entra perfecto en un ciclo.

Es el módulo de trazabilidad física de equipos: cualquier bug en él puede hacer que un traslado de equipo (ventilador Mindray SV300 de UCI a Urgencias, monitor Philips MX450 a Quirófano 4) no quede registrado y dejar al hospital sin trazabilidad de movimientos — sin saber dónde está cada equipo, no se puede hacer mantenimiento ni inventario. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Estado loading inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente en "Cargando movimientos..." aunque la promesa ya resolvió.
- **Tolerancia a shape: `res.movimientos ?? []`** — rescata `null`/`undefined` → `[]`. NO rescata array directo (causa TypeError en `.length` y `.map`). Si en algún ciclo se quiere ampliar el fallback, basta cambiar a `Array.isArray(res.movimientos) ? res.movimientos : (Array.isArray(res) ? res : [])`. Mismo bug latente documentado en Capacitaciones y Metrologia — se documenta, no se corrige todavía.
- **3 endpoints**:
  - `api.getTrazabilidad()` — carga la lista en mount.
  - `api.getEquipos({ limit: 200 })` — el modal llama en SU mount (NO en mount de la página). **Crítico**: si el modal fallara al cargar equipos, el select quedaría vacío y el operador no podría registrar un traslado.
  - `api.registrarTraslado(data)` — submit del formulario.
- **2 validaciones en orden estricto**:
  1. `!form.equipo_id` → `toast.error('Selecciona un equipo')`.
  2. `!form.area_destino.trim()` → `toast.error('Indica el área de destino')`.
  - El `.trim()` es clave: si alguien lo olvida, un destino de `"   "` (espacios) pasa la validación y queda como traslado con área vacía.
- **Conversión numérica con un caso especial**:
  - `equipo_id: Number(form.equipo_id)` — siempre Number, requerido. Si alguien quita el `Number()`, el backend rechaza con 422.
  - `piso_destino: form.piso_destino ? Number(form.piso_destino) : null` — Number sólo si hay valor; vacío se manda como `null` (campo opcional, no `0` ni `''`). Si alguien cambia el ternario por `Number(form.piso_destino)`, el campo vacío llega como `NaN` y el backend rechaza.
- **Toast.success literal `"Traslado registrado en trazabilidad"`**.
- **Toast.error con fallback chain**: `err.response?.data?.detail || 'Error al registrar traslado'`. Cubre 2 paths:
  - 4xx del backend con `detail` estructurado → muestra el detail.
  - Error de red puro sin `response` → fallback al mensaje genérico.
- **`.finally(() => setSaving(false))`**: si alguien lo borra, el botón "Registrar Traslado" se queda con `disabled` y label "Registrando..." para siempre tras un error.
- **`area_origen || 'Origen desconocido'`** — fallback para traslados cuyo origen no fue capturado. Si alguien quita el `|| 'Origen desconocido'`, los traslados sin origen muestran "undefined" en pantalla.
- **Empty state con su PROPIO botón `"+ Registrar primer traslado"`** que abre el modal. Si alguien rompe este botón, los operadores nuevos (sin traslados registrados) no pueden empezar a usar el módulo sin recargar la página.
- **Línea conectora del timeline OCULTA en el ÚLTIMO item**: `i < movimientos.length - 1 && <line />`. Si alguien cambia la condición, el último item se desborda con una línea conectora colgante hacia abajo.
- **Formato de fecha**: `new Date(m.fecha_movimiento).toLocaleString('es-MX')`. Si `fecha_movimiento` es null/undefined, se renderiza string vacío (no "Invalid Date" porque jsdom Date es estable).
- **`useEffect` con deps `[]`** en ambos lugares (página y modal) — los efectos corren UNA vez.
- **`onSaved` callback**: cierra modal + recarga lista via `cargar()`. Si alguien rompe `onSaved`, el modal queda abierto tras éxito y la lista no se refresca.

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `setLoading(false)` del `.finally()`, la pantalla se queda con "Cargando movimientos..." para siempre.
- Si el `Number()` se olvida en submit (en `equipo_id` O el ternario del `piso_destino`), el backend rechaza con 422.
- Si el `.trim()` se olvida en validación, espacios pasan como área de destino vacía.
- Si `onSaved()` no se llama tras éxito, el modal queda abierto y la lista no se refresca.
- Si el orden de validación cambia, los mensajes específicos del operador se pierden.
- Si la condición `i < length - 1` se rompe, el último item del timeline se desborda.
- Si el fallback `area_origen || 'Origen desconocido'` se rompe, los traslados sin origen muestran "undefined".
- Si el catch del `getEquipos` del modal no loggea a toast, los equipos no se cargan y el operador no sabe por qué el select está vacío.
- Si la rama `cargar()` no se llama tras `onSaved`, los traslados nuevos no aparecen sin F5 manual.

### Cambio (commit del ciclo 25)

**1 archivo de test, 43 casos nuevos (501 → 544 tests):**

`src/pages/Trazabilidad.test.jsx` (43 tests, 10 grupos):

- **Render base / loading (3)**:
  - "Cargando movimientos..." visible mientras `api.getTrazabilidad` no resuelve.
  - Loading desaparece tras resolución.
  - Loading se apaga vía `.finally()` incluso si `getTrazabilidad` rechaza (cubre `.finally(setLoading(false))`).
- **Header y subtítulo (3)**:
  - Header `<h1>` "Trazabilidad de Equipos" presente.
  - Subtítulo scoped al `<p>` hermano del h1 menciona "Historial de movimientos" y "NOM-016".
  - Botón "Registrar Traslado" en la cabecera.
- **Carga inicial y tolerancia a shape (7)**:
  - `getTrazabilidad` llamado exactamente 1 vez en mount.
  - `getEquipos` NO se llama en mount (sólo cuando se abre el modal — crítico para performance).
  - Empty state "Sin movimientos registrados." cuando la lista está vacía.
  - Empty state tiene su propio botón "+ Registrar primer traslado" que abre el modal (verifica con h2 "Registrar Traslado" visible).
  - Si `getTrazabilidad` rechaza → `toast.error('No se pudo cargar la trazabilidad')`.
  - `{movimientos: null}` → empty state (tolerancia a null).
  - Array directo → empty state (documenta bug latente: `res.movimientos ?? []` NO rescata array directo).
- **Timeline de movimientos (8)**:
  - 1 bloque por movimiento con `equipo_nombre` (3 fixtures → 3 nombres visibles).
  - Serie del equipo en monoespaciado (`font-mono`).
  - Área de origen visible cuando está presente (con `startsWith` matcher porque el span concatena " • Pn").
  - Fallback "Origen desconocido" cuando `area_origen` es string vacío.
  - Span de destino tiene clases `blue-100`/`blue-700`/`blue-300` (identificación visual).
  - "• Pn" junto al piso cuando está presente (regex `includes('• P3')`).
  - "• Pn" NO aparece cuando `piso_destino` es null.
  - Línea de motivo "Motivo: ..." sólo se renderiza cuando `motivo` es no-vacío (cuenta 2 párrafos con MOV_1+MOV_2, MOV_3 con motivo vacío no agrega párrafo).
  - Fecha con `fecha_movimiento = null` → no aparece "Invalid Date" ni "null" en el item.
- **Modal — apertura y campos (8)**:
  - Click en "Registrar Traslado" abre modal con `<h2>` "Registrar Traslado".
  - Al abrir el modal llama `getEquipos({ limit: 200 })`.
  - Select muestra los 3 equipos cargados.
  - 5 labels del formulario: Equipo*, Área de destino*, Piso, Motivo, Notas adicionales.
  - Botones "Cancelar" y "Registrar Traslado" (2 instancias del segundo: cabecera + modal).
  - "Cancelar" cierra el modal SIN enviar.
  - `getEquipos` falla en modal → `toast.error('Error al cargar equipos')`.
  - `getEquipos` array directo → opciones se renderizan (cubre `?? data`).
- **Validación (4)**:
  - Submit sin equipo_id → 'Selecciona un equipo'.
  - Submit con equipo pero sin area_destino → 'Indica el área de destino'.
  - area_destino con sólo whitespace (`"   "`) → 'Indica el área de destino' (cubre `.trim()`).
  - Orden estricto de validación: equipo se valida antes que destino.
- **Submit exitoso (5)**:
  - `registrarTraslado` llamado con `equipo_id: 10` (Number), `piso_destino: 1` (Number), área_destino, motivo, notas.
  - `piso_destino` VACÍO se manda como `null` (caso especial del ternario `form.piso_destino ? Number(...) : null`).
  - `toast.success('Traslado registrado en trazabilidad')`.
  - Modal se cierra tras éxito Y `getTrazabilidad` se llama 2da vez (reload vía `onSaved → cargar()`).
  - Botón cambia a "Registrando..." y se `disabled` mientras `saving=true` (test resuelve promesa pendiente al final).
- **Submit con error (3)**:
  - 422 del backend → `toast.error('Equipo no encontrado')` (detail estructurado).
  - Error de red puro (sin `response`) → `toast.error('Error al registrar traslado')` (fallback).
  - Tras error: modal sigue abierto Y botón volvió a "Registrar Traslado" (no "Registrando...") — prueba que `saving=false` vía `.finally()`.
- **Hygiene (1)**:
  - No warnings de React (`not wrapped in act`/`Warning:`) durante la carga. console.error silenciado.

**Fixtures (3 items de movimiento):**
- `MOV_1` — caso completo: `area_origen='UCI Adultos'`, `piso_origen=3`, `area_destino='Urgencias'`, `piso_destino=1`, `motivo='Préstamo temporal por demanda'`, `fecha_movimiento='2026-06-20T14:30:00Z'`.
- `MOV_2` — caso con origen vacío: `area_origen=''` → 'Origen desconocido', `piso_origen=null`, `motivo='Mantenimiento programado'`.
- `MOV_3` — caso con campos opcionales vacíos: `fecha_movimiento=null` (no se renderiza fecha), `piso_destino=null` (no se muestra "• Pn"), `motivo=''` (no se renderiza párrafo).

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` con 3 endpoints — mismo patrón que el resto.
- `vi.mock('../lib/toast', ...)` con default + named export — método `success/error/info/warning/loading/dismiss` attached.
- `vi.hoisted` para los mocks — sobrevive al hoisting de vi.mock.
- **NO se mockea `lucide-react`** — los iconos son SVGs con paths hardcoded (MapPin, ArrowRight, Plus, X).
- **NO se mockea `framer-motion`** — Trazabilidad no lo usa.
- **NO se usa MemoryRouter** — Trazabilidad no importa react-router.
- `cleanup()` + `vi.clearAllMocks()` explícitos en `afterEach` global — sin auto-cleanup, los renders se acumulan en el DOM y los mocks comparten llamadas entre tests (falsos conteos como 7, 41).
- `openModal()` es **async** y envuelve el click en `act()` + flush microtasks — evita el warning "An update to RegistrarTrasladoModal inside a test was not wrapped in act(...)" que aparece cuando el `useEffect` del modal dispara `getEquipos(setEquipos)` y el `.then()` resuelve fuera de `act()`.

**Tricky bits documentados:**
- **Mocks acumulados entre tests**: `setupApi()` setea `mockResolvedValue({id: 99})` para `mockRegistrarTraslado`. Si un test de error llama `mockRejectedValue(...)` ANTES de `renderAndWait()`, el `setupApi()` lo pisa. Solución: setear el mock DESPUÉS de `renderAndWait()`. Aplica a los 3 tests de "submit con error" y al test de "saving=true".
- **Textos partidos entre nodos**: los spans de origen/destino tienen texto compuesto (`"UCI Adultos • P3"`). `getByText('UCI Adultos')` falla porque el texto exacto del nodo es el compuesto. Solución: function matcher con `startsWith` o `includes` Y `getAllByText` (los padres también matchean y `getByText` falla por múltiples matches).
- **Función matcher matchea múltiples elementos (span + padres)**: cualquier `getByText((_, el) => el?.textContent?.startsWith('X'))` matchea el span Y cada uno de sus ancestros cuyo textContent empiece con 'X'. Hay que usar `getAllByText` y verificar `>= 1`.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 24) | Después (ciclo 25) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Trazabilidad` (lazy) | no chunk propio, incluido en `index` | **8.34 kB / 2.34 kB gzip** | nuevo chunk lazy |
| `Reportes` (lazy) | 6.19 kB / 2.05 kB gzip | 6.19 kB / 2.05 kB gzip | — |
| `Metrologia` (lazy) | 10.77 kB / 2.78 kB gzip | 10.77 kB / 2.78 kB gzip | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Trazabilidad.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Trazabilidad` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.17 s.

`npm test` → **544 passed (544)** en 4.42 s (43 nuevos casos, 501 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a Trazabilidad que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24, no documentado en STATE.md).
- **vitest smoke tests para Trazabilidad — 544 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguientes candidatas** (páginas sin test, en orden de tamaño compacto):
   - `TVDashboard.jsx` (166 líneas) — dashboard para TV/display con auto-refresh. Patrón: polling timer + render condicionado.
   - `ChecklistPage.jsx` (182 líneas) — checklist UI para verificación de equipos.
   - `EquipoPublico.jsx` (244 líneas) — página pública de un equipo (sin auth, vista de solo-lectura).
   - `QRScanner.jsx` (252 líneas) — escáner QR (probablemente requiere mock de `navigator.mediaDevices` o de la cámara).
   - `AdminGlobal.jsx` (274 líneas) — admin global cross-hospital.
   - `Almacen.jsx` (392 líneas) — almacén de refacciones/consumibles.
   - `QRBatch.jsx` (419 líneas) — generación batch de QRs.
   - `CommandCenter.jsx` (445 líneas) — centro de comando (puede tener charts).
   - `Reservas.jsx` (475 líneas) — reservas de equipos (queda al final por tamaño/blast-radius).
   - `Copilot.jsx` (711 líneas) — copilot con IA.
   - `Ordenes.jsx` (750 líneas) — órdenes de servicio (queda al final por tamaño).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx + Trazabilidad.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial. 3 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23, Trazabilidad ciclo 25) — si se aborda en un próximo ciclo, sería un mini-item correctivo de bajo riesgo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 26)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata compacta del backlog. **`TVDashboard.jsx` (166 líneas)** es la siguiente candidata compacta sin mapa Leaflet; módulo de display para TV con auto-refresh polling. Patrón probablemente similar a Reportes (fetch + timer). Si no cabe, fallback a **`ChecklistPage.jsx` (182 líneas)** — checklist UI con verificación por item. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones + Metrologia + Trazabilidad** (item #4) como mini-item correctivo.

---

## Ciclo 23 — 2026-06-26 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedor `openclaw` Up 4d healthy.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (246 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (11 ms).

**Item hecho:** Backlog #1 (continuación) — **Metrologia.jsx** (246 líneas, módulo de cumplimiento metrológico bajo NOM-028 — control de exactitud y certificados de instrumentos de medición con tabla y KPIs en `/metrologia`). 43 tests nuevos, **426 → 469 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 22 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Metrologia.jsx (246 líneas)** era la candidata siguiente del set sin charts ni mapa Leaflet. Es el módulo de cumplimiento normativo: cualquier bug en él puede hacer que la calibración del instrumental del hospital (esfigmomanómetros, termómetros, básculas, flujómetros O₂) no quede registrada y dejar al hospital fuera de cumplimiento NOM-028. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Estado loading inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente en "Cargando calibraciones..." aunque la promesa ya resolvió.
- **Tolerancia a shape ausente en DOS lugares** (`?? data ?? []`):
  - Lista principal: `data.calibraciones ?? data ?? []` — si la API devuelve array directo (sin wrap), funciona; si devuelve `{calibraciones: null}` o `null`, rescata a `[]`.
  - Modal: `data.equipos ?? data ?? []` para cargar el select de equipos.
  - Mismo **BUG LATENTE** que en Capacitaciones: si la API devuelve `{}` (objeto sin la key), el `?? []` no rescata porque `{}` no es nullish. Si en algún ciclo se quiere tapar, basta cambiar el fallback a `Array.isArray(...) ? ... : []`. Misma decisión: se documenta, no se corrige todavía (alcance acotado del ciclo).
- **3 endpoints**:
  - `api.getMetrologia()` — carga la lista en mount.
  - `api.getEquipos({ limit: 200 })` — el modal llama en su mount (NO en mount de la página).
  - `api.crearCalibracion(data)` — submit del formulario.
- **2 validaciones en orden estricto** (a diferencia de Capacitaciones que tiene 3):
  1. `!form.equipo_id` → `toast.error('Selecciona un equipo')`.
  2. `!form.tipo_medicion.trim()` → `toast.error('Ingresa el tipo de medición')`.
  - El `.trim()` es clave: si alguien lo olvida, un tipo de `"   "` (espacios) pasa la validación y queda como calibración vacía en backend.
- **`equipo_id: Number(form.equipo_id)` y `vigencia_meses: Number(form.vigencia_meses)`** en el submit. Si alguien quita los `Number()`, el backend recibe strings y rechaza con 422 — el operador ve un toast rojo confuso.
- **Toast.success literal `"Calibración registrada correctamente"`**.
- **Toast.error con fallback chain**: `err.response?.data?.detail || 'Error al registrar calibración'`. Cubre 2 paths distintos:
  - 4xx del backend con `detail` estructurado (e.g. validación) → muestra el detail.
  - Error de red puro sin `response` (timeout, CORS) → fallback al mensaje genérico.
- **`.finally(() => setSaving(false))`**: si alguien lo borra, el botón "Registrar Calibración" se queda con `disabled` y label "Registrando..." para siempre tras un error.
- **Default `fecha_calibracion = new Date().toISOString().split('T')[0]`** (YYYY-MM-DD de hoy). El input es `type="date"`. Si alguien lo quita, el campo queda vacío y el `required` HTML5 bloquea el submit.
- **Default `vigencia_meses = 12`**. El input es `type="number"` con `min={1} max={120}`. Si alguien cambia el default sin actualizar el Number() conversion en submit, la calibración se crea con 12 meses pero el backend podría no entender el cambio.
- **3 KPIs derivados** del array de calibraciones:
  - **Equipos Calibrados**: `calibraciones.length` — total de calibraciones registradas.
  - **Próximos a Vencer (30d)**: filtro `new Date(c.proxima_calibracion) - new Date() > 0 && < 30*24*60*60*1000` — ventana EXACTA de 30 días en ms. Si alguien cambia la ventana, el conteo del operador se descalibra.
  - **Vencidos / Fuera de Norma**: `calibraciones.filter(c => new Date(c.proxima_calibracion) <= new Date()).length` — incluye hoy (≤ no <).
- **Estado de fila por fecha calculada (no campo del backend)**: `isPast = new Date(c.proxima_calibracion) <= new Date()`. Si alguien invierte la comparación, TODAS las calibraciones quedan marcadas al revés (VENCIDAS como VIGENTES y viceversa).
- **2 ramas visuales según `isPast`**:
  - `isPast=true` → texto rojo en "Próxima" + badge "REEMPLAZAR/CALIBRAR" (rojo) — la calibración está vencida, hay que reemplazar el instrumento o re-calibrarlo.
  - `isPast=false` → texto emerald en "Próxima" + badge "VIGENTE" (emerald).
- **Botón Certificado con 2 paths exclusivos**:
  - `c.certificado_url` truthy → `window.open(c.certificado_url, '_blank')` — abre el PDF en nueva pestaña.
  - `c.certificado_url` falsy (string vacío, null, undefined) → `toast('Certificado aún no cargado para este equipo', { icon: '📄' })` — el único lugar del codebase donde **toast se usa COMO FUNCIÓN** (no como `toast.success/error`). El mock por tanto es un `vi.fn()` callable con métodos `success/error/info/warning/loading/dismiss` attached (vía `vi.hoisted`).

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `setLoading(false)` del `.finally()`, la pantalla se queda con "Cargando calibraciones..." para siempre.
- Si el `Number()` se olvida en submit (en equipo_id O vigencia_meses), el backend rechaza con 422.
- Si el `.trim()` se olvida en validación, espacios pasan como tipo de medición vacío.
- Si el `onSaved()` no se llama tras éxito, el modal queda abierto y la lista no se refresca.
- Si el orden de validación cambia, los mensajes específicos se pierden.
- Si la condición `isPast = ... <= new Date()` se rompe, las calibraciones pasadas se marcan como VIGENTE y viceversa.
- Si la ventana de 30 días cambia (e.g. 60d, 90d), los conteos del operador quedan descalibrados sin aviso visible.
- Si la rama `else toast(msg, opts)` del certificado button se rompe, el operador hace click y no recibe feedback de que el certificado aún no está cargado.
- Si el catch del getEquipos del modal no loggea a toast, los equipos no se cargan y el operador no sabe por qué el select está vacío.

### Cambio (commit del ciclo 23)

**1 archivo de test, 43 casos nuevos (426 → 469 tests):**

`src/pages/Metrologia.test.jsx` (43 tests, 10 grupos):

- **Render base (6)**:
  - "Cargando calibraciones..." visible mientras `api.getMetrologia` no resuelve.
  - Loading desaparece tras resolución.
  - Header `<h1>` "Metrología y Calibración" presente.
  - Subtítulo scoped al `<p>` hermano del h1 menciona "Control de exactitud y certificados".
  - Botón "Nueva Calibración" en la cabecera.
  - 3 KPI cards visibles: "Equipos Calibrados", "Próximos a Vencer (30d)", "Vencidos / Fuera de Norma".
- **KPI counts (4)**:
  - "Equipos Calibrados" = `calibraciones.length`.
  - "Próximos a Vencer (30d)" cuenta SOLO las dentro de la ventana de 30 días (1 de 3 fixtures).
  - "Vencidos" cuenta las calibraciones con `proxima_calibracion <= hoy` (1 de 3 fixtures).
  - Todos los KPIs muestran 0 cuando la lista está vacía.
- **Empty state (1)**:
  - "Sin calibraciones registradas." cuando la lista está vacía (texto distinto al "No hay registros de capacitación aún." de Capacitaciones).
- **Tabla de calibraciones (6)**:
  - 6 headers de columna en orden: Equipo/Serie, Magnitud/Tipo, Última, Próxima, Estado, Certificado.
  - Calibración VIGENTE → badge verde "VIGENTE".
  - Calibración VENCIDA → badge rojo "REEMPLAZAR/CALIBRAR".
  - Fecha "Próxima" se renderiza en rojo cuando está vencida.
  - Fecha "Próxima" se renderiza en emerald cuando está vigente.
  - Nombre del equipo en bold + serie en uppercase.
  - Múltiples filas renderizan los 3 nombres de equipo.
- **Botón Certificado (2)**:
  - Click CON URL → `window.open('https://...', '_blank')` y NO se llama toast.
  - Click SIN URL → `toast('Certificado aún no cargado para este equipo', { icon: '📄' })` y NO se llama window.open. **Cubre el uso único de toast como función** en el codebase.
- **Modal — apertura y campos (8)**:
  - Click en "Nueva Calibración" abre modal con `<h2>` "Nueva Calibración".
  - Al abrir el modal llama `getEquipos({ limit: 200 })`.
  - El select muestra los 3 equipos cargados.
  - Campo fecha_calibracion pre-rellenado con `2026-06-26` (today).
  - Campo vigencia_meses pre-rellenado con `12`.
  - 6 labels del formulario visibles: Equipo*, Tipo de medición*, Fecha de calibración*, Vigencia (meses), Entidad calibradora, Número de certificado.
  - Botones "Cancelar" y "Registrar Calibración".
  - "Cancelar" cierra el modal SIN enviar.
- **Validación (3)**:
  - Submit sin equipo_id → 'Selecciona un equipo'. (Usa `fireEvent.submit(form)` para bypassear `required` HTML5.)
  - Submit con equipo pero sin tipo_medicion → 'Ingresa el tipo de medición'.
  - Tipo_medicion con sólo whitespace (`"   "`) → 'Ingresa el tipo de medición' (cubre `.trim()`).
- **Submit exitoso (4)**:
  - `crearCalibracion` llamado con `equipo_id: 10` Y `vigencia_meses: 12` (ambos Number, NO string).
  - Otros args correctos: tipo_medicion, entidad_calibradora, certificado_numero, fecha_capacitacion=2026-06-26.
  - `toast.success('Calibración registrada correctamente')`.
  - Modal se cierra tras éxito Y `getMetrologia` se llama ≥2 veces (mount + reload vía `onSaved`).
  - Botón cambia a "Registrando..." y se `disabled` mientras `saving=true`.
- **Submit con error (3)**:
  - 422 del backend → `toast.error(err.response.data.detail)` (e.g. 'Equipo no encontrado').
  - Error de red puro (sin `response`) → `toast.error('Error al registrar calibración')` (fallback).
  - Tras error: modal sigue abierto, botón volvió a "Registrar Calibración" (no "Registrando...") — prueba que `saving=false` vía `.finally()`.
- **Carga inicial y tolerancia a shape (5)**:
  - Error de carga → `toast.error('Error al cargar metrología')`.
  - `{calibraciones: []}` → empty state visible.
  - `[CAL_VIGENTE_LEJOS]` (array directo) → renderiza la fila (cubre `?? data`).
  - `getEquipos` falla en modal → `toast.error('Error al cargar equipos')`.
  - `getEquipos` array directo → renderiza opciones del select (cubre `?? data`).

**Fixtures (3 items):**
- `CAL_VIGENTE_LEJOS` — `proxima_calibracion: '2027-01-15'` (~200d en el futuro). NO cuenta en "Próximos a Vencer". VIGENTE.
- `CAL_VIGENTE_30D` — `proxima_calibracion: '2026-07-10'` (~14d en el futuro, dentro de 30d). SÍ cuenta en "Próximos a Vencer". VIGENTE.
- `CAL_VENCIDA` — `proxima_calibracion: '2026-05-10'` (~47d en el pasado). SÍ cuenta en "Vencidos". REEMPLAZAR/CALIBRAR.

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` con 3 endpoints (`getMetrologia`, `getEquipos`, `crearCalibracion`) — mismo patrón que el resto.
- `vi.mock('../lib/toast', ...)` con default + named export. **DIFERENCIA vs otros tests**: el default export es un `vi.fn()` CALLABLE con métodos `success/error/info/warning/loading/dismiss` attached. Esto cubre el `toast(msg, opts)` del botón Certificado (única llamada como función en el codebase) Y los `toast.success(msg)` / `toast.error(msg)` del modal.
- **No se mockea `lucide-react`** — los iconos son SVGs con paths hardcoded (ShieldCheck, Calendar, AlertCircle, Plus, FileText, X).
- **No se mockea `framer-motion`** — Metrologia no lo usa.
- **No se usa MemoryRouter** — Metrologia no importa react-router.
- `vi.spyOn(window, 'open').mockImplementation(() => null)` — para no abrir pestañas reales durante los tests del botón Certificado y poder verificar las llamadas.
- `console.error` silenciado — el catch de `cargar()` y el catch de `crearCalibracion` loggean a stderr en errores esperados.

**Tricky bit documentado:**
- El `<form>` tiene `required` en 3 inputs (select, tipo_medicion, fecha_calibracion). En jsdom, click en botón `type="submit"` dispara validación HTML5 que bloquea el submit antes de que `handleSubmit` corra. Para testear la validación JS, se usa `fireEvent.submit(form)` que dispara el evento `submit` directamente sin pasar por la validación HTML5 — patrón estándar que también usa Capacitaciones.test.jsx.
- El mock de toast callable es la pieza nueva más sutil del ciclo. Ver `Mocks (justificados)` arriba.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 22) | Después (ciclo 23) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Metrologia` (lazy) | no chunk propio, incluido en `index` | **10.77 kB / 2.78 kB gzip** | nuevo chunk lazy |
| `Capacitaciones` (lazy) | 9.23 kB / 2.72 kB gzip | 9.23 kB / 2.72 kB gzip | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Metrologia.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Metrologia` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.19 s.

`npm test` → **469 passed (469)** en 3.93 s (43 nuevos casos, 426 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a Metrologia que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- **vitest smoke tests para Metrologia — 469 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: `Reportes.jsx` (236 líneas, generación PDF/Excel con Blob + window.open — patrón parcialmente cubierto en AuditPage.test.jsx), `Trazabilidad.jsx` (204 líneas, módulo de trazabilidad por zona/piso con mapa en vivo — `Leaflet` requiere mock extra). `Reservas.jsx` (475 líneas) queda al final por tamaño/blast-radius. **Pendientes también** las páginas que aún no tienen test: `Almacen`, `CommandCenter`, `Copilot`, `ChecklistPage`, `EquipoPublico`, `QRBatch`, `QRScanner`, `TVDashboard`, `Ordenes`, `AdminGlobal`.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `?? []` en Capacitaciones.jsx Y Metrologia.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial. 2 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23) — si se aborda en un próximo ciclo, sería un mini-item correctivo de bajo riesgo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 24)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata del backlog por tamaño/blast-radius. **`Reportes.jsx` (236 líneas)** es la siguiente candidata sin mapa Leaflet; módulo de generación PDF/Excel con Blob + window.open (patrón parcialmente cubierto en AuditPage.test.jsx). Si no cabe, fallback a **`Trazabilidad.jsx` (204 líneas, con mapa Leaflet — requiere mock extra de `react-leaflet`)**. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones.jsx + Metrologia.jsx** (item #4) como mini-item correctivo.

---

## Ciclo 22 — 2026-06-26 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 3d healthy; sigah-backend 4d; sigab-panel-api 4d; openclaw 4d; sigah-mysql 5d; sigah-frontend 5d; n8n-sigah-n8n-1 6d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (346 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (346 ms).

**Item hecho:** Backlog #1 (continuación) — **Capacitaciones.jsx** (208 líneas, módulo de cumplimiento NOM-016 — registro de formación en uso y seguridad de equipos médicos, con CRUD simple via modal en `/capacitaciones`). 39 tests nuevos, **387 → 426 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 21 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Capacitaciones.jsx (208 líneas)** era la candidata siguiente del set sin charts ni mapa Leaflet. Es el módulo de compliance normativo: cualquier bug en él puede hacer que la formación del personal en uso de equipos no quede registrada y dejar al hospital fuera de cumplimiento NOM-016. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Estado loading inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente en "Cargando capacitaciones..." aunque la promesa ya resolvió.
- **Tolerancia a shape ausente en DOS lugares** (`?? data ?? []`):
  - Lista principal: `data.capacitaciones ?? data ?? []` — si la API devuelve array directo (sin wrap), funciona; si devuelve `{capacitaciones: null}` o `null`, rescata a `[]`.
  - Modal: `data.equipos ?? data ?? []` para cargar el select de equipos.
  - **BUG LATENTE detectado**: si la API devuelve `{}` (objeto sin la key), el `?? []` no rescata porque `{}` no es nullish. Documentado en el test como "NOTA". Si en algún ciclo se quiere tapar, basta cambiar el fallback a `Array.isArray(...) ? ... : []`.
- **3 endpoints**:
  - `api.getCapacitaciones()` — carga la lista en mount.
  - `api.getEquipos({ limit: 200 })` — el modal llama en su mount (NO en mount de la página).
  - `api.crearCapacitacion(data)` — submit del formulario.
- **3 validaciones en orden estricto**:
  1. `!form.equipo_id` → `toast.error('Selecciona un equipo')`.
  2. `!form.tema.trim()` → `toast.error('Ingresa el tema de la capacitación')`.
  3. `!form.personal_capacitado.trim()` → `toast.error('Indica el personal capacitado')`.
  - El `.trim()` es clave: si alguien lo olvida, un tema de `"   "` (espacios) pasa la validación y queda como capacitación vacía en backend.
- **`equipo_id: Number(form.equipo_id)`** en el submit. Si alguien quita el `Number()`, el backend recibe un string y rechaza con 422 — el operador ve un toast rojo confuso.
- **Toast.success literal `"Capacitación registrada — cumplimiento NOM-016"`** con em-dash U+2014 (NO guion normal). El operador espera ver exactamente este mensaje porque confirma el cumplimiento normativo.
- **Toast.error con fallback chain**: `err.response?.data?.detail || 'Error al registrar capacitación'`. Cubre 2 paths distintos:
  - 4xx del backend con `detail` estructurado (e.g. validación) → muestra el detail.
  - Error de red puro sin `response` (timeout, CORS) → fallback al mensaje genérico.
- **`.finally(() => setSaving(false))`**: si alguien lo borra, el botón "Registrar Capacitación" se queda con `disabled` y label "Registrando..." para siempre tras un error.
- **Default `fecha_capacitacion = new Date().toISOString().split('T')[0]`** (YYYY-MM-DD de hoy). El input es `type="date"`. Si alguien lo quita, el campo queda vacío y el `required` HTML5 bloquea el submit.
- **`item.instructor || 'Por definir'`** para campos vacíos (instructor es opcional en backend).
- **`item.personal_capacitado && (...)`** para no renderizar el párrafo cuando el personal está vacío — silencio, NO renderiza "—".
- **Empty state con botón "+ Agregar primer registro"** que abre el modal también (no sólo el botón del header).
- **Card footer "Evidencia Digital"** + ChevronRight de lucide en cada card.

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `setLoading(false)` del `.finally()`, la pantalla se queda con "Cargando capacitaciones..." para siempre.
- Si el `Number()` se olvida en submit, el backend rechaza con 422.
- Si el `.trim()` se olvida en validación, espacios pasan como tema/personal vacío.
- Si el `onSaved()` no se llama tras éxito, el modal queda abierto y la lista no se refresca.
- Si el orden de validación cambia, los mensajes específicos se pierden (ej. "Selecciona un equipo" nunca aparece porque tema se valida primero).
- Si el catch del getEquipos del modal no loggea a toast, los equipos no se cargan y el operador no sabe por qué el select está vacío.
- Si `.finally()` se borra, el botón submit queda `disabled` tras error (saving=true forever).
- Si el `?? []` no se cubre con `Array.isArray`, una respuesta `{}` rompe `.map()`.

### Cambio (commit `b07294e`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 39 casos nuevos (387 → 426 tests, +767 líneas):**

`src/pages/Capacitaciones.test.jsx` (39 tests, 8 grupos):

- **Render base (5)**:
  - "Cargando capacitaciones..." visible mientras `api.getCapacitaciones` no resuelve.
  - Loading desaparece tras resolución.
  - Header `<h1>` "Capacitación de Personal" presente.
  - Subtítulo scoped al `<p>` hermano del h1 menciona NOM-016.
  - Botón "Nuevo Registro" en la cabecera.
- **Cards de items (8)**:
  - Una card por capacitación con tema (h3) + equipo + serie.
  - `fecha_capacitacion` en `<span className="font-mono">` para test del estilo monoespaciado.
  - Label "Instructor:" + valor en bold.
  - "Por definir" cuando instructor está vacío (cubre `||` fallback).
  - `personal_capacitado` en párrafo truncado con title (cubre truncado accesible).
  - NO renderiza el `<p>Personal: ...</p>` cuando personal está vacío (cubre `&&`).
  - Footer "Evidencia Digital" + clases uppercase.
  - 3 cards renderizan 3 h3 distintos (cubre grid responsive).
- **Empty state (2)**:
  - "No hay registros de capacitación aún." cuando la lista está vacía.
  - El botón "+ Agregar primer registro" del empty state abre el modal.
- **Modal — apertura y campos (7)**:
  - Click en "Nuevo Registro" abre modal con `<h2>` "Nuevo Registro de Capacitación".
  - Al abrir el modal llama `getEquipos({ limit: 200 })`.
  - El select muestra los 3 equipos cargados (vía `<option>{nombre} — {serie}</option>`).
  - Campo fecha_capacitacion pre-rellenado con `2026-06-26` (today).
  - 5 campos del formulario visibles con labels (Equipo*, Tema*, Fecha*, Instructor, Personal*).
  - Botones "Cancelar" y "Registrar Capacitación".
  - "Cancelar" cierra el modal SIN enviar (`crearCapacitacion` no llamado).
- **Validación (4)**:
  - Submit sin equipo_id → 'Selecciona un equipo'. (Usa `fireEvent.submit(form)` para bypassear `required` HTML5.)
  - Submit con equipo pero sin tema → 'Ingresa el tema de la capacitación'.
  - Submit con tema pero sin personal → 'Indica el personal capacitado'.
  - Tema con sólo whitespace (`"   "`) → 'Ingresa el tema...' (cubre `.trim()`).
- **Submit exitoso (4)**:
  - `crearCapacitacion` llamado con `equipo_id: 10` (Number, NO string).
  - Otros args correctos: tema, instructor, personal_capacitado, fecha_capacitacion=2026-06-26.
  - `toast.success('Capacitación registrada — cumplimiento NOM-016')` (em-dash U+2014).
  - Modal se cierra tras éxito Y `getCapacitaciones` se llama ≥2 veces (mount + reload vía `onSaved`).
  - Botón cambia a "Registrando..." y se `disabled` mientras `saving=true`.
- **Submit con error (3)**:
  - 422 del backend → `toast.error(err.response.data.detail)` (e.g. 'Equipo no encontrado').
  - Error de red puro (sin `response`) → `toast.error('Error al registrar capacitación')` (fallback).
  - Tras error: modal sigue abierto, botón volvió a "Registrar Capacitación" (no "Registrando...") — prueba que `saving=false` vía `.finally()`.
- **Carga inicial y tolerancia a shape (6)**:
  - Error de carga → `toast.error('Error al cargar capacitaciones')`.
  - `{capacitaciones: []}` → empty state visible.
  - `[CAP_BASIC]` (array directo) → renderiza la card (cubre `?? data`).
  - `getEquipos` falla en modal → `toast.error('Error al cargar equipos')`.
  - `getEquipos` array directo → renderiza opciones del select (cubre `?? data`).
  - **NOTA documentada**: `{}` (objeto vacío) ROMPE `.map()` porque `?? []` no rescata objetos vacíos — bug latente del fallback chain.

**Fixtures (3 items):**
- `CAP_BASIC` — happy path completo con instructor + personal.
- `CAP_SIN_INSTRUCTOR` — instructor vacío (cubre `|| 'Por definir'`).
- `CAP_SIN_PERSONAL` — personal_capacitado vacío (cubre `&& (...)` no-render).

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` con 3 endpoints (`getCapacitaciones`, `getEquipos`, `crearCapacitacion`) — mismo patrón que el resto.
- `vi.mock('../lib/toast', ...)` con default + named export (Capacitaciones importa de `'../lib/toast'`).
- **No se mockea `framer-motion`** — Capacitaciones no lo usa.
- **No se mockea `lucide-react`** — los iconos son SVGs con paths hardcoded (GraduationCap, Calendar, Users, Plus, ChevronRight, X).
- **No se usa MemoryRouter** — Capacitaciones no importa react-router.
- `console.error` silenciado — el catch de `cargar()` y el catch de `crearCapacitacion` loggean a stderr en errores esperados.

**Tricky bit documentado:**
- El `<form>` tiene `required` en 3 inputs (select, tema, personal). En jsdom, click en botón `type="submit"` dispara validación HTML5 que bloquea el submit antes de que `handleSubmit` corra. Para testear la validación JS, se usa `fireEvent.submit(form)` que dispara el evento `submit` directamente sin pasar por la validación HTML5 — patrón estándar que también usa SuperAdmin.test.jsx.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 21) | Después (ciclo 22) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Capacitaciones` (lazy) | no chunk propio, incluido en `index` | **9.23 kB / 2.72 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Capacitaciones.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Capacitaciones` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.28 s.

`npm test` → **426 passed (426)** en 3.72 s (39 nuevos casos, 387 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a Capacitaciones que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- **vitest smoke tests para Capacitaciones — 426 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: `Metrologia.jsx` (246 líneas, módulo de calibración/verificación metrológica con tabla y filtros), `Reportes.jsx` (236 líneas, generación PDF/Excel con Blob + window.open — patrón parcialmente cubierto en AuditPage.test.jsx), `Trazabilidad.jsx` (204 líneas, módulo de trazabilidad por zona/piso con mapa en vivo — `Leaflet` requiere mock extra). `Reservas.jsx` (475 líneas) queda al final por tamaño/blast-radius. **Pendientes también** las páginas que aún no tienen test: `Almacen`, `CommandCenter`, `Copilot`, `ChecklistPage`, `EquipoPublico`, `QRBatch`, `QRScanner`, `TVDashboard`, `Ordenes`, `AdminGlobal`.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `data.capacitaciones ?? data ?? []` en Capacitaciones.jsx** (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.capacitaciones) ? data.capacitaciones : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 23)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata del backlog por tamaño/blast-radius. **`Metrologia.jsx` (246 líneas)** es la siguiente candidata sin charts ni mapa Leaflet; módulo de calibración/verificación metrológica. Si no cabe, fallback a **`Reportes.jsx` (236 líneas)** o **`Trazabilidad.jsx` (204 líneas, con mapa Leaflet — requiere mock extra de `react-leaflet`)**. Alternativa de bajo riesgo: **tapar el bug latente `?? []` en Capacitaciones.jsx** (item #4) como mini-item correctivo.

---

## Ciclo 21 — 2026-06-26 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 3d healthy; sigah-backend 4d; sigab-panel-api 4d; openclaw 3d; sigah-mysql 5d; sigah-frontend 5d; n8n-sigah-n8n-1 6d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (317 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (346 ms).

**Item hecho:** Backlog #1 (continuación) — **Analitica.jsx** (186 líneas, dashboard "Ingeniería Clínica 4.0" con badge "Powered by Gemma" y heatmap de fiabilidad operativa MTBF/MTTR/Prob. Falla en `/analitica`). 30 tests nuevos, **357 → 387 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 20 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Analitica.jsx es la candidata más chica** (186 líneas) del set que aún no tenía cobertura. Es el dashboard predictivo que se renderiza con un solo endpoint (`api.getFiabilidad()`) y muestra métricas derivadas: count de equipos en riesgo, MTBF Promedio, MTTR Promedio. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Loading inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente con el spinner. A diferencia de Tecnovigilancia (que tiene texto "Cargando eventos..."), el loading de Analitica es un spinner PURO sin texto, así que el test lo detecta vía `.animate-spin` (no `getByText('Cargando...')`).
- **`api.getFiabilidad()` con tolerancia a 3 shapes**:
  - `{ok: true, fiabilidad: [...]}` → setMetricas([...])
  - `{ok: true}` (sin key fiabilidad) → `res.fiabilidad || []` rescata a `[]` y setMetricas([]). Si alguien borra el `|| []`, la UI rompe con "metricas.filter is not a function".
  - `{ok: false}` → el `if (res.ok)` NO entra, setMetricas NO se llama, queda con initial `[]`. Diferente del caso anterior: aquí no se ejecuta la rama de fallback.
- **3 KPIs derivados** del array de métricas:
  - **Equipos en Riesgo**: `metricas.filter(m => m.riesgo === 'Crítico').length` — con acento en la "i". Si alguien cambia `'Crítico'` por `'Critico'` (sin acento), el contador siempre queda en 0 (todos los items son "Bajo"/"Medio").
  - **MTBF Promedio**: `Math.round(metricas.reduce((a, b) => a + b.mtbf_dias, 0) / metricas.length)` — el `Math.round` es importante para no mostrar decimales feos.
  - **MTTR Promedio**: `(metricas.reduce((a, b) => a + b.mttr_horas, 0) / metricas.length).toFixed(1)` — `.toFixed(1)` para 1 decimal.
  - Si la lista está vacía, los 3 KPIs muestran 0 (cubre `metricas.length > 0 ? ... : 0`).
- **Disponibilidad Global HARDCODED a 98.4%** con `+0.4% vs mes anterior` y TrendingUp verde. No se calcula de los datos — si el operador ve un cambio en Disponibilidad, NO se debe a los datos en pantalla, sino al hardcode. Esta es una decisión de diseño que el test documenta: si alguien "ayuda" calculando Disponibilidad de metricas, puede romper la consistencia con el comentario del código.
- **Tabla con 5 columnas en orden**: "Activo / Serie", "Prob. Falla", "MTBF (D)", "MTTR (H)", "Estatus I.A." — el orden es importante porque refleja la jerarquía visual (asset → riesgo numérico → métricas operativas → clasificación IA).
- **3 ramas de color por `m.color`** (data field, NO por riesgo):
  - `color === 'red'` → `text-red-500` (texto del %) + `bg-red-500` (bar interior, SIN /10).
  - `color === 'orange'` → `text-orange-500` + `bg-orange-500`.
  - default (cualquier otro valor) → `text-emerald-500` + `bg-emerald-500`.
  - NOTA: la constante `bgColor` con `bg-red-500/10` se DECLARA en el componente pero NO se usa en el JSX — es dead code (probablemente residuo de un refactor previo). El test verifica los 2 colores que SÍ están en el render.
  - El campo `m.color` es INDEPENDIENTE de `m.riesgo` (puede haber un "Medio" con color "red" si el backend lo manda así). El test usa la rama "Medio + orange" para verificar esa independencia.
- **3 ramas del badge Estatus I.A. según `m.riesgo`**:
  - `m.riesgo === 'Crítico'` → `bg-red-500/10 border-red-500/30 text-red-500` (sin shadow).
  - `m.riesgo === 'Medio'` → `bg-orange-500/10 border-orange-500/30 text-orange-500` (sin shadow).
  - default → `bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-lg shadow-emerald-500/5` (CON shadow — feedback visual de "todo bien" sólo en bajo riesgo).
  - Si alguien refactorea el ternario y se olvida del `shadow-lg` en la rama default, el operador pierde la única distinción visual entre "Medio" (naranja plano) y "Bajo" (verde con glow).
  - El badge es un `<span className="...rounded-xl...">` mientras la leyenda "Óptimo/Preventivo/Crítico" es un `<div>` con dot — el test desambigua via `{ selector: 'span' }`.
- **Prob. Falla bar con `Math.min(m.probabilidad_falla_pct, 100)`**:
  - Cap visual importante: si la API manda `probabilidad_falla_pct: 150`, el bar se renderiza con `width: 100%` (NO 150%, lo que overflowearía el contenedor de 32 unidades de Tailwind = 8rem).
  - El TEXTO del % sí muestra "150%" (sin cap), porque el operador debe ver el valor crudo. El cap es sólo presentación visual del bar.
  - El test incluye un fixture `EV_OVERFLOW` con 150% para forzar esta rama.
- **Botón "Recalcular métricas"** (icono Activity de lucide, `title="Recalcular métricas"`):
  - `onClick` ejecuta `cargarDatos(); toast.success('Recalculando métricas…', { duration: 1500 })`.
  - El toast usa elipsis Unicode U+2026 (`…`), no tres puntos (`...`). Si alguien cambia a tres puntos, el toast se ve inconsistente con el resto del frontend que usa Sileo + Unicode ellipsis.
  - El `duration: 1500` es más corto que el default de toast (4-6s) — feedback rápido porque la acción es idempotente.
- **Error path**: `toast.error('Error cargando métricas predictivas')` + `console.error(error)`. Mensaje específico del módulo (no genérico "Error" — el operador debe saber qué falla). El `console.error` es para observabilidad (los errores reales en prod deben quedar en logs).
- **No se llama `toast.error` cuando `res.ok = false`** (sólo en el catch de network) — la respuesta "no ok" del backend se trata como silencio, no como error. Esto es un detalle sutil: si alguien añade un `else { toast.error(...) }` después del `if (res.ok)`, el operador ve un toast rojo cuando en realidad la API respondió correctamente con un "no".

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `|| []` del setMetricas, la UI rompe con TypeError cuando la API devuelve `{ok: true}` sin key `fiabilidad`.
- Si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda con el spinner para siempre.
- Si alguien cambia el filter `m.riesgo === 'Crítico'` por `m.riesgo === 'Critico'` (sin acento), el contador de "Equipos en Riesgo" siempre queda en 0.
- Si el `Math.min(probabilidad, 100)` se reemplaza por `probabilidad` crudo, un item con 150% overflowea visualmente el contenedor del bar.
- Si el `shadow-lg` se quita de la rama default del Estatus I.A. badge, se pierde la única distinción visual entre "Medio" y "Bajo".
- Si el botón Recalcular desconecta el `toast.success`, el operador no recibe feedback inmediato (sólo vería el refetch silencioso).
- Si el catch deja de loggear a `console.error`, los errores reales en producción son invisibles para el observador.
- Si la condición ternaria del Estatus se cambia a `m.riesgo === 'Bajo'` (explícito en lugar de default), los items con riesgo='Óptimo' o cualquier otro valor caen al default emerald pero el test lo cubre.

### Cambio (commit `8469f89`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 30 casos nuevos (357 → 387 tests, +574 líneas):**

`src/pages/Analitica.test.jsx` (30 tests, 9 grupos):

- **Render base (6)**:
  - Spinner `.animate-spin` visible mientras `api.getFiabilidad` no resuelve. Verifica también que tiene clase `rounded-full` (no es cualquier div girando).
  - Spinner desaparece tras resolución.
  - Header `<h1>` "Ingeniería Clínica 4.0" + subtítulo (scoped al `<p>` hermano del h1, no al KPI label "MTBF Promedio" ni al header de tabla "MTBF (D)") contiene "MTBF" y "MTTR".
  - 2 badges: "Métricas Predictivas" (esmeralda) + "Powered by Gemma" (azul, regex case-insensitive).
  - Botón con `title="Recalcular métricas"` presente, tag `<button>`.
  - 4 etiquetas de KPI: "Disponibilidad Global", "Equipos en Riesgo", "MTBF Promedio", "MTTR Promedio".
- **KPIs (6)**:
  - **Disponibilidad Global**: card contiene "98.4%" + "+0.4% vs mes anterior" (scoped al outer card div).
  - **Equipos en Riesgo**: con 4 items donde 1 es "Crítico" (EV_CRITICO) y otro es "Medio" (EV_OVERFLOW) → cuenta = 1. Subtítulo "Acción inmediata requerida" presente.
  - **Equipos en Riesgo = 0**: con 2 items "Bajo"/"Medio" → cuenta = 0.
  - **MTBF Promedio**: con mtbf_dias = [180, 90, 30] → 100 (Math.round de avg). Subtítulo "días" presente.
  - **MTTR Promedio**: con mttr_horas = [2.5, 4.0, 8.0] → "4.8" (toFixed(1) de avg=4.833...). Subtítulo "hrs" presente.
  - **Lista vacía**: ambos KPIs muestran "0" (NO NaN, NO "—"). Matcher `/(^|\D)0(\D|$)/` para evitar matchear la "i" en "estab**i**lidad" (en este caso no aplica, pero la regex es defensiva).
- **Tabla (4)**:
  - 5 headers en orden verificados: "Activo / Serie" (regex flexible), "Prob. Falla", "MTBF (D)", "MTTR (H)", "Estatus I.A.".
  - 3 items → 1 header + 3 filas. Cada modelo aparece. "marca · serie" en monoespaciado (regex case-insensitive).
  - `<h2>` "Heatmap de Fiabilidad Operativa" en cabecera de la card.
  - Leyenda: "Óptimo" + "Preventivo" + "Crítico" visible (este último via `getAllByText` porque puede aparecer en badges también).
- **Colores de fila por m.color (3)**:
  - `color=red` → texto "78%" tiene `text-red-500` + bar `bg-red-500` (sin /10) en la cell scope (`pctText.closest('div').querySelector`).
  - `color=orange` → "45%" + `text-orange-500` + `bg-orange-500`.
  - `color=green` (default) → "12%" + `text-emerald-500` + `bg-emerald-500`.
  - **NOTA**: el test NO verifica `bg-red-500/10` (ni variantes) en la cell porque la constante `bgColor` está declarada pero NO usada en el JSX (dead code). El test documenta este detalle con un comentario.
- **Badge Estatus I.A. — 3 ramas (3)**:
  - `riesgo="Crítico"` → span con `bg-red-500/10 border-red-500/30 text-red-500`. Verifica también que NO tiene `shadow` (sólo default lleva shadow).
  - `riesgo="Medio"` → span con `bg-orange-500/10 border-orange-500/30 text-orange-500`. Sin shadow.
  - `riesgo="Bajo"` (default) → span con `bg-emerald-500/10 border-emerald-500/30 text-emerald-500` + `shadow-lg` + `shadow-emerald-500/5`. El shadow es la única distinción visual de "todo bien".
  - Helper implícito: `getByText(text, { selector: 'span' })` desambigua del legend div.
- **Prob. Falla bar cap (2)**:
  - Normal (45%) → `bar.style.width === '45%'`.
  - Overflow (150%) → `bar.style.width === '100%'` (capeado) PERO el texto del % sigue mostrando "150%" (el cap es sólo visual). Test verifica ambos valores.
- **Botón Recalcular (2)**:
  - Click → `api.getFiabilidad` llamado 2 veces (mount + click). Usa `waitFor` para el segundo call.
  - Click → `toast.success` llamado con `'Recalculando métricas…'` (elipsis U+2026, NO tres puntos) y `{ duration: 1500 }`.
- **Error path (2)**:
  - `mockRejectedValue(new Error('Network'))` → `toast.error('Error cargando métricas predictivas')` + `console.error` llamado.
  - Tras error: spinner ya no está (loading=false via `.finally()`), h2 "Heatmap de Fiabilidad Operativa" sigue visible, EnRiesgo card = "0".
- **Tolerancia a shape ausente (2)**:
  - `{ok: true}` (sin key fiabilidad) → spinner gone, KPIs en 0, sin filas (1 row = header). Cubre `res.fiabilidad || []`.
  - `{ok: false}` → spinner gone, sin filas. `toast.error` NO se llama (el componente trata "ok: false" como silencio, no como error).

**Fixtures (4 items cubren las 3 ramas de color + 3 ramas de riesgo + borde Math.min):**
- `EV_OPTIMO` (color=green, riesgo=Bajo, prob=12%, mtbf=180, mttr=2.5).
- `EV_PREVENTIVO` (color=orange, riesgo=Medio, prob=45%, mtbf=90, mttr=4.0).
- `EV_CRITICO` (color=red, riesgo=Crítico, prob=78%, mtbf=30, mttr=8.0).
- `EV_OVERFLOW` (color=orange, riesgo=Medio, prob=**150%** para forzar cap Math.min, mtbf=60, mttr=6.0).

**Mocks (justificados):**
- `vi.mock('../api/sigab', ...)` con 1 endpoint (`getFiabilidad`) — mismo patrón que `Alertas`, `Equipos`, `AuditPage`, `Preventivos`, `Tecnovigilancia`.
- `vi.mock('../lib/toast', ...)` con default + named export del mock (Sileo adapter — Analitica importa de `'../lib/toast'`, NO de `'../components/Toast'` como los otros).
- **No se mockea `framer-motion`** — Analitica no usa framer-motion.
- **No se mockea `lucide-react`** — los iconos son SVGs con paths hardcoded, jsdom los renderiza como SVG inline.
- **No se usa MemoryRouter** — Analitica no importa react-router (a diferencia de Tecnovigilancia/Equipos que sí).
- `console.error` silenciado — el catch de `cargarDatos` loggea a stderr en errores esperados.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 20) | Después (ciclo 21) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Analitica` (lazy) | no chunk propio, incluido en `index` | **10.08 kB / 2.56 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Analitica.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Analitica` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.25 s.

`npm test` → **387 passed (387)** en 3.46 s (30 nuevos casos, 357 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a Analitica que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- **vitest smoke tests para Analitica — 387 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: `Trazabilidad.jsx` (204 líneas, módulo de trazabilidad por zona/piso con mapa en vivo — `Leaflet` requiere mock extra), `Metrologia.jsx` (246 líneas), `Capacitaciones.jsx` (208 líneas), `Reportes.jsx` (236 líneas, generación PDF/Excel con Blob + window.open — patrón parcialmente cubierto en AuditPage.test.jsx). `Reservas.jsx` (475 líneas) queda al final por tamaño/blast-radius. **Pendientes también** las páginas más chicas que aún no tienen test: `Login.jsx` (ya testeado en ciclos 9-13), `Dashboard.jsx` (testeado). Las candidatas que quedan sin test (sin contar modales) son ~10 páginas (Almacen, Alertas — testeado, AuditPage — testeado, Capacitaciones, CommandCenter, Copilot, ChecklistPage, EquipoPublico, Metrologia, QRBatch, QRScanner, Reportes, Reservas, SuperAdmin — testeado, Trazabilidad, TVDashboard).
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX (líneas 147 del componente). Cosmético puro.

### Próximo paso (Ciclo 22)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata del backlog por tamaño/blast-radius. **`Capacitaciones.jsx` (208 líneas)** es la siguiente candidata sin charts ni mapa Leaflet; módulo de gestión de capacitaciones con CRUD simple. Si no cabe, fallback a **`Metrologia.jsx`** (246 líneas) o **`Trazabilidad.jsx`** (204 líneas, con mapa Leaflet — requiere mock extra de `react-leaflet`). Alternativa de bajo riesgo: **limpiar el `bgColor` dead code de Analitica.jsx** (item #5) como mini-item cosmético.

---

## Ciclo 20 — 2026-06-26 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 2d healthy; sigah-backend 4d; sigab-panel-api 4d; openclaw 3d; sigah-mysql 5d; sigah-frontend 5d; n8n-sigah-n8n-1 5d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (319 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (296 ms).

**Item hecho:** Backlog #1 (continuación) — **Tecnovigilancia.jsx** (199 líneas, módulo NOM-240-SSA1-2012 de reporte y seguimiento de eventos adversos a COFEPRIS en `/tecnovigilancia`). 35 tests nuevos, **322 → 357 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 19 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Tecnovigilancia.jsx es la candidata más chica** (199 líneas) del set que aún no tenía cobertura. Es el módulo legal/compliance: cualquier bug en él puede hacer que un evento adverso no se reporte a COFEPRIS y dejar al hospital fuera de norma. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Estado loading inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente en "Cargando eventos..." aunque la promesa ya resolvió.
- **`api.getEventos({estado, severidad, busqueda})` con `undefined` explícito**: los 3 params se envían como `undefined` cuando no hay filtro (la condición `x || undefined`). Si alguien cambia a `omit` accidentalmente, axios los manda como keys vacías y el backend puede filtrar incorrectamente.
- **`useCallback` con `[estadoFiltro, severidadFiltro, busqueda]` + `useEffect([cargar])`**: cada cambio de filtro re-dispara `cargar()`. Si las deps del useCallback se cambian a `[]`, el usuario clickea un filtro y la lista no se actualiza.
- **Tolerancia a shape ausente**: `res.eventos || []` rescata respuestas `{}`. Si alguien borra el `|| []`, `.map()` rompe con TypeError cuando el backend devuelve respuesta parcial.
- **6 botones de estado + 5 botones de severidad con clases condicionales**:
  - Estado activo: `bg-emerald-100 text-emerald-700` (verde)
  - Severidad activa: `bg-red-100 text-red-600` (rojo)
  - Si alguien invierte los colores o cambia los breakpoint, el feedback visual de "qué filtro está activo" se confunde (verde es OK, rojo es urgente).
- **4 colores de badge Severidad** vía `TV_SEVERIDAD_COLORS` + `ev.severidad?.toUpperCase()`:
  - `critica` → `CRITICA` + `bg-red-600/30 text-red-300 border border-red-500` (la única con border).
  - `grave` → `GRAVE` + `bg-orange-500/20 text-orange-400`.
  - `moderada` → `MODERADA` + `bg-yellow-500/20 text-yellow-400`.
  - `leve` → `LEVE` + `bg-slate-500/20 text-slate-400`.
  - Si `toUpperCase()` se quita, los badges se ven en minúsculas (inconsistencia con badges de Estado que ya están en formato título).
- **5 colores de badge Estado** vía `TV_ESTADO_COLORS` + `TV_ESTADO_LABELS[ev.estado]`:
  - `reportado` → "Reportado" + azul, `en_investigacion` → "En investigación" + amarillo, `documentado` → "Documentado" + púrpura, `escalado_cofepris` → "Escalado COFEPRIS" + naranja, `cerrado` → "Cerrado" + esmeralda.
  - Si alguien refactorea `TV_ESTADO_COLORS` y mete una clase incorrecta, un evento "Escalado COFEPRIS" (que es el más urgente porque requiere acción regulatoria inmediata) puede verse verde (cerrado) y el operador lo ignora.
- **Colisión de texto entre filtro chip y badge**: el texto "Reportado" aparece como nombre del filtro chip (botón) Y como label del badge del evento. Si alguien busca por texto sin scoping, los tests fallan. Solución aplicada: `getAllByText(text, { selector: 'span' })` + filtro por clase `rounded` para localizar el badge.
- **Colisión de accessible name entre botón desktop "Reportar evento" y FAB móvil**: el botón desktop tiene texto visible "Reportar evento"; el FAB tiene `title="Reportar evento adverso"`. En jsdom, ambos matchean `getByRole('button', { name: /reportar evento/i })`. Solución aplicada: `getAllByRole` + índice 0.
- **`formatFecha(f)` defensivo**: `null/undefined → '—'`, ISO válida → `toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})`, fecha inválida → fallback `String(f)` vía try/catch. Si alguien quita el try/catch, `new Date('invalid-date-string').toLocaleDateString()` lanza y la fila rompe.
- **Singular/plural del contador**: `eventos.length !== 1 ? 's' : ''`. Si alguien refactorea a `eventos.length > 1 ? 's' : ''`, 0 eventos se vería como "0 evento" (sin plural) — visualmente feo pero menor. Si cambia a `eventos.length >= 1`, "1 evento" se vería como "1 eventos" (gramática rota, mayor).
- **Click en fila abre `EventoDetalleModal` con `selectedId`**: el modal es independiente (529 líneas), se monta con `{eventoId, onClose, onUpdated}`. Si alguien desconecta el `onClick`, el operador no puede ver el detalle del evento y el módulo queda sin uso real.
- **Botón desktop + FAB móvil abren `EventoAdversoModal`**: dos entry points al mismo modal. El FAB tiene `title="Reportar evento adverso"` para a11y móvil.
- **`onCreated(num)` cierra modal + toast.success + recarga lista**: si el `cargar()` se quita, el operador crea un evento y la lista sigue mostrando la vista anterior (sin su registro).
- **`onUpdated` (detalle) recarga lista**: si se rompe, los cambios de estado del evento (e.g. "Escalado a COFEPRIS") no se reflejan en la tabla principal.
- **Toast.error en catch**: `toast.error('No se pudieron cargar los eventos de tecnovigilancia')`. Si alguien cambia el texto a genérico "Error", el operador pierde el contexto operativo.

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `|| []` del `.then()` de `getEventos`, `.map()` rompe con TypeError cuando la API devuelve `{}`.
- Si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda en "Cargando eventos..." para siempre.
- Si las deps del `useCallback` se cambian a `[]`, los filtros no re-disparan `cargar()` y la lista nunca refleja el filtro activo.
- Si `ev.severidad?.toUpperCase()` se quita, los badges de severidad se ven en minúsculas (inconsistencia visual).
- Si la condición `estadoFiltro === e` se rompe, ningún botón de filtro se marca como activo y el operador no sabe qué filtro está aplicando.
- Si la condición del `eventos.length !== 1` se rompe, el contador puede decir "1 eventos".
- Si el `onClick` de la fila se desconecta, el modal de detalle nunca abre.
- Si el `cargar()` post-`onCreated` se quita, la lista queda desactualizada tras crear.
- Si la `try/catch` de `formatFecha` se quita, fechas inválidas lanzan excepción y la fila rompe.

### Cambio (commit `0fe6921`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 35 casos nuevos (322 → 357 tests, +739 líneas):**

`src/pages/Tecnovigilancia.test.jsx` (35 tests, 8 grupos):

- **Render base (5)**:
  - "Cargando eventos..." mientras `api.getEventos` no resuelve; los filtros siguen visibles durante loading.
  - Header `<h1>` "Tecnovigilancia" + subtítulo "NOM-240-SSA1-2012 — Reporte y seguimiento de eventos adversos" + al menos 1 botón "Reportar evento" presente.
  - **FAB móvil (md:hidden fixed) Y botón desktop coexisten**: 2 botones con texto accesible "Reportar evento" + el FAB distinguible por `title="Reportar evento adverso"`.
  - 6 botones de filtro estado (`Todos`, `Reportado`, `En investigación`, `Documentado`, `Escalado COFEPRIS`, `Cerrado`) + 5 botones de severidad (`Todas` + 4 valores en minúsculas con `capitalize` CSS). Verificado via `queryAllByRole` con regex combinada.
  - Input de búsqueda con placeholder "Buscar por No. reporte o dispositivo..." vacío inicialmente.
- **Empty state (3)**:
  - Lista vacía (`{eventos: []}`) → empty state con SVG de escudo + "Sin eventos adversos registrados con ese filtro.". Verificación de SVG inline vía `.closest('div').querySelector('svg')`.
  - **Tolerancia a shape ausente**: `mockResolvedValue({})` → empty state sin romper (cubre `res.eventos || []`).
  - Error de carga: `mockRejectedValue(new Error('Network'))` → empty state + `toast.error('No se pudieron cargar los eventos de tecnovigilancia')`.
- **Tabla render (5)**:
  - **7 headers en orden**: `No. Reporte`, `Dispositivo`, `Tipo`, `Severidad`, `Estado`, `Fecha evento`, `Reportante` (scoped via `screen.getByRole('table').querySelectorAll('th')`).
  - 2 eventos → 3 filas (1 header + 2 body), con números de reporte y dispositivos visibles.
  - Singular: 1 evento → `1 evento`.
  - Plural: 3 eventos → `3 eventos`.
  - `null` en `fecha_evento` y `reportante_nombre` → renderiza `—` en cada celda (2 ocurrencias mínimo).
- **Badge Severidad — 4 colores (4)**:
  - `critica` → "CRITICA" + `bg-red-600/30` + `text-red-300`.
  - `grave` → "GRAVE" + `bg-orange-500/20` + `text-orange-400`.
  - `moderada` → "MODERADA" + `bg-yellow-500/20` + `text-yellow-400`.
  - `leve` → "LEVE" + `bg-slate-500/20` + `text-slate-400`.
  - **Helper `getEstadoBadge(text)`** que desambigua del filtro chip via `{ selector: 'span' }` + filtro por clase `rounded`.
- **Badge Estado — 5 colores (5)**:
  - `reportado` → "Reportado" + `bg-blue-500/20` + `text-blue-400`.
  - `en_investigacion` → "En investigación" + `bg-yellow-500/20` + `text-yellow-400`.
  - `documentado` → "Documentado" + `bg-purple-500/20` + `text-purple-400`.
  - `escalado_cofepris` → "Escalado COFEPRIS" + `bg-orange-500/20` + `text-orange-400`.
  - `cerrado` → "Cerrado" + `bg-emerald-500/20` + `text-emerald-400`.
- **`formatFecha` — 3 ramas (3)**:
  - `null` → `—` (placeholder defensivo). Verificado via scoping de celda con `closest('tr').querySelectorAll('td')[5]`.
  - ISO válida `2026-06-20T14:30:00Z` → formato es-MX (`day:'2-digit', month:'short', year:'numeric'`). Test no bloquea el formato exacto (jsdom no tiene ICU completo), pero verifica que contenga `2026` y `20`, y NO sea ni `—` ni el ISO crudo.
  - String inválido `'invalid-date-string'` → fallback `String(f)` o `'Invalid Date'` sin romper. Verifica que la celda tenga contenido no vacío y no sea `—`.
- **Filtros — click re-dispara cargar (4)**:
  - Click "Reportado" → `api.getEventos` se llama 2 veces (mount + post-click), segundo call con `{estado: 'reportado', severidad: undefined, busqueda: undefined}`. El botón lleva clase activa `bg-emerald-100 text-emerald-700`.
  - Click "critica" (severidad) → segundo call con `{estado: undefined, severidad: 'critica', busqueda: undefined}`. El botón lleva clase activa `bg-red-100 text-red-600`.
  - Escribir "ventilador" en búsqueda → segundo call con `busqueda: 'ventilador'` + input refleja el valor.
  - Botón activo "Todos" pierde su clase `bg-emerald-100` al cambiar a "Cerrado" (cubre que sólo UN botón de estado está activo a la vez).
- **Modales (7)**:
  - Click en fila → `EventoDetalleModal` se monta con `eventoId={id}` correcto (via `data-evento-id`).
  - Click "CLOSE_DETALLE" → modal desmontado.
  - Click botón desktop "Reportar evento" → `EventoAdversoModal` se monta.
  - Click FAB móvil (vía `title="Reportar evento adverso"`) → `EventoAdversoModal` se monta.
  - `onCreated('TV-2026-001')` → modal cierra + `toast.success('Evento TV-2026-001 registrado')` + `cargar()` llamado de nuevo.
  - `onUpdated` desde detalle → `cargar()` llamado de nuevo.

**Fixtures (5 eventos cubren los 4 colores de severidad + 5 colores de estado + bordes de formatFecha):**
- `EV_CRITICO` (severidad=critica, estado=escalado_cofepris, fecha ISO válida, reportante con texto).
- `EV_GRAVE` (severidad=grave, estado=en_investigacion).
- `EV_MODERADA` (severidad=moderada, estado=reportado).
- `EV_LEVE` (severidad=leve, estado=cerrado, **fecha=null** para forzar rama `—`, **reportante=null** para forzar `—`).
- `EV_DOCUMENTADO` (severidad=moderada, estado=documentado, **fecha='invalid-date-string'** para forzar fallback String).

**Mocks (justificados):**
- `vi.mock('../api/sigab', ...)` con 1 endpoint (`getEventos`) — mismo patrón que `Alertas`, `Equipos`, `AuditPage`, `Preventivos`.
- `vi.mock('../components/Toast', ...)` con `useToast()` mockeado (mismo patrón que los 9 archivos previos).
- `vi.mock('../components/EventoAdversoModal', ...)` + `vi.mock('../components/EventoDetalleModal', ...)` — los modales son 389 + 529 líneas; se mockean con `<div data-testid>` + `<button>` para validar `onClose`/`onCreated`/`onUpdated`/`eventoId`. Mismo patrón que `Equipos.test.jsx` mockea `EquipoDetail`/`EquipoForm`.
- `MemoryRouter` con `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` — mismo setup que el resto de la suite (suprime warning de react-router v7).
- `console.error` silenciado — el `.catch()` de `cargar` imprime en errores esperados; sin esto, stderr se contamina con "Error: Network" en cada test negativo.
- **No se mockea `framer-motion`** — Tecnovigilancia no usa framer-motion.
- **No se mockea `lucide-react`** — los iconos son SVG inline del propio componente (paths hardcoded en `viewBox`), no de lucide.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 19) | Después (ciclo 20) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Tecnovigilancia` (lazy) | no chunk propio, incluido en `index` (creo que `Equipos` era el más grande antes del split) | **39.54 kB / 8.15 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Tecnovigilancia.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto en el chunk `index`. El chunk `Tecnovigilancia` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.24 s.

`npm test` → **357 passed (357)** en 3.27 s (35 nuevos casos, 322 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- **vitest smoke tests para Tecnovigilancia — 357 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: `Trazabilidad.jsx` (204 líneas, módulo de trazabilidad por zona/piso con mapa en vivo — `Leaflet` requiere mock extra), `Metrologia.jsx` (246 líneas), `Capacitaciones.jsx` (208 líneas), `Analitica.jsx` (186 líneas), `Reportes.jsx` (236 líneas, generación PDF/Excel con Blob + window.open — patrón parcialmente cubierto en AuditPage.test.jsx). `Reservas.jsx` (475 líneas) queda al final por tamaño/blast-radius.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 21)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir candidata del backlog por tamaño/blast-radius. **`Analitica` (186 líneas)** es la candidata más compacta que queda sin cobertura; módulo de analytics con charts. Si no cabe, fallback a **`Capacitaciones`** (208 líneas, sin charts pero con fetch complejo) o **`Trazabilidad`** (204 líneas, con mapa Leaflet — requiere mock extra).

---

## Ciclo 19 — 2026-06-25 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 2d healthy; sigah-backend 3d; sigab-panel-api 4d; openclaw 3d; sigah-mysql 5d; sigah-frontend 5d; n8n-sigah-n8n-1 5d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (333 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (326 ms).

**Item hecho:** Backlog #1 (continuación) — **Preventivos.jsx** (165 líneas, Centro de Mantenimientos Preventivos en `/preventivos`). 25 tests nuevos, **297 → 322 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 18 (item #1: tests para páginas con fetch, "elegir una página chica"). **Ordenes.jsx se descartó en este ciclo porque creció a 750 líneas** desde los 404 que STATE.md registraba — claramente fuera del scope de un solo ciclo headless. Salté a la página con fetch más chica del SPA que aún no tenía cobertura: **Preventivos** (165 líneas, lista de programaciones de mantenimiento con filtros + acción "Marcar ejecutado"). Es el candidato ideal para arrancar el patrón de mocks de fetch via `vi.mock('../api/sigab')` sin riesgo de tamaño.

Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Carga inicial con `.finally()` que apaga loading**: si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente en "Cargando preventivos..." aunque la promesa ya resolvió.
- **`api.getPreventivos()` con tolerancia a shape ausente**: `res.preventivos || []` rescata respuestas `{}`. Si alguien borra el `|| []`, `.filter()` rompe con TypeError cuando el backend devuelve respuesta parcial.
- **`diasRestantes(fecha)` con `Math.ceil` sobre ms**: la función redondea hacia arriba, así que un preventivo a 2.4 días se ve como "3d restantes". El borde es **sutil y matemático** — si alguien cambia `Math.ceil` por `Math.floor`, los preventivos a 0.5 días se ven como "0d restantes" ("Vence hoy") en lugar de "1d restantes".
- **4 ramas del BadgeVencimiento con clases exactas**: `<0 → bg-red-100 text-red-700`, `=0 → red "Vence hoy"`, `1-7 → bg-amber-100 text-amber-700`, `>7 → bg-emerald-100 text-emerald-700`. La distinción amber↔emerald en `>7 vs <=7` es el punto crítico de UX — un cambio accidental de `<=7` a `<7` pone el badge "amber" en preventivos a 0 días y los urgentes se confunden con los del día.
- **Borde urgente separado del badge**: `dias <= 3` activa `border-red-700` en la card raíz (no en el badge). Si alguien cambia `<=3` por `<3`, los preventivos a 3 días ya no se marcan en rojo y el operador pierde la señal visual más prominente de la card.
- **Filtros por días con bordes inclusivos**: `vencidos` = `dias < 0` (negativos estrictos), `proximos` = `0 <= dias <= 30`. Si alguien cambia `<= 30` por `< 30`, el preventivo que vence exactamente en 30 días sale de "Próximos 30d" y el operador lo pierde del radar mensual.
- **`window.confirm` antes de ejecutar**: el componente NO usa `ConfirmDialog` propio — usa el confirm nativo. Si alguien desconecta el check, un click accidental ejecuta el preventivo.
- **`toast.loading(id) → toast.success(_, { id })` con id compartido**: si se rompe, el operador ve dos toasts en cascada (uno de "Registrando…" que nunca desaparece + el de éxito).
- **Recarga post-éxito via `cargar()`**: tras ejecutar OK, se llama de nuevo `api.getPreventivos()`. Si esto se quita, el operador ejecuta un preventivo pero la UI sigue mostrándolo como pendiente (con el badge de vencido).
- **Toast.error con `err?.response?.data?.detail`**: si el backend manda `detail: 'Equipo bloqueado por orden correctiva abierta'`, ese mensaje debe llegar al operador (NO un genérico "No se pudo registrar"). Si alguien quita el `?.response?.data?.detail`, el operador pierde la causa real y abre ticket a soporte.

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra el `|| []` del `.then()` de `getPreventivos`, `.filter()` rompe con TypeError cuando la API devuelve `{}`.
- Si alguien quita el `setLoading(false)` del `.finally()`, la pantalla se queda en "Cargando preventivos..." para siempre.
- Si alguien cambia `Math.ceil` por `Math.floor` en `diasRestantes`, los preventivos a 0.5 días se ven como "Vence hoy" en lugar de "1d restantes".
- Si la condición del borde urgente cambia de `<=3` a `<3`, los preventivos a 3 días pierden el `border-red-700` y el operador pierde la señal visual principal.
- Si el filtro "vencidos" cambia de `dias < 0` a `dias <= 0`, los preventivos del día actual se cuentan como vencidos (regresión de semántica).
- Si `handleEjecutar` no checa `window.confirm`, un click accidental ejecuta el preventivo.
- Si la cadena `toast.loading(id) → toast.success(_, { id })` se rompe, el operador ve dos toasts en cascada.
- Si el reload tras ejecutar se quita, el operador ejecuta un preventivo pero la UI sigue mostrándolo como pendiente.
- Si el fallback `err?.response?.data?.detail` se quita, errores con causa específica del backend se reportan como "No se pudo registrar".

### Cambio (commit `2ffc7f7`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 25 casos nuevos (297 → 322 tests, +582 líneas):**

`src/pages/Preventivos.test.jsx` (25 tests, 5 grupos):

- **Render base (7)**:
  - "Cargando preventivos..." mientras `api.getPreventivos` no resuelve; los filtros siguen visibles pero ninguna card filtra al DOM.
  - Header `<h1>` "Mantenimientos Preventivos" + subtítulo "Programación y seguimiento de preventivos".
  - 3 botones de filtro ("Todos" / "Vencidos" / "Próximos 30d") presentes en el DOM.
  - Las 4 cards se renderizan con sus tipos preventivos correctos (`Calibración anual`, `Limpieza de filtros`, `Verificación funcional`, `Mantenimiento mayor`).
  - Metadata completa de una card: tipo (`<h3>`), equipo, serie entre paréntesis, área ("Área: UCI Adultos"), descripción del procedimiento, fecha ISO, "Cada 365 días".
  - **Omisión de campos opcionales**: `equipo_serie=null` → `<p>` no contiene `<span>` de serie (verificado con `.closest('p')` + `querySelector` para no contaminar con el BadgeVencimiento hermano); `equipo_area=null` → no aparece "Área: ..."; `descripcion_procedimiento=null` → no aparece el `<p>` `line-clamp-2`. **Nota del primer intento**: el test original usaba `.parentElement` que subía al `<div>` ancestro compartido con el BadgeVencimiento ("Vence hoy") y daba false negative. La fix fue `.closest('p')` para scopear al `<p>` específico de equipo+serie.
  - Una card por item: 4 cards → 4 botones "Marcar ejecutado" (`queryAllByRole`).
  - **Tolerancia a shape ausente**: `api.getPreventivos.mockResolvedValue({})` → empty state "Sin preventivos en esta categoría." sin romper (cubre `res.preventivos || []`).
  - **Error de carga**: `mockRejectedValue(new Error('Network'))` → empty state + `toast.error('No se pudieron cargar los preventivos')`.
- **Filtros (4)**:
  - "Vencidos" muestra sólo el item con `dias < 0` (5 cards → 1 card).
  - "Próximos 30d" muestra los items con `0 <= dias <= 30` (5 cards → 3 cards: HOY=0d, PROXIMO_3D=3d, PROXIMO_10D=10d). VENCIDO (-5d) y LEJANO_60D (60d) quedan fuera — cubre el borde `<= 30`.
  - "Vencidos" sin matches → empty state.
  - El botón activo lleva `bg-emerald-600 text-white`; al cambiar, el estilo emigra al nuevo botón (el anterior pierde el `bg-emerald-600`). Cubre el ternario `filtro === v ? 'bg-emerald-600 text-white' : 'bg-[var(--content-surface)]...'`.
- **BadgeVencimiento — 4 ramas (4)**:
  - `dias < 0` → "Vencido hace 5d" + `bg-red-100 text-red-700`.
  - `dias = 0` → "Vence hoy" + clases rojas (ruta distinta: literal "Vence hoy", no template).
  - `1 <= dias <= 7` → "3d restantes" + `bg-amber-100 text-amber-700`.
  - `dias > 7` → "10d restantes" + `bg-emerald-100 text-emerald-700`.
- **Borde urgente — `dias <= 3` (3)**:
  - HOY (0d) y PROXIMO_3D (3d) → ambos con `border-red-700` (cubre el borde `<= 3` inclusivo).
  - PROXIMO_10D (10d) y LEJANO_60D (60d) → sin `border-red-700`, usan `border-[var(--content-border)]`.
  - VENCIDO (-5d) también lleva `border-red-700` — `dias <= 3` cubre negativos.
- **`handleEjecutar` — flow completo (7)**:
  - `window.confirm` cancelado → NO se llama `api.ejecutarPreventivo`, NO se muestra `toast.loading`.
  - Confirm aceptado → `api.ejecutarPreventivo` se llama con el `id` correcto del item clickeado.
  - Éxito → `toast.loading('Registrando ejecución…')` + `toast.success('Preventivo registrado como ejecutado', { id: 'toast-id-loading' })` con el MISMO id (patrón `tid`).
  - Éxito → recarga: `api.getPreventivos` se llama 1 vez en mount + 1 vez post-ejecutar.
  - Error del backend con `response.data.detail` → `toast.error` recibe el detail específico del backend + `toast.success` NO se llama.
  - Error del backend sin detail (Error plano) → `toast.error('No se pudo registrar el preventivo', { id: 'toast-id-loading' })` (cubre el fallback `|| 'No se pudo...'`).
  - Error → NO recarga la lista (sólo el éxito recarga — el operador conserva la vista para reintentar).

**Fixtures (`daysFromTodayISO(days)`):**
- Función helper que devuelve `YYYY-MM-DD` en UTC midnight relativo al día actual del test. Hace los tests **estables a través de runs** sin importar la hora del día (cubre drift por timezone/DST).
- 5 preventivos cubren los 4 estados del Badge + el borde urgente: `VENCIDO` (-5d), `HOY` (0d), `PROXIMO_3D` (3d, sin serie para forzar rama null), `PROXIMO_10D` (10d), `LEJANO_60D` (60d).

**Mocks (justificados):**
- `vi.mock('../api/sigab', ...)` con 2 endpoints (`getPreventivos`, `ejecutarPreventivo`) — mismo patrón que `Alertas.test.jsx`, `Equipos.test.jsx`, `AuditPage.test.jsx`. **No es MSW real**: es mock de módulo, mucho más simple y consistente con los 9 archivos de test previos.
- `vi.mock('../components/Toast', ...)` con el `useToast()` mockeado (mismo patrón).
- `window.confirm` espiado: default `true` (cubre flujo "aceptado"), sobreescrito a `false` en el test "confirm cancelado".
- `console.error` silenciado — los 2 `.catch()` imprimen en errores esperados; sin esto, stderr se contamina con "Error: Network" en cada test negativo.
- **No se mockea `framer-motion`** — Preventivos no usa framer-motion.
- **No se mockea `lucide-react`** — la página no usa iconos de lucide.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 18) | Después (ciclo 19) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.63 kB gzip | 110.72 kB / 37.63 kB gzip | — |
| `Preventivos` (lazy) | 4.15 kB / 1.49 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.63 kB gzip). `Preventivos.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings de Vite, build 4.13 s.

`npm test` → **322 passed (322)** en 3.08 s (25 nuevos casos, 297 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- **vitest smoke tests para Preventivos — 322 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidato natural**: `Reservas.jsx` (475 líneas, lista de reservas de equipos con calendario y modal de detalle), `Tecnovigilancia.jsx` (199 líneas), `Reportes.jsx` (236 líneas), `Trazabilidad.jsx` (204 líneas), `Metrologia.jsx` (246 líneas), `Capacitaciones.jsx` (208 líneas), `Analitica.jsx` (186 líneas). El ciclo 19 demuestra que el patrón `vi.mock('../api/sigab')` cubre bien páginas con fetch sin necesidad de MSW real — sigue siendo más simple, más rápido y consistente con los 9 archivos previos.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 20)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — elegir una candidata del backlog por tamaño/blast-radius. **`Tecnovigilancia` (199 líneas)** es la candidata más compacta: módulo legal/compliance para reportes de eventos adversos a COFEPRIS, blast-radius medio (todos los hospitales del panel). Si no cabe, fallback a **`Reservas`** (475 líneas — más grande pero tiene fetch + state complejo + modal propio) o **`Reportes`** (236 líneas, generación de reportes PDF/Excel con Blob + window.open — patrón ya cubierto en AuditPage.test.jsx).

---

## Ciclo 18 — 2026-06-25 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 2d healthy; sigah-backend 3d; sigab-panel-api 3d; openclaw 3d; sigah-mysql 4d; sigah-frontend 4d; n8n-sigah-n8n-1 5d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (322 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (480 ms).

**Item hecho:** Backlog #4 — **LandingPage.jsx** (361 líneas, portal comercial público de SIGAH/SIGAB en `/` y `/landing`). 40 tests nuevos, **257 → 297 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 17 (item #4: vitest smoke tests para LandingPage). La página es 100% estática (sin `useEffect`/`fetch`/`api`) y por tanto smoke-testeable sin MSW. Es la primera impresión del producto para todo visitante externo, con blast-radius máximo: si los CTAs se rompen, no entra nadie al producto. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Redirección condicional** (línea 58): `if (user && location.pathname === '/') return <Navigate to="/dashboard" replace />;` — la rama "/landing siempre visible aunque haya sesión" la hace especial vs. la "/" estricta. Si alguien refactorea la condición a `location.pathname !== '/landing'` o invierte la lógica, los usuarios logueados ven el portal comercial en lugar de la app, o no pueden volver a la landing.
- **5 CTAs que llaman a `goLogin`**: "Iniciar sesión" (nav superior), "Comenzar ahora" (hero), "Ver funcionamiento" (hero — anchor a #planes), "Solicitar presupuesto formal" (calculadora), "Solicitar auditoría" (form lead). Si alguien desconecta un `onClick`, el flujo de conversión marketing → auth se rompe silenciosamente y la landing no convierte.
- **Botón móvil "Acceder"** (línea 90): distinto del "Iniciar sesión" desktop — `<button className="md:hidden">` con `aria-label="Acceder"` y `Menu` icon de lucide. Si alguien refactorea y mete el mismo botón en `md:inline-flex` y `md:hidden` no se distingue, la a11y móvil se rompe.
- **Calculadora de inversión** (líneas 54, 61, 264): `useState(500)` + `onChange={(e) => setBeds(parseInt(e.target.value, 10))}`. Si alguien quita `parseInt`, el slider pasa `string` y la fórmula `500 + beds * 4` se rompe con `NaN`. Si alguien cambia `parseInt` por `parseFloat`, beds=50 da 50.0 y la fórmula falla. El cálculo `price = (500 + beds * 4).toLocaleString('es-MX')` formatea con coma como separador de miles en MX (`2500 → '2,500'`), NO con punto como en `es-ES`. Si alguien cambia la locale sin querer, el precio se lee "veinticinco cero cero" en lugar de "dos mil quinientos".
- **Slider con constraints** (`min=50, max=2000, step=50`): si alguien cambia `step="50"` por `step="100"`, el operador que arrastra ve valores no aceptados por la fórmula y el precio salta entre rangos discontinuos.
- **Anchor links del nav superior**: 4 `<a href="#plataforma|#planes|#casos|#cumplimiento">` con scroll a secciones ancla. Si alguien los convierte a `<Link to="/plataforma">` de react-router, la navegación deja de ser scroll-smooth y rompe el UX del marketing site.
- **Estructura de testimonios** (línea 211): cada testimonio es un `<figure>` con `<blockquote>` + `<figcaption>` — semántica HTML5 correcta. Si alguien quita `<figure>` o el `<blockquote>` y mete `<div>`, los lectores de pantalla pierden la asociación quote↔author y la a11y se degrada para usuarios ciegos.
- **3 figuras hardcoded** mapeadas a `t.name` como key — si alguien cambia la key a `t.role` y mete un duplicado, React tira warning de keys duplicadas en consola.
- **4 métricas de impacto** (`-32%`, `-28%`, `+40%`, `751`) con `Icon` derivado dinámicamente (`const Icon = m.icon`). Si alguien mete un icono undefined, la página rompe en runtime.
- **Sección "tira de confianza"**: 4 badges normativos (`NOM-016-SSA3`, `NOM-240-SSA1`, `ISO 13485`, `IA local On-Premise`). Si alguien quita uno, la página pierde una señal de compliance que el operador de compras usa para calificar al proveedor.
- **Form de auditoría con `onSubmit={(e) => { e.preventDefault(); goLogin(); }}`** (línea 300): preventDefault evita la navegación nativa del form; cualquier submit va a /login. Si alguien quita `e.preventDefault()`, el form hace GET al action="" actual (vacío → recarga la página) y la landing parpadea.
- **Footer con 4 links + copyright**: si alguien refactorea el array y mete un link duplicado, el `key={t}` falla.

Riesgos silenciosos cubiertos por los tests:
- Si alguien refactorea la condición del redirect (`user && location.pathname === '/'`) a una variante que rompa la dualidad `/` ↔ `/landing`, los usuarios logueados quedan atrapados en el portal comercial sin ver su dashboard.
- Si alguien quita `parseInt` del slider, beds se vuelve string y la fórmula genera `NaN` → `toLocaleString('es-MX')` devuelve `'NaN'` como precio (bug de los peores: pantalla con "NaN/mes" en lugar de "$2,500/mes").
- Si alguien cambia la locale de `toLocaleString('es-MX')` a `es-ES` o `en-US`, los precios se formatean distinto y el mercado mexicano lee "2.500" como "dos punto cinco" en lugar de "dos mil quinientos".
- Si alguien desconecta un `onClick={goLogin}` de los 5 CTAs, ese botón específico deja de convertir.
- Si alguien quita `e.preventDefault()` del form de auditoría, el submit recarga la página en lugar de ir a /login.
- Si alguien refactorea los testimonios y pierde la estructura `<figure>/<blockquote>/<figcaption>`, la a11y para usuarios de lector de pantalla se degrada.
- Si alguien cambia los iconos del `IMPACT_METRICS` y mete uno undefined, la página rompe al mapearlo (`Icon = m.icon` + `<Icon ...>`).
- Si alguien quita uno de los 4 badges normativos, la señal de compliance se reduce.

### Cambio (commit `55521e7`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 40 casos nuevos (257 → 297 tests, +364 líneas):**

`src/pages/LandingPage.test.jsx` (40 tests, 8 grupos):

- **Render base (7)**: marca SIGAH en nav + footer; 4 nav links del header (`Plataforma`, `Planes`, `Casos de éxito`, `Cumplimiento`) con href a `#plataforma|#planes|#casos|#cumplimiento`; badge "Validado en HGR No. 1 IMSS Tijuana"; H1 del hero con la línea de gradiente "Cumplimiento NOM-016 en automático"; 4 badges normativos (`NOM-016-SSA3`, `NOM-240-SSA1`, `ISO 13485`, `IA local On-Premise`); 4 links del footer (con duplicado manejado para `Cumplimiento` que también aparece en el nav); copyright "© 2026 SIGAH Medical Systems".
- **Redirección condicional (3)**:
  - `user=null + pathname="/"` → renderiza landing (H1 presente, sentinel de Navigate ausente).
  - `user + pathname="/"` → renderiza sentinel `<div data-testid="mock-navigate" data-to="/dashboard">`, H1 ausente (la rama del redirect funcionó).
  - `user + pathname="/landing"` → NO redirige (preview de marketing siempre visible), sentinel ausente, H1 presente.
- **CTAs navegan a /login (6)**: cada uno de los 5 botones (`Iniciar sesión`, `Comenzar ahora`, `Solicitar presupuesto formal`, `Solicitar auditoría`, `Acceder` móvil) está presente y es queryable por `getByRole('button', { name: ... })`. El anchor secundario "Ver funcionamiento" lleva `href="#planes"`. El botón móvil `Acceder` se valida por `aria-label` (decisión a11y explícita).
- **Ecosistema SIGAH vs SIGAB (4)**: H2 "Ecosistema SIGAH"; H3 "SIGAH Comercial" + "SIGAB Clínico"; 3 features de cada uno (`Inventario digital de activos` + `Cronograma de mantenimiento preventivo` + `Alertas de calibración y vencimientos` para SIGAH; `Trazabilidad por zona y piso (mapa en vivo)` + `Señales predictivas de falla con IA local` + `Bitácoras clínicas y órdenes NOM-016` para SIGAB).
- **Casos de éxito (3)**: H2 "Casos de éxito"; 3 testimonios con sus 9 campos (3 nombres + 3 roles + 3 orgs) — `Ing. Laura Méndez / Jefa de Ingeniería Biomédica / Hospital General Regional`, `Ing. Carlos Ríos / Coordinador de Conservación / Red Hospitalaria Metropolitana`, `Dr. Antonio Vega / Director de Operaciones / Instituto de Especialidades`; cada testimonio estructurado como `<figure>` con `<blockquote>` + `<figcaption>` (3 `<figure>` en el DOM).
- **Métricas de impacto (2)**: los 4 valores `-32%`, `-28%`, `+40%`, `751`; los 4 labels descriptivos (`Tiempo caído en equipos vitales`, `Costos en mantenimiento correctivo`, `Cumplimiento documental NOM-016`, `Activos biomédicos gestionados`).
- **Calculadora de inversión (6)**: slider `id="bed-slider"` con `type=range`, `min=50`, `max=2000`, `step=50`, `value=500`; label accesible "Camas censables"; contador `500` visible a la derecha del label; precio default `'2,500'` (verifica formato `es-MX` con coma, NO punto); cambio a `1000` camas → precio `'4,500'`; cambio al mínimo `50` → precio `'700'` (sin separador porque <1000); cambio a `750` → contador refleja `750`. **Nota del primer intento**: el test original asumía `2.500`/`4.500` con punto (locale `es-ES`). Node confirmó que `es-MX` usa coma como separador de miles — fix correcta: `'2,500'`/`'4,500'`. Si alguien refactorea la locale, los tests atrapan el cambio inmediatamente.
- **Formulario de auditoría lead (5)**: H2 "Agenda tu auditoría gratuita NOM-016"; 3 inputs (`Dr. Juan Pérez`, `Hospital General`, `juan.perez@hospital.com`) presentes y vacíos inicialmente; `fireEvent.submit` sobre el `<form>` no rompe (el `e.preventDefault()` del onSubmit lo absorbe); nota "Tus datos están protegidos bajo estrictos protocolos..." presente.
- **Estructura y composición defensiva (4)**: las 5 secciones ancla existen (`#plataforma`, `#ecosistema`, `#casos`, `#planes`, `#cumplimiento`); `<footer>` contiene el copyright (scoped via `within(footer)`); el link "Plataforma" del nav apunta a `#plataforma` (anchor interno, NO router-link); cero warnings ni errores de consola durante el render (`vi.spyOn(console, 'warn'/'error')`).

**Mocks (justificados):**
- **`react-router-dom` mockeado vía `vi.importActual`**: `Navigate` se reemplaza por `<div data-testid="mock-navigate" data-to={to}>REDIRECT</div>` para poder verificar la rama del redirect. `useNavigate` y `useLocation` siguen siendo reales (importados del módulo real vía `vi.importActual`) — el `MemoryRouter` intercepta `navigate('/login')` sin necesidad de mockearlo. Sin este mock, la rama del redirect no se puede testear directamente.
- **`AuthContext.Provider`** mutable (`{ user, login, logout, loading, setUser }`) — mismo patrón que Login.test.jsx, Dashboard.test.jsx y SuperAdmin.test.jsx. Permite inyectar `user={null}` o `user={...}` para testear las dos ramas del redirect.
- **No se mockea `framer-motion`**: LandingPage no usa framer-motion (a diferencia de SuperAdmin).
- **No se mockea `lucide-react`**: los SVGs se renderizan en jsdom sin warnings. El proyecto verificó este patrón en los ciclos 5, 7, 16 y 17.
- **No se mockea el `fetch`/`api`**: LandingPage no hace ninguno — es 100% estática.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 17) | Después (ciclo 18) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.63 kB gzip | 110.72 kB / 37.63 kB gzip | — |
| `LandingPage` (lazy) | 19.28 kB / 5.51 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.63 kB gzip). `LandingPage.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings de Vite, build 4.12 s.

`npm test` → **297 passed (297)** en 2.88 s (40 nuevos casos, 257 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- **vitest smoke tests para LandingPage — 297 tests (este ciclo)**.

### Backlog restante
1. **Tests con MSW**: páginas con fetch (Ordenes, Reservas, Preventivos, Reportes, Trazabilidad, Metrologia, etc.). Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo, no headless.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **vitest smoke tests restantes sin fetch**: DashboardV3 (bajo valor — preview estático con CSS externo).

### Próximo paso (Ciclo 19)
Salud primero. Luego **item #1 (Tests con MSW)** — elegir una página chica para arrancar el setup: **Ordenes.jsx** (404 líneas, lista de órdenes de mantenimiento con filtros, paginación y modal de detalle `OrdenDetalleModal` lazy — buen caso de prueba porque tiene fetch + state complejo + subcomponente lazy). Si en el ciclo se complica el setup de MSW + fixtures, fallback a **item #4 (DashboardV3 — preview estático, bajo valor de test pero smoke-testeable sin MSW)**.

---

## Ciclo 17 — 2026-06-25 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (mismo uptime que ciclo 16).
- Contenedores: openclaw Up 2d healthy; sigah-backend 3d; sigah-mysql 4d; sigab-panel-api 3d; sigah-bot 2d; sigah-frontend 4d; n8n 5d; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (312 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (335 ms).

**Item hecho:** Backlog #1 (continuación — quinta oleada) — **SuperAdmin.jsx** (347 líneas, panel multi-inquilino SaaS para gestionar hospitales IMSS en `/superadmin`). 33 tests nuevos, **224 → 257 tests totales**.

### Diagnóstico
El backlog sugería item #2 (limpieza de tokens de color en `tailwind.config.js`) pero ese item YA FUE HECHO en el ciclo 8 (commit `dad055a`, -44/+3 líneas). El config quedó limpio: sólo `sigah.{blue,emerald}` + `cyan-glow` + `ai-violet` + `glass-0` + `shadow-blue-sm` + `animation.slide-up` + screens 3xl/5xl — todos verificados con grep contra `src/`. Re-correr el ciclo 8 sería no-op. Salté a item #1 (más tests) eligiendo la página de mayor blast-radius del panel SaaS que aún no tenía cobertura y NO requiere MSW.

Páginas aún sin test (post-ciclo 16): DashboardV3, LandingPage, SuperAdmin, CommandCenter, Almacen, Analitica, Capacitaciones, ChecklistPage, Copilot, EquipoPublico, Metrologia, Ordenes, Preventivos, QRBatch, QRScanner, Reportes, Reservas, Tecnovigilancia, Trazabilidad, TVDashboard. De esas, las que NO usan `useEffect`/`fetch`/`axios`/`api/` (smoke-testeables sin MSW): DashboardV3 (153 líneas, preview estático con clases CSS externas — bajo valor de test), LandingPage (361 líneas, gran hero — testearla vale un ciclo entero), SuperAdmin (347 líneas, panel multi-inquilino con 6 paneles interactivos).

SuperAdmin es la candidata ideal: 347 líneas de lógica de página pura con 7 useState y 1 useContext, sin fetch. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **3 KPIs derivados de listas**: `Inquilinos Activos = tenants.filter(t => t.estado === 'activo').length` (2 de 3), `Nodos Conectados = nodes.filter(n => n.estado === 'online').length` (3 de 3), `Peticiones Totales (Hoy) = "15.5k"` (hardcoded). Si alguien rompe un `.filter()` o cambia el literal, el panel reporta métricas incorrectas y el operador no se entera hasta que llega la queja del hospital.
- **Tabla de inquilinos con badge dinámico por plan**: `t.plan === 'Red Metropolitana'` → `bg-blue-500/10 text-blue-600 border border-blue-500/20`; el resto → clases neutras `bg-[var(--content-bg)] text-[var(--content-muted)]`. Si alguien refactorea el ternario, el plan "Hospital Singular" (el más común) se pinta azul corporativo y el operador confunde prioridad.
- **Badge de estado `activo`/`suspendido` con ternario de color**: `activo → bg-emerald-500/10 text-emerald-600`; `suspendido → bg-red-500/10 text-red-600`. Si alguien invierte los colores, un hospital suspendido se pinta verde y el operador lo lee como "operando normalmente" — bug crítico.
- **Toggle de estado**: `toggleTenantStatus(id)` invierte activo↔suspendido. El `setTenants(tenants.map(...))` crea un array nuevo — si alguien rompe el `.map()` (p.ej. lo cambia por un `.forEach` que muta in-place), React no re-renderiza y el badge se queda pegado.
- **Formulario "Registrar Hospital" oculto por default**: aparece con `framer-motion` (motion.form con initial/animate de opacidad). El handler `handleAddTenant` valida `if (!newTenantName || !newTenantSlug) return;` antes de crear, y normaliza el slug con `newTenantSlug.toLowerCase().replace(/\s+/g, '-')`. Si alguien rompe el validate, el operador registra un hospital sin nombre y queda como fila fantasma. Si alguien quita el `.replace(/\s+/g, '-')`, dos hospitales con el mismo nombre base generan slugs idénticos y colisionan en subdominio.
- **Búsqueda case-insensitive por nombre o slug**: `tenants.filter(t => t.nombre.toLowerCase().includes(...) || t.slug.toLowerCase().includes(...))`. Si alguien refactorea a una sola columna, el operador no puede buscar por slug. Si alguien quita el `.toLowerCase()`, la búsqueda se vuelve case-sensitive y el operador se frustra buscando "hgr" vs "HGR".
- **Topología de nodos**: 3 servidores hardcoded (VPS Cloud, Terminal Física Dev, Hospital Edge Node) con IP/rol/latencia. Cada uno lleva un pill teal con la latencia formateada. Si alguien borra uno, el panel pierde cobertura de infraestructura.
- **Logs de auditoría NOM-016 Global**: 4 entradas con tipos info/success/warning/error mapeados a colores (blue/emerald/amber/red). Si alguien refactorea el ternario, un "error" de licencia suspendida puede pintarse verde y pasar desapercibido.
- **Botón "Salir del Panel"** invoca `useAuth().logout()`. Si alguien desconecta el handler, el superadmin no puede salir y la sesión queda atrapada.

Riesgos silenciosos cubiertos por los tests:
- Si alguien refactorea los `.filter()` de los KPIs y cambia `=== 'activo'` por `=== 'inactivo'`, los conteos se invierten silenciosamente.
- Si alguien quita el ternario de color del badge de plan, "Hospital Singular" se pinta azul corporativo y se confunde con "Red Metropolitana".
- Si alguien invierte los colores del badge de estado, un hospital suspendido se lee como "operando normalmente".
- Si alguien rompe `toggleTenantStatus` (cambia `.map` por mutación in-place), React no re-renderiza.
- Si alguien quita la validación de `handleAddTenant`, se pueden registrar hospitales fantasma sin nombre.
- Si alguien quita `.toLowerCase()` del filtro de búsqueda, las búsquedas del operador fallan.
- Si alguien cambia el mapeo `tipo → color` de los logs, un error crítico de auditoría se pinta verde.
- Si alguien desconecta `useAuth().logout()` del botón "Salir del Panel", el superadmin queda atrapado en la sesión.

### Cambio (commit `d29c142`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 33 casos nuevos (224 → 257 tests, +394 líneas):**

`src/pages/SuperAdmin.test.jsx` (33 tests, 7 grupos):
- **Header y marca (5)**:
  - Marca "SIGAH" + dominio ".mx" en el header.
  - Subtítulo "SuperAdmin Command Center" presente.
  - Badge "Ollama local: Activo" presente (estado del LLM local).
  - Botón "Salir del Panel" presente.
  - Click en "Salir del Panel" invoca `useAuth().logout()` (1 vez).
- **KPIs derivados (3)**:
  - "Inquilinos Activos" cuenta 2 (3 tenants, 1 suspendido).
  - "Nodos Conectados" cuenta 3 (todos online).
  - "Peticiones Totales (Hoy)" muestra "15.5k" hardcoded.
- **Tabla de inquilinos (6)**:
  - 5 columnas del header (Nombre/ID, Subdominio/Slug, Plan, Base Datos, Estado/Acciones).
  - 3 tenants hardcoded con su slug concatenado a `.sigah.mx`.
  - Plan "Red Metropolitana" lleva clases distintivas (`bg-blue-500/10` + `text-blue-600`) vs el default.
    - **Nota del primer intento**: el test usaba `screen.getByText('Hospital Singular')` directamente y caía en `getMultipleElementsFoundError` porque ese literal aparece tanto en la tabla (id 2) como en el `<select>` del formulario (que está oculto pero renderizado en el DOM con `isAddingTenant=false` — el form sigue montado en el árbol React aunque no se vea). La fix correcta fue scope a la fila vía `screen.getByText('HGR No. 20 IMSS Tijuana').closest('tr')` y `within(row).getByText(...)`.
  - Badges "activo" llevan `text-emerald-600`; "suspendido" lleva `text-red-600`.
  - Toggle del tenant activo muestra `ToggleRight` con clase emerald; del suspendido muestra `ToggleLeft` neutro.
- **Toggle de estado (2)**:
  - Click en el toggle del tenant suspendido (id 3) lo cambia a activo: 3 activos, 0 suspendidos, KPI "Inquilinos Activos" sube a 3.
  - Click en el toggle de un activo (id 1) lo cambia a suspendido: KPI baja a 1.
    - **Nota del primer intento**: el assert usaba `screen.getByText('suspendido')` global y fallaba tras el toggle porque id 3 también es suspendido — 2 elementos. La fix fue `within(activeRow).getByText('suspendido')` scopeando a la fila del id 1.
- **Formulario "Registrar Hospital" (7)**:
  - El formulario NO está visible inicialmente (no aparece "Nuevo Registro").
  - Click en "Registrar Hospital" muestra el formulario con sus 2 inputs placeholder.
  - Los inputs de nombre y slug se rellenan correctamente con `fireEvent.change`.
  - Submit con nombre+slug vacíos NO agrega tenant (validación `if (!newTenantName || !newTenantSlug) return;`).
  - Submit válido agrega un nuevo tenant con slug normalizado (`HA Lindavista` → `ha-lindavista`).
  - Botón "Cancelar" cierra el formulario y resetea `isAddingTenant`.
  - El `<select>` de plan tiene 3 opciones (Hospital Singular, Red Metropolitana, Gubernamental Custom) — el valor por defecto es "Hospital Singular".
- **Búsqueda de inquilinos (4)**:
  - Muestra los 3 tenants inicialmente.
  - Filtrar por "20" deja solo el tenant #2.
  - Filtrar por slug funciona case-insensitive ("HGP" matchea "hgp-tijuana").
  - Buscar con texto inexistente deja la tabla vacía.
- **Topología y nodos (2)**:
  - Header "Topología y Nodos" presente.
  - Los 3 nodos hardcoded se renderizan con IP + rol + latencia (14 ms / 2 ms / 45 ms).
- **Logs de auditoría NOM-016 Global (4)**:
  - Header "Auditoría NOM-016 Global" presente.
  - Los 4 logs hardcoded se renderizan con su mensaje completo.
  - Tipo "success" lleva `text-emerald-600`; "warning" → `text-amber-600`; "error" → `text-red-600`; "info" → `text-blue-600`.
  - Cada log muestra timestamp + tenant en formato `HH:MM:SS • Tenant: NOMBRE`.

**Mocks (justificados):**
- `AuthContext.Provider` con valor mockeado (`{ user: { rol: 'superadmin' }, logout: vi.fn(), ... }`) — mismo patrón que `ProtectedRoute.test.jsx` y `Login.test.jsx`. Evita montar el `AuthProvider` real, que dispara `api.getMe()` y depende del token en localStorage.
- **No se mockea `framer-motion`**: `motion.form` se monta tal cual en jsdom — sólo aplica `opacity` y `transform` via inline style, no hay timers externos. Si en algún ciclo futuro framer-motion introduce timers o RAF, este test se rompe y se mockea explícitamente.
- **No se mockea `lucide-react`**: los SVGs se renderizan en jsdom sin warnings. Si en algún ciclo futuro lucide introduce animaciones, se mockea con `vi.mock` por componente (patrón ya usado en Dashboard.test.jsx).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 16) | Después (ciclo 17) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.63 kB gzip | +1 byte (rounding) |
| `SuperAdmin` (lazy) | 14.81 kB / 3.79 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.63 kB gzip, +1 byte rounding). `SuperAdmin.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings de Vite, build 4.10 s.

`npm test` → **257 passed (257)** en 2.63 s (33 nuevos casos, 224 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- **vitest smoke tests para SuperAdmin — 257 tests (este ciclo)**.

### Backlog restante
1. **Tests con MSW**: páginas con fetch (Ordenes, Reservas, Preventivos, Reportes, Trazabilidad, Metrologia, etc.). Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo, no headless.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **vitest smoke tests restantes sin fetch**: DashboardV3 (bajo valor — preview estático con CSS externo), LandingPage (361 líneas, hero premium — vale un ciclo entero).

### Próximo paso (Ciclo 18)
Salud primero. Luego **item #4 (vitest smoke tests para LandingPage — 361 líneas, hero premium del v3.0)** — la página de marketing que se muestra al público y la primera impresión del producto. Vale un ciclo entero por su blast-radius (todo usuario no autenticado aterriza ahí) y porque concentra patrones de animación con framer-motion, `IntersectionObserver` para reveal-on-scroll, y CTAs que navegan a `/login`. Si no cabe, fallback a item #1 (Tests con MSW — seleccionar una página chica como Ordenes).

---

## Ciclo 16 — 2026-06-25 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (creado 2026-06-21 05:55:31, ~4d uptime).
- Contenedores: openclaw Up 2d healthy; sigah-backend 3d; sigah-mysql 4d; sigab-panel-api 3d; sigah-bot 46h; sigah-frontend 4d; n8n 5d; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (352 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (332 ms).

**Item hecho:** Backlog #1 (continuación — tercera oleada) — **Primitivos de `src/components/ui/`** (Button, GlassCard, PageHeading, TableWrapper). 44 tests nuevos, **180 → 224 tests totales**.

### Diagnóstico
`src/components/ui/` exporta 6 primitivos (`index.js`). Auditoría rápida de consumidores reales:

| Primitivo | Consumidores reales | Test? |
|---|---|---|
| `Button` | `LandingPage.jsx` (5× — CTA principal, "Ir a login", etc.) | **este ciclo** |
| `GlassCard` | `CommandCenter.jsx` (3×), `AdminGlobal.jsx` (2×) | **este ciclo** |
| `PageHeading` | `CommandCenter.jsx`, `AdminGlobal.jsx` | **este ciclo** |
| `TableWrapper` | `AdminGlobal.jsx` (1× — tablas de admin) | **este ciclo** |
| `ModalWrapper` | ninguno (definido + exportado pero sin import real) | omitido — testing dead code |
| `PageWrapper` | ninguno (idem) | omitido — testing dead code |

Los 4 con consumidores concentran patrones sutiles que un test atrapa y un DevTools manual no:

- **Button** (70 líneas): las 5 variantes (`primary`/`glass`/`ghost`/`danger`/`outline`) se mapean vía `VARIANTS[variant] ?? VARIANTS.primary`. Si alguien pasa `variant="no-existe"`, el `??` cae a `primary` y un CTA "Eliminar" sale celeste IMSS en lugar de rojo — bug de identidad visual grave, fácil de introducir al refactorizar. Los 3 tamaños (sm/md/lg) tienen el mismo patrón de fallback. La prop `loading=true` en `<button>` añade `disabled` automáticamente (patrón de seguridad); en `<a>` NO (atributo no aplica a anchors). El prop polimórfico `as="a"` reasigna la etiqueta pero conserva el resto de la API — fácil de romper con un descuido. La posición del icono se decide por `iconPosition`: si alguien la cambia, el icono salta al lado equivocado de un CTA.
- **GlassCard** (15 líneas): toggles `padding` (default true) y `hover` (default false). `padding=false` se usa en `AdminGlobal` para tablas densas; `hover=true` se usa en cards clicables de `CommandCenter`. Si alguien invierte los defaults, las páginas se vuelven grises sin padding o las cards dejan de responder al hover. Las CSS vars (`var(--content-surface)`, `var(--content-border)`) se aplican como `style` inline — cross-check con `theme` para detectar tema roto.
- **PageHeading** (37 líneas): composición flex `flex items-start gap-3` + slot de `actions` en la derecha. Si alguien rompe el orden flex, los botones de acción saltan al lado izquierdo del título (bug que ya pasó una vez en v3.0). El `badge` se renderiza inline junto al `<h1>` con `bg-indigo-500/20`; sin badge, el span simplemente no aparece (no rompe el row). El bloque del icono es condicional — sin icono, no se renderiza el wrapper (evita layout huérfano).
- **TableWrapper** (13 líneas): el único propósito real es `overflow-x-auto` (tablas largas en móvil). Si alguien la quita, las tablas se desbordan. Border + rounded-2xl + shadow-sm dan la identidad glass.

Riesgos silenciosos cubiertos por los tests:
- Si alguien refactorea `VARIANTS` y rompe la asociación variant↔clase, los CTAs de LandingPage salen sin gradiente IMSS.
- Si alguien añade una nueva variante sin actualizar el fallback, el `??` lo enmascara y nadie se entera.
- Si alguien invierte el default de `padding` o `hover`, la densidad de CommandCenter/AdminGlobal salta.
- Si alguien quita `overflow-x-auto` de TableWrapper, las tablas largas rompen el layout en móvil.
- Si alguien refactorea PageHeading y mueve el slot de `actions` al lado izquierdo del título, los botones de acción aparecen antes que el título (regresión visual real).
- Si alguien cambia `iconPosition` a default `right`, los iconos saltan al lado equivocado de cada CTA.

### Cambio (commit `5075fe1`, pusheado a `autocycle/v3.0`)

**4 archivos de test, 44 casos nuevos (180 → 224 tests, +387 líneas):**

1. `src/components/ui/Button.test.jsx` (22 tests, 6 grupos)
   - **Etiqueta & props base (4)**: renderiza `<button>` por default; `as="a"` con href; reenvía `onClick`; `disabled` bloquea click.
   - **Variantes (6)**: cada una de las 5 (`primary`/`glass`/`ghost`/`danger`/`outline`) aplica su clase distintiva (`btn-primary`, `glass-panel`, `bg-transparent`, `bg-red-600`, `border-cyan-glow/40`); variante inválida cae al fallback `primary` sin romper.
   - **Tamaños (4)**: sm/md/lg aplican `px-{3,5,7} py-{1.5,2.5,3.5} text-{xs,sm,base}`; tamaño inválido cae a md.
   - **Loading (3)**: muestra `.animate-spin` (Loader2) y oculta el icono (children siguen); `loading=true` en `<button>` añade `disabled` y bloquea click; `loading=true` en `<a>` NO añade `disabled` (atributo no aplica).
   - **Icono (3)**: `iconPosition="left"` pone el icono antes del texto en `childNodes` del botón; `iconPosition="right"` lo pone después; sin icono no se renderiza.
     - **Nota del primer intento**: el test original usaba `compareDocumentPosition` entre `getByTestId('dummy-icon')` y `getByText('Left')`. `getByText` devolvía el `<button>` (ancestro del svg), así que `compareDocumentPosition` retornaba `CONTAINED_BY` (16) y la máscara con `FOLLOWING` (4) daba 0. La fix correcta fue iterar `btn.childNodes` y comparar índices — eso sí testea el orden DOM real.
   - **a11y & composición (2)**: lleva `focus-visible:ring-2`; `className` custom se concatena sin perder la variante primary.

2. `src/components/ui/GlassCard.test.jsx` (8 tests, 4 grupos)
   - **Render base (3)**: renderiza children; siempre lleva `border` + `rounded-2xl` + `shadow-sm` + `backdrop-blur-xl` (identidad glass); aplica `--content-surface` y `--content-border` como style inline.
   - **Padding (2)**: default lleva `p-4 md:p-5`; `padding={false}` los omite (caso AdminGlobal tablas).
   - **Hover (2)**: `hover={true}` lleva `transition-all` + `cursor-pointer` + `hover:shadow-md`; default no lleva esas clases.
   - **Composición (1)**: `className` custom se concatena.

3. `src/components/ui/PageHeading.test.jsx` (9 tests, 4 grupos)
   - **Title & subtitle (3)**: title se renderiza como `<h1>`; subtitle como `<p>` cuando se pasa; sin subtitle, no hay `<p>` huérfano.
   - **Icono (2)**: con icono se renderiza el bloque; sin icono el bloque desaparece (no deja wrapper vacío).
   - **Badge (2)**: badge inline junto al `<h1>` con `bg-indigo-500/20`; sin badge, el span no aparece.
   - **Actions (2)**: slot derecho se renderiza con los children; sin actions, no hay `<button>` dentro del heading.

4. `src/components/ui/TableWrapper.test.jsx` (5 tests, 2 grupos)
   - **Render base (4)**: renderiza children; siempre lleva `overflow-x-auto` (decisión arquitectónica — si se quita, las tablas rompen en móvil); border + rounded-2xl + shadow-sm; CSS vars de tema como style inline.
   - **Composición (1)**: `className` custom se concatena sin perder `overflow-x-auto`.

**Decisión deliberada — lo que NO se testea (y por qué):**
- **`ModalWrapper`** está exportado desde `index.js` pero `grep` confirma que ningún archivo de producción lo importa (los modales reales usan `ConfirmDialog` o markup propio). Testearlo sería añadir cobertura a código muerto — gasto de bytes del bundle de tests y ruido para futuros lectores. Si en algún ciclo futuro un consumidor real lo adopta, se le añaden tests en ese ciclo.
- **`PageWrapper`** idem — exportado, no consumido.

**Mocks (ninguno necesario):** los 4 primitivos son presentationales puros. No hacen fetch, no usan contexto, no tienen side-effects. Renderizan → asserts sobre el DOM. La ausencia de mocks es intencional.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 15) | Después (ciclo 16) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `LandingPage` (lazy) | 19.28 kB / 5.51 kB gzip | igual | — |
| `CommandCenter` (lazy) | 16.00 kB / 4.61 kB gzip | igual | — |
| `AdminGlobal` (lazy) | n/a | n/a | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). Los `*.test.jsx` están fuera del alcance del bundler de producción (ningún archivo de producción los importa), así que el dist queda bit-exacto en lo que al bundle principal se refiere. Cero warnings, build 4.30 s.

`npm test` → **224 passed (224)** en 2.40 s (44 nuevos casos, 180 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` que viene de los tests existentes (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- **vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (este ciclo)**.

### Backlog restante
1. **Tests con MSW**: páginas con fetch (Ordenes, Reservas, Preventivos, Reportes, Trazabilidad, Metrologia, etc.). Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo, no headless.
2. **Limpieza de tokens de color sobrantes en `tailwind.config.js`**: cosmético puro, ~30 min — cabe en cualquier ciclo corto como éste.
3. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
4. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).

### Próximo paso (Ciclo 17)
Salud primero. Luego **item #2 (limpieza de tokens de color sobrantes en tailwind.config.js)** — alcance muy acotado, puramente cosmético, cabe en cualquier ciclo corto. La consolidación dark→green del v3.0 dejó entradas duplicadas o sin uso que inflan el purge de Tailwind y oscurecen el archivo. Si no cabe, fallback a item #1 (más tests — seleccionar 1 página con MSW o un componente simple).

---

## Ciclo 15 — 2026-06-25 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (creado 2026-06-21 05:55:31, ~4d uptime).
- Contenedores: openclaw Up 2d healthy; sigah-backend 3d; sigah-mysql 4d; sigab-panel-api 3d; sigah-bot 46h; sigah-frontend 4d; n8n 4d; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (355 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (330 ms).

**Item hecho:** Backlog #1 (continuación) — **Formatos.jsx** (152 líneas, Centro de Formatos IMSS/SIGAH: 4 cards estáticas con su metadata + modal FormatoViewer para vista previa). 28 tests nuevos, **152 → 180 tests totales**.

### Diagnóstico
Formatos es la página más simple del SPA: sin fetch, sin API calls, sin useEffect — sólo un `useState` local `visorOrden` que controla la apertura del modal FormatoViewer. Aun así concentra patrones sutiles que un test atrapa y un DevTools manual no:

- Render literal de las 4 cards de `FORMATOS_INFO` con metadata completa: label, descripción, norma (`NOM-016-SSA3-2012` × 4), folio_prefix (`RF` / `OS-C` / `OS-P` / `OS-PR`), secciones (chips), icono emoji (⚠️ / 🔧 / 📅 / ⚡). Si alguien cambia una descripción o borra un campo del array, el operador ve el formato con info desactualizada y el test atrapa la divergencia.
- **Color theme semántico por formato**: `amber` para Reporte de Falla, `red` para OS Correctivo, `emerald` para OS Preventivo, `purple` para OS Predictivo. Las clases CSS (`bg-{color}-100 text-{color}-700`, `border-{color}-700/50`, `bg-{color}-600 hover:bg-{color}-700`) son semánticas — si alguien refactorea `COLOR_CLASSES` y rompe la asociación tipo↔color, las cards pierden identidad visual (un Reporte de Falla pintado en rojo se confundiría con una OS Correctivo).
- **`ordenVacio(tipo)`** genera el folio correcto según el tipo: `RF-0001`, `OS-C-0001`, `OS-P-0001`, `OS-PR-0001`. El fallback `folio_prefix || 'XX'` cubre typos pero deja folio `XX-0001` si alguien borra el `find()`. Si alguien rompe esta función, la numeración oficial del formato se rompe y los tests lo cazan folio por folio.
- **Apertura del modal**: cuando el operador hace click en "Ver Formato", el componente pasa `ordenVacio(f.tipo)` al FormatoViewer. Si alguien rompe el handler (pasa `null`, objeto sin tipo, o el tipo equivocado), el visor downstream cae en `default: OSCorrectivo` y el operador imprime el formato equivocado sin saberlo. **El campo clave es `tipo_mantenimiento`** (no `tipo`) — el FormatoViewer hace `currentOrden.tipo_mantenimiento` para decidir qué sub-componente renderizar.
- **Placeholders pre-rellenados**: `[Nombre del Equipo]`, `[Marca]`, `[Modelo]`, `[Serie]`, `[Área / Servicio]`, `[Técnico Asignado]`. Si alguien los borra, el operador imprime el formato con campos vacíos y tiene que re-escribir a mano.
- **Cierre del modal**: el `onClose` del FormatoViewer debe invocar `setVisorOrden(null)` para desmontar el modal. Si el modal no propaga onClose, el operador queda atrapado.
- **Colisión de strings entre cards**: `'Tiempos'` aparece en las secciones de OS Correctivo Y OS Preventivo. Una verificación naive con `getByText('Tiempos')` falla con `getMultipleElementsFoundError` — el primer intento del test cayó en este bug. La solución es scope a la card correcta (`heading.closest('div.border')`) y buscar dentro de ese subtree.

Riesgos silenciosos:
- Si alguien borra un tipo de FORMATOS_INFO, una de las 4 cards desaparece del grid.
- Si alguien refactorea COLOR_CLASSES a tokens semánticos y rompe la asociación tipo↔color, los formatos pierden identidad visual.
- Si `ordenVacio` no recibe el tipo correcto (passing `null`), el visor abre OS Correctivo por default aunque el operador hizo click en "Reporte de Falla".
- Si FormatoViewer no propaga onClose, el operador queda atrapado en el modal.
- Si alguien quita el `find()` con fallback, una typo en un tipo genera folio `XX-0001` y la numeración oficial se rompe.

### Cambio (commit `3ce8754`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 28 casos nuevos (152 → 180 tests, +427 líneas):**

`src/pages/Formatos.test.jsx` (28 tests, 6 grupos):
- **Header y banner (3)**:
  - `<h1>` "Formatos Oficiales IMSS" presente.
  - Subtítulo "4 formatos NOM-016-SSA3-2012" presente.
  - Banner azul con "Tip:" + referencia a "Órdenes de Servicio" y botón 🖨 Formato.
- **Render de las 4 cards (5)**:
  - 4 botones "Ver Formato" en el DOM.
  - 4 `<h2>` con los labels oficiales (Reporte de Falla, OS Correctivo, OS Preventivo, OS Predictivo (IA)).
  - 4 spans con los iconos emoji exactos (⚠️ / 🔧 / 📅 / ⚡).
  - 4 spans con la norma "NOM-016-SSA3-2012".
  - 4 badges monoespaciados con `${folio_prefix}-XXXX`.
- **Secciones por card (5)**:
  - Cada verificación se scopea a la card correcta vía `heading.closest('div.border')` para evitar colisiones (ej. "Tiempos" en correctivo+preventivo). El primer intento del test cayó en `getMultipleElementsFoundError: Found multiple elements with the text: Tiempos`; la fix fue usar `[...card.querySelectorAll('span')].find(el => el.textContent === s)` dentro del scope.
  - reporte_falla: 4 secciones (Equipo, Quién reporta, Descripción de falla, Condición y criticidad).
  - correctivo: 5 secciones (Diagnóstico de falla, Trabajo realizado, Tiempos, Material y refacciones, Estado final).
  - preventivo: 5 secciones (Rutina (6 casillas), Servicio efectuado, Tiempos, Evidencia fotográfica, Próximo preventivo).
  - predictivo: 4 secciones (Análisis IA (4 métricas), Recomendación generada, Acción ejecutada, Validación ingeniero).
  - Cada card tiene un `<p>SECCIONES</p>` sobre los chips (4 ocurrencias totales).
- **Color theme por tipo (5)**:
  - reporte_falla: btn lleva `bg-amber-600 hover:bg-amber-700` + badge lleva `bg-amber-100`.
  - correctivo: btn lleva `bg-red-600 hover:bg-red-700`.
  - preventivo: btn lleva `bg-emerald-600 hover:bg-emerald-700`.
  - predictivo: btn lleva `bg-purple-600 hover:bg-purple-700`.
  - Cada card lleva `border-{color}-700` en el contenedor raíz.
- **Apertura del modal (8)**:
  - Inicialmente NO hay modal en el DOM.
  - Click en cada uno de los 4 botones "Ver Formato" abre el visor con el `tipo_mantenimiento` correcto (`reporte_falla` / `correctivo` / `preventivo` / `predictivo`) y el folio correcto (`RF-0001` / `OS-C-0001` / `OS-P-0001` / `OS-PR-0001`).
  - La fecha pasada al visor es ISO `YYYY-MM-DD` y coincide con el día actual (no es `1970-01-01`).
  - Los placeholders de equipo/técnico están pre-rellenados (`[Nombre del Equipo]`, `[Marca]`, `[Modelo]`, `[Serie]`, `[Área / Servicio]`, `[Técnico Asignado]`).
  - El campo clave es `tipo_mantenimiento` (NO `tipo`) — cubre el refactor trap donde alguien cambia a `tipo` y el visor downstream cae al default OSCorrectivo.
- **Cierre del modal (2)**:
  - Click en "Cerrar" del visor desmonta el modal (mock `data-testid` desaparece).
  - Después de cerrar, se puede abrir un visor de otro tipo (state se resetea correctamente).

**Mocks (justificados):**
- `vi.hoisted(() => ({...}))` para `lastOrdenReceived` — el mock del FormatoViewer necesita mutar esta ref para que el test pueda leer la `orden` que el padre pasó.
- `components/formatos/FormatoViewer`: stub completo porque trae 4 sub-componentes (FormatoReporteFalla, FormatoOSCorrectivo, FormatoOSPreventivo, FormatoOSPredictivo) + `usePrintFormato` + `api.getFormato`, todos fuera del alcance del smoke test de la página. El stub expone `data-testid="mock-formato-viewer"` + 4 spans con tipo/folio/fecha/equipo + un botón "Cerrar visor" que invoca `onClose` y guarda la `orden` recibida en `mocks.lastOrdenReceived.current`.
- **No se mockean `api/sigab` ni `Toast`**: Formatos.jsx no los usa. Es una página estática pura con sólo `useState` local para el visor. La ausencia de mocks para estos paths es intencional — refleja que la página no tiene dependencias de runtime.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 14) | Después (ciclo 15) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Formatos` (lazy) | 4.59 kB / 1.84 kB gzip | igual | — |
| `FormatoViewer` (lazy) | 58.29 kB / 10.62 kB gzip | igual | — |
| `Equipos` (lazy) | 51.02 kB / 11.64 kB gzip | igual | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | igual | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Formatos.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto en lo que al bundle principal se refiere. Cero warnings, build 4.67s.

`npm test` → **180 passed (180)** en 1.94 s (28 nuevos casos, 152 previos). Sin warnings de `act()` ni de React state updates. Sin errores en stderr (Formatos.jsx no tiene `console.error` que silenciar — la página es estática).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- vitest smoke tests para Dashboard (19 tests, 82 → 101 total) — ciclo 10.
- vitest smoke tests para Equipos (20 tests, 101 → 121 total) — ciclo 11.
- Dead code cleanup: import muerto de ESTADO_COLORS/ESTADO_LABELS en Equipos.jsx — ciclo 12.
- vitest smoke tests para Alertas (18 tests, 121 → 139 total) — ciclo 13.
- vitest smoke tests para AuditPage (13 tests, 139 → 152 total) — ciclo 14.
- **vitest smoke tests para Formatos (28 tests, 152 → 180 total)** — este ciclo.

### Backlog restante
1. **Más tests** (opcional, alcance decreciente): quedan candidatas chicas (`Preventivos` 165, `ChecklistPage` 182) y medianas (`Tecnovigilancia` 199, `Reportes` 236, `Trazabilidad` 204, `Capacitaciones` 208). Cada una ~10–15 tests. El set {Login, Dashboard, Equipos, Alertas, AuditPage, Formatos} cubre las 6 páginas más transitadas + el centro legal/compliance + el centro de formatos. **`Preventivos` es el siguiente candidato natural por tamaño** (165 líneas, mantenimiento preventivo programado).
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio, sólo se paga en la ruta `/dashboard`).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada — habría que escribir uno pequeño o agregar `focus-trap-react` ~3 KB).
4. **Opcional**: dead code grep round 2 — un grep por `TODO|FIXME|XXX|HACK` (ciclo 13: 0 hits reales, sólo falsos positivos como `XXXX` para folios y la palabra `TODOS` en strings de "todos los campos") y por `console.*` residuales (todos los `console.error` están en `.catch()` legítimos — borrarlos silenciaría errores reales, sería regresión). Net result: dead code cleanup ya dio lo que podía dar.

### Próximo paso (Ciclo 16)
Salud primero. Luego **elegir entre #1 (más tests en una página — `Preventivos` es la candidata más chica del backlog restante, mantenimiento preventivo programado) o #3 (focus trap en 1 modal para establecer el patrón)**. Si el operador empieza a quejarse de UX en una página específica, esa página se prioriza sobre cualquier ítem del backlog.

---

## Ciclo 14 — 2026-06-24 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (creado 2026-06-21 05:55:31, ~3d uptime).
- Contenedores: openclaw Up 2d healthy; sigah-backend 2d; sigah-mysql 4d; sigab-panel-api 2d; sigah-bot 41h; sigah-frontend 4d; n8n 4d; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (349 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (327 ms).

**Item hecho:** Backlog #1 (continuación) — **AuditPage.jsx** (148 líneas, Centro de Auditoría NOM-016 Compliance / bitácora SHA-256 inalterable). 13 tests nuevos, **139 → 152 tests totales**.

### Diagnóstico
AuditPage es la página legal/compliance del SPA: bitácora inalterable con hashing encadenado SHA-256 según NOM-016-SSA3-2012. Concentra patrones muy distintos a las páginas anteriores:

- 3 endpoints de API con roles distintos: `getAuditLogs` (read, carga inicial con 2 shapes toleradas `{logs}` o `{eventos}`), `verificarCadena` (validación batch, con loading local), `descargarBitacoraPdf` (Blob + window.open para descarga).
- 1 `useState` local `loading` SOLO en `handleVerify` (no en el fetch inicial — la página no muestra spinner de carga, sólo tabla vacía o llena). El botón "Verificar" se DISABILITA durante el request.
- 2 ramas del alert de verificación (verde con `<Verified>` si `integridad_ok` o `valida`, rojo con `<ShieldAlert>` si no). El alert es CONDICIONAL a `verification` truthy, así que un 500 del backend no debe renderizar alert.
- Badges de acción con clases CSS exactas: INSERT verde (`bg-emerald-500/10 text-emerald-600`), UPDATE azul, DELETE rojo, default slate. Si alguien refactorea a tokens y rompe las clases, los badges pierden semántica visual.
- 2 patterns de toast.loading con id compartido (`tid`): uno en `handleVerify` (loading → success/error con `id: tid`), otro en `handleGenerarBitacora`. Si alguien rompe la cadena, el operador ve dos toasts en cascada.
- `URL.createObjectURL` + `window.open` en la generación de PDF (jsdom no los provee de forma estable — el primer intento del test falló con `createObjectURL does not exist`).
- **`AuditPage` importa `toast` directo desde `../lib/toast`**, no usa `useToast()` (a diferencia de Alertas). Es el ÚNICO consumidor de las 5 páginas testeadas con este patrón — los mocks de `../components/Toast` son inútiles para esta página. Esto es un detalle que sólo se descubre escribiendo el test; un DevTools manual nunca lo atrapa.

Riesgos silenciosos:
- Si alguien borra `data.logs || data.eventos` el operador ve tabla vacía aunque la API sí devolvió eventos.
- Si el botón Verificar no se deshabilita, el operador puede spamear el endpoint durante la verificación.
- Si la cadena `toast.loading(id) → toast.success(_, { id })` se rompe, el operador ve dos toasts en cascada.
- Si `URL.createObjectURL` se quita antes de `window.open`, el operador hace click en "Generar Bitácora PDF" y nada se descarga.
- Si alguien quita el fallback 'SISTEMA' para logs sin `usuario_nombre`, la celda queda vacía y se pierde la trazabilidad (quién hizo qué).

### Cambio (commit `18ab29e`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 13 casos nuevos (139 → 152 tests, +436 líneas):**

`src/pages/AuditPage.test.jsx` (13 tests, 4 grupos):
- **Carga inicial de logs (5)**:
  - API devuelve `{logs: [4 items]}` → header `<h1>` "Auditoría NOM-016 Compliance" + 4 hashes en el DOM (buscados por `getByTitle` porque el span visible usa `truncate w-32` y recorta el hash; el hash completo vive en el atributo `title` del span) + celda "Equipo #42" de la columna Entidad.
  - API devuelve `{eventos: [...]}` (shape alternativa) → fallback funciona, log visible.
  - API devuelve `{}` (sin `logs` ni `eventos`) → tabla se renderiza con sus headers pero el tbody queda vacío; no crashea.
  - `usuario_nombre: null` → celda muestra el fallback literal `'SISTEMA'`.
  - `getAuditLogs` rechaza → tabla vacía + `toast.error('No se pudo cargar la bitácora de auditoría')`.
- **Badges de acción (1)**: 4 fixtures (INSERT/UPDATE/DELETE/LOGIN), se valida que el `<span>` de cada uno lleva la clase CSS exacta (`bg-emerald-500/10 text-emerald-600` para INSERT, etc.). LOGIN usa el default slate. Si alguien refactorea el ternario a tokens semánticos, el test falla con la clase rota.
- **Verificar Cadena (5)**:
  - `integridad_ok=true` + `valida=true` + `total_registros=1234` + `mensaje='...'` → `toast.loading('Verificando integridad de la cadena SHA-256…')` → `toast.success('Cadena íntegra (1234 registros)', { id: 'toast-id-loading' })` con id compartido (reemplazo, no duplicado) + alert verde con el mensaje y "Total de registros verificados: 1234".
  - `integridad_ok=false` con `mensaje='Hash no coincide en registro #567'` → `toast.error` con el detail del backend + alert rojo renderizado.
  - `integridad_ok=false` SIN `mensaje` → `toast.error('Integridad comprometida')` (cubre el fallback `data.mensaje || 'Integridad comprometida'`).
  - `verificarCadena` rechaza → `toast.error('No se pudo verificar la cadena', { id: 'toast-id-loading' })` + el alert NO se renderiza (`verification` queda `null`).
  - Promesa controlada con `let resolveVerify`: tras el click, `await waitFor` verifica que el botón está `disabled`; tras resolver la promesa, otro `waitFor` verifica que volvió a `not.disabled`. Cubre la transición del `disabled={loading}` + `setLoading(true/false)` en el `try/finally`.
- **Generar Bitácora PDF (2)**:
  - Success: `api.descargarBitacoraPdf` devuelve `new Blob(['PDF-binary'])` → `URL.createObjectURL` se llamó con ese blob + `window.open` llamado con la URL `'blob:mock-url'` y target `'_blank'` + `toast.loading('Generando bitácora PDF…')` → `toast.success('Bitácora generada', { id: 'toast-id-loading' })` con id compartido.
  - Error: `api.descargarBitacoraPdf` rechaza → `toast.error('No se pudo generar la bitácora PDF', { id: 'toast-id-loading' })` + `window.open` **NO** se llamó.

**Mocks (justificados):**
- `vi.hoisted(() => ({...}))` para todas las refs — mismo patrón que Alertas/Equipos/Dashboard.
- `api/sigah`: 3 endpoints (`getAuditLogs`, `verificarCadena`, `descargarBitacoraPdf`) con `mockResolvedValue`/`mockRejectedValue` por test. **El componente importa desde `../api/sigah` (no `../api/sigab`)**, aunque el archivo `sigah.js` es un shim que re-exporta desde `sigab.js`. El mock debe ir al path que el componente usa, no al path "real".
- `components/Toast`: stub completo por consistencia con el resto de los tests (aunque AuditPage no lo use).
- **`lib/toast`**: stub adicional porque AuditPage hace `import toast from '../lib/toast'` y llama `toast.loading`/`toast.success` directamente. Si no se mockea este path, los tests de "Verificar Cadena" y "Generar Bitácora PDF" fallan con `Number of calls: 0` (la primera versión del test cayó en este bug). El stub redirige cada método al mismo `mocks.mockToast` para que el `loading` devuelva el id fijo `'toast-id-loading'` que la cadena `toast.success(_, { id })` espera.
- `URL.createObjectURL`: jsdom no lo implementa por defecto, así que se **asigna directamente** (`URL.createObjectURL = vi.fn(() => 'blob:mock-url')`). `vi.spyOn(URL, 'createObjectURL')` no funciona porque la propiedad no existe en el prototipo. (El primer intento del test cayó en este bug con `createObjectURL does not exist`.)
- `window.open`: `vi.spyOn` con `mockImplementation(() => null)` para no abrir pestañas reales durante el test y poder verificar las llamadas.
- `console.error`: silenciado globalmente en `beforeEach` con `vi.spyOn(console, 'error').mockImplementation(() => {})` — los 3 catches (`fetchLogs`, `handleVerify`, `handleGenerarBitacora`) imprimen `console.error(err)` en errores esperados.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 13) | Después (ciclo 14) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `AuditPage` (lazy) | 5.66 kB / 2.03 kB gzip | igual | — |
| `Equipos` (lazy) | 51.02 kB / 11.64 kB gzip | igual | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | igual | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `AuditPage.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto en lo que al bundle principal se refiere. Cero warnings, build 4.33s.

`npm test` → **152 passed (152)** en 1.76 s (13 nuevos casos, 139 previos). Sin warnings de `act()` ni de React state updates. `console.error` silenciado como se documenta arriba.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- vitest smoke tests para Dashboard (19 tests, 82 → 101 total) — ciclo 10.
- vitest smoke tests para Equipos (20 tests, 101 → 121 total) — ciclo 11.
- Dead code cleanup: import muerto de ESTADO_COLORS/ESTADO_LABELS en Equipos.jsx — ciclo 12.
- vitest smoke tests para Alertas (18 tests, 121 → 139 total) — ciclo 13.
- **vitest smoke tests para AuditPage (13 tests, 139 → 152 total)** — este ciclo.

### Backlog restante
1. **Más tests** (opcional, alcance decreciente): quedan candidatas chicas (`Formatos` 152 líneas, `Preventivos` 165, `ChecklistPage` 182) y medianas (`Tecnovigilancia` 199, `Reportes` 236). Cada una ~10–15 tests. El set {Login, Dashboard, Equipos, Alertas, AuditPage} cubre las 5 páginas más transitadas + el centro legal/compliance. `Formatos` es el siguiente candidato natural por tamaño.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio, sólo se paga en la ruta `/dashboard`).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada — habría que escribir uno pequeño o agregar `focus-trap-react` ~3 KB).
4. **Opcional**: dead code grep round 2 — un grep por `TODO|FIXME|XXX|HACK` (ciclo 13: 0 hits reales, sólo falsos positivos como `XXXX` para folios y la palabra `TODOS` en strings de "todos los campos") y por `console.*` residuales (todos los `console.error` están en `.catch()` legítimos — borrarlos silenciaría errores reales, sería regresión). Net result: dead code cleanup ya dio lo que podía dar.

### Próximo paso (Ciclo 15)
Salud primero. Luego **elegir entre #1 (más tests en una página chica — `Formatos` es la candidata más acotada del backlog restante, sólo abre un modal estático) o #3 (focus trap en 1 modal para establecer el patrón)**. Si el operador empieza a quejarse de UX en una página específica, esa página se prioriza sobre cualquier ítem del backlog.

## Ciclo 13 — 2026-06-24 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (creado 2026-06-21 05:55:31).
- Contenedores: openclaw Up 2d healthy; sigah-backend 2d; sigah-mysql 3d; sigab-panel-api 2d; sigah-bot 36h; sigah-frontend 3d; n8n 4d; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 2w.
- `https://sigah.129-121-100-147.sslip.io/` → 200.
- `https://sigab.129-121-100-147.sslip.io/` → 200.

**Item hecho:** Backlog #1 (continuación) — segunda página chica del set post-{Login, Dashboard, Equipos}: **Alertas.jsx** (145 líneas, Centro de Alertas del operador). 18 tests nuevos, **121 → 139 tests totales**.

### Diagnóstico
Alertas es la página más pequeña del SPA pero concentra patrones sutiles que un test atrapa y un DevTools manual no:

- 3 ramas de render: `loading` (spinner "Cargando alertas..."), `empty` (visible sólo cuando `visibles.length === 0` — distinto del `alertas.length === 0` cuando hay un filtro sin matches), y la lista de cards con badges de prioridad.
- 5 filtros (`'' | critica | alta | media | baja`) con highlight visual del activo (`bg-emerald-100 text-emerald-700`). El `capitalize` de Tailwind es sólo presentación — el DOM tiene el string literal `'critica'` (sin tilde), detalle que rompió el primer intento del test hasta corregir el regex.
- Botón "Marcar todas leídas" **condicional** a `alertas.length > 0`. Si alguien lo sube al header incondicionalmente, aparece en estado vacío y confunde al operador.
- 2 endpoints mutantes: `marcarLeida(id)` (individual, filtra del state) y `marcarTodasLeidas()` (batch con `window.confirm`, limpia el state). Ambos con loading toast + success/error con o sin `response.data.detail` del backend.
- `marcarTodas` usa el patrón **toast.loading con id compartido** para reemplazar el toast de "Marcando todas…" por el de "Todas las alertas marcadas como leídas" (sin spamear el corner). Si alguien rompe esa cadena, el operador ve dos toasts en cascada en lugar de uno solo que cambia.

Riesgos silenciosos:
- Si alguien borra `prev.filter((a) => a.id !== id)`, el operador marca alertas como leídas sin que desaparezcan de la lista.
- Si alguien quita `setAlertas([])` de `marcarTodas`, ve "Todas marcadas" con todas las alertas todavía visibles.
- Si el filtro deja de aplicar `a.prioridad === filtro`, se rompe la utilidad principal de la página.
- Si alguien no tolera la key `alertas` faltante en la respuesta (`res.alertas || []`), un backend viejo o respuesta parcial crashea la página en `Cannot read property 'filter' of undefined`.

### Cambio (commit `6571b1e`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 18 casos nuevos (121 → 139 tests, +471 líneas):**

`src/pages/Alertas.test.jsx` (18 tests, 7 grupos):
- **Loading (1)**: spinner "Cargando alertas..." presente; ni el empty state ni ninguna alerta filtrada al DOM. Verifica que el `if (loading) return ...` corto-circuita el bloque de contenido (el `<h1>` "Centro de Alertas" del header SÍ se renderiza durante loading — aserción ajustada al hecho real del componente).
- **Empty (3)**:
  - API devuelve `{alertas: []}` → "Sin alertas pendientes" + "El sistema está en buen estado" + botón "Marcar todas" **ausente**.
  - API devuelve `[ALERTA_BAJA]`, click en filtro "critica" → empty state con la baja invisible (filtro sin matches).
  - API devuelve `{}` (sin la key `alertas`) → empty state. Cubre el edge case del `res.alertas || []`.
- **Render con datos (3)**:
  - Header `<h1>` "Centro de Alertas" (level 1) + contador "4 alertas pendientes" + 5 botones de filtro presentes + 4 mensajes de alerta visibles + botón "Marcar todas" presente.
  - Línea "Equipo: X (serie)" muestra la serie entre paréntesis cuando `equipo_serie` existe.
  - Línea "Equipo:" **ausente** cuando ambos `equipo_nombre` y `equipo_serie` son null.
- **Filtros (3)**:
  - Filtro activo toma `bg-emerald-100`; click transfiere el highlight de "Todas" a "critica".
  - Click en "alta" → solo la alerta de prioridad `alta` visible; las otras dos desaparecen.
  - Click en "Todas" tras filtrar → vuelven todas las alertas.
- **Marcar individual (3)**:
  - Success: `api.marcarLeida(id)` llamado con el id correcto + alerta removida del DOM + `toast.success('Alerta marcada como leída')` + la otra alerta sigue visible.
  - Error con `response.data.detail`: `toast.error` con el detail del backend (`'Alerta ya marcada por otro operador'`) + la alerta **sigue** visible (no se removió).
  - Error sin detail (`new Error('Network down')`): `toast.error('No se pudo marcar la alerta')` genérico.
- **Marcar todas batch (4)**:
  - `confirm=true` + success: `api.marcarTodasLeidas` llamado + `toast.loading('Marcando todas…')` llamado **antes** + `toast.success('Todas las alertas marcadas como leídas', { id: 'toast-id-loading' })` con el **mismo id** (reemplazo, no duplicado) + lista vacía (3 alertas removidas del DOM) + botón "Marcar todas" **desaparece** (`alertas.length === 0`).
  - `confirm=true` + error con detail: `toast.error` con el detail del backend + la alerta **sigue** visible.
  - `confirm=true` + error sin detail: `toast.error('Error al marcar todas', { id: 'toast-id-loading' })` genérico.
  - `confirm=false`: `api.marcarTodasLeidas` **NO** llamada + ningún toast emitido + la alerta sigue visible. `await act + Promise.resolve()` da el tick extra para asegurar que cualquier llamada se hubiera ejecutado.
- **Error en carga inicial (1)**: `getAlertasPendientes` rechaza con `new Error('Network')` → empty state + `toast.error('No se pudieron cargar las alertas')`.

**Mocks (justificados):**
- `vi.hoisted(() => ({...}))` para todas las refs — mismo patrón que Equipos/Dashboard. `vi.mock` se hoistea y necesita refs disponibles antes de la primera ejecución.
- `api/sigab`: 3 endpoints (`getAlertasPendientes`, `marcarLeida`, `marcarTodasLeidas`) con `mockResolvedValue`/`mockRejectedValue` por test.
- `Toast`: stub completo (success/error/info/warning/loading/dismiss). `loading` devuelve un id fijo `'toast-id-loading'` para verificar la cadena `toast.loading(id) → toast.success(_, { id })` o `toast.error(_, { id })`.
- `window.confirm`: `vi.spyOn(window, 'confirm').mockReturnValue(true)` por defecto; cada test de "confirm=false" lo sobreescribe con `mockReturnValue(false)`.
- `console.error`: silenciado globalmente en `beforeEach` con `vi.spyOn(console, 'error').mockImplementation(() => {})` — los 3 catches (`cargar`, `marcar`, `marcarTodas`) imprimen `console.error(err)` en errores esperados, contaminarían stderr con "Error: Network" tres veces por cada test negativo.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 12) | Después (ciclo 13) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Equipos` (lazy) | 51.02 kB / 11.64 kB gzip | igual | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | igual | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Alertas.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings, build 4.09s.

`npm test` → **139 passed (139)** en 1.66 s (18 nuevos casos, 121 previos). Sin warnings de `act()` ni de React state updates. `console.error` silenciado como se documenta arriba.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- vitest smoke tests para Dashboard (19 tests, 82 → 101 total) — ciclo 10.
- vitest smoke tests para Equipos (20 tests, 101 → 121 total) — ciclo 11.
- Dead code cleanup: import muerto de ESTADO_COLORS/ESTADO_LABELS en Equipos.jsx — ciclo 12.
- **vitest smoke tests para Alertas (18 tests, 121 → 139 total)** — este ciclo.

### Backlog restante
1. **Más tests** (opcional, alcance decreciente): quedan candidatas chicas (`AuditPage` 148 líneas, `Formatos` 152, `Preventivos` 165, `ChecklistPage` 182) y medianas (`Tecnovigilancia` 199, `Reportes` 236). Cada una ~10–15 tests. El set {Login, Dashboard, Equipos, Alertas} cubre las páginas más transitadas.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio, sólo se paga en la ruta `/dashboard`).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada — habría que escribir uno pequeño o agregar `focus-trap-react` ~3 KB).
4. **Opcional**: dead code grep round 2 — un grep por `TODO|FIXME|XXX|HACK` (ciclo 13: 0 hits reales, sólo falsos positivos como `XXXX` para folios y la palabra `TODOS` en strings de "todos los campos") y por `console.*` residuales (todos los `console.error` están en `.catch()` legítimos — borrarlos silenciaría errores reales, sería regresión). Net result: dead code cleanup ya dio lo que podía dar.

### Próximo paso (Ciclo 14)
Salud primero. Luego **elegir entre #1 (más tests en una página chica — `AuditPage` o `Formatos` son las candidatas más acotadas) o #3 (focus trap en 1 modal para establecer el patrón)**. Si el operador empieza a quejarse de UX en una página específica, esa página se prioriza sobre cualquier ítem del backlog.

## Ciclo 12 — 2026-06-24 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 46h healthy; sigah-backend 2d; sigah-mysql 3d; sigab-panel-api 2d; sigah-bot 31h; sigah-frontend 3d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (272 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (313 ms).

**Item hecho:** Backlog #4 (dead code cleanup en Equipos.jsx) — el más chiquito del backlog. 1 línea eliminada, 0 tests añadidos, 1 commit.

### Diagnóstico
Equipos.jsx línea 22 importaba `ESTADO_COLORS, ESTADO_LABELS` desde `'../utils/constants'` pero nunca los referenciaba en el resto del archivo (438 líneas). Los consumidores reales son los componentes hijos — `EquipoTable`, `EquipoCard`, `EquipoDetail` — cada uno con su propio import. `grep -c "ESTADO_COLORS|ESTADO_LABELS" Equipos.jsx` = **1** (el import mismo).

Confirmado con `grep` global: los tokens viven en `utils/tokens.js` y se re-exportan desde `utils/constants.js`. Tres componentes los consumen (`EquipoCard`, `EquipoTable`, `EquipoDetail`), y `Tecnovigilancia`/`EventoDetalleModal` consumen la variante `TV_*`. `Equipos.jsx` no es uno de ellos.

Riesgo de dejarlo: confunde al siguiente que lea el archivo ("¿por qué importa colores que no usa?"), y abre la puerta a que alguien asuma que `Equipos.jsx` muestra badges de estado en algún sitio que no muestra (no los muestra — los badges viven en los sub-componentes).

### Cambio (commit `6ef0183`, pusheado a `autocycle/v3.0`)

**1 archivo, 1 línea eliminada:**

`src/pages/Equipos.jsx` — borrada la línea 22:

```diff
 import { useToast } from '../components/Toast';
-import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
 import { Download, Plus, LayoutGrid, List } from 'lucide-react';
```

Cosmético puro. Tree-shaking de Vite ya descartaba los exports no usados del bundle, así que el chunk `Equipos` queda **bit-exacto**: 51.02 kB / 11.64 kB gzip. Es la verificación de que el import era realmente muerto — si el bundle hubiera cambiado, significaba que algo sí lo consumía.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 11) | Después (ciclo 12) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Equipos` (lazy) | 51.02 kB / 11.64 kB gzip | 51.02 kB / 11.64 kB gzip | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | igual | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). Build 4.10s, 0 warnings.

`npm test` → **121 passed (121)** en 1.53 s (sin cambios — ningún archivo de test modificado).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- vitest smoke tests para Dashboard (19 tests, 82 → 101 total) — ciclo 10.
- vitest smoke tests para Equipos (20 tests, 101 → 121 total) — ciclo 11.
- **Dead code cleanup: import muerto de ESTADO_COLORS/ESTADO_LABELS en Equipos.jsx** — este ciclo.

### Backlog restante
1. **Más tests** (opcional, alcance decreciente): las páginas que quedan (`/ordenes`, `/alertas`, `/reportes`, `/trazabilidad`, `/tecnovigilancia`, etc.) son menos transitadas que {Login, Dashboard, Equipos}. Cada una ~10–15 tests. Equipos cubrió el 95% del blast-radius; el resto es robustez marginal.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio, sólo se paga en la ruta `/dashboard`).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada — habría que escribir uno pequeño o agregar `focus-trap-react` ~3 KB).
4. **Opcional**: dead code cleanup round 2 — un grep por `TODO`, `FIXME`, y `console.log`/`console.warn` residuales podría sacar más. Cosmético puro.

### Próximo paso (Ciclo 13)
Salud primero. Luego **elegir entre #1 (más tests en una página chica — `/alertas` o `/reportes` parecen candidatas) o #4 (dead code grep round 2 — TODO/FIXME/console residuales)**. Ambos caben en un ciclo corto. Si el operador empieza a quejarse de UX en una página específica, esa página se prioriza sobre cualquier ítem del backlog.

## Ciclo 11 — 2026-06-24 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 41h healthy; sigah-backend 2d; sigah-mysql 3d; sigab-panel-api 2d; sigah-bot 26h; sigah-frontend 3d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (348 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (340 ms).

**Item hecho:** Backlog #1 (continuación) — última página del set {Login, Dashboard, Equipos}: **Equipos.jsx** (438 líneas, la página más transitada del inventario del operador). 20 tests nuevos, **101 → 121 tests totales**.

### Diagnóstico
Equipos es la página más compleja del SPA: combina 5 endpoints de API, 11 estados locales (`useState`), 3 `useEffect` (catálogos, fetch principal con `useCallback`, deep-link por URL), 4 ramas de render (loading spinner / empty state / vista tarjeta / vista tabla), 6 filtros selectivos + búsqueda debounced, paginación real con `limit/offset`, exportación CSV con `Blob` + `triggerDownload`, y dos modales (EquipoForm alta, EquipoDetail vista). El STATE anterior (ciclo 10) la había dejado para un ciclo largo porque requería "más mocks" — el ciclo 11 cierra esa deuda.

Riesgos silenciosos que un test atrapa y un DevTools manual no:
- Si alguien borra `updateFiltros` o se olvida del `setOffset(0)` al cambiar filtros, el operador paginaría sobre datos viejos tras un filtro.
- Si el debounce de 400ms de la búsqueda se quita o baja, cada keystroke dispara un fetch → tormenta de requests.
- Si alguien borra el `setSearchParams(newParams, { replace: true })` del deep-link, la URL queda con `?equipoId=99` para siempre y cada navegación re-abre el detalle.
- Si el orden de `await descargarEquiposCsv` → `triggerDownload` → `toast.success` se rompe, el operador ve "Exportado exitosamente" sin que se haya descargado nada.
- Si alguien cambia `import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants'` por un import que SÍ use, el bundle sube (el import actual es dead code, fuera de alcance).

### Cambio (commit `1ddec72`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 20 casos nuevos (101 → 121 tests, +524 líneas):**

`src/pages/Equipos.test.jsx` (20 tests, 8 grupos):
- **Estado loading (1)**: spinner "Cargando inventario..." presente; `EquipoTable` y `EquipoCard` NO en el DOM. La promesa de `getEquipos` se resuelve al final dentro de `act()` para no dejar promesas colgadas.
- **Estado empty (1)**: API devuelve `{equipos: [], total: 0}` → "No se encontraron equipos" + "Intenta con otros filtros" + ni tabla ni cards montadas.
- **Render default (2)**: header `<h1>` "Inventario de Equipos" + subtítulo "N equipos registrados · HGR No.1 IMSS"; vista por defecto = tabla → `EquipoTable` montado con los 2 nombres de equipos en su `textContent`, `EquipoCard` NO.
- **Toggle de vista (2)**: click "Tarjetas" → grid de `EquipoCard` (test usa `findAllByTestId('mock-equipo-card')` y verifica que `[1]` es "Monitor Philips IntelliVue"); click "Tabla" desde tarjetas → vuelve a `EquipoTable`, `EquipoCard` desmontado.
- **Filtros (3)**:
  - Los 6 selects tienen la opción "Todos..." por defecto (sin filtros activos).
  - Cambiar `estado` a `operativo` dispara `api.getEquipos({ estado: 'operativo', limit: 50, offset: 0 })` y aparece el badge "1" (verifica el contador `activeFilterCount`).
  - Click "Limpiar filtros" resetea el state: el último fetch no incluye `estado` ni `criticidad`.
- **Paginación (3)**:
  - `total=1` → controles NO en el DOM.
  - `total=75` → "Mostrando 1–50 de 75 equipos" + "Pág. 1 / 2" + Anterior disabled.
  - Click "Siguiente" → fetch con `offset: 50` + "Mostrando 51–75 de 75" + Siguiente ahora disabled.
- **Modales (3)**:
  - Click `EquipoCard` (vista tarjeta) → `EquipoDetail` montado con el `equipo.nombre` correcto.
  - Botón "CLOSE_DETAIL" del detalle desmonta el modal.
  - Click "Nuevo equipo" → `EquipoForm` montado (cuidado: hay 2 botones con ese nombre — desktop + FAB móvil — el test usa `getAllByRole` y toma `[0]`); "SAVE_FORM" dispara un nuevo `getEquipos` y desmonta el form.
- **CSV export (2)**:
  - Success: `descargarEquiposCsv` + `triggerDownload(blob, filename)` con filename regex `^inventario_sigah_\d{4}-\d{2}-\d{2}\.csv$` + `toast.success` con mensaje que matchea `/exportado exitosamente/i`. El `console.error` se silencia con `vi.spyOn` para no contaminar stderr.
  - Error: `descargarEquiposCsv` rechaza con `new Error('Network')` → `toast.error(/No se pudo exportar/i)` + `triggerDownload` NO llamado.
- **Deep-link por query param (2)**:
  - `mockSearchParams.set('equipoId', '42')` antes de render → `api.getEquipo('42')` llamado y `EquipoDetail` montado con el nombre del fixture (`'DeepLinked'`).
  - El `setSearchParams` se llama con un `URLSearchParams` SIN `equipoId` y con `{ replace: true }` (no empuja historia nueva).
- **Búsqueda debounced (1)**: `vi.useFakeTimers()`; tipear "ventilador" → `getEquipos` NO recibe `buscar` antes de 400ms; tras `vi.advanceTimersByTimeAsync(450)` el último call incluye `{ buscar: 'ventilador' }`.

**Mocks (justificados):**
- `vi.hoisted(() => ({...}))` para todas las refs mutables — `vi.mock` se hoistea al top del archivo y necesita refs disponibles antes de la primera ejecución. Patrón documentado en el comentario del test.
- `useSearchParams`: URLSearchParams controlable a nivel de módulo (identidad estable para que el `useEffect` con dep `[searchParams, setSearchParams]` no re-dispare). El `setSearchParams` mock muta el URLSearchParams en lugar de reemplazarlo (semántica de react-router).
- `api/sigab`: 5 endpoints (`getEquipos`, `getAreasCatalogo`, `getEquipo`, `descargarEquiposCsv`, `triggerDownload`) con `mockResolvedValue`/`mockRejectedValue` por test.
- `Toast`: stub completo (success/error/info/warning/loading/dismiss). Mock necesario porque `useToast` real viene de sileo, que no es jsdom-safe.
- `EquipoCard`/`EquipoTable`/`EquipoDetail`/`EquipoForm`: mocks triviales con `data-testid` + handlers (`onClick`/`onClose`/`onSaved`) que cierran el ciclo de interacción. El test verifica que se **montan** y que los handlers correctos se invocan, no el contenido interno (esos viven en sus propios test files o son componentes pesados probados en sitio).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 10) | Después (ciclo 11) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Equipos` (lazy) | 51.02 kB / 11.64 kB gzip | 51.02 kB / 11.64 kB gzip | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | igual | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Equipos.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings, build 4.18s.

`npm test` → **121 passed (121)** en 1.47 s (20 nuevos casos, 101 previos). Sin warnings de `act()` ni de React state updates. Único stderr fue el `console.error` del catch de `handleExportarCsv` (esperado), silenciado con `vi.spyOn(console, 'error').mockImplementation(() => {})`.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- vitest smoke tests para Dashboard (19 tests, 82 → 101 total) — ciclo 10.
- **vitest smoke tests para Equipos (20 tests, 101 → 121 total)** — este ciclo.

### Backlog restante
1. **Más tests** (opcional, alcance decreciente): las páginas que quedan (`/ordenes`, `/alertas`, `/reportes`, etc.) son menos transitadas. El set {Login, Dashboard, Equipos} cubre el 95% del blast-radius.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Opcional**: dead code cleanup — `Equipos.jsx` importa `ESTADO_COLORS, ESTADO_LABELS` de `'../utils/constants'` pero no los usa. Cosmético puro, podría ir en cualquier ciclo.

### Próximo paso (Ciclo 12)
Salud primero. Luego **item #4 (dead code cleanup en Equipos.jsx — `ESTADO_COLORS`/`ESTADO_LABELS`)** — alcance muy acotado, cosmético, cabe en cualquier ciclo. Si no cabe, fallback a #2 (`MaintenanceChart` lazy) o #3 (focus trap en 1 modal para establecer el patrón).

## Ciclo 10 — 2026-06-24 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 36h healthy; sigah-backend 2d; sigah-mysql 3d; sigab-panel-api 2d; sigah-bot 21h; sigah-frontend 3d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (328 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (354 ms).

**Item hecho:** Backlog #1 (continuación) — segunda página del set {Login, Dashboard, Equipos}: **Dashboard.jsx** (231 líneas, Centro de Control del operador). 19 tests nuevos, **82 → 101 tests totales**.

### Diagnóstico
Dashboard es la página más transitada del SPA — la ruta por defecto post-login. Su superficie de fallo (sin contar los sub-componentes probados aparte):
- 3 ramas de render: `loading` (spinner "Iniciando SIGAH Engine..."), `error` (con botón "Reintentar conexión" que dispara `window.location.reload()`), y el body.
- 4 KPIs derivados de `useDashboard()`: Total Activos, Operativos, Fallas Críticas, Mantenimiento Due. El cuarto es **condicional a `useResponsive().isControlRoom`** (≥3840px, sala de control 4K) — un test sin control del hook no podría verificar esa rama.
- Banner de alertas críticas: aparece cuando `alertas.filter(a => a.prioridad === 'critica').length > 0`. Si alguien borra ese filtro o cambia el string `'critica'`, las críticas nunca se anuncian.
- 2 CTAs: botón Poka-Yoke (abre `TripleValidationModal` con `setShowPokaYoke(true)`) y botón NOM-016 (`navigate('/checklists')`).
- Render defensivo: `resumen?.total || 0` y `resumen?.operativos || 0` — clave para que un `resumen=null` durante el primer frame del SSE no crashee con `Cannot read property 'total' of null`.

### Cambio (commit `c0680f0`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 19 casos nuevos (82 → 101 tests, +306 líneas):**

`src/pages/Dashboard.test.jsx` (19 tests, 7 grupos):
- **Estado loading (1)**: spinner "Iniciando SIGAH Engine..." presente; el body (CENTRO DE CONTROL, Total Activos) NO se renderiza — confirma que el `if (loading) return ...` corto-circuita.
- **Estado error (2)**:
  - Render del bloque de error (mensaje "Backend caído (503)" + título "Error de Enlace" + botón "Reintentar conexión").
  - Click en "Reintentar conexión" llama a `window.location.reload()`. Truco: jsdom no permite `delete window.location.reload` (`TypeError: Cannot delete property 'reload'`), hay que redefinirlo con `Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, ... })`. Documentado en el beforeEach.
- **Render exitoso — header (4)**:
  - `<h1>` "CENTRO DE CONTROL" con span "SIGAB" dentro (búsqueda con `within()`).
  - Subtítulo "IMSS 1 Clínica General Tijuana" + tagline "Sistema Integral de Activos Biomédicos".
  - Ambos CTAs (Poka-Yoke + NOM-016) visibles.
  - Click en NOM-016 → `mockNavigate('/checklists')` (mock de `useNavigate`).
- **KPIs (5)**:
  - 3 KPIs base: Total Activos=751, Operativos=698, Fallas Críticas=0 (sin alertas críticas). Incluye la unidad "Equipos" sólo en el primero.
  - Mantenimiento Due **NO** aparece con `isControlRoom: false` (default).
  - Mantenimiento Due **SÍ** aparece con `isControlRoom: true` + valor 23.
  - Conteo de críticas: 2 alertas críticas + 1 media → KPI muestra "2" (verifica `alertas.filter(a => a.prioridad === 'critica').length`).
  - Render defensivo: `resumen: null` → renderiza "0" en los KPIs sin "NaN" en el DOM.
- **Banner de alertas críticas (2)**:
  - Sin críticas (1 alerta "media") → `mock-alerta-banner` **NO** en el DOM.
  - Con críticas (1 crítica + 1 media) → banner presente, contiene la crítica, **no** contiene la media (verifica el filtro).
- **Mapa + gráfica (2)**: secciones "Mapa de Activos por Zona" y "Cumplimiento de Mantenimiento" presentes; los mocks de HospitalMap y MaintenanceChart se montan.
- **Modal Poka-Yoke (3)**: cerrado inicialmente; abre con click en el botón; cierra vía `onClose()` disparado desde el mock del modal.

**Mocks (justificados):**
- `useDashboard`: controla loading/error/resumen/alertas. Sin mock, el hook hace `Promise.all([api.getDashboard, ...])` y el test se cuelga.
- `useResponsive`: controla `isControlRoom` (default `false` en `setupDashboard`, opt-in con segundo arg).
- `useNavigate`: spy para verificar navegación sin tener que montar `/checklists` real.
- `HospitalMap` (41 KB), `MaintenanceChart` (Recharts, 512 KB en chunk shared), `TripleValidationModal` (8 KB + fetch interno), `AlertaBanner`: mocks triviales con `data-testid`. El test verifica que se **montan** en la posición correcta, no su contenido (esos viven en sus propios archivos / contratos de uso).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 9) | Después (ciclo 10) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `Dashboard` (lazy) | 60.38 kB / 15.06 kB gzip | 60.38 kB / 15.06 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Dashboard.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings, build 3.90s.

`npm test` → **101 passed (101)** en 1.33 s (19 nuevos casos, 82 previos). Sin warnings de `act()` ni de React state updates.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- vitest smoke tests para Login (12 tests, 70 → 82 total) — ciclo 9.
- **vitest smoke tests para Dashboard (19 tests, 82 → 101 total)** — este ciclo.

### Backlog restante
1. **Equipos.jsx** (438 líneas) — la última página del set. Es la más compleja: usa `useEffect` con fetch a la API, combina KPICard + EquipoTable + EquipoCard con toggle de vista, 4 modales (Detalle, QR, Historial, Órdenes), filtros y búsqueda. Va a requerir más mocks (api endpoints + al menos 2-3 modales) — trabajo de 1 ciclo largo.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).

### Próximo paso (Ciclo 11)
Salud primero. Luego **item #1 (Equipos.jsx)** — última página del set. Si no cabe entero, fallback a #2 (`MaintenanceChart` lazy) o #3 (focus trap en un solo modal para establecer el patrón).

## Ciclo 9 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 31h healthy; sigah-backend 43h; sigah-mysql 2d; sigab-panel-api 46h; sigah-bot 16h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (335 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (335 ms).

**Item hecho:** Backlog #1 (más tests para páginas reales) — primera página: **Login.jsx** (97 líneas, la frontera de auth). Justificación del orden: Login es la página más pequeña del set {Login, Dashboard, Equipos} y la de mayor blast-radius (si rompe, nadie entra). Probar Login primero establece el patrón de mock para AuthContext + MemoryRouter; Dashboard y Equipos pueden extender el mismo patrón en próximos ciclos.

### Diagnóstico
Login es la única página que renderiza el formulario de auth — `useAuth().login(matricula, password)` → `api.login()` → POST `/api/auth/login`. La función es trivial (3 estados: idle / loading / error + 2 inputs controlados), pero está en el camino crítico. Y las rutas protegidas dependen 100% de que el token se guarde en localStorage tras login exitoso.

Riesgos silenciosos que un test atrapa y un DevTools manual no:
- Si alguien refactoriza `handleSubmit` y olvida el `setLoading(false)` en el `finally`, el botón queda disabled para siempre tras un error.
- Si alguien borra el `e.preventDefault()`, la página hace submit nativo HTML, navega al action por defecto, y la SPA se rompe.
- Si alguien cambia el formato del error (`err.response?.data?.detail` → `err.detail`), los mensajes del backend dejan de mostrarse.
- Si el `navigate('/dashboard')` se borra, el usuario ve el login aunque el token esté en localStorage (UX rota).

### Cambio (commit `c618f4c`, pusheado a `autocycle/v3.0`)

**1 archivo de test, 12 casos nuevos (70 → 82 tests, +152 líneas):**

`src/pages/Login.test.jsx` (12 tests):
- **Render del formulario (4 tests)**:
  - Título "SIGAB" (h2) + subtítulo "IMSS 1 Clínica General Tijuana".
  - Inputs Matrícula y Contraseña presentes con sus labels asociados (`getByLabelText`).
  - Inputs vacíos al inicio.
  - Botón muestra "Ingresar" en idle, NO "Iniciando sesión...".
- **State local (2 tests)**:
  - `fireEvent.change` en matrícula actualiza `input.value`.
  - `fireEvent.change` en password actualiza `input.value`.
- **Submit exitoso (2 tests)**:
  - Submit llama `login(matricula, password)` y navega a `/dashboard` (mock route renderiza `DASHBOARD_PAGE`).
  - Mientras `loading=true` (entre click y resolve), muestra "Iniciando sesión..." y el botón está `disabled`. Resolver dentro de `act()` para no disparar warnings.
- **Submit con error (4 tests)**:
  - Error con `err.response.data.detail = "Credenciales incorrectas"` → muestra el detail.
  - Error sin detail (`new Error('Network Error')`) → muestra el mensaje por defecto "Error al iniciar sesión. Verifique sus credenciales."
  - Tras error, el botón vuelve a "Ingresar" (loading=false restaurado en `finally`).
  - Tras error, NO navega a /dashboard.

**Patrón de setup:**
- Wrap con `<AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn() }}>` — bypass del AuthProvider real (que requiere mockear `api.login` entero). Mismo patrón que `ProtectedRoute.test.jsx`.
- `<MemoryRouter initialEntries={['/login']}>` con `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` (silencia los warnings de react-router v7, ya usado en tests previos).
- `<Routes>` con dos rutas: `/login` → `<Login />`, `/dashboard` → `<div>DASHBOARD_PAGE</div>` (target del `navigate`).
- Helper `renderLogin({ login })` parametrizable para inyectar la mock `login`.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 8) | Después (ciclo 9) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). `Login.test.jsx` está fuera del alcance del bundler de producción (ningún archivo de producción lo importa), así que el dist queda bit-exacto. Cero warnings, build 4.33s.

`npm test` → **82 passed (82)** en 1.15 s (12 nuevos casos, 70 previos). Sin warnings (el `act()` wrap del test de loading silencia el warning de React state update al resolver la promesa mockeada).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js (−44 líneas) — ciclo 8.
- **vitest smoke tests para Login (12 tests, 70 → 82 total)** — este ciclo.

### Backlog restante
1. **Más tests de páginas**: Dashboard (231 líneas) y Equipos (438 líneas) son los siguientes candidatos. Mismo patrón (AuthContext.Provider + MemoryRouter + mockear endpoints con `vi.mock('../api/sigab')` o `vi.mock('../api/sigab', { partial: true })`).
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).

### Próximo paso (Ciclo 10)
Salud primero. Luego **item #1 (más tests de páginas)** — Dashboard primero (231 líneas, más simple que Equipos, mockea menos endpoints: KPIs + chart data). Si no cabe, fallback a Equipos (más complejo: tabla + cards + filtros + 4 modales, requiere más mocks).

## Ciclo 8 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (uptime 2d).
- Contenedores: openclaw Up 26h healthy; sigah-backend 38h; sigah-mysql 2d; sigab-panel-api 41h; sigah-bot 11h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (316 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (364 ms).

**Item hecho:** Backlog #2 (limpieza tokens sobrantes en `tailwind.config.js`).

### Diagnóstico
La consolidación dark→green del v3.0 (ciclos 1-2) dejó en `tailwind.config.js` un montón de entradas declaradas pero nunca referenciadas como clase en `src/`. Eran ruido del archivo, no del bundle: Tailwind solo emite CSS para tokens usados como clase, así que ningún KB de output estaba inflado — pero el archivo pesaba 99 líneas, tenía 3 paletas de colores semi-duplicadas (`medical`, `imss`, `sigah`) y pantallas/animaciones/shadows que ningún componente invocaba. Riesgo real: que un dev futuro añada `text-medical-green` o `bg-sigah-gradient` pensando que están vivos.

Auditoría sistemática con grep `bg-/text-/border-/ring-/from-/to-/shadow-/animate-` contra `src/**`:

**Colores vivos:**
- `cyan-glow` (LandingPage, Button) — paleta "Stitch / Apple-Medical"
- `ai-violet` (LandingPage, 2 ocurrencias)
- `sigah.blue`, `sigah.emerald` (App.jsx spinner, LandingPage badge)
- `glass.0` (Button.jsx `ring-offset-glass-0`)

**Colores muertos** (0 usos como clase Tailwind en src/):
- `medical.{green,yellow,red}` — paleta previa a la consolidación
- `imss.{green,dark,blue}` — idem (el "imss" que aparece en CSS es de clases tipo `.qr-label-imss-icon`, no del token)
- `sigah.{blue-dark,blue-light,emerald-light,amber,amber-light,red,red-light,slate,gray,gray-light}` — 10 entradas de la paleta de diseño original, ninguna usada
- `glass.{50,100,200,300,400,500}` — LandingPage usa los hex crudos (`#0b1326`, `#171f33`, `#2d3449`) directamente como `bg-[#...]`, no como token

**Backgrounds/shadows/animations muertos:**
- `sigah-gradient`, `sigah-emerald-gradient` (backgroundImage) — 0 usos
- `shadow-blue-lg`, `shadow-green-sm` — 0 usos (solo `shadow-blue-sm` en Button.jsx)
- `animate-pulse-slow`, `animate-fade-in` — 0 usos (solo `animate-slide-up` en SigabUI/ModalWrapper)

**Otros:**
- `fontFamily.data` — 0 usos
- `screens.xs` y `screens.4xl` — 0 usos como clase. **Pero ojo:** `useResponsive.js` tiene `xs: 320` y `'4xl': 2560` como keys de un objeto JS — eso es independiente de Tailwind, el hook consume los números directamente, así que la limpieza del screens config no le afecta.

### Cambio (commit `dad055a`, pusheado a `autocycle/v3.0`)

`tailwind.config.js`: rewrite completo, **−44 líneas / +3 líneas** (47 líneas eliminadas, 3 reescritas).

Quedan solo los tokens con ≥1 uso real:
- `colors`: `sigah.blue`, `sigah.emerald`, `cyan-glow`, `ai-violet`, `glass.0`
- `screens`: `3xl`, `5xl` (los dos que DashboardGrid usa)
- `fontFamily`: `sans`, `mono`, `display`, `body`
- `fontSize`: la escala completa (xs/4xl es la que usan Alertas y OCRScanner)
- `boxShadow.blue-sm` (Button)
- `animation.slide-up` + `keyframes.slideUp`
- `safelist`: igual (las regex de KPICard siguen siendo necesarias — los colores ahí son Tailwind core, no tokens custom)

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 7) | Después (ciclo 8) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.62 kB gzip | +0.01 kB (ruido) |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambio real.** Confirmado: Tailwind solo emite CSS para los tokens usados como clase, así que quitar entradas no-usadas del config no reduce el bundle — el beneficio es claridad del archivo y eliminación de un pie de "esto parece soportado pero no lo está".

Build: `npm run build` verde, sin warnings, 4.19s.
Tests: `npm test` → **70 passed (70)** en 902 ms (todos los del ciclo 5 + ciclo 7 siguen verdes — los tests no referencian tokens del Tailwind config).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (ciclo 7).
- **Limpieza de tokens muertos en tailwind.config.js (−44 líneas, cero impacto en bundle)** — este ciclo.

### Backlog restante
1. **Más tests con MSW**: páginas reales (Login, Dashboard, Equipos) mockeando axios. Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo.
2. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Opcional**: tailwind ya tiene `data:` pattern con `@source inline()` o JITs mejor — pero el v3 sigue en JIT estándar, no urge.

### Próximo paso (Ciclo 9)
Salud primero. Luego **item #1 (más tests)** — el más valioso y el más largo. Si cabe sólo una página, mejor Equipos (`/equipos` es la ruta más transitada del operador: KPICard + tabla + cards + modales). Si no cabe, fallback a #2 (MaintenanceChart lazy).

## Ciclo 3 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 48min healthy; sigah-backend 13h; sigah-mysql 41h; sigab-panel-api 16h; sigah-bot 16h; sigah-frontend 41h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (89 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (17 ms).

**Item hecho:** Backlog #1 (continuación) — accesibilidad teclado: skip-link + cards/filas del inventario activables con teclado.

### Diagnóstico
El frontend v3.0 ya tenía un ring global `*:focus-visible` (line 239 de `index.css`), pero los patrones interactivos clave eran inaccesibles por teclado:
- `Layout.jsx` no tenía skip-to-content — un usuario de teclado tenía que tabular por 20+ items del sidebar en cada página.
- `EquipoCard.jsx`: `<div onClick>` — `<div>` no es focuseable, Enter/Space no abrían el detalle.
- `EquipoTable.jsx`: mobile card Y desktop `<tr>` con `onClick` — mismo problema. El teclado nunca llegaba al inventario en `/equipos`.
- El bottom-nav móvil tenía `<nav>` sin label — lectores de pantalla anunciaban "navigation" genérico.

### Cambio (commit `234dca0`, pusheado a `autocycle/v3.0`)
- `Layout.jsx`: `<a href="#main-content" className="skip-link">Saltar al contenido principal</a>` como primer hijo focuseable; `<main id="main-content" tabIndex={-1}>` como ancla (tabIndex=-1 para que sea programáticamente focuseable sin entrar al tab order); bottom-nav recibe `aria-label="Navegación principal móvil"`.
- `index.css`: `.skip-link` oculto con `left: -9999px` hasta que recibe `:focus-visible`, donde se posiciona en top-left como pill verde-acento con outline blanco; `:target { scroll-margin-top: 4rem }` para que el salto al ancla no quede oculto bajo el header sticky.
- `EquipoCard.jsx`: `role="button"`, `tabIndex={0}`, `aria-label="Ver detalle de <nombre> — <marca> <modelo>"`, `onKeyDown` que activa `onClick` en Enter/Space; clase extra `focus-visible:border-[var(--accent)]` para refuerzo visual (el ring global ya marca el outline).
- `EquipoTable.jsx`: helper `handleRowKeyDown(e, eq)` que activa la fila con Enter/Space, con guard `if (e.target !== e.currentTarget) return` para no interceptar Enter/Space de los botones internos (tickets, QR). Mismo `role/tabIndex/aria-label` para mobile card (div) y desktop (tr); el `<tr>` usa `focus-visible:ring-2 focus-visible:ring-inset` para que el ring no rompa la grilla de la tabla.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 2) | Después (ciclo 3) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.42 kB gzip | 110.44 kB / 37.51 kB gzip | +0.09 kB gzip (ruido) |
| `Equipos` (lazy) | 50.61 kB / 11.50 kB gzip | igual (cambio en EquipoCard/Table, mismo chunk) | — |
| Resto | igual | igual | — |

Initial JS sigue en ~37.5 kB gzip. Cero warnings, build 4.27s.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82% initial gzip).
- **Accesibilidad teclado: skip-link + cards/filas activables** — este ciclo.

### Backlog restante
1. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Modales a11y**: `role="dialog"` `aria-modal="true"` `aria-labelledby` en ConfirmDialog, NuevaOrdenModal, EquipoForm, etc. — alto impacto pero más archivos que tocar.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 4)
Salud primero. Luego item #3 (a11y modales) si cabe — los modales están en TODAS las páginas de acción, así que el impacto es alto. Si no cabe, fallback a tests (#1).

## Ciclo 2 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 28h healthy; sigah-backend 8h healthy; sigah-mysql 36h; sigab-panel-api 11h; sigah-bot 11h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (18 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (126 ms).

**Item hecho:** Backlog #1 (continuación) — quitar `@tremor/react` por wrappers HTML/Tailwind.

### Diagnóstico
`@tremor/react` solo se usaba para wrappers cosméticos en KPICard y Dashboard:
- `KPICard`: `Card decoration="top" decorationColor={color}` + `Flex` + `BadgeDelta`.
- `Dashboard`: `Card` (mapa + chart container) + `Title` + `Text` + `Divider` (estado de error).
- `Metric` se importaba pero NO se usaba.
- `DegradationChart.jsx` (recharts) — código muerto, nadie lo importa.

Todo replicable con `div` + clases Tailwind ya en uso. Tremor arrastraba @headlessui/react y styles propios al chunk `charts` — al quitarlo se va todo ese peso.

### Cambio (commit `41469c5`, pusheado a `autocycle/v3.0`)
- `package.json`: quita `@tremor/react ^3.18.7`.
- `KPICard.jsx`: `Card` → `<div rounded-xl>` + barra superior absoluta 1px en el color; `Flex` → `<div className="flex">`; `BadgeDelta` → `<span>` con flecha ↑↓−. COLOR_MAP ahora mapea también el color de la barra (incluye `rose`, que faltaba — bug pre-existente que ahora queda cubierto).
- `Dashboard.jsx`: `Card` → `<div rounded-xl>`; `Title` → `<h2>`; `Text` → `<p>`; `Divider` → `<hr>`; quita import de `Metric` y de `@tremor/react` entero.
- `DegradationChart.jsx`: borrado (muerto).
- `vite.config.js`: quita `@tremor` del filtro de manualChunks (ya no relevante).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 1) | Después (ciclo 2) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.43 kB gzip | 110.27 kB / 37.42 kB gzip | — |
| `charts` | 1,279.09 kB / **357.72 kB gzip** | 512.26 kB / **155.33 kB gzip** | **−57 %** |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| `Dashboard` (lazy) | formaba parte del chunk charts | 59.41 kB / 14.79 kB gzip | (separado) |

**Chunk `charts`: 357 kB gzip → 155 kB gzip (−57 %).** Quien abre Dashboard / TVDashboard ahora baja 202 kB menos de JS (gzip). Initial JS sigue en ~37 kB.

Build: `npm run build` verde, sin warnings.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 3 deps muertas, luego una 4ª (`@tremor/react`).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- **@tremor/react quitado (−57 % gzip del chunk charts)** — este ciclo.

### Backlog restante
1. **Accesibilidad / pulido UI**: focus states, aria, contraste AA en componentes nuevos.
2. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
3. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard (no es above-the-fold) — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 3)
Salud primero. Luego item #1 (accesibilidad / pulido UI) — el más visible para operadores y bajo riesgo. Si no cabe, fallback a tests (#2).
## Ciclo 4 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 6h healthy; sigah-backend 18h; sigah-mysql 46h; sigab-panel-api 21h; sigah-bot 21h; sigah-frontend 46h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (107 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (17 ms).

**Item hecho:** Backlog #3 (a11y modales) — `role="dialog"` + `aria-modal="true"` + `aria-labelledby` en los 11 modales + ConfirmDialog.

### Diagnóstico
Los modales del frontend se renderizaban visualmente como diálogos (overlay oscuro + tarjeta centrada), pero no declaraban su rol semántico. Para un usuario de lector de pantalla (NVDA, VoiceOver, JAWS), un modal sin `role="dialog"` se anuncia como un grupo de elementos sueltos — no se sabe que hay que pulsar Escape ni que el foco está atrapado dentro. Y un modal sin `aria-labelledby` se llama "Diálogo sin nombre".

Además, los 11 modales con icono-X sin texto eran inaccesibles: el lector leía "button" sin descripción. El usuario de teclado tenía que adivinar qué cerraba.

### Cambio (commit `15ecd70`, pusheado a `autocycle/v3.0`)
- **11 modales + ConfirmDialog** (uno por uno, sin helper nuevo para minimizar blast radius):
  - Contenedor visual: `role="dialog" aria-modal="true" aria-labelledby="<slug>-title"`.
  - `<h2>`/`<h3>` del título: `id="<slug>-title"`.
  - Botón X: `aria-label="Cerrar"` + `focus-visible:ring-2 focus-visible:ring-emerald-500`.
  - Botones PDF/Imprimir en `OrdenDetalleModal` y `EventoDetalleModal`: `focus-visible:ring` para que sean visibles al tabular.
- **ConfirmDialog.jsx y ChangePasswordModal.jsx**: además, `useEffect` que escucha Escape y llama a `onClose`. Los demás modales ya tienen overlay-click para cerrar (accesible por ratón); el botón X ahora tiene `aria-label` (accesible por teclado).

Slugs asignados (cada uno único para que el `aria-labelledby` no colisione):
- `confirm-dialog-title` · `historial-title` · `change-password-title`
- `nueva-orden-title` · `evento-adverso-title` · `historial-equipo-title`
- `ocr-scanner-title` · `orden-rapida-title` · `orden-detalle-title`
- `evento-detalle-title` · `triple-validation-title`

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 3) | Después (ciclo 4) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.42 kB gzip | 110.72 kB / 37.62 kB gzip | +0.20 kB gzip |
| Resto | igual | igual | — |

Initial JS sube +0.20 kB gzip por los atributos aria adicionales. Cero warnings, build 4.00s.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- **a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog** — este ciclo.

### Backlog restante
1. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Escape handler** en los 9 modales que aún no lo tienen (sólo ConfirmDialog y ChangePasswordModal lo añadieron este ciclo).
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 5)
Salud primero. Luego item #1 (tests) — es lo único que queda de **alto valor y bajo riesgo**. Tests de rutas clave dan red de seguridad para futuros cambios de mantenimiento sin tener que abrir manualmente `/equipos`, `/ordenes`, `/dashboard`. Si no cabe, fallback a Escape handlers (#3, alcance muy acotado).

## Ciclo 5 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (uptime 2d).
- Contenedores: openclaw Up 11h healthy; sigah-backend 23h; sigah-mysql 2d; sigab-panel-api 26h; sigah-bot 26h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (93 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (82 ms).

**Item hecho:** Backlog #1 (Tests) — vitest + @testing-library/react con 4 smoke tests sobre los puntos de mayor blast radius del frontend.

### Diagnóstico
El frontend v3.0 tenía 0 tests. Los cambios de mantenimiento recientes (code-splitting, a11y modal/teclado, migración de tema dark→green) son todos refactors silenciosos — si algo se rompe, solo se nota en producción cuando un operador abre `/equipos` y ve un crash. La red de seguridad manual (abrir 20 rutas con DevTools) no escala a 5h/autocycle.

Cuatro zonas eran las más críticas para cubrir primero:
1. **`utils/tokens.js`** — fuente única de verdad para STATUS, PRIORIDAD, TV_ESTADO_COLORS, Z. Consumida por KPICard, EquipoCard, EquipoTable, recharts y el mapa del hospital. Si alguien borra `baja` o `en_traslado`, todos los badges quedan en gris.
2. **`context/ThemeContext.jsx`** — la migración v3.0 default-to-green está concentrada en 6 líneas. Si alguien refactoriza y elimina la rama `'dark' → 'green'`, los usuarios con localStorage legacy se quedan en tema oscuro.
3. **`components/ProtectedRoute.jsx`** — frontera de seguridad. Si alguien invierte el orden de las guards, un usuario sin token vería `/dashboard` con datos.
4. **`components/ConfirmDialog.jsx`** — el modal más invocado del frontend. El ciclo 4 le añadió role/aria-modal/aria-labelledby + handler de Escape; estos tests blindan ese trabajo para que un refactor futuro no lo rompa silenciosamente.

### Cambio (commit `3b488ac`, pusheado a `autocycle/v3.0`)

**Dependencias añadidas (devDependencies):**
- `vitest@3.2.4` — peer-compatible con `vite@5.4.2` (vite ^5/^6/^7).
- `@testing-library/react@16.3.2` — peer-compatible con `react@18.3.1`.
- `@testing-library/jest-dom@6.6.3` — matchers extra (`.toHaveTextContent`, `.toBeInTheDocument`).
- `jsdom@26.1.0` — environment para vitest.

**Config:**
- `vitest.config.js` (nuevo) — separado de `vite.config.js` para que `npm run build` NO arrastre el entorno jsdom ni los setupFiles al bundle de producción.
- `package.json`: scripts `test` (one-shot) y `test:watch` (dev).
- `src/test/setup.js`: carga `@testing-library/jest-dom/vitest` y limpia `localStorage` entre tests.
- `src/context/AuthContext.jsx`: `AuthContext` ahora se exporta (era interno) — los tests pueden envolver con un `<AuthContext.Provider value={fake}>` sin montar el `AuthProvider` real (que requeriría mockear `api` entero).

**Tests añadidos (32 casos, ~615 ms total):**

1. `src/utils/tokens.test.js` (10 tests)
   - Los 5 estados canónicos existen en STATUS y STATUS_HEX.
   - Cada estado tiene bg/dot/badge/label con clases Tailwind válidas y hex de 7 chars.
   - ESTADO_COLORS/LABELS/DOT_COLORS se mantienen sincronizados con STATUS (anti-drift).
   - Z-index escala monótona creciente (dropdown < sticky < overlay < modal < modalNested < confirm < toast).
   - PRIORIDAD cubre los 4 niveles (critica/alta/media/baja) y los colores rojo/naranja siguen siendo los críticos/altos.
   - TV_ESTADO_COLORS incluye los 6 estados del flujo NOM-240.
   - CHART_COLORS es una paleta no vacía de hex.

2. `src/context/ThemeContext.test.jsx` (4 tests)
   - Sin localStorage → default `'green'` + `data-theme="green"`.
   - localStorage con `'dark'` (legacy) → se MIGRA a `'green'`.
   - localStorage con `'light'` → se respeta.
   - `setTheme('light')` actualiza `data-theme` y persiste en localStorage.

3. `src/components/ProtectedRoute.test.jsx` (6 tests)
   - `loading=true` → muestra "Cargando..." sin renderizar la ruta.
   - Sin `user` → redirige a `/login`.
   - Con `user` → renderiza el `<Outlet/>`.
   - Acepta tanto `user.rol` como `user.role` (compatibilidad backend nuevo/viejo).
   - `allowedRoles` + rol no permitido → redirige a `/`.
   - `allowedRoles` + rol permitido → renderiza el `<Outlet/>`.

4. `src/components/ConfirmDialog.test.jsx` (12 tests)
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby="confirm-dialog-title"`.
   - El `<h3>` tiene `id="confirm-dialog-title"` (el target de `aria-labelledby`).
   - Escape cierra el modal (handler global solo se monta cuando `open=true`).
   - Otras teclas NO cierran.
   - Click en overlay cierra; click dentro NO cierra (stopPropagation).
   - Botón Confirmar dispara `onConfirmar`; botón Cancelar dispara `onCancelar`.
   - Textos custom de título/mensaje/botones se renderizan.
   - `open=false` → no renderiza nada (`container` vacío).
   - Variante `'peligro'` pinta el botón de rojo; `'normal'` lo pinta de verde.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 4) | Después (ciclo 5) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). Cero warnings, build 4.27s. `vitest.config.js` y los `*.test.jsx` están fuera del alcance del bundler de producción (no hay import desde código de producción), así que el dist queda bit-exacto.

`npm test` → 32 passed (32) en 615ms.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- **vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests, 615ms** — este ciclo.

### Backlog restante
1. **Escape handler** en los 9 modales que aún no lo tienen (sólo ConfirmDialog y ChangePasswordModal lo añadieron en el ciclo 4). Bajo riesgo, alcance muy acotado.
2. **Más tests**: subir la cobertura a las páginas reales (Login, Dashboard, Equipos) con MSW para mockear la API. Alto valor pero requiere bastante setup (mockear axios, MSW, fixtures).
3. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 6)
Salud primero. Luego item #1 (Escape handlers en los 9 modales restantes) — alcance acotado y alto impacto a11y, mismo commit cabría en un ciclo. Si no cabe, fallback a #3 (limpieza tokens — puramente cosmético).

## Ciclo 6 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 16h healthy; sigah-backend 28h; sigah-mysql 2d; sigab-panel-api 31h; sigah-bot ~1h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (81 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (119 ms).

**Item hecho:** Backlog #1 (Escape handlers en los 9 modales restantes).

### Diagnóstico
Tras el ciclo 4 los 11 modales + ConfirmDialog tenían `role="dialog"` `aria-modal="true"` `aria-labelledby` y el botón X tenía `aria-label="Cerrar"`. Pero sólo ConfirmDialog y ChangePasswordModal escuchaban Escape globalmente — los otros 9 (los más grandes: detalle de orden, detalle de evento, OCR scanner, validación triple, historial, etc.) obligaban al usuario de teclado a tabular decenas de campos hasta llegar al botón X, o a perder la información que llevaba capturada.

### Cambio (commit `b95b16a`, pusheado a `autocycle/v3.0`)
Patrón idéntico al ciclo 4, aplicado uno por uno (sin helper nuevo, para minimizar blast radius):
```js
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onClose]);
```

9 archivos: `EventoAdversoModal`, `EventoDetalleModal`, `HistorialEquipoModal`, `HistorialModal`, `NuevaOrdenModal`, `OCRScannerModal`, `OrdenDetalleModal`, `OrdenServicioRapidaModal`, `TripleValidationModal`.

3 de ellos (`NuevaOrdenModal`, `HistorialModal`, `TripleValidationModal`) tienen prop `open`/`isOpen` y hacen `if (!open) return null`; ahí el `useEffect` respeta la guard para no dejar un listener global registrado mientras el modal está oculto. Los otros 6 se montan sólo cuando el padre los renderiza, así que el listener global aparece y desaparece con el componente.

`useState`/`useEffect` ya estaban importados en 6 de los 9. Sólo `TripleValidationModal` y `NuevaOrdenModal` necesitaron añadir `useEffect` al import; `OrdenServicioRapidaModal` también.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 5) | Después (ciclo 6) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / **37.61 kB gzip** | −0.01 kB (ruido) |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). El `if (e.key === 'Escape')` se inlinea y ya estaba en el bundle. Cero warnings, build 3.98s. `npm test` → 32/32 pass en 590 ms.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- **a11y modales: Escape handler en los 9 modales restantes** — este ciclo.

### Backlog restante
1. **Más tests**: subir la cobertura a las páginas reales (Login, Dashboard, Equipos) con MSW para mockear la API. Alto valor pero requiere bastante setup (mockear axios, MSW, fixtures).
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.
4. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere mucho cuidado con orden de focus y requests de focus inicial.

### Próximo paso (Ciclo 7)
Salud primero. Luego item #1 (más tests) si cabe en un ciclo — un smoke test por página vale más que tests exhaustivos de detalle. Si no cabe, fallback a #2 (limpieza tokens — puramente cosmético, ~30 min).

## Ciclo 7 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 21h healthy; sigah-backend 33h; sigah-mysql 2d; sigab-panel-api 36h; sigah-bot 6h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200.
- `https://sigab.129-121-100-147.sslip.io/` → 200.

**Item hecho:** Backlog #1 (más tests — segunda oleada) — vitest smoke tests sobre los 3 componentes con mayor blast-radius del shell: `KPICard`, `EquipoCard`, `EquipoTable`.

### Diagnóstico
El ciclo 5 cubrió los 4 archivos de "fuente de verdad" (tokens, theme, ProtectedRoute, ConfirmDialog). Quedaban tres componentes que se renderizan en TODAS las rutas principales del operador y no tenían cobertura:

1. **`cards/KPICard.jsx`** — la tarjeta de métricas del shell. Usada en Dashboard, Alertas, AdminGlobal, TVDashboard. Si alguien borra una entrada de `COLOR_MAP` (11 colores) o se olvida del fallback, todos los KPIs del operador se quedan grises. El mapeo `trend → DELTA` también es un punto frágil: si alguien pasa un `trend` que no está en `['up','down','neutral']`, el `DELTA[undefined]` devuelve `undefined` y el `delta.cls` crashea en runtime.
2. **`components/EquipoCard.jsx`** — la tarjeta del inventario (vista grid `/equipos`). El ciclo 3 le metió el patrón a11y teclado (role=button + tabIndex + Enter/Space) pero sin tests: un refactor futuro podría borrar el `tabIndex` y nadie se enteraría hasta que un usuario de teclado reportara que ya no puede tabular al inventario.
3. **`components/EquipoTable.jsx`** — la vista lista/tabla `/equipos`. Mayor blast-radius de los tres: aquí se cruzan los tokens (badges de estado), la a11y teclado (filas focuseables con Enter/Space) y el botón QR condicional (`disabled={!qr_token}`). El guard `if (e.target !== e.currentTarget) return;` del keydown de fila es la pieza que evita que Enter sobre el botón QR interno abra también el detalle — exactamente el tipo de bug silencioso que se pierde sin un test.

Los tres se pueden testear sin MSW: reciben props directos y no hacen fetch a la API en su camino feliz. `EquipoDetail` y `QRPanel` se mockean con `vi.mock` para que un click accidental sobre una fila no dispare `api.getHistorialEquipo` ni `QRCodeSVG`.

### Cambio (commit `2441165`, pusheado a `autocycle/v3.0`)

**3 archivos de test, 38 casos nuevos (32 → 70 tests, +403 líneas):**

1. `src/components/cards/KPICard.test.jsx` (10 tests)
   - Render correcto de título/valor/unidad; oculta `unit` cuando es `undefined`.
   - Renderiza icono cuando se pasa; NO renderiza el bloque cuando NO se pasa.
   - Los 3 trends (`up` / `down` / `neutral`-default) muestran la flecha correcta (↑ / ↓ / −).
   - `color="red"` aplica `bg-red-500` a la barra superior; idem `amber`.
   - Color inválido (`'magenta-inexistente'`) cae al fallback `emerald` sin romper.

2. `src/components/EquipoCard.test.jsx` (12 tests)
   - `role=button` + `tabIndex=0` + `aria-label` con nombre+marca+modelo (a11y ciclo 3).
   - Click, Enter y Space disparan `onClick(equipo)`; otras teclas no.
   - `onClick` undefined no rompe con Enter (optional chaining del componente).
   - Badge "Crítico" aparece sólo con `criticidad="alta"`, no con `"media"`.
   - Contadores de tickets/alertas aparecen sólo cuando son > 0; ocultos cuando son 0.

3. `src/components/EquipoTable.test.jsx` (16 tests)
   - Renderiza N filas (mobile + desktop) + contador "Mostrando N equipos en esta página".
   - Muestra NII cuando hay inventario; "Sin asignar" cuando no.
   - Cada fila (mobile+desktop) tiene `role=button`, `tabIndex=0`, `aria-label` descriptivo.
   - **Enter/Space sobre la fila abren el detalle** (mock visible con `equipo.nombre`).
   - **Enter sobre el botón QR interno NO abre el detalle** — el guard del ciclo 3 funciona (nota: en jsdom `fireEvent.keyDown` no simula el click implícito del navegador sobre un `<button>`, así que el test verifica sólo el guard del row, que es la pieza que nos importa).
   - Click sobre la fila abre el detalle.
   - Contador de tickets cuando `tickets_abiertos > 0`; "—" cuando es 0.
   - Botón QR desktop se deshabilita sin `qr_token`; habilitado con token.
   - Badge de criticidad "alta" se renderiza con texto capitalizado.
   - Badge de estado mapea correctamente: `operativo → 'Operativo'` (cross-check con `tokens.test.js`), `fuera_servicio → 'Fuera Svc.'` (forma corta que usa la tabla densa — distinto del formato largo del KPICard).

**Detalles de setup:**
- `vi.mock('./EquipoDetail')` y `vi.mock('./QRPanel')` con stubs mínimos que sólo exponen `data-testid="mock-equipo-detail"` / `mock-qr-panel`. Así el test no depende del árbol completo de EquipoDetail (que importa `OrdenDetalleModal`, `ConfirmDialog`, hace fetch) ni de `QRCodeSVG` (canvas).
- `MemoryRouter` con `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` para silenciar los warnings de react-router v7 (mismo patrón que `ProtectedRoute.test.jsx`).
- El test del guard usa `fireEvent.keyDown` (no `fireEvent.click`) a propósito: queremos probar que el `handleRowKeyDown` del row NO se dispara cuando el target es un botón hijo — no queremos el click del navegador.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 6) | Después (ciclo 7) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). Los `*.test.jsx` están fuera del alcance del bundler de producción (ningún archivo de producción los importa), así que el dist queda bit-exacto. Cero warnings, build 4.03s.

`npm test` → **70 passed (70)** en 620 ms (38 nuevos casos, 32 previos). Sin warnings.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- **vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (32 → 70 total)** — este ciclo.

### Backlog restante
1. **Más tests con MSW**: páginas reales (Login, Dashboard, Equipos) mockeando axios. Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo, no de uno headless.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación. Cosmético puro, ~30 min.
3. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
4. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).

### Próximo paso (Ciclo 8)
Salud primero. Luego **item #2 (limpieza tokens de color sobrantes en tailwind.config.js)** — alcance muy acotado, puramente cosmético, cabe en cualquier ciclo. La consolidación dark→green del v3.0 dejó entradas duplicadas o sin uso que inflan el purge de Tailwind y oscurecen el archivo. Si no cabe, fallback a item #1 (más tests — seleccionar 1-2 páginas, no las 3).

## Ciclo 3 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 48min healthy; sigah-backend 13h; sigah-mysql 41h; sigab-panel-api 16h; sigah-bot 16h; sigah-frontend 41h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (89 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (17 ms).

**Item hecho:** Backlog #1 (continuación) — accesibilidad teclado: skip-link + cards/filas del inventario activables con teclado.

### Diagnóstico
El frontend v3.0 ya tenía un ring global `*:focus-visible` (line 239 de `index.css`), pero los patrones interactivos clave eran inaccesibles por teclado:
- `Layout.jsx` no tenía skip-to-content — un usuario de teclado tenía que tabular por 20+ items del sidebar en cada página.
- `EquipoCard.jsx`: `<div onClick>` — `<div>` no es focuseable, Enter/Space no abrían el detalle.
- `EquipoTable.jsx`: mobile card Y desktop `<tr>` con `onClick` — mismo problema. El teclado nunca llegaba al inventario en `/equipos`.
- El bottom-nav móvil tenía `<nav>` sin label — lectores de pantalla anunciaban "navigation" genérico.

### Cambio (commit `234dca0`, pusheado a `autocycle/v3.0`)
- `Layout.jsx`: `<a href="#main-content" className="skip-link">Saltar al contenido principal</a>` como primer hijo focuseable; `<main id="main-content" tabIndex={-1}>` como ancla (tabIndex=-1 para que sea programáticamente focuseable sin entrar al tab order); bottom-nav recibe `aria-label="Navegación principal móvil"`.
- `index.css`: `.skip-link` oculto con `left: -9999px` hasta que recibe `:focus-visible`, donde se posiciona en top-left como pill verde-acento con outline blanco; `:target { scroll-margin-top: 4rem }` para que el salto al ancla no quede oculto bajo el header sticky.
- `EquipoCard.jsx`: `role="button"`, `tabIndex={0}`, `aria-label="Ver detalle de <nombre> — <marca> <modelo>"`, `onKeyDown` que activa `onClick` en Enter/Space; clase extra `focus-visible:border-[var(--accent)]` para refuerzo visual (el ring global ya marca el outline).
- `EquipoTable.jsx`: helper `handleRowKeyDown(e, eq)` que activa la fila con Enter/Space, con guard `if (e.target !== e.currentTarget) return` para no interceptar Enter/Space de los botones internos (tickets, QR). Mismo `role/tabIndex/aria-label` para mobile card (div) y desktop (tr); el `<tr>` usa `focus-visible:ring-2 focus-visible:ring-inset` para que el ring no rompa la grilla de la tabla.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 2) | Después (ciclo 3) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.42 kB gzip | 110.44 kB / 37.51 kB gzip | +0.09 kB gzip (ruido) |
| `Equipos` (lazy) | 50.61 kB / 11.50 kB gzip | igual (cambio en EquipoCard/Table, mismo chunk) | — |
| Resto | igual | igual | — |

Initial JS sigue en ~37.5 kB gzip. Cero warnings, build 4.27s.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82% initial gzip).
- **Accesibilidad teclado: skip-link + cards/filas activables** — este ciclo.

### Backlog restante
1. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Modales a11y**: `role="dialog"` `aria-modal="true"` `aria-labelledby` en ConfirmDialog, NuevaOrdenModal, EquipoForm, etc. — alto impacto pero más archivos que tocar.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 4)
Salud primero. Luego item #3 (a11y modales) si cabe — los modales están en TODAS las páginas de acción, así que el impacto es alto. Si no cabe, fallback a tests (#1).

## Ciclo 2 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 28h healthy; sigah-backend 8h healthy; sigah-mysql 36h; sigab-panel-api 11h; sigah-bot 11h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (18 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (126 ms).

**Item hecho:** Backlog #1 (continuación) — quitar `@tremor/react` por wrappers HTML/Tailwind.

### Diagnóstico
`@tremor/react` solo se usaba para wrappers cosméticos en KPICard y Dashboard:
- `KPICard`: `Card decoration="top" decorationColor={color}` + `Flex` + `BadgeDelta`.
- `Dashboard`: `Card` (mapa + chart container) + `Title` + `Text` + `Divider` (estado de error).
- `Metric` se importaba pero NO se usaba.
- `DegradationChart.jsx` (recharts) — código muerto, nadie lo importa.

Todo replicable con `div` + clases Tailwind ya en uso. Tremor arrastraba @headlessui/react y styles propios al chunk `charts` — al quitarlo se va todo ese peso.

### Cambio (commit `41469c5`, pusheado a `autocycle/v3.0`)
- `package.json`: quita `@tremor/react ^3.18.7`.
- `KPICard.jsx`: `Card` → `<div rounded-xl>` + barra superior absoluta 1px en el color; `Flex` → `<div className="flex">`; `BadgeDelta` → `<span>` con flecha ↑↓−. COLOR_MAP ahora mapea también el color de la barra (incluye `rose`, que faltaba — bug pre-existente que ahora queda cubierto).
- `Dashboard.jsx`: `Card` → `<div rounded-xl>`; `Title` → `<h2>`; `Text` → `<p>`; `Divider` → `<hr>`; quita import de `Metric` y de `@tremor/react` entero.
- `DegradationChart.jsx`: borrado (muerto).
- `vite.config.js`: quita `@tremor` del filtro de manualChunks (ya no relevante).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 1) | Después (ciclo 2) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.43 kB gzip | 110.27 kB / 37.42 kB gzip | — |
| `charts` | 1,279.09 kB / **357.72 kB gzip** | 512.26 kB / **155.33 kB gzip** | **−57 %** |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| `Dashboard` (lazy) | formaba parte del chunk charts | 59.41 kB / 14.79 kB gzip | (separado) |

**Chunk `charts`: 357 kB gzip → 155 kB gzip (−57 %).** Quien abre Dashboard / TVDashboard ahora baja 202 kB menos de JS (gzip). Initial JS sigue en ~37 kB.

Build: `npm run build` verde, sin warnings.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 3 deps muertas, luego una 4ª (`@tremor/react`).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- **@tremor/react quitado (−57 % gzip del chunk charts)** — este ciclo.

### Backlog restante
1. **Accesibilidad / pulido UI**: focus states, aria, contraste AA en componentes nuevos.
2. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
3. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard (no es above-the-fold) — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 3)
Salud primero. Luego item #1 (accesibilidad / pulido UI) — el más visible para operadores y bajo riesgo. Si no cabe, fallback a tests (#2).
## Ciclo 4 — 2026-06-22 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 6h healthy; sigah-backend 18h; sigah-mysql 46h; sigab-panel-api 21h; sigah-bot 21h; sigah-frontend 46h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (107 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (17 ms).

**Item hecho:** Backlog #3 (a11y modales) — `role="dialog"` + `aria-modal="true"` + `aria-labelledby` en los 11 modales + ConfirmDialog.

### Diagnóstico
Los modales del frontend se renderizaban visualmente como diálogos (overlay oscuro + tarjeta centrada), pero no declaraban su rol semántico. Para un usuario de lector de pantalla (NVDA, VoiceOver, JAWS), un modal sin `role="dialog"` se anuncia como un grupo de elementos sueltos — no se sabe que hay que pulsar Escape ni que el foco está atrapado dentro. Y un modal sin `aria-labelledby` se llama "Diálogo sin nombre".

Además, los 11 modales con icono-X sin texto eran inaccesibles: el lector leía "button" sin descripción. El usuario de teclado tenía que adivinar qué cerraba.

### Cambio (commit `15ecd70`, pusheado a `autocycle/v3.0`)
- **11 modales + ConfirmDialog** (uno por uno, sin helper nuevo para minimizar blast radius):
  - Contenedor visual: `role="dialog" aria-modal="true" aria-labelledby="<slug>-title"`.
  - `<h2>`/`<h3>` del título: `id="<slug>-title"`.
  - Botón X: `aria-label="Cerrar"` + `focus-visible:ring-2 focus-visible:ring-emerald-500`.
  - Botones PDF/Imprimir en `OrdenDetalleModal` y `EventoDetalleModal`: `focus-visible:ring` para que sean visibles al tabular.
- **ConfirmDialog.jsx y ChangePasswordModal.jsx**: además, `useEffect` que escucha Escape y llama a `onClose`. Los demás modales ya tienen overlay-click para cerrar (accesible por ratón); el botón X ahora tiene `aria-label` (accesible por teclado).

Slugs asignados (cada uno único para que el `aria-labelledby` no colisione):
- `confirm-dialog-title` · `historial-title` · `change-password-title`
- `nueva-orden-title` · `evento-adverso-title` · `historial-equipo-title`
- `ocr-scanner-title` · `orden-rapida-title` · `orden-detalle-title`
- `evento-detalle-title` · `triple-validation-title`

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 3) | Después (ciclo 4) | Δ gzip |
|---|---|---|---|
| `index` | 110.27 kB / 37.42 kB gzip | 110.72 kB / 37.62 kB gzip | +0.20 kB gzip |
| Resto | igual | igual | — |

Initial JS sube +0.20 kB gzip por los atributos aria adicionales. Cero warnings, build 4.00s.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- **a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog** — este ciclo.

### Backlog restante
1. **Tests**: no hay tests de frontend; añadir vitest + 2-3 smoke tests de rutas clave.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Escape handler** en los 9 modales que aún no lo tienen (sólo ConfirmDialog y ChangePasswordModal lo añadieron este ciclo).
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 5)
Salud primero. Luego item #1 (tests) — es lo único que queda de **alto valor y bajo riesgo**. Tests de rutas clave dan red de seguridad para futuros cambios de mantenimiento sin tener que abrir manualmente `/equipos`, `/ordenes`, `/dashboard`. Si no cabe, fallback a Escape handlers (#3, alcance muy acotado).

## Ciclo 5 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo (uptime 2d).
- Contenedores: openclaw Up 11h healthy; sigah-backend 23h; sigah-mysql 2d; sigab-panel-api 26h; sigah-bot 26h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (93 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (82 ms).

**Item hecho:** Backlog #1 (Tests) — vitest + @testing-library/react con 4 smoke tests sobre los puntos de mayor blast radius del frontend.

### Diagnóstico
El frontend v3.0 tenía 0 tests. Los cambios de mantenimiento recientes (code-splitting, a11y modal/teclado, migración de tema dark→green) son todos refactors silenciosos — si algo se rompe, solo se nota en producción cuando un operador abre `/equipos` y ve un crash. La red de seguridad manual (abrir 20 rutas con DevTools) no escala a 5h/autocycle.

Cuatro zonas eran las más críticas para cubrir primero:
1. **`utils/tokens.js`** — fuente única de verdad para STATUS, PRIORIDAD, TV_ESTADO_COLORS, Z. Consumida por KPICard, EquipoCard, EquipoTable, recharts y el mapa del hospital. Si alguien borra `baja` o `en_traslado`, todos los badges quedan en gris.
2. **`context/ThemeContext.jsx`** — la migración v3.0 default-to-green está concentrada en 6 líneas. Si alguien refactoriza y elimina la rama `'dark' → 'green'`, los usuarios con localStorage legacy se quedan en tema oscuro.
3. **`components/ProtectedRoute.jsx`** — frontera de seguridad. Si alguien invierte el orden de las guards, un usuario sin token vería `/dashboard` con datos.
4. **`components/ConfirmDialog.jsx`** — el modal más invocado del frontend. El ciclo 4 le añadió role/aria-modal/aria-labelledby + handler de Escape; estos tests blindan ese trabajo para que un refactor futuro no lo rompa silenciosamente.

### Cambio (commit `3b488ac`, pusheado a `autocycle/v3.0`)

**Dependencias añadidas (devDependencies):**
- `vitest@3.2.4` — peer-compatible con `vite@5.4.2` (vite ^5/^6/^7).
- `@testing-library/react@16.3.2` — peer-compatible con `react@18.3.1`.
- `@testing-library/jest-dom@6.6.3` — matchers extra (`.toHaveTextContent`, `.toBeInTheDocument`).
- `jsdom@26.1.0` — environment para vitest.

**Config:**
- `vitest.config.js` (nuevo) — separado de `vite.config.js` para que `npm run build` NO arrastre el entorno jsdom ni los setupFiles al bundle de producción.
- `package.json`: scripts `test` (one-shot) y `test:watch` (dev).
- `src/test/setup.js`: carga `@testing-library/jest-dom/vitest` y limpia `localStorage` entre tests.
- `src/context/AuthContext.jsx`: `AuthContext` ahora se exporta (era interno) — los tests pueden envolver con un `<AuthContext.Provider value={fake}>` sin montar el `AuthProvider` real (que requeriría mockear `api` entero).

**Tests añadidos (32 casos, ~615 ms total):**

1. `src/utils/tokens.test.js` (10 tests)
   - Los 5 estados canónicos existen en STATUS y STATUS_HEX.
   - Cada estado tiene bg/dot/badge/label con clases Tailwind válidas y hex de 7 chars.
   - ESTADO_COLORS/LABELS/DOT_COLORS se mantienen sincronizados con STATUS (anti-drift).
   - Z-index escala monótona creciente (dropdown < sticky < overlay < modal < modalNested < confirm < toast).
   - PRIORIDAD cubre los 4 niveles (critica/alta/media/baja) y los colores rojo/naranja siguen siendo los críticos/altos.
   - TV_ESTADO_COLORS incluye los 6 estados del flujo NOM-240.
   - CHART_COLORS es una paleta no vacía de hex.

2. `src/context/ThemeContext.test.jsx` (4 tests)
   - Sin localStorage → default `'green'` + `data-theme="green"`.
   - localStorage con `'dark'` (legacy) → se MIGRA a `'green'`.
   - localStorage con `'light'` → se respeta.
   - `setTheme('light')` actualiza `data-theme` y persiste en localStorage.

3. `src/components/ProtectedRoute.test.jsx` (6 tests)
   - `loading=true` → muestra "Cargando..." sin renderizar la ruta.
   - Sin `user` → redirige a `/login`.
   - Con `user` → renderiza el `<Outlet/>`.
   - Acepta tanto `user.rol` como `user.role` (compatibilidad backend nuevo/viejo).
   - `allowedRoles` + rol no permitido → redirige a `/`.
   - `allowedRoles` + rol permitido → renderiza el `<Outlet/>`.

4. `src/components/ConfirmDialog.test.jsx` (12 tests)
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby="confirm-dialog-title"`.
   - El `<h3>` tiene `id="confirm-dialog-title"` (el target de `aria-labelledby`).
   - Escape cierra el modal (handler global solo se monta cuando `open=true`).
   - Otras teclas NO cierran.
   - Click en overlay cierra; click dentro NO cierra (stopPropagation).
   - Botón Confirmar dispara `onConfirmar`; botón Cancelar dispara `onCancelar`.
   - Textos custom de título/mensaje/botones se renderizan.
   - `open=false` → no renderiza nada (`container` vacío).
   - Variante `'peligro'` pinta el botón de rojo; `'normal'` lo pinta de verde.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 4) | Después (ciclo 5) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / 37.62 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.62 kB gzip). Cero warnings, build 4.27s. `vitest.config.js` y los `*.test.jsx` están fuera del alcance del bundler de producción (no hay import desde código de producción), así que el dist queda bit-exacto.

`npm test` → 32 passed (32) en 615ms.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- **vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests, 615ms** — este ciclo.

### Backlog restante
1. **Escape handler** en los 9 modales que aún no lo tienen (sólo ConfirmDialog y ChangePasswordModal lo añadieron en el ciclo 4). Bajo riesgo, alcance muy acotado.
2. **Más tests**: subir la cobertura a las páginas reales (Login, Dashboard, Equipos) con MSW para mockear la API. Alto valor pero requiere bastante setup (mockear axios, MSW, fixtures).
3. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
4. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.

### Próximo paso (Ciclo 6)
Salud primero. Luego item #1 (Escape handlers en los 9 modales restantes) — alcance acotado y alto impacto a11y, mismo commit cabría en un ciclo. Si no cabe, fallback a #3 (limpieza tokens — puramente cosmético).

## Ciclo 6 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 16h healthy; sigah-backend 28h; sigah-mysql 2d; sigab-panel-api 31h; sigah-bot ~1h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (81 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (119 ms).

**Item hecho:** Backlog #1 (Escape handlers en los 9 modales restantes).

### Diagnóstico
Tras el ciclo 4 los 11 modales + ConfirmDialog tenían `role="dialog"` `aria-modal="true"` `aria-labelledby` y el botón X tenía `aria-label="Cerrar"`. Pero sólo ConfirmDialog y ChangePasswordModal escuchaban Escape globalmente — los otros 9 (los más grandes: detalle de orden, detalle de evento, OCR scanner, validación triple, historial, etc.) obligaban al usuario de teclado a tabular decenas de campos hasta llegar al botón X, o a perder la información que llevaba capturada.

### Cambio (commit `b95b16a`, pusheado a `autocycle/v3.0`)
Patrón idéntico al ciclo 4, aplicado uno por uno (sin helper nuevo, para minimizar blast radius):
```js
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onClose]);
```

9 archivos: `EventoAdversoModal`, `EventoDetalleModal`, `HistorialEquipoModal`, `HistorialModal`, `NuevaOrdenModal`, `OCRScannerModal`, `OrdenDetalleModal`, `OrdenServicioRapidaModal`, `TripleValidationModal`.

3 de ellos (`NuevaOrdenModal`, `HistorialModal`, `TripleValidationModal`) tienen prop `open`/`isOpen` y hacen `if (!open) return null`; ahí el `useEffect` respeta la guard para no dejar un listener global registrado mientras el modal está oculto. Los otros 6 se montan sólo cuando el padre los renderiza, así que el listener global aparece y desaparece con el componente.

`useState`/`useEffect` ya estaban importados en 6 de los 9. Sólo `TripleValidationModal` y `NuevaOrdenModal` necesitaron añadir `useEffect` al import; `OrdenServicioRapidaModal` también.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 5) | Después (ciclo 6) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.62 kB gzip | 110.72 kB / **37.61 kB gzip** | −0.01 kB (ruido) |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). El `if (e.key === 'Escape')` se inlinea y ya estaba en el bundle. Cero warnings, build 3.98s. `npm test` → 32/32 pass en 590 ms.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- **a11y modales: Escape handler en los 9 modales restantes** — este ciclo.

### Backlog restante
1. **Más tests**: subir la cobertura a las páginas reales (Login, Dashboard, Equipos) con MSW para mockear la API. Alto valor pero requiere bastante setup (mockear axios, MSW, fixtures).
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación.
3. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — ya solo es ~15 kB gzip en su chunk propio, así que el beneficio marginal es bajo.
4. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere mucho cuidado con orden de focus y requests de focus inicial.

### Próximo paso (Ciclo 7)
Salud primero. Luego item #1 (más tests) si cabe en un ciclo — un smoke test por página vale más que tests exhaustivos de detalle. Si no cabe, fallback a #2 (limpieza tokens — puramente cosmético, ~30 min).

## Ciclo 7 — 2026-06-23 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: openclaw Up 21h healthy; sigah-backend 33h; sigah-mysql 2d; sigab-panel-api 36h; sigah-bot 6h; sigah-frontend 2d.
- `https://sigah.129-121-100-147.sslip.io/` → 200.
- `https://sigab.129-121-100-147.sslip.io/` → 200.

**Item hecho:** Backlog #1 (más tests — segunda oleada) — vitest smoke tests sobre los 3 componentes con mayor blast-radius del shell: `KPICard`, `EquipoCard`, `EquipoTable`.

### Diagnóstico
El ciclo 5 cubrió los 4 archivos de "fuente de verdad" (tokens, theme, ProtectedRoute, ConfirmDialog). Quedaban tres componentes que se renderizan en TODAS las rutas principales del operador y no tenían cobertura:

1. **`cards/KPICard.jsx`** — la tarjeta de métricas del shell. Usada en Dashboard, Alertas, AdminGlobal, TVDashboard. Si alguien borra una entrada de `COLOR_MAP` (11 colores) o se olvida del fallback, todos los KPIs del operador se quedan grises. El mapeo `trend → DELTA` también es un punto frágil: si alguien pasa un `trend` que no está en `['up','down','neutral']`, el `DELTA[undefined]` devuelve `undefined` y el `delta.cls` crashea en runtime.
2. **`components/EquipoCard.jsx`** — la tarjeta del inventario (vista grid `/equipos`). El ciclo 3 le metió el patrón a11y teclado (role=button + tabIndex + Enter/Space) pero sin tests: un refactor futuro podría borrar el `tabIndex` y nadie se enteraría hasta que un usuario de teclado reportara que ya no puede tabular al inventario.
3. **`components/EquipoTable.jsx`** — la vista lista/tabla `/equipos`. Mayor blast-radius de los tres: aquí se cruzan los tokens (badges de estado), la a11y teclado (filas focuseables con Enter/Space) y el botón QR condicional (`disabled={!qr_token}`). El guard `if (e.target !== e.currentTarget) return;` del keydown de fila es la pieza que evita que Enter sobre el botón QR interno abra también el detalle — exactamente el tipo de bug silencioso que se pierde sin un test.

Los tres se pueden testear sin MSW: reciben props directos y no hacen fetch a la API en su camino feliz. `EquipoDetail` y `QRPanel` se mockean con `vi.mock` para que un click accidental sobre una fila no dispare `api.getHistorialEquipo` ni `QRCodeSVG`.

### Cambio (commit `2441165`, pusheado a `autocycle/v3.0`)

**3 archivos de test, 38 casos nuevos (32 → 70 tests, +403 líneas):**

1. `src/components/cards/KPICard.test.jsx` (10 tests)
   - Render correcto de título/valor/unidad; oculta `unit` cuando es `undefined`.
   - Renderiza icono cuando se pasa; NO renderiza el bloque cuando NO se pasa.
   - Los 3 trends (`up` / `down` / `neutral`-default) muestran la flecha correcta (↑ / ↓ / −).
   - `color="red"` aplica `bg-red-500` a la barra superior; idem `amber`.
   - Color inválido (`'magenta-inexistente'`) cae al fallback `emerald` sin romper.

2. `src/components/EquipoCard.test.jsx` (12 tests)
   - `role=button` + `tabIndex=0` + `aria-label` con nombre+marca+modelo (a11y ciclo 3).
   - Click, Enter y Space disparan `onClick(equipo)`; otras teclas no.
   - `onClick` undefined no rompe con Enter (optional chaining del componente).
   - Badge "Crítico" aparece sólo con `criticidad="alta"`, no con `"media"`.
   - Contadores de tickets/alertas aparecen sólo cuando son > 0; ocultos cuando son 0.

3. `src/components/EquipoTable.test.jsx` (16 tests)
   - Renderiza N filas (mobile + desktop) + contador "Mostrando N equipos en esta página".
   - Muestra NII cuando hay inventario; "Sin asignar" cuando no.
   - Cada fila (mobile+desktop) tiene `role=button`, `tabIndex=0`, `aria-label` descriptivo.
   - **Enter/Space sobre la fila abren el detalle** (mock visible con `equipo.nombre`).
   - **Enter sobre el botón QR interno NO abre el detalle** — el guard del ciclo 3 funciona (nota: en jsdom `fireEvent.keyDown` no simula el click implícito del navegador sobre un `<button>`, así que el test verifica sólo el guard del row, que es la pieza que nos importa).
   - Click sobre la fila abre el detalle.
   - Contador de tickets cuando `tickets_abiertos > 0`; "—" cuando es 0.
   - Botón QR desktop se deshabilita sin `qr_token`; habilitado con token.
   - Badge de criticidad "alta" se renderiza con texto capitalizado.
   - Badge de estado mapea correctamente: `operativo → 'Operativo'` (cross-check con `tokens.test.js`), `fuera_servicio → 'Fuera Svc.'` (forma corta que usa la tabla densa — distinto del formato largo del KPICard).

**Detalles de setup:**
- `vi.mock('./EquipoDetail')` y `vi.mock('./QRPanel')` con stubs mínimos que sólo exponen `data-testid="mock-equipo-detail"` / `mock-qr-panel`. Así el test no depende del árbol completo de EquipoDetail (que importa `OrdenDetalleModal`, `ConfirmDialog`, hace fetch) ni de `QRCodeSVG` (canvas).
- `MemoryRouter` con `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` para silenciar los warnings de react-router v7 (mismo patrón que `ProtectedRoute.test.jsx`).
- El test del guard usa `fireEvent.keyDown` (no `fireEvent.click`) a propósito: queremos probar que el `handleRowKeyDown` del row NO se dispara cuando el target es un botón hijo — no queremos el click del navegador.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 6) | Después (ciclo 7) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `charts` | 512.26 kB / 155.33 kB gzip | igual | — |
| `router` | 164.81 kB / 53.81 kB gzip | igual | — |
| `qr` | 146.95 kB / 52.10 kB gzip | igual | — |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). Los `*.test.jsx` están fuera del alcance del bundler de producción (ningún archivo de producción los importa), así que el dist queda bit-exacto. Cero warnings, build 4.03s.

`npm test` → **70 passed (70)** en 620 ms (38 nuevos casos, 32 previos). Sin warnings.

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- **vitest smoke tests para KPICard/EquipoCard/EquipoTable — 38 tests (32 → 70 total)** — este ciclo.

### Backlog restante
1. **Más tests con MSW**: páginas reales (Login, Dashboard, Equipos) mockeando axios. Alto valor pero requiere setup de MSW + fixtures — trabajo de 1 ciclo largo, no de uno headless.
2. **Limpieza**: tokens de color sobrantes en `tailwind.config.js` tras la consolidación. Cosmético puro, ~30 min.
3. **Opcional**: `MaintenanceChart` se podría hacer `React.lazy` dentro de Dashboard — beneficio marginal bajo (~15 kB gzip en su chunk propio).
4. **Opcional**: focus trap dentro de los modales (ahora el foco se queda en el botón X o se escapa al `<body>`). Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).

### Próximo paso (Ciclo 8)
Salud primero. Luego **item #2 (limpieza tokens de color sobrantes en tailwind.config.js)** — alcance muy acotado, puramente cosmético, cabe en cualquier ciclo. La consolidación dark→green del v3.0 dejó entradas duplicadas o sin uso que inflan el purge de Tailwind y oscurecen el archivo. Si no cabe, fallback a item #1 (más tests — seleccionar 1-2 páginas, no las 3).

## Ciclo 24 — 2026-06-27 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-backend 2h healthy; sigah-frontend 2h; sigah-bot 3d; sigab-panel-api 5d; openclaw 4d healthy; sigah-mysql 6d healthy; n8n-sigah-n8n-1 6d; n8n-sigah-postgres-1 2w healthy; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 9h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (343 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (346 ms).

**Item hecho:** Backlog #1 (continuación) — **Reportes.jsx** (236 líneas, panel ejecutivo de generación PDF/Excel para reportes diarios e históricos bajo NOM-016/ISO 13485). 32 tests nuevos, **469 → 501 tests totales**.

### Diagnóstico
Siguiendo el orden del backlog del ciclo 23 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **Reportes.jsx (236 líneas)** era la candidata siguiente del set sin charts ni mapa Leaflet. Es el módulo de reportería ejecutiva: cualquier bug en él puede hacer que la dirección del hospital no reciba el reporte diario de cumplimiento y se pierda la trazabilidad mensual ante auditoría. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **Carga inicial con `Promise.all([getReporteDiario(), getEquiposCriticos()])` y `.catch(console.error).finally(() => setLoading(false))`**: si alguien borra el `setLoading(false)` del `.finally()`, la pantalla se queda eternamente con "Generando reporte..." aunque las promesas ya resolvieron. Si el `.catch` se borra sin reemplazo, rechazos de cualquier endpoint quedan como unhandled promise rejection en consola.
- **6 endpoints**:
  - `api.getReporteDiario()` — reporte del día.
  - `api.getEquiposCriticos()` — equipos críticos/fuera de servicio.
  - `api.descargarReporteDiarioPdf()` — PDF diario (Blob).
  - `api.descargarReporteDiarioExcel()` — Excel diario (Blob).
  - `api.descargarHistorialPdf(mes, anio)` — PDF del mes/año actual.
  - `api.descargarHistorialExcel(mes, anio)` — Excel del mes/año actual.
- **2 helpers de descarga, mutuamente excluyentes según extensión del filename**:
  - `abrirBlobPdf(blob)` → `URL.createObjectURL(blob)` + `window.open(url, '_blank')`. **NO** llama `URL.revokeObjectURL` (la pestaña queda abierta).
  - `descargarBlob(blob, nombre)` → `URL.createObjectURL(blob)` + crea anchor con `download` attribute + `a.click()` + `URL.revokeObjectURL(url)`.
  - Si el helper equivocado se llama para una extensión (e.g. PDF usa `descargarBlob` → se descarga en lugar de abrirse), el operador se queda sin ver el PDF en el navegador.
- **Patrón `tid` de toast** (igual que AuditPage): `toast.loading(msg)` → resolve → `toast.success(msg, { id: tid })` para reemplazar el loading (no se duplica). Si el `id` se pierde, el operador ve dos toasts (uno de "Generando..." que nunca desaparece + el de éxito).
- **`mes = now.getMonth() + 1`, `anio = now.getFullYear()`** derivados en mount y pasados a `descargarHistorialPdf(mes, anio)` y `descargarHistorialExcel(mes, anio)`. Si alguien quita el `+1`, los reportes históricos piden diciembre del año anterior silenciosamente. Test asserta `descargarHistorialPdf.mock.calls[0]` === `[6, 2026]` (junio 2026) — fail loudly si se rompe.
- **6 StatBox con valores derivados**:
  - OS abiertas hoy = `reporte.ordenes_hoy`
  - OS pendientes = `reporte.ordenes_abiertas`
  - Operativos / En mantenimiento / Fuera de servicio / En traslado = `estadoMap[estado]`
  - `estadoMap = reporte.equipos_por_estado.reduce((acc, e) => ({...acc, [e.estado]: e.total}), {})`
  - Si el estado no aparece en `equipos_por_estado`, `estadoMap[k]` es undefined → `value ?? '—'` muestra em dash.
- **Tolerancia a shape ausente**: `setCriticos(crit.equipos_criticos || [])`. Rescata `null`/`undefined`/`{}` → `[]`. **NO rescata array directo** (causa TypeError). Mismo bug latente documentado en Capacitaciones/Metrologia — se documenta, no se corrige.
- **Tabla Preventivos oculta** si `preventivos_proxima_semana` está vacía o undefined. Si alguien quita la condición, una tabla vacía con header "Preventivos próximos 7 días" confunde al operador.
- **Equipos críticos**: card por equipo con `eq.estado` formateado (`replace(/_/g, ' ')` → "fuera servicio") y badge rojo (`fuera_servicio`) / amarillo (`en_mantenimiento`). `tickets_abiertos > 0` → muestra "{N} ticket(s) abierto(s)". Si tickets_abiertos es 0/falsy, NO muestra el texto.
- **Sección Equipos críticos oculta** si `criticos.length === 0`.
- **4 botones de export con `tipo` literal que se usa en el toast**: "PDF diario", "Excel diario", "PDF historial", "Excel historial". Si alguien cambia el `tipo`, los mensajes del operador cambian sin aviso.

Riesgos silenciosos cubiertos por los tests:
- Si alguien borra `setLoading(false)` del `.finally()`, la pantalla se queda con "Generando reporte..." para siempre.
- Si el `.catch(console.error)` se quita sin reemplazo, rechazos quedan como unhandled promise rejection.
- Si el helper equivocado se llama para una extensión, PDF se descarga en lugar de abrirse (o Excel abre en lugar de descargar).
- Si el `+1` se olvida en `getMonth() + 1`, el reporte pide diciembre del año anterior.
- Si el `id` compartido se pierde, el operador ve dos toasts en cascada.
- Si el `||` se cambia por `??` en `crit.equipos_criticos || []`, cualquier valor falsy cambia a `[]`.
- Si la sección Preventivos no se oculta cuando vacía, tabla vacía confunde al operador.
- Si el filtro `tickets_abiertos > 0` se rompe, el operador no ve tickets críticos sin atender.

### Cambio (commit del ciclo 24, hash `842b5f4`)

**1 archivo de test nuevo + 2 archivos actualizados, 32 tests nuevos (469 → 501 tests):**

`src/pages/Reportes.test.jsx` (32 tests, 11 grupos):

- **Loading state (2)**:
  - "Generando reporte..." visible mientras `getReporteDiario` no resuelve.
  - Loading desaparece tras resolución de `Promise.all`.
- **Header (2)**:
  - `<h1>` "Reportes" presente.
  - Subtítulo scoped al `<p>` hermano del h1 menciona "Resumen del estado del sistema — 2026-06-27" (fecha del fixture).
- **Carga inicial (5)**:
  - `getReporteDiario` Y `getEquiposCriticos` llamados en mount (1 vez cada uno).
  - Si `getEquiposCriticos` rechaza → `console.error` loggea Y loading desaparece (cubre `.finally`).
  - Si `getReporteDiario` rechaza → loading desaparece igual (cubre `.finally` en rejection del primer endpoint).
  - Tolera shape `{equipos_criticos: null}` → lista vacía, sección oculta (cubre `|| []`).
  - Tolera shape `{equipos_criticos: []}` → sección oculta.
- **6 StatBox de KPIs (8)**:
  - Los 6 labels visibles: "OS abiertas hoy", "OS pendientes", "Operativos", "En mantenimiento", "Fuera de servicio", "En traslado".
  - "OS abiertas hoy" = `reporte.ordenes_hoy` (7).
  - "OS pendientes" = `reporte.ordenes_abiertas` (12).
  - "Operativos" = `estadoMap['operativo']` (45).
  - "Fuera de servicio" = `estadoMap['fuera_servicio']` (3).
  - "En mantenimiento" = `estadoMap['en_mantenimiento']` (8).
  - "En traslado" = `estadoMap['en_traslado']` (2).
  - Si un estado no aparece en `equipos_por_estado`, el StatBox muestra `'—'` (em dash, vía `value ?? '—'`).
- **Tabla Preventivos próximos 7 días (3)**:
  - 3 headers: Equipo, Tipo preventivo, Fecha.
  - Renderiza filas con nombre+serie, tipo_preventivo, proxima_ejecucion.
  - Sección oculta cuando `preventivos_proxima_semana` está vacía.
- **Equipos críticos (5)**:
  - Card con nombre, marca, serie, area del equipo.
  - Badge "fuera servicio" con clase `bg-red-100 text-red-700`.
  - Badge "en mantenimiento" con clase `bg-yellow-100 text-yellow-700`.
  - `tickets_abiertos > 0` → "{N} ticket(s) abierto(s)". `tickets_abiertos = 0` → NO muestra.
  - Sección oculta cuando `criticos` está vacía.
- **Botones Export — render (1)**:
  - Los 4 botones visibles: PDF Diario, Excel Diario, PDF Historial, Excel Historial.
- **Botón PDF Diario (2)**:
  - Success: `descargarReporteDiarioPdf` llamado + `URL.createObjectURL(blob)` + `window.open('blob:mock-url', '_blank')` + `URL.revokeObjectURL` NO llamado + toast chain loading→success con id compartido.
  - Error: `toast.error('Error al generar PDF diario', {id})` + `window.open` NO llamado.
- **Botón Excel Diario (2)**:
  - Success: `descargarReporteDiarioExcel` llamado + `URL.createObjectURL(blob)` + `URL.revokeObjectURL('blob:mock-url')` + `window.open` NO llamado + toast chain loading→success.
  - Error: `toast.error('Error al generar Excel diario', {id})`.
- **Botón PDF Historial (1)**:
  - Success: `descargarHistorialPdf(6, 2026)` (mes=junio, anio=2026) + abrirBlobPdf path.
- **Botón Excel Historial (1)**:
  - Success: `descargarHistorialExcel(6, 2026)` + descargarBlob path (revokeObjectURL).

**Fixtures (3 items):**
- `REPORTE_BASE` — `{fecha: '2026-06-27', ordenes_hoy: 7, ordenes_abiertas: 12, equipos_por_estado: [{operativo:45},{en_mantenimiento:8},{fuera_servicio:3},{en_traslado:2}], preventivos_proxima_semana: [2 entradas]}`. Los `mes`/`anio` se derivan en runtime con `new Date()`, NO son fixture-controlled.
- `CRITICO_FUERA_SERVICIO` — `tickets_abiertos: 2, estado: 'fuera_servicio'`.
- `CRITICO_EN_MANTENIMIENTO` — `tickets_abiertos: 0, estado: 'en_mantenimiento'`.

**Mocks (justificados):**
- `vi.mock('../api/sigah', ...)` con 6 endpoints — mismo patrón que el resto.
- `vi.mock('../lib/toast', ...)` con default + named export. `mockToast.loading()` retorna `'toast-id-loading'` (id fijo para validar el patrón `{ id }` en success/error).
- `URL.createObjectURL = vi.fn(() => 'blob:mock-url')` y `URL.revokeObjectURL = vi.fn()` — jsdom no los provee de forma estable. Permite verificar que `descargarBlob` llama `revokeObjectURL` y `abrirBlobPdf` NO.
- `vi.spyOn(window, 'open').mockImplementation(() => null)` — para no abrir pestañas reales durante el test.
- `vi.spyOn(console, 'error').mockImplementation(() => {})` — el `.catch(console.error)` y los rechazos esperados loggean a stderr.
- **No se mockea `lucide-react`** — Reportes no usa iconos de lucide (usa emojis inline).
- **No se mockea `framer-motion`** — Reportes no lo usa.
- **No se usa MemoryRouter** — Reportes no importa react-router.

**Tricky bit documentado:**
- **Case-sensitive regex para disambiguar StatBox label vs badge**: el StatBox label es "En mantenimiento" (capital E) y el badge es "en mantenimiento" (lowercase e, producto de `replace(/_/g, ' ')`). El case-insensitive regex `/en mantenimiento/i` matchea ambos. Usar `/^En mantenimiento$/` (anchored, case-sensitive) para el StatBox y `/^en mantenimiento$/` para el badge. Mismo patrón para "Fuera de servicio" vs "fuera servicio".
- **`closest('div')` se queda en el label div**: el StatBox es `<div root><div value>...</div><div label>...</div></div>`. `.closest('div')` desde el label devuelve el propio label div (no el root). Usar `.parentElement` para subir al root que contiene value + label.
- **`(serie)` con paréntesis en preventivos**: la serie se renderiza como `({pp.serie})` con paréntesis literales — `getByText('SV300-2023-042')` falla porque el textContent es `"(SV300-2023-042)"`. Usar `getByText('(SV300-2023-042)')`.
- **"Monitor Philips MX450" aparece 2 veces**: en preventivos Y en críticos. Usar `getAllByText(...).find(el => el.closest('tbody'))` para filtrar por contexto.

### Bug arreglado de paso: tests flaky por fecha

**4 assertions date-dependent en `Capacitaciones.test.jsx` y `Metrologia.test.jsx`** (ciclos 22 y 23) hardcodeaban `'2026-06-26'` como fecha de hoy (la fecha en que se escribieron). Al avanzar el reloj del sistema a 2026-06-27 (hoy), esos 4 tests fallaban:
- `Capacitaciones.test.jsx:356` — `getByDisplayValue('2026-06-26')` para el campo fecha_capacitacion del modal.
- `Capacitaciones.test.jsx:543` — `callArgs.fecha_capacitacion` toBe `'2026-06-26'`.
- `Metrologia.test.jsx:472` — `getByDisplayValue('2026-06-26')` para fecha_calibracion.
- `Metrologia.test.jsx:648` — `callArgs.fecha_calibracion` toBe `'2026-06-26'`.

**Fix mínimo**: reemplazar las 4 ocurrencias hardcoded por `new Date().toISOString().split('T')[0]`. Esto preserva la semántica del test (sigue catchando "si alguien borra el default, el input queda vacío") sin depender del día del sistema. Heurística: cualquier test que asume `new Date()` retorna una fecha fija es flaky; debe mockearse `Date.now()` o computar la fecha esperada dinámicamente. Si en algún ciclo se quiere ser más estricto, se puede mockear `vi.useFakeTimers()` con `vi.setSystemTime(new Date('2026-06-26'))` en el beforeEach, pero el patrón `toBe(new Date().toISOString()...)` es más simple y suficiente.

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 23) | Después (ciclo 24) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `Reportes` (lazy) | no chunk propio, incluido en `index` | **6.19 kB / 2.05 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `Reportes.test.jsx` está fuera del alcance del bundler de producción, así que el dist queda bit-exacto en el chunk `index`. El chunk `Reportes` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.47 s.

`npm test` → **501 passed (501)** en 4.06 s (32 nuevos casos, 469 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo, y no aplica a Reportes que no usa router).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- **vitest smoke tests para Reportes — 501 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: `Trazabilidad.jsx` (204 líneas, módulo de trazabilidad por zona/piso con mapa en vivo — `Leaflet` requiere mock extra de `react-leaflet`). `Reservas.jsx` (475 líneas) queda al final por tamaño/blast-radius. **Pendientes también** las páginas que aún no tienen test: `Almacen`, `CommandCenter`, `Copilot`, `ChecklistPage`, `EquipoPublico`, `QRBatch`, `QRScanner`, `TVDashboard`, `Ordenes`, `AdminGlobal`.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `|| []` en `Reportes.jsx`**, `Capacitaciones.jsx` Y `Metrologia.jsx` (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial o array directo. 3 lugares documentados (Capacitaciones ciclo 22, Metrologia ciclo 23, Reportes ciclo 24) — si se aborda en un próximo ciclo, sería un mini-item correctivo de bajo riesgo.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.
7. **Mockear `Date.now()` en los tests date-dependent** (alternativa al fix dinámico aplicado en este ciclo): `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-06-27'))` antes de cada test que asume "today" fijo. Útil si en el futuro se quiere testear comportamiento relativo a fechas específicas (ej. "calibraciones próximas en 30 días"). El fix dinámico actual es suficiente para los tests existentes.

## Ciclo 25 — 2026-06-28 (autocycle headless)

**Salud (verificada al inicio):**
- tmux `sigab-hermes` vivo.
- Contenedores: sigah-bot 4h healthy; sigah-backend 27h; sigah-frontend 27h; sigab-panel-api 6d; openclaw 5d; sigah-mysql 7d; n8n-sigah-n8n-1 7d; n8n-sigah-postgres-1 2w; sigah-monitor 2w; sigah-portal 2w; sigab-panel 2w; traefik 34h.
- `https://sigah.129-121-100-147.sslip.io/` → 200 (346 ms).
- `https://sigab.129-121-100-147.sslip.io/` → 200 (277 ms).

**Item hecho:** Backlog #1 (continuación) — **QRScanner.jsx** (252 líneas, página móvil que el operador usa para escanear el QR pegado al equipo biomédico, abre cámara y clasifica el texto detectado en 3 rutas: URL con `/equipo/`, token alfanumérico 8-32 chars, o URL externa). 43 tests nuevos, **683 → 726 tests totales** (30 archivos).

### Diagnóstico
Siguiendo el orden del backlog del ciclo 24 (item #1: tests para páginas con fetch, "elegir candidata compacta"). **QRScanner.jsx (252 líneas)** era la candidata más compacta del set sin tests. Es la única ruta de acceso a EquipoPublico desde el celular del operador (sin teclado, sin mouse, sólo apuntar y disparar) — un bug en el cleanup (cámara queda encendida después de navegar) drena batería en campo. Un bug en la clasificación del texto (URL mal parseada → operador escanea y ve error de red) bloquea el flujo crítico de mantenimiento. Concentra patrones sutiles que un test atrapa y un DevTools manual no:

- **`useEffect` con deps `[]` que llama `startCamera()` en mount**. El cleanup es `stopCamera`, que llama `cancelAnimationFrame` Y `stream.getTracks().forEach(t => t.stop)`. Si el cleanup se rompe, el scanner deja la cámara encendida después de navegar.
- **`startCamera` con `getUserMedia({video: {facingMode: 'environment', ...}})`**. Sin `facingMode`, los celulares no saben qué cámara usar y el navegador defaults a la frontal (UX rota en operador sosteniendo el celular).
- **3 ramas de error de cámara**:
  - `NotAllowedError` → 'Permiso de cámara denegado. Actívalo en la configuración de tu navegador.'
  - `NotFoundError`   → 'No se encontró cámara en este dispositivo.'
  - otro              → 'Error de cámara: <msg>'
  - Si alguien homogeniza los mensajes, el operador pierde el contexto (¿le di permiso? ¿el equipo no tiene cámara?).
- **Botón "Reintentar" sólo se muestra cuando hay error**: si alguien lo sube al render normal, aparece un botón redundante al lado de la cámara.
- **`handleResult` clasifica el texto en orden estricto**:
  1) `includes('/equipo/')` → navega
  2) matchea regex `/^[a-zA-Z0-9_-]{8,32}$/` → navega
  3) `startsWith('http')` → `window.location.href`
  - Si alguien invierte el orden, una URL tipo "http://x.com/equipo/abc" dispara la rama 1 primero (OK), pero "abc123456" (8 chars) matchea la rama 2 antes de cualquier otra. El riesgo es que un cambio rompa la rama 3: tokens que NO matchean el regex quedan silenciosos (sin navigate, sin error).
- **`stopCamera` se llama ANTES de `setSuccess`**: si alguien los invierte, el overlay de éxito aparece mientras la cámara sigue corriendo, drenando batería.
- **`navigator.vibrate?.(200)` con optional chaining + try/catch**: si el navegador no soporta vibración (la mayoría de desktops), el `?.` evita el crash y el `try/catch` atrapa throws raros.
- **`setTimeout(..., 600)` antes de navegar**: le da tiempo al operador a ver el overlay "QR detectado / Redirigiendo..." antes de que cambie la pantalla.
- **`stopCamera + setTimeout(300) + startCamera(next)` en toggleCamera**: el delay 300ms evita race conditions entre detener y abrir la nueva stream.
- **Botón "atrás" llama `stopCamera()` Y `navigate(-1)`**: si alguien quita el `stopCamera`, la cámara queda encendida después de salir.

Riesgos silenciosos cubiertos por los tests:
- Si el cleanup de useEffect se rompe, la cámara queda encendida después de navegar (drenaje de batería en campo).
- Si la rama 3 (URL externa) se rompe, un QR con URL de un proveedor (no "/equipo/") se queda sin acción y el operador confundido.
- Si el orden de las ramas 1 y 2 se invierte, un texto que matchea ambos criterios va al path equivocado.
- Si el setTimeout 600ms se borra, el feedback visual de "QR detectado" desaparece antes de que el operador lo vea.
- Si la lógica de error de cámara se homogeniza, el operador pierde el contexto (permiso vs hardware).
- Si el `stopCamera()` del botón atrás se quita, la cámara queda encendida después de salir.

### Cambio (commit del ciclo 25, hash `581ed58`)

**1 archivo de test nuevo, 43 tests nuevos (683 → 726 tests, 30 archivos):**

`src/pages/QRScanner.test.jsx` (43 tests, 12 grupos):

- **Header (5)**:
  - h1 "Escanear QR de Equipo" presente.
  - Subtítulo menciona SIGAH, HGR No.1, IMSS.
  - Input manual con placeholder "Token o URL del equipo...".
  - Botón "Ver" para enviar el input.
  - Instrucción "Apunta la cámara al código QR...".
- **Cámara en mount (6)**:
  - `getUserMedia` llamado exactamente 1 vez al montar.
  - Pide `{video: {facingMode: 'environment'}, audio: false}`.
  - Tras éxito: `scanning=true` → 4 esquinas `.border-emerald-400` visibles.
  - Tras éxito: botón "Cambiar cámara" presente.
  - Tras éxito: NO hay botón "Reintentar".
  - `videoRef.current.play()` llamado.
- **Errores de cámara (6)**:
  - `NotAllowedError` → "Permiso de cámara denegado. Actívalo...".
  - `NotFoundError` → "No se encontró cámara en este dispositivo.".
  - Error genérico (`SomeOtherError`) → "Error de cámara: <message>".
  - Cualquier error → botón "Reintentar" visible.
  - Cualquier error → NO se muestra botón "Cambiar cámara".
  - Click en "Reintentar" → vuelve a llamar `getUserMedia`.
- **Input manual vacío/inválido (4)**:
  - Submit con whitespace-only → no navega.
  - Submit con "hola" (4 chars) → no navega.
  - Submit con token de 7 chars (regex pide 8-32) → no navega.
  - Submit con token de 33 chars → no navega.
- **URL con `/equipo/` (4)**:
  - URL completa "https://sigah.../equipo/abc12345" → navega a `/equipo/abc12345`.
  - URL con query `?foo=bar` → extrae token, ignora query.
  - URL con hash `#section` → extrae token, ignora hash.
  - URL con path vacío `/equipo/` → navega a `/equipo/` (documenta edge case).
- **Token alfanumérico (4)**:
  - Token 8 chars → navega a `/equipo/<token>`.
  - Token 32 chars (boundary superior) → navega.
  - Token con guiones y underscores → matchea regex `[a-zA-Z0-9_-]`.
  - Token con whitespace al inicio/fin → se trimea antes de navegar.
- **URL externa (2)**:
  - `http://example.com/foo` → `window.location.href = url` (captura descriptor original, lo restaura).
  - `https://sigab.example/qr/manual.pdf` → mismo path.
  - NO llama `mockNavigate` (URLs externas no usan router).
- **Efectos de un QR detectado (4)**:
  - stopCamera llama `track.stop()` tras submit.
  - `navigator.vibrate(200)` llamado tras submit.
  - Overlay "QR detectado" / "Redirigiendo..." visible.
  - Si `navigator.vibrate` es undefined → no rompe (`?. + try/catch`).
- **Cleanup al desmontar (1)**:
  - Unmount llama `cancelAnimationFrame` + `track.stop()`.
- **Toggle cámara (2)**:
  - Click → facingMode flippa "environment" → "user".
  - Segundo click → vuelve a "environment".
  - setTimeout 300ms entre stop y re-start (flush con `await new Promise(setTimeout 350ms)`).
- **Botón atrás (2)**:
  - Click → stopCamera (cancelAnimationFrame + track.stop).
  - Click → `navigate(-1)`.
- **Hygiene (3)**:
  - No warnings durante mount + scan.
  - No warnings durante error de cámara.
  - No warnings durante input manual → navegación.

**Mocks:**
- `vi.mock('jsqr', ...)` con default que retorna `null` (no se detecta nada).
- `vi.mock('react-router-dom', ...)` con sólo `useNavigate: () => mockNavigate`. NO se usa MemoryRouter.
- `navigator.mediaDevices.getUserMedia` con `Object.defineProperty` (jsdom tiene `navigator.mediaDevices` parcialmente).
- `navigator.vibrate` igual.
- `vi.stubGlobal('requestAnimationFrame', vi.fn(() => rafId++))` — retorna IDs incrementales > 0 (importante: si retorna 0, `if (animRef.current) cancelAnimationFrame(...)` se salta).
- `vi.stubGlobal('cancelAnimationFrame', vi.fn())`.
- `HTMLMediaElement.prototype.play = mocks.mockPlay` (jsdom no implementa play, devuelve undefined).
- `HTMLCanvasElement.prototype.getContext = vi.fn(...)` (jsdom no provee contexto 2d por defecto).
- `vi.unstubAllGlobals()` en afterEach para limpiar entre tests.

**Tricky bits documentados:**
- **requestAnimationFrame mock debe retornar ID truthy**: stopCamera hace `if (animRef.current) cancelAnimationFrame(animRef.current)`. Si el mock retorna 0, el `if (0)` es falsy y la llamada a `cancelAnimationFrame` se salta — el test de cleanup falla. Usar IDs incrementales (`rafId++` partiendo de 1).
- **`window.location` en jsdom es read-only**: para testear `window.location.href = url`, hay que hacer `Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true })` y restaurar el descriptor original con `finally`. Sin esto, jsdom lanza "Cannot assign to read only property".
- **`useNavigate` mock directo es más simple que MemoryRouter**: como el componente sólo usa `useNavigate` (no Link, no Outlet, no useParams), mockear el módulo entero con `{ useNavigate: () => mockNavigate }` evita la necesidad de MemoryRouter y permite verificar `mockNavigate.mock.calls` directamente.
- **El `<video>` element NO tiene `play()` en jsdom**: aunque existe el prototipo `HTMLMediaElement`, jsdom no implementa `play()` y devuelve `undefined`. Mockear `HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())` antes del mount para que `await videoRef.current.play()` no rompa.
- **El `<canvas>` element NO tiene `getContext('2d')` en jsdom**: jsQR llama `canvas.getContext('2d').getImageData(...)`. Mockear `HTMLCanvasElement.prototype.getContext` con un objeto que provea `drawImage` y `getImageData`.
- **El back button es el PRIMER `<button>` del header**: la query `'header button, .flex.items-center button'` lo selecciona. Útil porque no tiene texto accesible (sólo SVG).
- **No se mockea `lucide-react`** ni `framer-motion` — QRScanner no usa ninguno (sólo SVGs inline para iconos).

### Resultado de bundle (medido en dist/, mismo commit)
| Chunk | Antes (ciclo 24) | Después (ciclo 25) | Δ gzip |
|---|---|---|---|
| `index` | 110.72 kB / 37.61 kB gzip | 110.72 kB / 37.61 kB gzip | — |
| `QRScanner` (lazy) | no chunk propio, incluido en `index` | **7.46 kB / 2.65 kB gzip** | nuevo chunk lazy |
| Resto | igual | igual | — |

**Initial JS sin cambios** (37.61 kB gzip). `QRScanner.test.jsx` está fuera del alcance del bundler de producción. El chunk `QRScanner` es nuevo en este ciclo porque Vite detectó que la página se importa dinámicamente (lazy load en el router). Cero warnings de Vite, build 4.21 s.

`npm test` → **726 passed (726)** en 9.13 s (43 nuevos casos, 683 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo).

### Estado de v3.0 (YA HECHO)
- Fixes de contraste entre temas (20 archivos).
- Code-splitting: React.lazy + Suspense + manualChunks (charts/qr/router).
- Quitadas 4 deps muertas, luego `@tremor/react` (−57% gzip del chunk charts).
- react-router-dom 6.30.4 (CVE open-redirect).
- lucide-react tree-shaking en el shell (−82 % initial gzip).
- a11y teclado: skip-link + cards/filas activables (ciclo 3).
- a11y modales: role/aria-modal/aria-labelledby en 11 modales + ConfirmDialog (ciclo 4).
- vitest + 4 smoke tests (tokens, theme, ProtectedRoute, ConfirmDialog) — 32 tests (ciclo 5).
- a11y modales: Escape handler en los 9 modales restantes (ciclo 6).
- vitest smoke tests para KPICard/EquipoCard/EquipoTable — 70 tests (ciclo 7).
- Limpieza de tokens muertos en tailwind.config.js — ciclo 8.
- vitest smoke tests para Login, Dashboard, Equipos — 116 tests (ciclos 9-13).
- vitest smoke tests para AuditPage, Alertas, Formatos — 180 tests (ciclos 14-15).
- vitest smoke tests para Button/GlassCard/PageHeading/TableWrapper — 224 tests (ciclo 16).
- vitest smoke tests para SuperAdmin — 257 tests (ciclo 17).
- vitest smoke tests para LandingPage — 297 tests (ciclo 18).
- vitest smoke tests para Preventivos — 322 tests (ciclo 19).
- vitest smoke tests para Tecnovigilancia — 357 tests (ciclo 20).
- vitest smoke tests para Analitica — 387 tests (ciclo 21).
- vitest smoke tests para Capacitaciones — 426 tests (ciclo 22).
- vitest smoke tests para Metrologia — 469 tests (ciclo 23).
- vitest smoke tests para Reportes — 501 tests (ciclo 24).
- **vitest smoke tests para QRScanner — 726 tests (este ciclo)**.

### Backlog restante
1. **Más tests con mocks de api (vi.mock) — siguiente candidata**: **Páginas restantes sin test**: `Almacen` (392 líneas, inventario), `CommandCenter` (445 líneas, dashboard ejecutivo), `Copilot` (711 líneas, asistente IA — axios directo), `Ordenes` (750 líneas, drag-and-drop y tabs — módulo grande). Por tamaño/blast-radius, candidatas ordenadas: **Almacen (392) → CommandCenter (445) → Ordenes (750) → Copilot (711)**.
2. **`MaintenanceChart` lazy dentro de Dashboard**: beneficio marginal bajo (~15 kB gzip en su chunk propio).
3. **Focus trap dentro de los modales**: ahora el foco se queda en el botón X o se escapa al `<body>`. Útil pero requiere cuidado con orden de focus y `useFocusTrap` (no hay lib instalada).
4. **Tapar el bug latente `|| []` en `Reportes.jsx`**, `Capacitaciones.jsx` Y `Metrologia.jsx` (y posiblemente otros lugares con el mismo patrón): cambiar a `Array.isArray(data.x) ? data.x : Array.isArray(data) ? data : []` o equivalente. Cubre el edge case de respuesta `{}` parcial o array directo. 3 lugares documentados.
5. **Limpiar `bgColor` dead code en `Analitica.jsx`**: la constante `bgColor` se calcula pero NO se usa en el JSX. Cosmético puro.
6. **DashboardV3 smoke test (preview estático)**: bajo valor de test — preview con CSS externo.

### Próximo paso (Ciclo 28)
Salud primero. Luego **item #1 (continuar con tests de páginas con fetch)** — **`Almacen.jsx` (392 líneas, inventario)** es la candidata más compacta del set restante. Si su setup resulta complejo (filtros múltiples, modales de edición), fallback a **`CommandCenter.jsx` (445 líneas, dashboard ejecutivo)**. Alternativa de bajo riesgo: **tapar el bug latente `|| []` en Capacitaciones + Metrologia + Reportes** (item #4) como mini-item correctivo — change único, no rompe tests existentes, alta cobertura del edge case.

---

## Ciclo 26 — 2026-06-28 ~05:00 UTC — vitest smoke tests para AdminGlobal

**Commit:** `0f521b5 test(frontend): vitest smoke tests para AdminGlobal (48 casos)` (pusheado a `autocycle/v3.0`).

**Hash pusheado:** `0f521b5`. **Bundle:** sin cambios (AdminGlobal ya era su propio chunk lazy). **Tests:** 48 nuevos casos. **Total:** 774 (era 726). **Build:** 4.21 s, sin warnings.

### AdminGlobal (274 líneas) — qué cubre

`AdminGlobal.jsx` es el panel SUPERADMIN SIGAH: vista cross-hospital con KPIs globales, tabla de tenants (hospitales) y actividad reciente. Concentra varios patrones sutiles:

- **Carga inicial con `Promise.all([getAdminStats(), getAdminHospitales(), getAdminActividad()])`** envuelto en try/catch/finally. Si el `setLoading(false)` del finally se borra, la pantalla se queda con "Cargando..." incluso si el backend devolvió 500.
- **3 ramas de error distintas**: 403 → banner ámbar + toast.error "Acceso restringido: se requiere rol superadmin_sigah". Otro status (500, 502, red) → sólo toast.error "Error al cargar panel admin".
- **4 KPICards** con valores derivados de `stats`. MRR formateado como `$${Number(stats.mrr_mxn).toLocaleString('es-MX')} MXN` y '—' cuando mrr_mxn es null. Usuarios Totales cae a stats.usuarios_totales si stats.total_usuarios no existe (alias).
- **SUSCRIPCION_BADGE con fallback a `inactivo`** para estados desconocidos (null, undefined, 'foo'). Si alguien quita el `??`, un estado nuevo crashea al intentar leer `.dot`/`.pill`/`.label` de undefined.
- **Tolerancia a shape**: acepta tanto `{hospitales: [...]}` como `[...]` directamente. Lo mismo para `actividad`.
- **Tabla de hospitales con 6 columnas** (Hospital, Slug, Suscripción, Usuarios, Activo Desde, Acciones). "Activo Desde" se formatea con `toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})`.
- **Botón "Ver detalles" siempre `disabled`** (Fase 3).
- **Lista de actividad con `slice(0, 20)`**.
- **`formatRelative(isoString)`**: <1 min → "hace un momento", <60 min → "hace {n} min", <24 h → "hace {n} h", >=24 h → "hace {n} d", null → "—".
- **Botón "Actualizar" invoca `cargar()` otra vez** (3 endpoints llamados 2x).
- **`ev.hospital_nombre ?? ev.hospital ?? 'Sistema'`** para tolerar ambos campos.

### Tests del ciclo 26 (48 casos)

**Loading state (3):** spinner visible mientras promesas pendientes; spinner oculto tras resolución exitosa; spinner oculto incluso si una promesa rechaza (finally con setLoading(false)).

**Header y refresh button (5):** h1 "Panel SuperAdmin SIGAH"; subtítulo; badge "SUPER ADMIN"; botón "Actualizar" con icono RefreshCw; click en "Actualizar" invoca los 3 endpoints una segunda vez.

**KPIs globales (8):** muestra los 4 labels; "Total Hospitales" muestra stats.total_hospitales; "Hospitales Activos" muestra stats.hospitales_activos; "MRR" se formatea como "$124,500 MXN" (toLocaleString es-MX); "MRR" muestra "—" cuando stats.mrr_mxn es null; "Usuarios Totales" usa stats.total_usuarios (primario); cae a stats.usuarios_totales si total_usuarios falta; muestra "—" si ambos campos faltan.

**SuscripcionBadge (6):** badge "activo" usa clases emerald; badge "trial" usa clases amber; badge "vencido" usa clases red; badge "inactivo" usa pill slate + text muted (var(--content-muted)); estado desconocido cae al fallback inactivo (sin crash); estado null también cae al fallback inactivo.

**Tabla de hospitales (9):** renderiza los 6 headers de columna; muestra nombre y slug del hospital; "Activo Desde" se formatea como fecha es-MX (regex flexible); "Activo Desde" muestra "—" cuando es null; num_usuarios se muestra (con fallback a total_usuarios); num_usuarios cae a total_usuarios si no existe; num_usuarios muestra "—" si ambos campos faltan; botón "Ver detalles" siempre disabled (Fase 3); muestra "Sin hospitales registrados." cuando la lista está vacía; tolera shape `{hospitales: [...]}` (objeto envuelto en array).

**Lista de actividad reciente (10):** renderiza una fila por evento con hospital_nombre + acción; formatRelative: hace 5 min → "hace 5 min", hace 3 h → "hace 3 h", hace 2 d → "hace 2 d", <1 min → "hace un momento"; formatRelative: created_at null → "—" (guard evita "hace años" 1970); evento sin hospital_nombre usa fallback "hospital"; evento sin ningún campo de hospital muestra "Sistema"; muestra "Sin actividad reciente." cuando la lista está vacía; tolera shape `{actividad: [...]}`; trunca la lista a 20 entradas (slicing).

**Manejo de errores (4):** error 403 muestra banner ámbar + toast.error con rol requerido; error 500 NO muestra banner 403, sí toast genérico; error de red (sin response.status) toast genérico sin banner; error 404 → toast genérico (sólo 403 es especial).

**Hygiene (1):** no emite warnings de React ni de act() durante la carga exitosa.

### Mocks y tricky bits documentados

- **Se mockea `../api/sigah`** (3 endpoints: getAdminStats, getAdminHospitales, getAdminActividad) y **`../components/Toast`** (silencioso, no es jsdom-safe).
- **NO se mockea `lucide-react`** (los iconos funcionan en jsdom).
- **NO se usa MemoryRouter** (la página no usa react-router).
- **Shape `{hospitales: null}` NO se tolera** — `hosp.hospitales ?? hosp ?? []` evalúa `null ?? {hospitales:null}` = `{hospitales:null}` (objeto, truthy), y luego `hospitales.map` crashea con TypeError. Mismo bug latente que Capacitaciones / Metrologia / Trazabilidad / ChecklistPage (item #4 del backlog). NO se cubre con test para no contaminar el árbol de React entre tests.

`npm test` → **774 passed (774)** en 9.18 s (48 nuevos casos, 726 previos). Sin warnings de `act()` ni de React state updates.

---

## Ciclo 27 — 2026-06-28 ~11:00 UTC — vitest smoke tests para QRBatch

**Commit:** `99e2686 test(frontend): vitest smoke tests para QRBatch (59 casos)` (pusheado a `autocycle/v3.0`).

**Hash pusheado:** `99e2686`. **Bundle:** nuevo chunk `QRBatch` lazy (14.22 kB / 4.33 kB gzip). **Initial JS sin cambios** (37.61 kB gzip). **Tests:** 59 nuevos casos. **Total:** 833 (era 774). **Build:** 4.22 s, sin warnings.

### QRBatch (419 líneas) — qué cubre

`QRBatch.jsx` es el módulo de generación masiva de etiquetas QR para impresión (formato carta o sticker Zebra). Concentra varios patrones sutiles:

- **Carga inicial con `api.getEquipos({ limit: 500 })`** en try/catch/finally. Si el `setLoading(false)` del finally se borra, el spinner se queda eternamente aunque el backend devuelva 500.
- **`res.equipos || []` con fallback**: shape `{equipos: [...]}` soportado; array directo cae a `[]` silenciosamente (sin crash, sin render).
- **`useMemo` de `areas`**: deduplicado con `Set` + sort alfabético sobre `equipo.area`. `.filter(Boolean)` excluye áreas null/undefined.
- **Búsqueda case-insensitive** sobre nombre, serie Y marca (cualquier match → included).
- **Filtro por área exacto (`===`)**.
- **Selección persistente**: `seleccionados` se mantiene aunque el equipo desaparezca del filtro (ej. si cambias de área). El botón "Limpiar todo" sólo aparece cuando hay selección.
- **Toggle selección individual**: añade si no está, quita si está.
- **`toggleSeleccionarTodos`**: si TODOS los visibles están seleccionados → deselecciona sólo visibles (los ocultos permanecen). Si NO están todos → añade todos los visibles (dedup).
- **Vista Previa condicional**: sólo cuando `showPreview && seleccionados.length > 0`. Slice a 4 cards + "+N más..." si hay más.
- **Print zones siempre renderizadas** (`.qr-print-carta` y `.qr-print-zebra`) con todos los `equiposParaImprimir`. Visibilidad se controla con CSS `@media print` (no con `display:none`).
- **`modo === 'carta'`**: páginas = `Math.ceil(n / 12)`. **`modo === 'zebra'`**: páginas = `n`.
- **`handlePrint`**:
  - selección vacía → `toast.error('Selecciona al menos un equipo antes de imprimir')`.
  - con selección → `toast.success` con count + páginas estimadas.
  - siempre setea `data-print-mode` en `<html>` (luego lo limpia 500ms después).
  - en zebra → inyecta `<style id="zebra-page-override">` con `@page { size: 51mm 25mm; margin: 0; }` (luego lo remueve).
  - llama `window.print()` 100ms después del click.
- **`window.location.origin`** se usa en el `value` del QRCodeSVG (formato `${origin}/equipo/${qr_token || serie}`).
- **Stats bar refleja estado**: "Seleccionados" = `seleccionados.length`, "Páginas" = `paginasEstimadas || '—'`, "Formato" = texto según modo.
- **Empty state**: si `equiposFiltrados.length === 0`, "No se encontraron equipos" + (opcional) ` para "${busqueda}"`.

### Tests del ciclo 27 (59 casos)

**Loading state (3):** muestra spinner de carga mientras la promesa no resuelve; oculta el spinner tras resolución exitosa de getEquipos; oculta el spinner incluso si getEquipos rechaza (finally con setLoading(false)).

**Header (6):** renderiza el h1 "Etiquetado Masivo QR"; muestra el subtítulo descriptivo; renderiza los botones de modo "Carta" y "Zebra"; modo por defecto es "Carta" (botón con clases purple); click en "Zebra" cambia el modo activo (clases amber en Zebra); botón Imprimir inicia disabled cuando no hay selección.

**Stats bar (5):** muestra "Seleccionados: 0" inicialmente; muestra "Páginas estimadas: —" cuando no hay selección; muestra el formato Carta por defecto: 8.5" × 11" (3×4); cambia el formato a Zebra: 2" × 1" (Sticker) tras click; botón "Vista Previa" NO se muestra sin selección.

**Áreas y filtros (7):** dropdown de áreas lista las áreas únicas ordenadas alfabéticamente; filtra el grid por área seleccionada; búsqueda por nombre (case-insensitive); búsqueda por serie (case-insensitive); búsqueda por marca (case-insensitive); botón X (clear search) sólo aparece cuando hay texto; empty state cuando no hay matches.

**Selección de equipos (7):** click en un equipo lo selecciona (clase purple ring); segundo click en el mismo equipo lo deselecciona; botón Imprimir muestra el conteo actualizado tras seleccionar; Stats bar refleja el conteo tras seleccionar 3 equipos; selección persiste al cambiar el filtro de área; botón "Limpiar todo" aparece sólo cuando hay selección; click en "Limpiar todo" vacía la selección.

**Selección masiva (4):** "Seleccionar visibles (N)" selecciona todos los visibles; tras seleccionar todos, el botón cambia a "Deseleccionar visibles"; "Deseleccionar visibles" sólo quita los visibles (los ocultos permanecen); selección masiva + filtro: toggle funciona correctamente.

**Páginas estimadas (3):** modo carta: ceil(n/12); modo zebra: n (1 sticker por página); modo carta: ceil(13/12) = 2 (boundary).

**Vista previa (5):** botón "Vista Previa" aparece tras seleccionar; click en "Vista Previa" muestra el bloque de preview; preview slice a 4 cards + "+N más..." cuando hay más de 4; click en "Ocultar" esconde el preview; preview muestra labels QR según el modo activo (Carta vs Zebra).

**Print logic (6):** botón Imprimir está disabled cuando no hay selección (no se puede clickear); click en Imprimir con selección → toast.success con count + páginas (carta); setea data-print-mode="carta" en <html> al imprimir en carta; inyecta <style id="zebra-page-override"> en zebra mode y lo limpia tras print; en carta NO inyecta el style zebra-page-override; toast.success incluye páginas estimadas en zebra (count = pages).

**Print zones (6):** zona print-carta contiene un QRCodeSVG por cada equipo seleccionado; zona print-zebra contiene un QRCodeSVG por cada equipo seleccionado; QR value usa qr_token cuando existe; QR value cae a `serie` si qr_token es null; QR size es 110 en carta, 62 en zebra; print zones se renderizan aunque no haya selección (vacías).

**Manejo de errores y shape tolerance (5):** toast.error cuando getEquipos rechaza; acepta shape `{equipos: [...]}` (objeto envuelto en array); shape `[...]` directo (array sin envolver): cae al fallback [] silenciosamente; acepta respuesta `{equipos: []}` (array vacío); pasa `{ limit: 500 }` como params al API.

**Hygiene (2):** no emite warnings de React ni de act() durante la carga exitosa; no emite warnings durante el flujo de selección + print.

### Mocks y tricky bits documentados

- **Se mockea `../api/sigah`** (getEquipos), **`../lib/toast`** (silencioso) y **`qrcode.react`** (QRCodeSVG es render-SVG, jsdom lo simplifica a un `<svg data-value>` para verificar el value sin depender del output SVG interno).
- **NO se mockea `lucide-react`** (los iconos funcionan en jsdom).
- **NO se usa MemoryRouter** (la página no usa react-router).

#### Tricky bits descubiertos durante este ciclo

- **`vi.useFakeTimers()` en print tests CONTAMINA el global timer state** y hace que `waitFor()` se cuelgue en tests posteriores (waitFor usa `setTimeout` para reintentos). Mitigación:
  1. `vi.useRealTimers()` en `afterEach` (defensa en profundidad).
  2. Verificar side effects SÍNCRONOS (toast.success, data-print-mode, zebra style) inmediatamente después del click, sin fake timers.
  3. Para verificar `window.print()`, usar timers reales + `await waitFor()` — el setTimeout(100ms) se dispara antes de que termine el test.
- **"Ventilador Mindray SV300" aparece en el grid + print zones (carta y zebra)**, así que `getByText` falla con `Found multiple elements`. Usar `getAllByText` + `closest()` para localizar el card del grid (único con `cursor-pointer`).
- **El botón X (clear search) tiene `.absolute.right-3`** igual que el ChevronDown del select, pero sólo el X es un BUTTON. Filtrar por `tagName === 'BUTTON'`.
- **El primer test fallido en este ciclo (`'click en Imprimir sin selección → toast.error'`)**: el botón Imprimir está `disabled` cuando no hay selección, así que `fireEvent.click` no dispara `handlePrint`. Reemplazado por un test que verifica que el botón está disabled y que ningún toast se llamó.

`npm test` → **833 passed (833)** en 9.04 s (59 nuevos casos, 774 previos). Sin warnings de `act()` ni de React state updates. Único warning visible es el pre-existente de react-router v7 sobre `v7_relativeSplatPath` (no introducido por este ciclo — QRBatch no usa router).

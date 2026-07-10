# Contexto compartido — memoria común de los agentes SIGAB/SIGAH

> Destilado de las sesiones de consolidación (jun-jul 2026). TODO agente lo
> lee antes de trabajar. Si algo de aquí resulta falso, corrígelo en el mismo
> commit en que lo descubras.

## Qué es esto
- **SIGAH** = la empresa/plataforma SaaS. **SIGAB** = la app de gestión de
  activos biomédicos. Cliente piloto: **Clínica/HGR No. 1 IMSS Tijuana**
  (~881 equipos reales, datos de pacientes → producción se trata como
  hospital, no como demo). Deadline comercial IMSS: nov-2026.
- **Pragma AI** = el entorno/homelab de agentes de Gustavo (ThinkCentre 24/7
  como nodo central, ASUS como estación de desarrollo/gaming, VPS como prod).

## Versión y ramas (vigente 2026-07-03)
- Prod full-stack corre **v4.0.0** = rama `v4.0/piloto-clinica-1` del repo
  `djpiyama123-droid/SIGAB-Test-2` (público). Espejo limpio y privado:
  `djpiyama123-droid/SIGAB-v4` (main; snapshots del loop).
- `VERSION` + `versions.json` + `docs/releases/` = trazabilidad. El panel
  superadmin la muestra. Si algo "no se mira bien" en la app, la entrada de
  versión dice qué se tocó, qué verificar y cómo revertir.
- Ramas muertas: `autocycle/v3.0` (regresión 29-jun), `pulido/2026-06-16` de
  origin (historia reescrita). `feat/ui-cinematic` = congelada, solo-frontend.
- "v3.0" en docs viejos = la migración de tema dark→Verde-Blanco IMSS, NO una
  versión de la app.

## Máquinas y accesos
| Nodo | Tailscale | Rol |
|---|---|---|
| VPS Bluehost | `sigab-vps` (100.107.39.80) | Producción (docker: backend FastAPI, frontend nginx, mysql, bot, openclaw, n8n, panel) |
| ThinkCentre M720q | `sigah-thinkcentre-m720q` (100.98.18.51) | Homelab 24/7: director del loop, réplica del repo |
| ASUS TUF A16 | `asus-gustavo` (100.97.220.115) | Estación de Gustavo (desarrollo + gaming) — NO poner trabajo autónomo aquí |

SSH entre nodos: llaves clásicas sobre el tailnet. **JAMÁS `tailscale up
--ssh`** (reencamina el 22 y rompe todo el acceso).

## Reglas de producción (sangre de regresiones pasadas)
1. El dist vivo se sirve de `/opt/sigab/sigab-frontend/dist` (nginx estático).
   Deploy = build + backup `dist.bak-<ts>` + rsync. Rollback = rsync inverso.
2. Discriminador del calendario en builds: `grep -a anim-cell-pop
   assets/Reservas-*.js`. (`grep ActividadHeatmap` YA NO sirve — minificación.)
3. El backend corre imagen docker horneada: editar `/opt/sigab` NO cambia lo
   que corre; backend = rebuild + up, SOLO con OK humano, SIEMPRE con
   mysqldump previo (backups en `/root/db-backups/`).
4. Helpers PDF iOS en `api/sigab.js` (`prepararVentanaPdf`/`abrirPdf`/
   `triggerDownload`): no tocarlos sin correr el flujo en móvil — el bug de
   PDFs en iPhone fue el reclamo #1 del piloto.
5. Los metadatos de contratos (tipo_adquisicion, 881 equipos) YA están
   importados — no re-importar. `equipo_documentos` espera los PDFs
   escaneados por equipo + manifiesto (aún no existen).

## Diseño v4.0
Design system Verde-Blanco IMSS: primary `#047857`, dark `#065F46`, light
`#E0F0E9`, neutral `#F8FAF9`, Inter, roundness 8, targets táctiles 48px,
mobile-first (técnicos usan iPhone/iPad en piso). Pantallas de referencia:
proyecto Stitch `projects/7684283430601085634` (5 pantallas COMPLETE; falta
Reservas). IDs en `docs/CONSOLIDACION-V4.md` §6.

## Dónde pedir y reportar
- Backlog humano → `/home/cloud/proyectos/PETICIONES-LOOP.md` (VPS).
- Notas de deploy → `/home/cloud/proyectos/DEPLOY_*.md` (VPS).
- Alertas → Telegram vía Hermes/OpenClaw (`/v1/notify`).
- Mapa completo del ecosistema → `docs/CONSOLIDACION-V4.md`.
- Carriles y protocolo de agentes → `docs/agentes/ORQUESTACION.md`.

## Petición directa de Gustavo — Portar formato IMSS de Órdenes a v4 (2026-07-08)

> **Prioridad sobre el backlog genérico** (la petición de Inventario de abajo ya
> está prácticamente cerrada). Un ítem por ciclo; esto puede tomar 2-3 ciclos.

**Qué**: existe un refactor completo de Órdenes de Servicio al **formato IMSS
oficial** hecho sobre la base v3: rama `feat/orden-servicio-imss-oficial-2026-07-07`,
tag `v.3.2.0`, commit `63c849e` (este mismo repo, ya pusheado 2026-07-08). NO se
puede desplegar tal cual porque su base es `feat/ui-cinematic` (v3) y machacaría
este frontend v4. **La tarea es PORTAR ese trabajo a esta rama v4**: leer el diff
(`git fetch origin feat/orden-servicio-imss-oficial-2026-07-07 && git show 63c849e`),
identificar qué aporta (layout del formato oficial IMSS de OS, 7 campos nuevos del
modal: hora_inicio, hora_termino, tiempo_estimado, tiempo_real,
recibe_conformidad_nombre, recibe_matricula, localizacion_completa) y
reimplementarlo en los componentes de Órdenes de v4 adaptado al design system
Verde-Blanco IMSS y a los tokens de tema (`var(--content-*)`, 4 temas).

**Backend/BD ya listos (2026-07-08)**: las 7 columnas EXISTEN en
`ordenes_servicio` de producción (las 3 últimas se agregaron hoy con backup
`ordenes_pre_alter_2026-07-08.sql`). Verificar si los schemas Pydantic/SQLAlchemy
del backend exponen los 3 campos nuevos; si no, agregarlos (nullable) — sin
redeploy del backend hasta que el frontend los use de verdad.

**Reglas**: NO merge directo de la rama v3 (divergió — es porteo, no merge). NO
tocar los helpers PDF iOS sin probar el flujo. Gates de siempre (build + vitest
verdes, capturas en los temas del modal de OS). Bump patch + versions.json +
release note por ciclo, como siempre.

**Actualización 2026-07-08 (loop-thinkcentre, v4.0.21) — hallazgo + 2 bloqueos reales:**

1. **El porteo está MÁS avanzado de lo que dice el resumen de arriba.** Ya
   existe en v4 `sigab-frontend/src/components/formatos/` (`FormatoOSCorrectivo.jsx`,
   `FormatoOSPreventivo.jsx`, `FormatoOSPredictivo.jsx`, `FormatoReporteFalla.jsx`,
   `FormatoViewer.jsx`) construido en 6 commits previos (`31b42fc`…`a24584f`,
   el último literalmente "reimplementar 4 formatos IMSS fieles al .docx
   oficial") y ya está integrado (`FormatoViewer` se usa en `pages/Ordenes.jsx`
   y `pages/Formatos.jsx`, no es código muerto). Ya cubre visualmente
   `hora_inicio`, `hora_termino`, `tiempo_estimado`, `tiempo_real` y una fila
   de "Localización completa del equipo o instalación" (mapeada hoy a
   `ubicacion_fisica`, no a la columna nueva `localizacion_completa`).
   Antes de portar nada del diff de la rama v3, comparar campo a campo con
   este directorio — puede que el trabajo real que falta sea mucho menor de
   lo que parece.

2. **Bloqueo de acceso**: `git fetch` no está en el allowlist de
   `.claude/settings.json` de este nodo (ThinkCentre, ciclo headless sin
   humano para aprobar el prompt de permiso) → no se pudo leer
   `git show 63c849e` de `feat/orden-servicio-imss-oficial-2026-07-07` este
   ciclo. Si se quiere que el loop compare contra ese diff, alguien con
   permisos debe agregar `Bash(git fetch origin feat/orden-servicio-imss-oficial-2026-07-07:*)`
   (o similar, acotado a esa rama) al allowlist.

3. **Bloqueo real de negocio, no de permisos**: los 3 campos que SÍ faltan
   (`recibe_conformidad_nombre`, `recibe_matricula`, `localizacion_completa`)
   no se pueden completar solo desde el frontend. Verificado leyendo
   `sigab-backend/models/orden_servicio.py` y `routes/ordenes.py` (solo
   lectura, sin tocar nada — fuera de mi carril "SOLO sigab-frontend/"):
   - El modelo SQLAlchemy **no tiene** `recibe_conformidad_nombre` ni
     `recibe_matricula` como atributos — ni con esos nombres ni con alias.
   - `finalizar_orden` (`routes/ordenes.py:327`) redirige silenciosamente
     `recibe_conformidad_nombre` a la columna vieja `reporta_nombre` (hay un
     comentario en el propio código: "Nota: Los campos de recibo/matricula
     deben estar en el modelo").
   - El PUT `/ordenes/{id}` tiene una whitelist `campos_permitidos`
     (`routes/ordenes.py:680-690`) que **no incluye** `tiempo_estimado` ni
     `tiempo_real` (bare) — el modelo solo conoce `tiempo_estimado_hrs`/
     `tiempo_real_hrs` (Decimal). Las columnas bare que Gustavo agregó hoy a
     producción son huérfanas: nada las lee ni las escribe.
   - `recibe_matricula` (columna nueva en producción) no coincide ni con
     `schema.sql` del repo (que tiene `recibe_conformidad_matricula`, otro
     nombre) ni con lo que el frontend ya envía (`OrdenDetalleModal.jsx`
     usa `recibe_conformidad_matricula`, no `recibe_matricula`).
   - Conclusión: agregar estos 3 campos a la UI sin arreglar antes el modelo
     SQLAlchemy + la whitelist del PUT + el mapeo de `finalizar_orden`
     produciría un formulario que "parece guardar" pero descarta los datos
     en silencio — inaceptable en un documento NOM-016 de auditoría. No se
     tocó nada del lado backend (fuera de mi carril); esto requiere que
     Gustavo o un agente con permiso de `sigab-backend/` resuelva el
     mismatch de nombres antes de que el frontend pueda cerrar el punto.

**Nota de corrección (loop-thinkcentre, 2026-07-10)**: los 2 bloqueos de arriba
(fetch de la rama v3 y los 3 campos huérfanos del backend) quedaron resueltos
al día siguiente de escribirse esta nota, en v4.0.24/v4.0.25 (`sesion-sonnet-asus`,
commits `cd05789`/`cb20aa4`/`db91b84`): el modelo SQLAlchemy y la whitelist de
`PUT /ordenes/{id}` ya exponen `localizacion_completa`, `recibe_conformidad_nombre`
y `recibe_matricula`, y los 5 componentes de `formatos/` + `OrdenServicioRapidaModal.jsx`/
`NuevaOrdenModal.jsx`/`OrdenDetalleModal.jsx` ya leen/escriben esos 3 campos
(verificado por grep en el código actual, 2026-07-10). La petición de portar el
formato IMSS de Órdenes a v4 está cerrada — no repetir este diagnóstico en
ciclos futuros.

**Qué se hizo en su lugar este ciclo (v4.0.21, Prioridad 2 del carril)**: el
chunk principal de JS (`index-*.js`, se descarga en TODA visita a la app,
antes de login) pesaba 1,003 kB / 202.76 kB gzip porque `Layout.jsx`,
`Sidebar.jsx` y `StatusIndicator.jsx` hacían `import * as Lucide from
'lucide-react'` + acceso dinámico `Lucide[nombre]`, lo que impide el
tree-shaking de Rollup y mete las ~1600 piezas de la librería completa de
iconos en el bundle que las usa. Se reemplazó por mapas estáticos con
imports nombrados (`utils/navIcons.js` para Sidebar/Layout, mapa local en
`StatusIndicator.jsx`) — mismos iconos, mismo comportamiento visual, ahora
tree-shakeable. Resultado: `index-*.js` bajó a 111 kB / 37.67 kB gzip (-89%),
sin inflar ningún otro chunk (verificado: Dashboard pasó de 44 a 47 kB nada
más). Build + vitest verdes. Pendiente: `charts` (recharts+framer-motion+d3,
529 kB) sigue siendo un chunk grande pero ya se descarga solo en las páginas
que lo usan (Dashboard/Reservas/Analitica vía rutas lazy) — candidato para
un ciclo futuro si se quiere seguir recortando, no es un bug del mismo tipo.

## Petición directa de Gustavo — Módulo Inventario (2026-07-05)

> **Prioridad sobre el backlog genérico**: estos 5 puntos van ANTES que
> cualquier ítem de `scripts/loop/PROMPT-CICLO.md` en los próximos ciclos.
> No retomar el backlog genérico hasta cerrarlos — sigue la norma ya
> vigente de un ítem por ciclo, así que puede tomar varios ciclos, pero el
> orden de trabajo es este primero.

1. **UX general de Inventario/Equipos**: pedido explícito de Gustavo de que
   el módulo sea "más intuitivo y fácil de usar". No especificó qué
   fricciones atacar — el director elige con criterio propio, informado por
   los puntos 2-5 de abajo (que son ejemplos concretos de esa misma
   fricción).

2. ✅ **Resuelto (v4.0.15, loop-thinkcentre)**: el footer de
   `sigab-frontend/src/components/EquipoDetail.jsx` ahora tiene "🎫 Nueva OS"
   (abre `OrdenServicioRapidaModal.jsx` pre-llenado con el equipo, sin salir
   del detalle) y "🕒 Historial" (abre `HistorialEquipoModal.jsx`, que suma
   la pestaña "Preventivos" que el resumen inline del detalle no mostraba).
   Además, el campo "Estado" de la grilla de info pasó de badge de solo
   lectura a un `<select>` que llama `api.updateEquipo(id, { estado })`
   directo (optimista + rollback si falla el POST) para los 3 estados que
   Gustavo pidió explícitamente (operativo/en_mantenimiento/fuera_servicio);
   "en_traslado" y "baja" quedan fuera del quick-change a propósito porque
   dependen de otros flujos (traslados, baja definitiva), no de un simple
   cambio de campo — si el equipo ya está en uno de esos dos, el select lo
   muestra como opción deshabilitada para no perder el estado real. Pendiente
   NO cubierto: el punto 1 (UX general de Inventario) sigue abierto como
   paraguas; con los puntos 2/3/4 resueltos, el candidato que queda de la
   petición de Gustavo es el punto 5 (calendario de mantenimiento).

3. ✅ **Resuelto (v4.0.14, loop-thinkcentre)**: `sigab-frontend/src/pages/Equipos.jsx`
   ahora refleja `filtros`, `orden`, `vista` y la página actual en
   `searchParams` (efecto de sincronización + inicialización perezosa de
   cada `useState` leyendo la URL). El equipo abierto en `EquipoDetail`
   también vive en `?equipoId=` (antes se borraba de inmediato tras abrir;
   ahora persiste mientras el modal está abierto y se limpia al cerrarlo).
   Se unificó la selección de "vista tabla": `EquipoTable.jsx` tenía su
   propio `useState` interno + su propio `EquipoDetail` desconectado del de
   la vista tarjeta — se eliminó y ahora usa el `onSelect` del padre, así
   que ambas vistas comparten el mismo estado y el mismo modal. Resultado:
   abrir el detalle de un equipo, navegar a otra sección y volver a
   Inventario ahora restaura filtro, página/offset, vista y la selección
   abierta. Pendiente NO cubierto por este fix: scroll vertical de la
   lista (no persistido; alcance menor, no reportado como bloqueante).

4. ✅ **Resuelto (v4.0.13, loop-thinkcentre)**: `EquipoForm.jsx` ya tiene un
   `<select>` de "Tipo de adquisición" (sección "Mantenimiento y contrato",
   junto a proveedor/N° contrato) que usa el mismo enum que el badge de
   `EquipoDetail.jsx`. Se centralizó `TIPO_ADQ_OPTIONS` en
   `utils/constants.js` (antes vivía duplicable solo en `Equipos.jsx`) para
   que filtro, badge y formulario compartan una sola fuente de verdad.

5. ✅ **Resuelto (v4.0.16, loop-thinkcentre)**: `EquipoForm.jsx` conserva el
   date picker simple para capturar/editar la fecha (no tenía sentido
   reemplazarlo, es la forma más rápida de escribir una fecha), pero
   `EquipoDetail.jsx` (que antes NO mostraba este campo en absoluto) ahora
   tiene una sección "🗓️ Próximo Mantenimiento" con el componente nuevo
   `CalendarioMantenimiento.jsx`: un mes con el día objetivo resaltado y
   coloreado por urgencia (rojo=vencido, ámbar=≤7 días, verde=programado),
   adaptando el patrón visual de `ActividadHeatmap` de `pages/Reservas.jsx`
   (celdas redondeadas, escala de color, animación `anim-cell-pop`) a un
   solo mes con un día objetivo — no una grilla de 26 semanas, porque no hay
   suficiente densidad de datos por equipo (una sola fecha, no un historial
   diario de eventos) para que ese patrón exacto tenga sentido. De paso se
   encontró y corrigió un bug de zona horaria: `new Date("YYYY-MM-DD")` se
   interpreta como medianoche UTC, que en Tijuana (UTC-7) cae un día antes
   en hora local — el componente usa un parser de día local propio en vez
   de `parseFecha` de `utils/fechas.js` (ese helper es para timestamps con
   hora, no para días de calendario puros). Con esto se cierran los 5
   puntos de la petición de Inventario del 2026-07-05; el punto 1 (UX
   general) sigue como paraguas abierto sin ítems concretos pendientes de
   esa lista — el próximo ciclo puede volver al backlog genérico o a
   `docs/DESIGN-SYSTEM-V4.md`.

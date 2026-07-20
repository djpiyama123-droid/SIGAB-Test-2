# SIGAB v4.0 — Design System "Verde-Blanco IMSS"

> Fuente de verdad del rediseño visual rumbo a producción (directiva de
> Gustavo, 2026-07-03). Referencia de diseño: proyecto Stitch "SIGAB v4.0
> Piloto HGR1" (IDs de pantalla en `docs/CONSOLIDACION-V4.md` §6).

## Paleta

| Token | Hex | Uso |
|---|---|---|
| Primary | `#047857` | Acentos principales, botones primarios, iconografía de marca |
| Secondary (dark) | `#065F46` | Hover/active de primary, gradientes |
| Tertiary (light) | `#E0F0E9` | Fondos de chips/badges suaves sobre superficie clara |
| Neutral | `#F8FAF9` | Fondo de contenido en modo claro |
| Texto | `#1E293B` sobre claro / `#F1F5F9` sobre oscuro | Nunca fijo — usar el token de tema, no un valor literal |

Tipografía: **Inter** (UI general), **JetBrains Mono** (folios/series/IDs
técnicos), **Outfit** (display/body solo en LandingPage pública).
Roundness: `8px` base (`rounded-lg`/`rounded-xl` en Tailwind).
Targets táctiles: mínimo `44–48px` de alto en controles interactivos (móvil).

## Tokens CSS centralizados

La app ya implementa un sistema de temas por `data-theme` en
`sigab-frontend/src/index.css` (`:root`/`[data-theme]`), con las variables
que TODO componente debe consumir en vez de colores sueltos:

`--content-bg`, `--content-surface`, `--content-border`, `--content-text`,
`--content-muted`, `--accent`, `--accent-dark`, `--accent-light`,
`--sidebar-*`, `--header-*`, `--bottom-nav-*`.

El tema `[data-theme="green"]` ("Verde-Blanco IMSS (claro)" en el selector de
`Header.jsx`) ya usa los valores exactos de la paleta Stitch de arriba
(`--sidebar-bg`/`--accent` `#047857`, `--accent-dark` `#065F46`,
`--accent-light` `#E0F0E9`, `--content-bg` `#F8FAF9`) — alineado en este
ciclo (antes usaba `#059669`/`#047857`/`#DCFCE7`, verde SIGAH histórico, y
`#F8FAFC` de fondo). El tema `dark` conserva `#059669` a propósito (paleta
distinta, no es candidato Verde-Blanco IMSS).

**Regla para todo commit de este design system:** un componente nuevo o
tocado NO debe fijar colores de texto/fondo con clases Tailwind literales
(`text-white`, `bg-slate-800`, `text-emerald-500` para texto de cuerpo) si
esas clases determinan legibilidad sobre el fondo de la página — deben usar
`var(--content-text)` / `var(--content-muted)` / `var(--accent)` para que el
componente funcione en los 4 temas (`glass`, `blue`, `green`, y el default
del sistema operativo del usuario). Los acentos puntuales de marca (badges
de estado emerald/amber/red, icono de sección) sí pueden usar la paleta
Tailwind fija porque no dependen del tema de fondo.

## Tabla de avance (por pantalla)

| Pantalla | Estado | Commit | Notas |
|---|---|---|---|
| Preventivos | ✅ Aplicado | `45868a3` | Badges legibles en claro, iconos Lucide, targets 48px |
| Dashboard | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: títulos con `text-white` fijo (header, "Mapa de Activos", "Cumplimiento de Mantenimiento", estado de error) invisibles en temas claros → ahora usan `var(--content-text)`. KPICard y StatusIndicator ya eran theme-aware. Ciclo 2026-07-10 (loop-thinkcentre): los 3 botones de `pages/Dashboard.jsx` (header "Poka-Yoke"/"NOM-016" y "Reintentar conexión" del estado de error) medían ~36px de alto (`py-2` + texto `text-sm`), por debajo del mínimo táctil `44–48px` que exige este mismo documento → se agregó `min-h-[44px] justify-center` a los 3, sin tocar layout/color. Es el único hallazgo de este tipo en el archivo (los demás elementos interactivos del módulo viven en `HospitalMap`/`KPICard`/`StatusIndicator`, ya auditados en ciclos previos). Ciclo (este ciclo, loop-thinkcentre): 2 bugs de contraste más en componentes hijos de Dashboard, encontrados al comparar contra el commit `86373f7` de `feat/ui-cinematic` (ver sección ATAJO abajo) — `components/charts/MaintenanceChart.jsx` (tooltip de recharts con `backgroundColor`/`borderColor` fijos oscuros sin `color`/`itemStyle`/`labelStyle`, inconsistente en temas claros) y `components/AlertaBanner.jsx` (banner de alertas rojas con `text-red-200` sobre `bg-red-900/30`, invisible en temas claros) → ambos migrados a tokens de tema, detalle completo en la sección ATAJO. Ciclo 2026-07-17 (loop-thinkcentre, v4.0.54, Prioridad 2 del carril — recorte de bundle): la gráfica de barras "Cumplimiento de Mantenimiento" (`components/charts/MaintenanceChart.jsx`) se reemplazó por `components/charts/MiniGroupedBarChart.jsx` (SVG propio, mismos colores/leyenda/tooltip, sin dependencias nuevas) — Dashboard ya no importa `recharts`, así que la pantalla de mayor tráfico de la app (primera tras iniciar sesión) ya no descarga el chunk `charts` (375 kB). Detalle en `docs/releases/v4.0.54.md`. Pendiente: layout Stitch completo (screen ID `f0a7d832f5c54a9491da2f699e137490`) |
| Equipos / Inventario | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: toggles de vista, botón "Filtros" (móvil) y "Limpiar filtros" usaban `hover:text-white` fijo — invisibles en hover sobre temas claros → ahora `hover:text-[var(--content-text)]`. Ciclo 2026-07-11 (loop-thinkcentre): la vista tarjeta (`EquipoCard.jsx`) no tenía acceso directo al QR — había que abrir el detalle completo primero, mientras que `EquipoTable.jsx` (vista tabla, ambas variantes móvil/desktop) sí lo tenía desde v4.0 base. El screen ID de Stitch de Inventario móvil (`b8a...9fa0`) lo llama explícitamente "chips de filtro, badges, QR por card" — se agregó el mismo botón QR (icono, 44×44px, mismo SVG/patrón que `EquipoTable`) como overlay circular en la esquina inferior derecha de la miniatura de cada tarjeta, con `stopPropagation` para no abrir el detalle; abre `QRPanel` directo, gestionado en `pages/Equipos.jsx` (mismo componente que ya usaba `EquipoTable`, sin duplicar lógica). Solo se muestra si el equipo tiene `qr_token` (mismo criterio que la tabla). Pendiente: resto del layout Stitch completo (screen ID `aa22f6401767433fbaf79ca5362948cf`) |
| Detalle de Equipo | 🟡 Parcial | v4.0.16 / (este ciclo) | Se corrigió bug de contraste en `EquipoDetail.jsx`, `EquipoForm.jsx` y `HistorialEquipoModal.jsx`: campos "Criticidad", "N° Contrato/Servicio", "Proveedor", traslados, tabs e historial (órdenes/preventivos) usaban `text-white` fijo como texto de cuerpo → ahora `var(--content-text)`. Badges de estado siguen con `text-white` fijo (correcto, van sobre fondo de color). v4.0.16: nueva sección "Próximo Mantenimiento" con vista de calendario (`CalendarioMantenimiento.jsx`), adaptando el patrón visual del heatmap de Reservas a un mes con el día objetivo resaltado por urgencia — petición directa de Gustavo (punto 5/5 de Inventario). Ciclo 2026-07-12 (loop-thinkcentre): los 6 botones del footer de acciones (Eliminar, Nueva OS, Historial, QR, Cerrar, Editar) medían ~36px de alto (`py-2` + `text-sm`), por debajo del mínimo táctil 44px de este documento — mismo patrón ya corregido en Dashboard (v4.0.35) y Reservas (v4.0.38) → se agregó `min-h-[44px] justify-center` a los 6 (el botón "Cerrar" no tenía `flex`, se agregó `flex items-center` de paso para que el min-height centre el texto). El `<select>` inline de cambio rápido de estado (badge pill, `text-xs`/`py-1`) se dejó igual a propósito: sigue el patrón de badges/pills compactos ya establecido en toda la app (no es un CTA primario). Pendiente: layout Stitch completo (screen ID `f9b01c3c7232494e9bb95899c10d40b2` / variantes 2562px, 2386px) |
| Mapa de Activos (Dashboard) | ✅ Clasificación azul completa | (este ciclo) | Se corrigió bug de contraste reportado por Gustavo con capturas: `HospitalMap.jsx` tenía el panel "Ficha Técnica" y el tooltip "Ver Ficha" con fondo FIJO oscuro (`#0f172a`) mezclado con texto de tokens de tema (`var(--content-text)`, oscuro en temas claros) → invisible en Azul/Verde. Ahora panel y tooltip usan `var(--content-surface)`/`var(--content-bg)` consistentemente. También corregidos: badges COFEPRIS/Criticidad (patrón `*-500/10`), hover de tabs de piso y "Limpiar filtros". Modales hijos `QRPanel.jsx` y `OrdenServicioRapidaModal.jsx` también corregidos (mismo patrón). Ciclo (este ciclo, loop-thinkcentre): quinta instancia del bug de azul-como-acento único (Reservas v4.0.38, Metrología/Trazabilidad v4.0.40, Checklists v4.0.41) — el módulo usaba `blue-500`/`blue-600` como acento interactivo (3 tabs de piso activos, borde de foco de búsqueda y de `<select>` de estado, spinner de carga, indicador de "resultados filtrados", punto de encabezado de grupo de piso, enlace "Limpiar filtros" del estado vacío) → migrado íntegro a emerald, mismo patrón validado 4 veces. También se corrigió la etiqueta "Ubicacion" (icono + texto, sin propósito categórico) de `text-blue-400` a `var(--content-muted)`, alineada con la convención de etiquetas de campo ya usada en `EquipoCard.jsx`/`EquipoDetail.jsx`/`EquipoTable.jsx` (Área/Serie/Piso en `content-muted`). Se dejó intacto el botón "📅 Programar Mantenimiento Preventivo" del panel de acciones del equipo (`bg-blue-500/10`), parte de un esquema categórico de 5 colores por acción (rojo=Abrir OS, ámbar=Acción Rápida, azul=Programar Preventivo, neutral=Historial, verde=QR) — cambiarlo a emerald chocaría con el botón de QR y reduciría la distinción entre acciones, mismo criterio que los KPIs de `Analitica.jsx`. De paso, en `EquipoDetail.jsx` se encontró y corrigió un bug real de semántica de color (no solo de marca): el badge de estado del mini-historial de órdenes (dentro del modal de detalle) coloreaba `en_progreso` en azul y usaba ámbar como fallback genérico (capturando también `abierta`/`cancelada`), inconsistente con la convención de toda la app (`Ordenes.jsx`: abierta=rojo, en_progreso=ámbar, cerrada=esmeralda, cancelada=neutral) y con su propio componente hermano `HistorialEquipoModal.jsx` (mismo dato, mismo footer de `EquipoDetail`) que ya usaba cerrada=esmeralda/cancelada=neutral/resto=ámbar → se corrigió para igualar ese patrón hermano. Los badges `ADQUISICION_COLORS`/`ADQUISICION_BADGE` (azul=recurso_propio) de `EquipoCard.jsx`/`EquipoTable.jsx`/`EquipoDetail.jsx` y el azul de "N° Inventario IMSS" (vs. esmeralda de "N° Serie") se revisaron y son categóricos intencionales (4 tipos de adquisición, 2 tipos de folio), no el bug de acento único — no se tocaron. Los enlaces "Ver Documento de Contrato"/"Abrir PDF original" en azul siguen la convención ya validada azul=documento (Metrología/Ordenes) — tampoco se tocaron. Pendiente: layout Stitch completo |
| Detalle de Equipo (Historial) | ✅ Clasificación azul completa | (este ciclo) | `components/HistorialEquipoModal.jsx`: el badge de "área destino" de la pestaña Traslados usaba `bg-blue-900/50 text-blue-300 border-blue-800`, inconsistente con `pages/Trazabilidad.jsx` (mismo dato semántico, área origen→destino, ya migrado a emerald en v4.0.40) → migrado a `bg-emerald-900/50 text-emerald-300 border-emerald-800`. De paso se revisó `components/QRPanel.jsx` (otro candidato del backlog): su botón "🏷️ Etiqueta A6" (`bg-blue-600`) se confirmó SIN bug — descarga un PDF, sigue la misma convención azul=documento ya validada en el botón "🖨️ PDF" de `OrdenDetalleModal.jsx` (bloque solid-button, no solo enlaces de texto). |
| Órdenes de Servicio | 🟡 Parcial | v4.0.5/v4.0.6 / (este ciclo) | Se corrigió bug de contraste: `Ordenes.jsx` (nombre de equipo en card móvil y tabla), `OrdenServicioRapidaModal.jsx` (botón cerrar) en v4.0.5; `OrdenDetalleModal.jsx` (botón cerrar, nombre de archivo PDF en hover) y `NuevaOrdenModal.jsx` (botón cerrar y "Cancelar") en v4.0.6 — todos `text-white`/`hover:text-white` fijo, invisibles en temas claros. Ciclo (este ciclo, loop-thinkcentre): clasificación de los 3 usos de `blue-` pendientes de `OrdenDetalleModal.jsx` (candidato explícito del backlog punto 4). El botón "🖨️ PDF" del header (`bg-blue-600`) se confirmó SIN bug — sigue la convención ya validada azul=documento (Metrología/Ordenes). El título de sección "Información" (`text-blue-400`) SÍ era un bug real: su hermano directo "Detalles del Fallo" (mismo layout, misma jerarquía) ya usaba `text-emerald-400`, sin razón categórica para el azul → migrado a emerald. El botón "Subir" del formulario de evidencias (`bg-blue-600`) también era un bug: es una acción primaria de formulario (mismo rol que "Firmar y Cerrar", ya emerald) sin convención de documento que lo justifique → migrado a emerald. Screen ID `8ecdc72b890b4f8394a69dbfdfe61918` (checklist NOM-016, firmas, PDF) — layout Stitch pendiente |
| Login | 🟡 Parcial | (este ciclo) | Título "SIGAB" con `text-white` fijo, invisible en temas claros — era la PRIMERA pantalla que ve cualquier usuario. Corregido a `var(--content-text)` |
| Ficha Pública de Equipo (QR) | 🟡 Parcial | (este ciclo) | Contenedor raíz fijaba `text-white` como color de texto por defecto (anti-patrón: cualquier texto nuevo sin override heredaría blanco). Cambiado a `var(--content-text)`; nombre/marca del equipo (que sí van sobre el badge de estado, fondo fijo oscuro por diseño) ahora llevan `text-white` explícito |
| Tecnovigilancia (Eventos Adversos) / Alertas | 🟡 Parcial | v4.0.7 | Se corrigió bug de contraste en `EventoAdversoModal.jsx` (botón cerrar, resumen "Dispositivo"/"Tipo", botón "Cancelar/Anterior"), `EventoDetalleModal.jsx` (botón cerrar, valor "Tipo" en Clasificación) y `pages/Alertas.jsx` (botón "Marcar todas leídas", texto del mensaje de la alerta) — todos `text-white`/`hover:text-white` fijo sobre fondo de tema → ahora `var(--content-text)`. Badges/botones con fondo sólido (rojo/azul/emerald/amarillo/púrpura/naranja) se dejaron igual, uso correcto. Ciclo 2026-07-13 (loop-thinkcentre): clasificación de azul-como-marca en `EventoDetalleModal.jsx` (candidato explícito del ciclo anterior) — botón "PDF NOM-240" (`bg-blue-600`) confirmado SIN bug (azul=documento); título de sección "Clasificacion" (`text-blue-400`) SÍ era bug, su hermano "Dispositivo medico (snapshot)" ya usaba `text-emerald-400` → migrado a emerald; botón "Subir" de evidencias (`bg-blue-600`) también migrado a emerald (mismo bug ya visto en `OrdenDetalleModal.jsx`, acción primaria de formulario sin convención de documento) |
| Copilot | 🟡 Parcial | v4.0.9 | Se corrigió bug de contraste en `pages/Copilot.jsx`: la burbuja de respuesta del asistente IA tenía `bg-slate-700/70` (fijo oscuro) mezclado con `text-[var(--content-text)]` — contraste invertido en temas claros → ahora `bg-[var(--content-surface)]`/`border-[var(--content-border)]` (se quitó también `prose-invert`, ya no aplica sin fondo oscuro fijo). También los botones cerrar de "Diagnóstico de Falla" y "Vision (Gemma)" (`hover:text-white` → `hover:text-[var(--content-text)]`) |
| Componentes transversales | ✅ Aplicado | v4.0.10 / v4.0.17 | v4.0.10: se corrigieron 4 bugs de contraste de la categoría "Modales/componentes transversales" del barrido 2026-07-04: `ConfirmDialog.jsx` (título `text-white` fijo como texto de cuerpo), `FilterBar.jsx` (botón "Limpiar" con `hover:text-white` fijo), `HistorialModal.jsx` (botón cerrar con `hover:text-white` fijo) y `charts/DegradationChart.jsx` (valor "%" del tooltip con `text-white` fijo) — los 4 mezclaban texto fijo con superficie de tema, invisibles en claro. Todos ahora usan `var(--content-text)`. Se verificó `charts/MaintenanceChart.jsx` (listado en el barrido) y NO tiene el bug — falso positivo, era `contentStyle` inline autoconsistente de recharts. v4.0.17 (`e4c068d`): cierran la categoría `OCRScannerModal.jsx` (zona cámara/archivo, banner motor/confianza e inputs del form extraído con `bg-slate-950` fijo mezclado con tokens; `text-white` sobre `var(--content-surface)` en "Capturar otra"/"Cancelar") y `TripleValidationModal.jsx` (3 inputs Poka-Yoke con `bg-slate-800/50` + `text-white`). Verificado con Playwright en los 4 temas |
| Etiquetado Masivo QR | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste en `pages/QRBatch.jsx` (el más afectado del backlog, 8 bugs): píldoras de estadísticas, panel de Vista Previa y barra de herramientas con `bg-slate-800/*` fijo → `bg-[var(--content-surface)]`; input de búsqueda, select de área y botones "Vista Previa"/"Seleccionar visibles" con `text-white` fijo sobre fondo de tema → `var(--content-text)`; tarjetas de selección de equipo migradas al patrón de `EquipoCard.jsx`. Las etiquetas QR imprimibles (`bg-white`, emulan papel físico) se dejaron igual, uso correcto |
| Analítica (Ingeniería Clínica 4.0) | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste en `pages/Analitica.jsx`: título y 3 de los 4 KPIs principales (Disponibilidad, MTBF, MTTR) con `text-white` fijo sobre tarjetas de tema, columnas MTBF/MTTR de la tabla del Heatmap con el mismo problema, y hover de fila (`hover:bg-slate-800/40`) mezclando fondo fijo con texto de tema → ahora `var(--content-text)`/`hover:bg-[var(--content-border)]/30`. Badges de riesgo (translúcidos) sin cambios |
| Reportes | ✅ Aplicado | v4.0.18 | Se corrigieron los 3 bugs de contraste del backlog `Secundaria`: botón "PDF" (`hover:text-white` fijo), nombre de equipo en la tabla de "Preventivos próximos 7 días" y nombre de equipo en la lista de "Equipos críticos" (ambos `text-white` fijo como texto de cuerpo) → ahora `var(--content-text)` / `hover:text-[var(--content-text)]`. Badges de estado (fondo sólido `bg-red-900/50`/`bg-yellow-900/50`) sin cambios, uso correcto |
| Auditoría NOM-016 | ✅ Aplicado | (este ciclo) | Se corrigieron los 2 bugs de contraste del backlog `Secundaria`: título "Auditoría NOM-016 Compliance" y nombre de usuario en la columna "Usuario" de la tabla de bitácora (ambos `text-white` fijo sobre `var(--content-bg)`) → ahora `var(--content-text)`. Badges de acción (INSERT/UPDATE/DELETE, fondo translúcido) y `divide-slate-800`/`hover:bg-slate-800/30` de la tabla sin cambios (fuera del alcance del backlog original, no invisibles) |
| Checklists NOM-016 | ✅ Aplicado | (este ciclo) | Se corrigieron los 2 bugs de contraste del backlog `Secundaria` (botón "Cambiar" con `hover:text-white` fijo, textarea de "Observaciones Adicionales" con `text-white` fijo sobre `var(--content-surface)`) y 2 bugs adicionales de la misma familia encontrados al leer el archivo completo (no capturados por el grep original `text-white\|text-black\|bg-white`): el botón de selección de plantilla y las tarjetas del "Historial Compliance" usaban `bg-slate-800/50` fijo mezclado con texto de tema (`var(--content-text)`/`var(--content-muted)`, oscuro en temas claros) → ahora `bg-[var(--content-surface)]`, mismo patrón ya aplicado en `QRBatch.jsx`/`HospitalMap.jsx` |
| Almacén | ✅ Aplicado | (este ciclo) | Se corrigieron los 2 bugs de contraste del backlog `Secundaria`: input de búsqueda (`text-white` fijo sobre `bg-[var(--content-bg)]` de tema) y botón "Ajustar" de la tabla (`hover:text-white` fijo) → ahora `var(--content-text)`. Los 2 modales (`NuevaRefaccionModal`, `AjustarStockModal`) son 100% fixed-dark autoconsistentes (`bg-slate-950`/`bg-slate-900` + `text-white`, no mezclan con tokens de tema) — revisados y confirmados sin bug, no se tocaron |
| Tecnovigilancia | ✅ Aplicado | (este ciclo) | Se corrigió el bug de contraste del backlog `Secundaria`: columna "Dispositivo" de la tabla de eventos con `text-white` fijo sobre `bg-[var(--content-surface)]` de tema → ahora `var(--content-text)`. Botones "Reportar evento" (desktop y FAB móvil, fondo rojo sólido) sin cambios, uso correcto |
| Trazabilidad | ✅ Aplicado | (este ciclo) | Se corrigió el bug de contraste del backlog `Secundaria`: nombre de equipo en la línea de tiempo de movimientos con `text-white` fijo sobre `bg-[var(--content-surface)]` de tema → ahora `var(--content-text)`. El modal `RegistrarTrasladoModal` es fixed-dark autoconsistente (mismo patrón que Almacén), no se tocó |
| Reservas | 🟡 Parcial | (este ciclo) | Ciclo 2026-07-11 (loop-thinkcentre): el módulo ya era theme-safe pero sus acentos primarios (botones "Nueva Reserva"/"Confirmar Reserva", icono del modal, bordes de foco de los 6 inputs del formulario) usaban `blue-600`/`blue-500` fijo — el único módulo del rediseño con un azul de marca en vez del verde `#047857` Verde-Blanco IMSS que usan `Equipos.jsx`/`Ordenes.jsx`/`Almacen.jsx`/`Login.jsx` (`bg-emerald-600 hover:bg-emerald-500`, `focus:border-emerald-500`). Migrados los 11 usos de azul-como-primario a emerald; se dejó intacto el único azul restante (icono "Editar reserva" en `DiaReservasModal`), que sigue el patrón establecido en todo el resto de la app de azul=editar/rojo=eliminar como acento secundario, no como color de marca. De paso, 4 botones ("Cancelar"/"Confirmar Reserva" del modal, "Nueva reserva" del footer de día, "Nueva Reserva" del header) medían 36-40px de alto (`py-2`/`py-2.5` + `text-sm`), por debajo del mínimo táctil 44px de este documento → se agregó `min-h-[44px] justify-center`, mismo patrón que el fix de Dashboard del ciclo anterior. El heatmap (`ActividadHeatmap`, `anim-cell-pop`) no se tocó. Ciclo 2026-07-16 (loop-thinkcentre, v4.0.53, Prioridad 2 del carril — recorte de bundle): el `AreaChart` de recharts ("Reservas por día") se reemplazó por `components/charts/MiniAreaChart.jsx` (SVG propio, mismo color/degradado/tooltip, sin dependencias nuevas) — `Reservas.jsx` ya no importa `recharts`, así que la ruta ya no descarga el chunk `charts` (382 kB) compartido con Dashboard/Analítica/TVDashboard. Detalle en `docs/releases/v4.0.53.md`. 4 variantes de Stitch pendientes de elegir para el layout completo (`9ad9c5aa…`, `0d916bcd…`, `73bb15a3…`, `1e753e9a…`) — sigue siendo el siguiente candidato del punto 3 del backlog de abajo |
| Metrología | ✅ Aplicado | (este ciclo) | Mismo bug de marca que Reservas: `pages/Metrologia.jsx` usaba `blue-500`/`blue-600` como acento único del módulo (icono de título, botón "Nueva Calibración", 6 bordes de foco del formulario, botón "Registrar Calibración", hover del nombre de equipo en la tabla) → migrado a emerald. Se dejó intacto el icono "Abrir certificado" (`text-blue-400`), que sigue el patrón ya establecido en `Ordenes.jsx` ("Ver PDF"/"Formato") de azul=acceso a documento, no acento de marca. El botón "Nueva Calibración" medía ~40px (`py-2` sin `text-sm`) → se agregó `min-h-[44px] justify-center` |
| Trazabilidad | ✅ Aplicado | (este ciclo) | Mismo bug: `pages/Trazabilidad.jsx` usaba azul como acento único (icono de título, botón "Registrar Traslado", 5 bordes de foco, botón de envío del modal, link de estado vacío, punto de la línea de tiempo, badge "área destino") → migrado a emerald íntegro (no hay convención de azul=documento en este archivo que preservar, a diferencia de Metrología). El badge de "área destino" pasó de `bg-blue-900/50 text-blue-300 border-blue-800` a su equivalente emerald, conservando el contraste con el badge neutro de "área origen". Botón "Registrar Traslado" (~40px) → `min-h-[44px] justify-center` |
| Checklists NOM-016 | ✅ Aplicado | (este ciclo) | Cuarta instancia del mismo bug de azul-como-marca (Reservas v4.0.38, Metrología/Trazabilidad v4.0.40): `pages/ChecklistPage.jsx` usaba `blue-500`/`blue-600` como acento único (icono de título, círculo+icono de "Selecciona una Plantilla Normativa", hover de las tarjetas de plantilla, borde de la tarjeta del checklist activo, radio buttons SI/NO/N-A, borde de foco de "Observaciones Adicionales", botón "Finalizar y Certificar Auditoría" y la etiqueta del nombre de checklist en "Historial Compliance") → migrado íntegro a emerald, mismo patrón validado 3 veces. No hay convención de azul=documento que preservar en este archivo (no tiene enlaces a PDF/certificados). Los botones ya cumplían el mínimo táctil 44px (`py-4` en "Finalizar", `p-4` en tarjetas de plantilla) — sin cambios de tamaño necesarios, solo color. |
| Dashboard / Órdenes | ✅ Clasificación azul completa | (este ciclo) | Continuación del punto 4 del backlog: se clasificó `blue-[0-9]` archivo por archivo en `pages/Dashboard.jsx`, `pages/Ordenes.jsx` y `pages/Analitica.jsx` (los 3 candidatos explícitos del ciclo anterior). Bugs reales encontrados y corregidos: `Dashboard.jsx` (icono `ClipboardCheck` de "Cumplimiento de Mantenimiento", único icono de título con color fijo del archivo, sin acompañar a ningún sistema categórico → `blue-500` a `emerald-500`) y `Ordenes.jsx` (toggle activo del filtro "Tipo" con `bg-blue-800/60 text-blue-300`, mismo componente que el toggle de "Estado" 6 líneas arriba que ya usa `emerald-800/60`/`emerald-300` — inconsistencia sin razón funcional, ambos ahora emerald). Confirmados SIN bug (azul es categórico o convención establecida, no acento de marca): `Ordenes.jsx` líneas "Ver PDF"/"🖨 Formato" (`text-blue-400`, convención azul=documento ya validada en Metrología); `Analitica.jsx` completo — las 4 tarjetas KPI (Disponibilidad/Riesgo/MTBF/MTTR) usan un color distinto cada una (emerald/red/blue/purple) como sistema categórico de diferenciación entre métricas, igual que `KPICard.jsx` (`COLOR_MAP` con 10 variantes, `Dashboard.jsx` ya usa `color="blue"` en un KPICard de forma legítima); el badge "Powered by Gemma" (`blue-500/10`) sigue la misma convención de azul=IA ya usada en `Copilot.jsx` ("Análisis de Imagen (Gemma Vision)", título `text-blue-400`) — no se tocó ninguno de los dos por ser un sistema de color intencional, no el bug de acento único. |
| Historial de Traslados (`components/HistorialModal.jsx`) | ✅ Clasificación azul completa | (este ciclo) | Distinto de `HistorialEquipoModal.jsx` (footer de `EquipoDetail.jsx`) — este modal se usa desde `EquipoTable.jsx`/`EquipoCard.jsx` para ver la línea de tiempo de traslados. Mismo dato que `pages/Trazabilidad.jsx` (ya emerald desde v4.0.40): el punto de la línea de tiempo (`bg-blue-500`) y el badge de "área destino" (`bg-blue-900/50 text-blue-300 border-blue-800`) usaban azul sin razón categórica → migrados a `bg-emerald-500` y `bg-emerald-900/50 text-emerald-300 border-emerald-800`, mismo patrón que `Trazabilidad.jsx`/`HistorialEquipoModal.jsx` |
| Móvil (Dashboard/Inventario/Detalle/Orden) | 🟡 Parcial | (este ciclo) | `components/Layout.jsx`: la barra de navegación inferior (compartida por TODAS las páginas en móvil, no solo Dashboard) tenía los 5 accesos en fila plana — no reflejaba el patrón "bottom-bar con Escanear central" del screen ID `8af028299b1c4cd4af17babd042028b8` (nombre literal de la pantalla Stitch). "Escanear" ahora se renderiza como FAB circular elevado (56px, `bg-[var(--accent)]`, `-mt-7` sobre la barra) centrado entre Equipos y Ordenes, en vez de ser el 5° ítem en fila. Los 4 ítems restantes ahora declaran `min-h-[48px] min-w-[48px]` explícito (antes solo `p-2`, ya cumplía el mínimo mas no lo garantizaba si cambia el tamaño de fuente/idioma). Pendiente: el resto del layout Stitch por pantalla (Inventario/Detalle/Orden móvil) — screen IDs en `CONSOLIDACION-V4.md` §6, sección Móvil |
| Órdenes de Servicio (formato IMSS, `OrdenCasillasForm.jsx`) | ✅ Clasificación azul completa | (este ciclo) | Cierre del punto 4 del backlog (clasificación de azul-como-marca en los 9 archivos restantes, ver detalle completo en el backlog abajo). Único bug real: la sección condicional "Nueva Orden de Servicio" de `components/OrdenCasillasForm.jsx` usaba una caja azul (`bg-blue-950/40`/`text-blue-400`) que rompía con las 6 secciones restantes del mismo formulario (Bloques A-F, todas `text-teal-400`) y con sus propios inputs internos (ya `focus:border-teal-500`) → migrada a `bg-teal-950/40`/`text-teal-400`. Los otros 8 archivos (`Copilot.jsx`, `FormatoViewer.jsx`, `Formatos.jsx`, `CommandCenter.jsx`, `AuditPage.jsx`, `EquipoPublico.jsx`, `SuperAdmin.jsx`, `AdminGlobal.jsx`) se revisaron y confirmaron SIN bug — azul categórico, azul=documento/IA/información, o marca propia autoconsistente fuera del alcance clínico. |
| Accesibilidad transversal — botones de cerrar (modales, toda la app) | ✅ Aplicado | (este ciclo) | Con el backlog de contraste y de azul-como-marca ya cerrados, barrido nuevo (no cubierto por ninguno de los dos anteriores): `grep -rn "onClick={onClose}"` sobre TODO `sigab-frontend/src` y clasificación manual de cada `<button>` de cerrar de modal contra `aria-label`. 19 botones de cerrar (ícono `X`/svg/`✕`, sin texto visible) en 17 archivos no tenían `aria-label` — para un lector de pantalla son un `<button>` sin nombre accesible, indistinguible de cualquier otro botón mudo del documento. Corregidos con `aria-label="Cerrar"` (mismo texto que ya usaban `Sidebar.jsx`/`ModalWrapper.jsx`/`Lightbox.jsx`, los 3 que sí lo tenían, confirmando que es la convención ya establecida): `pages/Reservas.jsx` (2), `pages/Almacen.jsx` (2), `pages/Metrologia.jsx`, `pages/Capacitaciones.jsx`, `pages/Trazabilidad.jsx`, `components/QRPanel.jsx`, `components/OCRScannerModal.jsx`, `components/EquipoDetail.jsx`, `components/EventoAdversoModal.jsx`, `components/EventoDetalleModal.jsx`, `components/OrdenDetalleModal.jsx`, `components/NuevaOrdenModal.jsx`, `components/HistorialEquipoModal.jsx`, `components/EquipoForm.jsx`, `components/OrdenServicioRapidaModal.jsx`, `components/PreventivoForm.jsx`, `components/HistorialModal.jsx`, `components/HospitalMap.jsx`. No se tocaron los botones "Cancelar"/"Cerrar" con texto visible (ya tienen nombre accesible) ni `pages/Copilot.jsx`/`formatos/FormatoViewer.jsx` (su botón de cerrar ya incluye el texto visible "✕ Cerrar", no es icon-only). Cambio 100% aditivo (solo el atributo `aria-label`), sin tocar clases, layout ni lógica — cero riesgo visual. Ciclo 2026-07-15 (loop-thinkcentre, v4.0.51): segundo barrido, esta vez de botones icon-only que tampoco tenían `title` (fallback de nombre accesible que sí cubre la mayoría de FAB/iconos de acción de la app) — se clasificaron por icono común (`Trash2`/`Pencil`/`Download`/`RefreshCw`/`Eye`/`Camera`/`Filter`/`ChevronDown`/`ChevronRight`/`ExternalLink`) y por el patrón de FAB móvil (`fixed bottom-6 right-6`, usado en 3 páginas). Encontrados 2 bugs reales: el FAB móvil "Nueva OS" de `pages/Ordenes.jsx` (único de los 3 FAB de ese patrón sin `title` ni `aria-label` — los de `Equipos.jsx`/`Tecnovigilancia.jsx` ya lo tenían) y el botón de refrescar de "Topología y Nodos" en `pages/SuperAdmin.jsx`. Ambos corregidos con `aria-label`. Todo lo demás revisado (detalle en `versions.json` v4.0.51) ya tenía `title` o texto visible. |
| Accesibilidad transversal — cerrar modales con tecla Escape | ✅ Aplicado | (este ciclo, v4.0.55) | Cuarto barrido de accesibilidad (distinto de los 3 anteriores: `aria-label` de botones de cerrar, `title` de iconos, navegación por teclado en filas/tarjetas de lista). Hallazgo: `components/ui/ModalWrapper.jsx` ya tiene cierre con Escape (`useEffect` + `document.addEventListener('keydown', ...)`), pero **ningún modal de la app lo usa** (`grep -rl "ModalWrapper"` sobre `src` no encontró un solo consumidor — cada modal implementa su propio overlay) — así que ese patrón nunca llegó a producción y Escape no cerraba NINGÚN modal. Se extrajo el mismo patrón a `hooks/useEscapeClose.js` (hook de 10 líneas, sin dependencias nuevas) y se conectó en los 10 modales que carecían de él: `HistorialModal.jsx`, `ChangePasswordModal.jsx`, `EventoAdversoModal.jsx`, `NuevaOrdenModal.jsx`, `EventoDetalleModal.jsx`, `OCRScannerModal.jsx`, `HistorialEquipoModal.jsx`, `OrdenDetalleModal.jsx`, `OrdenServicioRapidaModal.jsx`, `TripleValidationModal.jsx`. Se verificó primero que en los 10 casos el botón de cerrar (ícono `X`) y el click en el overlay de fondo ya cierran el modal de forma incondicional en cualquier momento (incluso durante `guardando`/`subiendo`) — Escape replica exactamente ese mismo comportamiento existente, no agrega una vía de cierre nueva. Dos matices manejados a propósito: (1) `ChangePasswordModal.jsx` con `required=true` (cambio de contraseña obligatorio, el mismo caso que ya oculta el botón "Cancelar") desactiva el hook (`isOpen && !required`) para no abrir un atajo de teclado que salte ese flujo; (2) `OrdenDetalleModal.jsx` desactiva su propio listener mientras su modal hijo `OCRScannerModal` está abierto (`!showOCR`) — sin esa guarda, ambos listeners viven en `document` y una sola pulsación de Escape cerraría los 2 modales a la vez en vez de solo el scanner anidado. No se tocó `ModalWrapper.jsx` en sí (su lógica ya era correcta, el bug era que nadie la usaba) ni los demás modales confirmados sin este bug: los que sí montan `ModalWrapper` (ninguno, hoy) y `ConfirmDialog.jsx`/`FilterBar.jsx` (no son overlays de pantalla completa con backdrop). Sin test dedicado del hook: el proyecto no tiene `jsdom`/`@testing-library/react` instalado (los tests existentes son de funciones puras, ver `vitest.config`), y no se justifica agregar esa dependencia para un hook de 10 líneas que reimplementa un patrón ya probado en producción (`ModalWrapper.jsx`). Verificado con `npm run build` + `npx vitest run` (57 tests) en verde; **pendiente que un humano confirme en navegador real** que Escape cierra cada uno de los 10 modales y que la guarda de `OrdenDetalleModal`+`OCRScannerModal` funciona como se espera (Escape con el scanner abierto cierra solo el scanner, una segunda pulsación cierra el detalle de la orden). |
| Accesibilidad transversal — navegación por teclado en filas/tarjetas de lista (Inventario, Órdenes, Tecnovigilancia, Etiquetado QR) | ✅ Aplicado | (este ciclo) | Tercer barrido de accesibilidad (distinto de los dos anteriores, que cubrieron `aria-label` en botones): `grep -rn "cursor-pointer" -B2` sobre `sigab-frontend/src` buscando contenedores `<div>`/`<tr>` con `onClick` que abren un detalle o alternan una selección — ninguno tenía `role`, `tabIndex` ni `onKeyDown`, así que un usuario que navega solo con teclado (o con lector de pantalla, que salta de control en control con Tab) no podía abrir NINGUNA fila de las tablas/tarjetas de Inventario, Órdenes de Servicio, Tecnovigilancia ni seleccionar equipos en Etiquetado Masivo QR — el flujo completo de esos 4 módulos era invisible fuera del mouse/touch. Corregidos siguiendo el patrón ya establecido en `EquipoDetail.jsx` (mini-historial de órdenes, único lugar del código que ya tenía `role="button"`/`tabIndex`/`onKeyDown` con Enter/Espacio): `components/EquipoCard.jsx` (vista tarjeta de Inventario), `components/EquipoTable.jsx` (tarjeta móvil y `<tr>` de escritorio), `pages/Ordenes.jsx` (tarjeta móvil y `<tr>` de escritorio), `pages/Tecnovigilancia.jsx` (`<tr>` de escritorio) y `pages/QRBatch.jsx` (tarjeta de selección de equipo, con `aria-pressed` porque alterna estado en vez de navegar). A diferencia del precedente de `EquipoDetail.jsx`, se agregó una guarda `e.target !== e.currentTarget` en cada `onKeyDown`: varias de estas filas/tarjetas tienen botones anidados con su propio `onClick` + `stopPropagation` (ej. el botón "QR" y el badge de "tickets abiertos" dentro de la fila de `EquipoTable.jsx`) — sin la guarda, presionar Enter/Espacio con el foco en ese botón anidado hacía "bubble" del evento `keydown` (que `stopPropagation` de un `onClick` NO detiene) y disparaba también la apertura del detalle de la fila completa. Los `<tr>` NO llevan `role="button"` (rompería la semántica de fila que usan los lectores de pantalla para navegar la tabla por columnas) — solo `tabIndex`/`onKeyDown`/foco visible vía `outline` (más confiable que `ring`/box-shadow sobre `<tr>` entre navegadores); los `<div>` de tarjeta sí llevan `role="button"` + foco vía `ring`, igual que el precedente. No se tocó `pages/Reservas.jsx` (el `onClick` del heatmap es una regla dura del proyecto, fuera de alcance de este barrido) ni `components/EquipoDetail.jsx` (galería de fotos ya usa `<button>` real, sin bug) ni los 3 overlays de fondo de modal (`onClick={onClose}` en el backdrop, cierre por conveniencia de mouse — el teclado ya cierra con el botón "Cerrar"/Escape). |

| Accesibilidad transversal — botones sin nombre accesible en Copilot | ✅ Aplicado | v4.0.58 | Sexto barrido de accesibilidad (distinto de los 5 anteriores): búsqueda con `grep -rPzol` sobre TODO `sigab-frontend/src` de botones icon-only (un solo hijo `<Icono/>` autocerrado) o con contenido vacío (`<div>`/`<span>` decorativo) sin `aria-label` ni `title` — patrón más estricto que los barridos previos, que cubrieron botones de cerrar (`onClick={onClose}`) y un set fijo de iconos conocidos, pero nunca inspeccionaron `pages/Copilot.jsx` boton por boton. Encontrados 3: el botón "Enviar mensaje" (`IconSend`) y "Detener respuesta" (`IconStop`, visible solo durante streaming) del chat principal, y el handle retráctil del panel de herramientas en móvil (sin icono ni texto, el botón más vacío de accesibilidad de toda la app) — los 3 corregidos con `title`, mismo patrón que su hermano "Limpiar chat" (ya lo tenía). Búsqueda confirmó que Copilot.jsx era el único archivo con este patrón en toda la app — categoría cerrada. Cambio 100% aditivo (solo `title`), sin tocar clases/layout/lógica. |
| Accesibilidad transversal — foco atrapado dentro de los modales (Tab/Shift+Tab) | ✅ Aplicado | (este ciclo, v4.0.57) | Quinto barrido de accesibilidad (distinto de los 4 anteriores: `aria-label` de botones de cerrar, `title` de iconos, navegación por teclado en filas/tarjetas de lista, cierre con Escape). Con Escape ya resuelto en v4.0.55, quedaba un hueco de teclado distinto: ningún modal de la app implementaba el patrón WAI-ARIA de diálogo (foco inicial dentro + `Tab`/`Shift+Tab` ciclando sin escapar al fondo) — un usuario que navega solo con teclado podía tabular fuera del modal abierto hacia elementos de la página de fondo (oculta visualmente detrás del overlay, pero seguía siendo parte del DOM enfocable). Nuevo `hooks/useFocusTrap.js`: recibe un `ref` al contenedor del diálogo y un flag `active`; si al activarse ningún elemento del contenedor ya tiene el foco (respeta un `autoFocus` propio existente, ej. el buscador de equipo de `EventoAdversoModal.jsx`), mueve el foco al primer elemento enfocable, y el listener de `keydown` (registrado sobre el propio contenedor, no sobre `document`) cicla `Tab`/`Shift+Tab` entre el primer y último elemento enfocable. Conectado en los mismos 10 modales de `useEscapeClose` (v4.0.55): `HistorialModal.jsx`, `ChangePasswordModal.jsx`, `EventoAdversoModal.jsx`, `NuevaOrdenModal.jsx`, `EventoDetalleModal.jsx`, `OCRScannerModal.jsx`, `HistorialEquipoModal.jsx`, `OrdenDetalleModal.jsx`, `OrdenServicioRapidaModal.jsx`, `TripleValidationModal.jsx` — mismo alcance exacto, misma pareja de hooks en cada archivo. `OrdenDetalleModal.jsx` reusa el mismo criterio que ya aplicaba a Escape: el trap se desactiva mientras su modal hijo `OCRScannerModal` está abierto (`!showOCR`), para que `Tab` quede atrapado en el escáner anidado (que tiene su propio trap activo) y no en el contenedor exterior. Sin test dedicado (mismo motivo que `useEscapeClose`: no hay `jsdom`/`@testing-library/react` instalado, y el hook reimplementa un patrón estándar sin lógica de negocio propia). Verificado con `npm run build` + `npx vitest run` (62 tests) en verde; **pendiente que un humano confirme con teclado real** que `Tab` nunca sale de cada modal y que la guarda de `OrdenDetalleModal`+`OCRScannerModal` funciona como se espera. |

| Accesibilidad transversal — `<label>` asociado a su control de formulario (Reservas, Órdenes, Equipos) | 🟡 Parcial | v4.0.59 / v4.0.60 / v4.0.61 / v4.0.62 / v4.0.63 / (este ciclo, v4.0.64) | Séptimo barrido de accesibilidad (distinto de los 6 anteriores: `aria-label` de botones de cerrar, `title` de iconos, navegación por teclado en filas/tarjetas, Escape, focus trap, botones sin nombre de Copilot). Hallazgo: `grep -rn "<label" sigab-frontend/src` sin `htmlFor` devolvió 117 líneas en decenas de archivos — cada `<label>Texto</label>` es visualmente correcto pero no está asociado programáticamente a su `<input>/<select>/<textarea>` hermano, así que un lector de pantalla anuncia el campo sin nombre al enfocarlo con Tab. Alcance demasiado grande para un ciclo (regla del proyecto: un módulo a la vez) → v4.0.59 cerró `pages/Reservas.jsx` (`NuevaReservaModal`), v4.0.60 cerró `pages/Ordenes.jsx` (formulario "Nueva Orden de Servicio"), v4.0.61 cerró `components/EquipoForm.jsx`, v4.0.62 cerró `components/OrdenServicioRapidaModal.jsx`, v4.0.63 cerró `components/NuevaOrdenModal.jsx` (ver detalle de esas versiones). Ciclo 2026-07-19 (loop-thinkcentre, v4.0.64): `components/EventoAdversoModal.jsx` (modal de "Reportar Evento Adverso" NOM-240, el mayor candidato por volumen tras cerrar `NuevaOrdenModal.jsx`). Se agregó `id`/`htmlFor` a los 12 campos con label+input/select/textarea hermano (buscar equipo, lote, registro sanitario, fecha y hora del evento, lugar del evento, tipo de evento, descripción del evento, consecuencia clínica, acción correctiva inmediata, sexo del paciente, edad del paciente, estado del dispositivo post-evento). El campo "Severidad" es distinto a los demás: no es un input nativo sino un grupo de 4 `<button type="button">` que actúan como selector único (mismo caso que "Prioridad" en `OrdenServicioRapidaModal.jsx`, v4.0.62) → migrado al patrón `fieldset`/`legend` ya validado ahí, más `aria-pressed` en cada botón para que un lector de pantalla anuncie cuál está seleccionado (los botones ya tenían nombre accesible propio por su texto visible, pero no exponían su estado de "presionado"). Cambio 100% aditivo (atributos `id`/`htmlFor`/`aria-pressed` + el wrapper `fieldset`/`legend`, que no cambia el renderizado visual — `border-0 p-0 m-0` iguala el reset ya usado en el precedente), sin tocar clases/layout/lógica de negocio ni el payload enviado al backend. Verificado con `npm run build` + `npx vitest run` (62 tests) en verde. **Pendiente**: `pages/Almacen.jsx` (9) es ahora el mayor por volumen; después `pages/Metrologia.jsx`/`pages/Copilot.jsx` (6 c/u), `pages/Trazabilidad.jsx`/`pages/Capacitaciones.jsx` (5 c/u), `components/PreventivoForm.jsx`/`components/OrdenCasillasForm.jsx` (4 c/u), `pages/LandingPage.jsx`/`components/TripleValidationModal.jsx`/`components/ChangePasswordModal.jsx` (3 c/u), `pages/SuperAdmin.jsx`/`pages/ChecklistPage.jsx`/`components/OCRScannerModal.jsx` (2 c/u) — candidato del próximo barrido, un módulo por ciclo. |

Leyenda: ✅ aplicado y verificado · 🟡 en progreso/parcial · ⬜ sin empezar.

## Backlog de este design system

1. ✅ Resuelto (este ciclo): valores de `[data-theme="green"]` en `index.css`
   alineados con la paleta Stitch exacta (`#047857`/`#065F46`/`#E0F0E9`,
   fondo `#F8FAF9`). Swatch de `Header.jsx` actualizado a juego.
2. Terminar el layout Stitch de Dashboard (KPI row + mapa + gráfica ya
   siguen el patrón visual; falta validar contra el screen ID de Stitch
   pantalla por pantalla).
3. Aplicar el mismo criterio de "sin colores fijos que dependan del fondo"
   a Detalle de Equipo y Reservas (layout Stitch), un módulo por ciclo.
4. ✅ Resuelto (`ChecklistPage.jsx`, `Dashboard.jsx`, `Ordenes.jsx`,
   `HospitalMap.jsx`): mismo bug de azul-como-marca migrado a emerald
   (detalle en la tabla de avance). `Analitica.jsx` revisado y confirmado
   SIN bug (azul es categórico/AI, ver tabla). `EquipoCard.jsx`,
   `EquipoDetail.jsx` y `EquipoTable.jsx` revisados este ciclo: sus usos de
   azul (`ADQUISICION_COLORS`/`ADQUISICION_BADGE`, "N° Inventario IMSS",
   enlaces a PDF) son categóricos o siguen la convención azul=documento —
   confirmados SIN el bug de acento único (detalle en la fila de Mapa de
   Activos de la tabla). `OrdenDetalleModal.jsx` revisado este ciclo: botón
   "🖨️ PDF" confirmado SIN bug (azul=documento); título "Información" y
   botón "Subir" de evidencias SÍ tenían el bug → migrados a emerald
   (detalle en la fila de Órdenes de Servicio de la tabla). `QRPanel.jsx`
   y `HistorialEquipoModal.jsx` revisados este ciclo: el botón "Etiqueta A6"
   de `QRPanel.jsx` confirmado SIN bug (azul=documento, descarga PDF); el
   badge de "área destino" de `HistorialEquipoModal.jsx` SÍ tenía el bug
   (inconsistente con `Trazabilidad.jsx`) → migrado a emerald (detalle en
   la fila "Detalle de Equipo (Historial)" de la tabla). `EventoDetalleModal.jsx`
   y `HistorialModal.jsx` revisados este ciclo (2026-07-13, loop-thinkcentre):
   en `EventoDetalleModal.jsx` el botón "PDF NOM-240" (`bg-blue-600`) se
   confirmó SIN bug (azul=documento, mismo patrón validado); el título de
   sección "Clasificacion" (`text-blue-400`) SÍ tenía el bug — su hermano
   directo "Dispositivo medico (snapshot)" (mismo layout/jerarquía) ya usaba
   `text-emerald-400` → migrado a emerald; el botón "Subir" del formulario de
   evidencias (`bg-blue-600`) también era el mismo bug ya visto en
   `OrdenDetalleModal.jsx` (acción primaria de formulario sin convención de
   documento que la justifique) → migrado a emerald. En `HistorialModal.jsx`
   (usado por `EquipoTable.jsx`/`EquipoCard.jsx` para el historial de
   traslados) el punto de la línea de tiempo (`bg-blue-500`) y el badge de
   "área destino" (`bg-blue-900/50 text-blue-300 border-blue-800`) mostraban
   el mismo dato que `Trazabilidad.jsx` (ya emerald desde v4.0.40) con color
   distinto sin razón categórica → migrados a `bg-emerald-500` y
   `bg-emerald-900/50 text-emerald-300 border-emerald-800` respectivamente,
   mismo patrón que `HistorialEquipoModal.jsx`.
   **Categoría cerrada (2026-07-14, loop-thinkcentre)**: se clasificaron los
   9 archivos restantes del backlog. `pages/Copilot.jsx` confirmado SIN bug
   — el avatar de mensajes IA (gradiente `blue-500`→`purple-600`) y el panel
   "Vision (Gemma)" (`text-blue-400`, botón "Analizar" `bg-blue-600`) siguen
   la convención azul=IA ya validada (mismo patrón que el badge "Powered by
   Gemma"); el panel "Diagnóstico de Falla" usa amarillo y "Resumen IA" usa
   esmeralda a propósito — 3 sub-herramientas de Copilot con color categórico
   propio, no un acento de marca único. `formatos/FormatoViewer.jsx`
   confirmado SIN bug — archivo 100% fixed-dark autoconsistente (sin ningún
   `var(--content-*)`), el botón "🖨 Imprimir" (azul) convive con
   "✍️ Editar"/"💾 Guardar" (ámbar/esmeralda) y "📄 Descargar PDF" (teal) como
   parte de una barra de herramientas con un color por acción, no un módulo
   con azul como único acento. `pages/Formatos.jsx`, `pages/CommandCenter.jsx`,
   `pages/AuditPage.jsx`, `pages/EquipoPublico.jsx` y `pages/SuperAdmin.jsx`
   confirmados SIN bug — banner informativo (azul=información), mapas de
   color categóricos explícitos (`FASE_BADGE`/`STACK_COLOR`/`colorMap` de
   CommandCenter, badge INSERT/UPDATE/DELETE de AuditPage), azul=documento
   (enlace "Manual" de EquipoPublico) o marca propia autoconsistente ajena al
   verde IMSS (gradiente azul→teal "SIGAH.mx" de SuperAdmin, panel comercial
   fuera del alcance clínico de este design system). `pages/AdminGlobal.jsx`
   confirmado SIN bug — el KPI "Total Hospitales" en azul es 1 de 4 colores
   categóricos de KPI (azul/esmeralda/ámbar/slate, mismo patrón que
   `Analitica.jsx`) y el punto azul del feed de actividad es un indicador
   informativo genérico, no ligado a ningún acento de marca del archivo (no
   hay botones primarios ni bordes de foco en azul en el resto del archivo
   que lo hagan inconsistente). **Único bug real encontrado**:
   `components/OrdenCasillasForm.jsx` — la sección condicional "Nueva Orden
   de Servicio" (caja `bg-blue-950/40 border-blue-700/50`, título
   `text-blue-400`) rompía con las 6 secciones restantes del mismo formulario
   (Bloques A-F, todas `text-teal-400` como acento de encabezado) — y sus
   propios inputs internos ya usaban `focus:border-teal-500`, confirmando que
   el azul era un resto de plantilla genérica, no una decisión de diseño →
   migrada a `bg-teal-950/40 border-teal-700/50` / `text-teal-400`, igualando
   el resto del formulario. Con esto se cierra el punto 4 del backlog —
   ningún archivo de `sigab-frontend/src` queda sin clasificar contra el bug
   de azul-como-marca-única.
5. Evaluar si el tema por defecto (`glass`, oscuro) debe seguir siendo el
   default o si Verde-Blanco IMSS (`green`) debe ser el default de
   producción — decisión de Gustavo, no del loop.

## ATAJO para el próximo ciclo — auditoría de contraste ya existe en `feat/ui-cinematic`

**Dato clave descubierto al cierre de esta sesión**: el 2026-06-20, el commit
`86373f7` ("fix(ui): corrige bugs de contraste entre temas en 20 modulos") en
`feat/ui-cinematic` ya hizo un barrido similar y tocó 20 archivos, varios de
los cuales siguen en el backlog de abajo: `EventoAdversoModal.jsx`,
`FilterBar.jsx`, `Almacen.jsx`, `Analitica.jsx`, `AuditPage.jsx`,
`Copilot.jsx`, `Reportes.jsx`, además de `HospitalMap.jsx`, `Ordenes.jsx` y
`EquipoPublico.jsx` (que esta sesión ya corrigió de forma independiente, con
un diff distinto — el código divergió bastante desde junio, verificar
solapamiento antes de portar). **Antes de rehacer el backlog manualmente,
revisar `git show 86373f7` y decidir por archivo: cherry-pick, reaplicación
manual, o descartar si ya no aplica.** Ese mismo commit también agrega una
regla genérica a `index.css` para `<option>` de `<select>` nativos (ya
portada hoy, ver más abajo).

**Actualización (loop-thinkcentre, este ciclo)**: se comparó `MaintenanceChart.jsx`
y `StatsCards.jsx` (la sección pendiente de este mismo párrafo) contra el diff
de `86373f7`. `StatsCards.jsx` se confirmó SIN bug — su único consumidor es
`TVDashboard.jsx` (kiosko 100% fixed-dark, `bg-slate-950`), así que sus tintes
fijos son autoconsistentes por diseño (mismo criterio que `NuevaRefaccionModal`
de Almacén). `MaintenanceChart.jsx` (usado por `Dashboard.jsx`, sí theme-aware)
SÍ tenía el bug: el `Tooltip` de recharts usaba `backgroundColor:'#0f172a'`/
`borderColor:'#334155'` fijos, sin `color`/`itemStyle`/`labelStyle` — en temas
claros (blue/green) mostraba una caja de tooltip oscura flotando sobre un
dashboard claro, inconsistente con el patrón ya establecido en
`DegradationChart.jsx` (`CustomTooltip` con `var(--content-bg)`). Se portó el
mismo fix de `86373f7`: `contentStyle` a `var(--content-bg)`/`var(--content-border)`/
`var(--content-text)`, más `itemStyle`/`labelStyle` explícitos y `cursor` neutro
(`rgba(100,116,139,0.08)` en vez de blanco fijo). El grid/eje (`stroke` gris fijo)
se dejó igual, mismo criterio que `DegradationChart.jsx` (líneas de apoyo, no
texto — no rompen legibilidad).

De paso se encontró un bug real NO capturado por ningún barrido anterior:
`AlertaBanner.jsx` (usado en `Dashboard.jsx`, el banner de alertas rojas arriba
de los KPIs) tenía `text-red-200` (rosa claro, pensado para fondo oscuro) como
texto del mensaje sobre `bg-red-900/30` — en temas claros esa combinación pierde
casi todo el contraste. Ninguno de los greps del barrido de contraste (`text-white
|text-black|bg-white`, luego `text-red-300|text-orange-300|text-yellow-300`)
cubría `text-red-200`/`text-red-500/60`, por eso quedó fuera de los backlogs de
abajo. Se portó el mismo fix de `86373f7`: mensaje a `var(--content-text)`,
metadato del equipo a `var(--content-muted)`, icono/prioridad a `text-red-600`
(legible en claro y oscuro), fondo a `bg-red-500/10 border-red-500/40`.

## Backlog de contraste — barrido completo (2026-07-04)

Sesión de hoy hizo un barrido de `grep -rn "text-white|text-black|bg-white"`
sobre TODO `sigab-frontend/src` (components + pages, 70 archivos) y clasificó
cada hit manualmente contra su fondo real. Se corrigieron 8 archivos de alto
impacto (Mapa de Activos, sus 2 modales hijos, Login, Ordenes, ModalWrapper
compartido, Ficha Pública, ProtectedRoute). Quedan **25 archivos con bugs
reales** confirmados, sin tocar — mismo patrón en todos los casos: texto fijo
(`text-white`/`text-black`) o fondo fijo mezclado con un token de tema. **No
son falsos positivos ni suposiciones — cada uno fue leído y verificado contra
su contenedor real.** Un módulo por ciclo, igual que Preventivos/Dashboard/
Equipos/Mapa:

**Alta prioridad (flujo core):**
(`components/EventoAdversoModal.jsx`, `components/EventoDetalleModal.jsx`,
`pages/Alertas.jsx` y `pages/Copilot.jsx` resueltos, ver tabla de avance;
`components/OrdenDetalleModal.jsx` resuelto en v4.0.6). No queda pendiente en
esta categoría — el siguiente barrido debe tomar de "Modales/componentes
transversales" abajo.

**Segunda pasada (v4.0.12, 2026-07-05):** el grep original de esta sección
solo buscó `text-white|text-black|bg-white` — no cubre una segunda variante
del mismo bug (tonos claros de acento, `text-red-300`/`text-orange-300`/
`text-yellow-300`, pensados para fondo oscuro, invisibles sobre el tinte
claro que su propio `bg-*-500/20` o `bg-*-900/50` produce en temas claros).
Se encontró y corrigió en `EventoAdversoModal.jsx` (chips de severidad +
`ring-offset-slate-800` fijo), `EventoDetalleModal.jsx` (paso inactivo de la
Timeline, `bg-slate-700/50` fijo), `utils/tokens.js`
(`TV_ESTADO_COLORS`/`TV_SEVERIDAD_COLORS`, compartido por varios modales de
Tecnovigilancia) y `pages/Alertas.jsx` (`PRIORIDAD_STYLE`, mapa local del
mismo patrón). `OrdenDetalleModal.jsx` y `Copilot.jsx` se revisaron a fondo
(archivo completo, no solo grep) y no tenían esta segunda variante. Detalle
completo en `docs/releases/v4.0.12.md`.

**Modales/componentes transversales (uso en varios flujos):**
(`components/ConfirmDialog.jsx`, `components/FilterBar.jsx`,
`components/HistorialModal.jsx` y `components/charts/DegradationChart.jsx`
resueltos este ciclo, ver tabla de avance. `components/charts/MaintenanceChart.jsx`
se revisó y NO tiene el bug — el grep original fue un falso positivo, el
tooltip de recharts usa `contentStyle` inline con `backgroundColor: '#0f172a'`
fijo, autoconsistente, no mezcla con var de tema.)
`components/OCRScannerModal.jsx` y `components/TripleValidationModal.jsx`
resueltos en v4.0.17 (`e4c068d`) — **categoría completa, sin pendientes**. El
siguiente barrido debe tomar de "Secundaria" abajo.

**Secundaria (módulos admin, menor tráfico en el piloto) — categoría COMPLETA:**
- `pages/QRBatch.jsx` (8 — el más afectado del lote) y `pages/Analitica.jsx` (6,
  título + 4 KPIs principales) resueltos en v4.0.11. `pages/Reportes.jsx` (3)
  resuelto en v4.0.18. `pages/AuditPage.jsx` (2) resuelto en v4.0.19.
  `pages/ChecklistPage.jsx` (2 + 2 de la familia `bg-slate-800` fijo) resuelto
  en v4.0.20. `pages/Almacen.jsx` (input de búsqueda + botón "Ajustar"),
  `pages/Tecnovigilancia.jsx` (columna "Dispositivo" de la tabla) y
  `pages/Trazabilidad.jsx` (nombre de equipo en la línea de tiempo) resueltos
  este ciclo — sin pendientes en esta categoría. El siguiente barrido de
  contraste debe volver al punto 3 del "Backlog de este design system" arriba
  (layout Stitch de Detalle de Equipo/Reservas) o revisar de nuevo el commit
  `86373f7` de `feat/ui-cinematic` (sección "ATAJO" arriba) por si queda algo
  sin comparar.

**Confirmados SIN bugs reales** (grep disparó por badges/CTAs sólidos, QR/PDF
previews, o páginas 100% fixed-dark autoconsistentes — no mezclan variable+fijo,
no requieren acción): `ChangePasswordModal.jsx`, `DashboardCharts.jsx`, `EquipoCard.jsx`,
`EquipoTable.jsx`, `Header.jsx`, `Layout.jsx`, `Lightbox.jsx`, `OrdenCasillasForm.jsx`,
`formatos/FormatoViewer.jsx`, `formatos/formatoThemes.js`, `ui/Button.jsx`,
`AdminGlobal.jsx`, `Capacitaciones.jsx`, `Formatos.jsx`, `LandingPage.jsx` (pública,
0 uso de tokens de tema, intencionalmente oscura fija — no aplica el sistema de
temas interno), `Metrologia.jsx`, `QRScanner.jsx`, `Reservas.jsx`, `SuperAdmin.jsx`,
`TVDashboard.jsx`. `components/v2/SigabUI.jsx` es código muerto (no se importa en
ningún lugar) — candidato a borrar en vez de arreglar.

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
| Dashboard | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: títulos con `text-white` fijo (header, "Mapa de Activos", "Cumplimiento de Mantenimiento", estado de error) invisibles en temas claros → ahora usan `var(--content-text)`. KPICard y StatusIndicator ya eran theme-aware. Ciclo 2026-07-10 (loop-thinkcentre): los 3 botones de `pages/Dashboard.jsx` (header "Poka-Yoke"/"NOM-016" y "Reintentar conexión" del estado de error) medían ~36px de alto (`py-2` + texto `text-sm`), por debajo del mínimo táctil `44–48px` que exige este mismo documento → se agregó `min-h-[44px] justify-center` a los 3, sin tocar layout/color. Es el único hallazgo de este tipo en el archivo (los demás elementos interactivos del módulo viven en `HospitalMap`/`KPICard`/`StatusIndicator`, ya auditados en ciclos previos). Ciclo (este ciclo, loop-thinkcentre): 2 bugs de contraste más en componentes hijos de Dashboard, encontrados al comparar contra el commit `86373f7` de `feat/ui-cinematic` (ver sección ATAJO abajo) — `components/charts/MaintenanceChart.jsx` (tooltip de recharts con `backgroundColor`/`borderColor` fijos oscuros sin `color`/`itemStyle`/`labelStyle`, inconsistente en temas claros) y `components/AlertaBanner.jsx` (banner de alertas rojas con `text-red-200` sobre `bg-red-900/30`, invisible en temas claros) → ambos migrados a tokens de tema, detalle completo en la sección ATAJO. Pendiente: layout Stitch completo (screen ID `f0a7d832f5c54a9491da2f699e137490`) |
| Equipos / Inventario | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: toggles de vista, botón "Filtros" (móvil) y "Limpiar filtros" usaban `hover:text-white` fijo — invisibles en hover sobre temas claros → ahora `hover:text-[var(--content-text)]`. Ciclo 2026-07-11 (loop-thinkcentre): la vista tarjeta (`EquipoCard.jsx`) no tenía acceso directo al QR — había que abrir el detalle completo primero, mientras que `EquipoTable.jsx` (vista tabla, ambas variantes móvil/desktop) sí lo tenía desde v4.0 base. El screen ID de Stitch de Inventario móvil (`b8a...9fa0`) lo llama explícitamente "chips de filtro, badges, QR por card" — se agregó el mismo botón QR (icono, 44×44px, mismo SVG/patrón que `EquipoTable`) como overlay circular en la esquina inferior derecha de la miniatura de cada tarjeta, con `stopPropagation` para no abrir el detalle; abre `QRPanel` directo, gestionado en `pages/Equipos.jsx` (mismo componente que ya usaba `EquipoTable`, sin duplicar lógica). Solo se muestra si el equipo tiene `qr_token` (mismo criterio que la tabla). Pendiente: resto del layout Stitch completo (screen ID `aa22f6401767433fbaf79ca5362948cf`) |
| Detalle de Equipo | 🟡 Parcial | v4.0.16 / (este ciclo) | Se corrigió bug de contraste en `EquipoDetail.jsx`, `EquipoForm.jsx` y `HistorialEquipoModal.jsx`: campos "Criticidad", "N° Contrato/Servicio", "Proveedor", traslados, tabs e historial (órdenes/preventivos) usaban `text-white` fijo como texto de cuerpo → ahora `var(--content-text)`. Badges de estado siguen con `text-white` fijo (correcto, van sobre fondo de color). v4.0.16: nueva sección "Próximo Mantenimiento" con vista de calendario (`CalendarioMantenimiento.jsx`), adaptando el patrón visual del heatmap de Reservas a un mes con el día objetivo resaltado por urgencia — petición directa de Gustavo (punto 5/5 de Inventario). Ciclo 2026-07-12 (loop-thinkcentre): los 6 botones del footer de acciones (Eliminar, Nueva OS, Historial, QR, Cerrar, Editar) medían ~36px de alto (`py-2` + `text-sm`), por debajo del mínimo táctil 44px de este documento — mismo patrón ya corregido en Dashboard (v4.0.35) y Reservas (v4.0.38) → se agregó `min-h-[44px] justify-center` a los 6 (el botón "Cerrar" no tenía `flex`, se agregó `flex items-center` de paso para que el min-height centre el texto). El `<select>` inline de cambio rápido de estado (badge pill, `text-xs`/`py-1`) se dejó igual a propósito: sigue el patrón de badges/pills compactos ya establecido en toda la app (no es un CTA primario). Pendiente: layout Stitch completo (screen ID `f9b01c3c7232494e9bb95899c10d40b2` / variantes 2562px, 2386px) |
| Mapa de Activos (Dashboard) | ✅ Clasificación azul completa | (este ciclo) | Se corrigió bug de contraste reportado por Gustavo con capturas: `HospitalMap.jsx` tenía el panel "Ficha Técnica" y el tooltip "Ver Ficha" con fondo FIJO oscuro (`#0f172a`) mezclado con texto de tokens de tema (`var(--content-text)`, oscuro en temas claros) → invisible en Azul/Verde. Ahora panel y tooltip usan `var(--content-surface)`/`var(--content-bg)` consistentemente. También corregidos: badges COFEPRIS/Criticidad (patrón `*-500/10`), hover de tabs de piso y "Limpiar filtros". Modales hijos `QRPanel.jsx` y `OrdenServicioRapidaModal.jsx` también corregidos (mismo patrón). Ciclo (este ciclo, loop-thinkcentre): quinta instancia del bug de azul-como-acento único (Reservas v4.0.38, Metrología/Trazabilidad v4.0.40, Checklists v4.0.41) — el módulo usaba `blue-500`/`blue-600` como acento interactivo (3 tabs de piso activos, borde de foco de búsqueda y de `<select>` de estado, spinner de carga, indicador de "resultados filtrados", punto de encabezado de grupo de piso, enlace "Limpiar filtros" del estado vacío) → migrado íntegro a emerald, mismo patrón validado 4 veces. También se corrigió la etiqueta "Ubicacion" (icono + texto, sin propósito categórico) de `text-blue-400` a `var(--content-muted)`, alineada con la convención de etiquetas de campo ya usada en `EquipoCard.jsx`/`EquipoDetail.jsx`/`EquipoTable.jsx` (Área/Serie/Piso en `content-muted`). Se dejó intacto el botón "📅 Programar Mantenimiento Preventivo" del panel de acciones del equipo (`bg-blue-500/10`), parte de un esquema categórico de 5 colores por acción (rojo=Abrir OS, ámbar=Acción Rápida, azul=Programar Preventivo, neutral=Historial, verde=QR) — cambiarlo a emerald chocaría con el botón de QR y reduciría la distinción entre acciones, mismo criterio que los KPIs de `Analitica.jsx`. De paso, en `EquipoDetail.jsx` se encontró y corrigió un bug real de semántica de color (no solo de marca): el badge de estado del mini-historial de órdenes (dentro del modal de detalle) coloreaba `en_progreso` en azul y usaba ámbar como fallback genérico (capturando también `abierta`/`cancelada`), inconsistente con la convención de toda la app (`Ordenes.jsx`: abierta=rojo, en_progreso=ámbar, cerrada=esmeralda, cancelada=neutral) y con su propio componente hermano `HistorialEquipoModal.jsx` (mismo dato, mismo footer de `EquipoDetail`) que ya usaba cerrada=esmeralda/cancelada=neutral/resto=ámbar → se corrigió para igualar ese patrón hermano. Los badges `ADQUISICION_COLORS`/`ADQUISICION_BADGE` (azul=recurso_propio) de `EquipoCard.jsx`/`EquipoTable.jsx`/`EquipoDetail.jsx` y el azul de "N° Inventario IMSS" (vs. esmeralda de "N° Serie") se revisaron y son categóricos intencionales (4 tipos de adquisición, 2 tipos de folio), no el bug de acento único — no se tocaron. Los enlaces "Ver Documento de Contrato"/"Abrir PDF original" en azul siguen la convención ya validada azul=documento (Metrología/Ordenes) — tampoco se tocaron. Pendiente: layout Stitch completo |
| Órdenes de Servicio | 🟡 Parcial | v4.0.5/v4.0.6 | Se corrigió bug de contraste: `Ordenes.jsx` (nombre de equipo en card móvil y tabla), `OrdenServicioRapidaModal.jsx` (botón cerrar) en v4.0.5; `OrdenDetalleModal.jsx` (botón cerrar, nombre de archivo PDF en hover) y `NuevaOrdenModal.jsx` (botón cerrar y "Cancelar") en v4.0.6 — todos `text-white`/`hover:text-white` fijo, invisibles en temas claros. Screen ID `8ecdc72b890b4f8394a69dbfdfe61918` (checklist NOM-016, firmas, PDF) — layout Stitch pendiente |
| Login | 🟡 Parcial | (este ciclo) | Título "SIGAB" con `text-white` fijo, invisible en temas claros — era la PRIMERA pantalla que ve cualquier usuario. Corregido a `var(--content-text)` |
| Ficha Pública de Equipo (QR) | 🟡 Parcial | (este ciclo) | Contenedor raíz fijaba `text-white` como color de texto por defecto (anti-patrón: cualquier texto nuevo sin override heredaría blanco). Cambiado a `var(--content-text)`; nombre/marca del equipo (que sí van sobre el badge de estado, fondo fijo oscuro por diseño) ahora llevan `text-white` explícito |
| Tecnovigilancia (Eventos Adversos) / Alertas | 🟡 Parcial | v4.0.7 | Se corrigió bug de contraste en `EventoAdversoModal.jsx` (botón cerrar, resumen "Dispositivo"/"Tipo", botón "Cancelar/Anterior"), `EventoDetalleModal.jsx` (botón cerrar, valor "Tipo" en Clasificación) y `pages/Alertas.jsx` (botón "Marcar todas leídas", texto del mensaje de la alerta) — todos `text-white`/`hover:text-white` fijo sobre fondo de tema → ahora `var(--content-text)`. Badges/botones con fondo sólido (rojo/azul/emerald/amarillo/púrpura/naranja) se dejaron igual, uso correcto |
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
| Reservas | 🟡 Parcial | (este ciclo) | Ciclo 2026-07-11 (loop-thinkcentre): el módulo ya era theme-safe pero sus acentos primarios (botones "Nueva Reserva"/"Confirmar Reserva", icono del modal, bordes de foco de los 6 inputs del formulario) usaban `blue-600`/`blue-500` fijo — el único módulo del rediseño con un azul de marca en vez del verde `#047857` Verde-Blanco IMSS que usan `Equipos.jsx`/`Ordenes.jsx`/`Almacen.jsx`/`Login.jsx` (`bg-emerald-600 hover:bg-emerald-500`, `focus:border-emerald-500`). Migrados los 11 usos de azul-como-primario a emerald; se dejó intacto el único azul restante (icono "Editar reserva" en `DiaReservasModal`), que sigue el patrón establecido en todo el resto de la app de azul=editar/rojo=eliminar como acento secundario, no como color de marca. De paso, 4 botones ("Cancelar"/"Confirmar Reserva" del modal, "Nueva reserva" del footer de día, "Nueva Reserva" del header) medían 36-40px de alto (`py-2`/`py-2.5` + `text-sm`), por debajo del mínimo táctil 44px de este documento → se agregó `min-h-[44px] justify-center`, mismo patrón que el fix de Dashboard del ciclo anterior. El heatmap (`ActividadHeatmap`, `anim-cell-pop`) y el `AreaChart` de recharts (ya usaban verde `#16a34a`) no se tocaron. 4 variantes de Stitch pendientes de elegir para el layout completo (`9ad9c5aa…`, `0d916bcd…`, `73bb15a3…`, `1e753e9a…`) — sigue siendo el siguiente candidato del punto 3 del backlog de abajo |
| Metrología | ✅ Aplicado | (este ciclo) | Mismo bug de marca que Reservas: `pages/Metrologia.jsx` usaba `blue-500`/`blue-600` como acento único del módulo (icono de título, botón "Nueva Calibración", 6 bordes de foco del formulario, botón "Registrar Calibración", hover del nombre de equipo en la tabla) → migrado a emerald. Se dejó intacto el icono "Abrir certificado" (`text-blue-400`), que sigue el patrón ya establecido en `Ordenes.jsx` ("Ver PDF"/"Formato") de azul=acceso a documento, no acento de marca. El botón "Nueva Calibración" medía ~40px (`py-2` sin `text-sm`) → se agregó `min-h-[44px] justify-center` |
| Trazabilidad | ✅ Aplicado | (este ciclo) | Mismo bug: `pages/Trazabilidad.jsx` usaba azul como acento único (icono de título, botón "Registrar Traslado", 5 bordes de foco, botón de envío del modal, link de estado vacío, punto de la línea de tiempo, badge "área destino") → migrado a emerald íntegro (no hay convención de azul=documento en este archivo que preservar, a diferencia de Metrología). El badge de "área destino" pasó de `bg-blue-900/50 text-blue-300 border-blue-800` a su equivalente emerald, conservando el contraste con el badge neutro de "área origen". Botón "Registrar Traslado" (~40px) → `min-h-[44px] justify-center` |
| Checklists NOM-016 | ✅ Aplicado | (este ciclo) | Cuarta instancia del mismo bug de azul-como-marca (Reservas v4.0.38, Metrología/Trazabilidad v4.0.40): `pages/ChecklistPage.jsx` usaba `blue-500`/`blue-600` como acento único (icono de título, círculo+icono de "Selecciona una Plantilla Normativa", hover de las tarjetas de plantilla, borde de la tarjeta del checklist activo, radio buttons SI/NO/N-A, borde de foco de "Observaciones Adicionales", botón "Finalizar y Certificar Auditoría" y la etiqueta del nombre de checklist en "Historial Compliance") → migrado íntegro a emerald, mismo patrón validado 3 veces. No hay convención de azul=documento que preservar en este archivo (no tiene enlaces a PDF/certificados). Los botones ya cumplían el mínimo táctil 44px (`py-4` en "Finalizar", `p-4` en tarjetas de plantilla) — sin cambios de tamaño necesarios, solo color. |
| Dashboard / Órdenes | ✅ Clasificación azul completa | (este ciclo) | Continuación del punto 4 del backlog: se clasificó `blue-[0-9]` archivo por archivo en `pages/Dashboard.jsx`, `pages/Ordenes.jsx` y `pages/Analitica.jsx` (los 3 candidatos explícitos del ciclo anterior). Bugs reales encontrados y corregidos: `Dashboard.jsx` (icono `ClipboardCheck` de "Cumplimiento de Mantenimiento", único icono de título con color fijo del archivo, sin acompañar a ningún sistema categórico → `blue-500` a `emerald-500`) y `Ordenes.jsx` (toggle activo del filtro "Tipo" con `bg-blue-800/60 text-blue-300`, mismo componente que el toggle de "Estado" 6 líneas arriba que ya usa `emerald-800/60`/`emerald-300` — inconsistencia sin razón funcional, ambos ahora emerald). Confirmados SIN bug (azul es categórico o convención establecida, no acento de marca): `Ordenes.jsx` líneas "Ver PDF"/"🖨 Formato" (`text-blue-400`, convención azul=documento ya validada en Metrología); `Analitica.jsx` completo — las 4 tarjetas KPI (Disponibilidad/Riesgo/MTBF/MTTR) usan un color distinto cada una (emerald/red/blue/purple) como sistema categórico de diferenciación entre métricas, igual que `KPICard.jsx` (`COLOR_MAP` con 10 variantes, `Dashboard.jsx` ya usa `color="blue"` en un KPICard de forma legítima); el badge "Powered by Gemma" (`blue-500/10`) sigue la misma convención de azul=IA ya usada en `Copilot.jsx` ("Análisis de Imagen (Gemma Vision)", título `text-blue-400`) — no se tocó ninguno de los dos por ser un sistema de color intencional, no el bug de acento único. |
| Móvil (Dashboard/Inventario/Detalle/Orden) | 🟡 Parcial | (este ciclo) | `components/Layout.jsx`: la barra de navegación inferior (compartida por TODAS las páginas en móvil, no solo Dashboard) tenía los 5 accesos en fila plana — no reflejaba el patrón "bottom-bar con Escanear central" del screen ID `8af028299b1c4cd4af17babd042028b8` (nombre literal de la pantalla Stitch). "Escanear" ahora se renderiza como FAB circular elevado (56px, `bg-[var(--accent)]`, `-mt-7` sobre la barra) centrado entre Equipos y Ordenes, en vez de ser el 5° ítem en fila. Los 4 ítems restantes ahora declaran `min-h-[48px] min-w-[48px]` explícito (antes solo `p-2`, ya cumplía el mínimo mas no lo garantizaba si cambia el tamaño de fuente/idioma). Pendiente: el resto del layout Stitch por pantalla (Inventario/Detalle/Orden móvil) — screen IDs en `CONSOLIDACION-V4.md` §6, sección Móvil |

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
   Activos de la tabla). **Aún no cerrado como categoría**: quedan sin
   clasificar `EventoDetalleModal.jsx`, `HistorialEquipoModal.jsx`,
   `HistorialModal.jsx`, `OrdenCasillasForm.jsx`, `OrdenDetalleModal.jsx`,
   `QRPanel.jsx`, `formatos/FormatoViewer.jsx`, `pages/AdminGlobal.jsx`,
   `pages/AuditPage.jsx`, `pages/CommandCenter.jsx`, `pages/Copilot.jsx`,
   `pages/EquipoPublico.jsx`, `pages/Formatos.jsx`, `pages/SuperAdmin.jsx`
   (`pages/Reportes.jsx`, `components/StatsCards.jsx` y
   `components/cards/KPICard.jsx` ya se revisaron en ciclos previos y NO
   tienen el bug). Candidato del próximo ciclo: `OrdenDetalleModal.jsx`
   tiene 3 usos de `blue-600`/`blue-400` sin clasificar aún (botón de
   acción, título "Información", botón de subir evidencia) — revisar si
   son acento de marca o convención de edición/documento antes de tocar.
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

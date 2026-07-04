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

El tema `[data-theme="green"]` ("Verde SIGAH (claro)" en el selector de
`Header.jsx`) es el candidato más cercano a Verde-Blanco IMSS pero sus
valores de acento (`#059669`/`#047857`/`#DCFCE7`) aún no calzan exactamente
con la paleta Stitch de arriba — pendiente de alinear (ver Backlog).

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
| Dashboard | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: títulos con `text-white` fijo (header, "Mapa de Activos", "Cumplimiento de Mantenimiento", estado de error) invisibles en temas claros → ahora usan `var(--content-text)`. KPICard y StatusIndicator ya eran theme-aware. Pendiente: layout Stitch completo (screen ID `f0a7d832f5c54a9491da2f699e137490`) |
| Equipos / Inventario | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: toggles de vista, botón "Filtros" (móvil) y "Limpiar filtros" usaban `hover:text-white` fijo — invisibles en hover sobre temas claros → ahora `hover:text-[var(--content-text)]`. Pendiente: layout Stitch completo (screen ID `aa22f6401767433fbaf79ca5362948cf`) |
| Detalle de Equipo | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste en `EquipoDetail.jsx`, `EquipoForm.jsx` y `HistorialEquipoModal.jsx`: campos "Criticidad", "N° Contrato/Servicio", "Proveedor", traslados, tabs e historial (órdenes/preventivos) usaban `text-white` fijo como texto de cuerpo → ahora `var(--content-text)`. Badges de estado siguen con `text-white` fijo (correcto, van sobre fondo de color). Pendiente: layout Stitch completo (screen ID `f9b01c3c7232494e9bb95899c10d40b2` / variantes 2562px, 2386px) |
| Mapa de Activos (Dashboard) | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste reportado por Gustavo con capturas: `HospitalMap.jsx` tenía el panel "Ficha Técnica" y el tooltip "Ver Ficha" con fondo FIJO oscuro (`#0f172a`) mezclado con texto de tokens de tema (`var(--content-text)`, oscuro en temas claros) → invisible en Azul/Verde. Ahora panel y tooltip usan `var(--content-surface)`/`var(--content-bg)` consistentemente. También corregidos: badges COFEPRIS/Criticidad (patrón `*-500/10`), hover de tabs de piso y "Limpiar filtros". Modales hijos `QRPanel.jsx` y `OrdenServicioRapidaModal.jsx` también corregidos (mismo patrón). Pendiente: layout Stitch completo |
| Órdenes de Servicio | 🟡 Parcial | (este ciclo) | Se corrigió bug de contraste: nombre de equipo `text-white` fijo sobre `bg-[var(--content-surface)]` en la card móvil y en la tabla de escritorio (invisible en temas claros). Screen ID `8ecdc72b890b4f8394a69dbfdfe61918` (checklist NOM-016, firmas, PDF) — layout Stitch pendiente |
| Login | 🟡 Parcial | (este ciclo) | Título "SIGAB" con `text-white` fijo, invisible en temas claros — era la PRIMERA pantalla que ve cualquier usuario. Corregido a `var(--content-text)` |
| Ficha Pública de Equipo (QR) | 🟡 Parcial | (este ciclo) | Contenedor raíz fijaba `text-white` como color de texto por defecto (anti-patrón: cualquier texto nuevo sin override heredaría blanco). Cambiado a `var(--content-text)`; nombre/marca del equipo (que sí van sobre el badge de estado, fondo fijo oscuro por diseño) ahora llevan `text-white` explícito |
| Reservas | ⬜ Pendiente | — | 4 variantes (`9ad9c5aa…`, `0d916bcd…`, `73bb15a3…`, `1e753e9a…`) — elegir la que mejor encaje con el calendario heatmap existente SIN romperlo (`anim-cell-pop` en `index.css`). Nota: ya es theme-safe (0 bugs de contraste, incluye tooltip de recharts bien resuelto) |
| Móvil (Dashboard/Inventario/Detalle/Orden) | ⬜ Pendiente | — | Screen IDs en `CONSOLIDACION-V4.md` §6, sección Móvil |

Leyenda: ✅ aplicado y verificado · 🟡 en progreso/parcial · ⬜ sin empezar.

## Backlog de este design system

1. Alinear los valores de `[data-theme="green"]` en `index.css` con la
   paleta Stitch exacta (`#047857`/`#065F46`/`#E0F0E9`) — hoy usa
   `#059669`/`#047857`/`#DCFCE7` (verde SIGAH histórico, no idéntico).
2. Terminar el layout Stitch de Dashboard (KPI row + mapa + gráfica ya
   siguen el patrón visual; falta validar contra el screen ID de Stitch
   pantalla por pantalla).
3. Aplicar el mismo criterio de "sin colores fijos que dependan del fondo"
   a Detalle de Equipo y Reservas (layout Stitch), un módulo por ciclo.
4. Evaluar si el tema por defecto (`glass`, oscuro) debe seguir siendo el
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
portada hoy, ver más abajo) — sección `MaintenanceChart.jsx`/`StatsCards.jsx`
del diff no ha sido comparada contra la v4 actual, revisar si aplica.

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

**Alta prioridad (flujo core, siguiente ciclo):**
- `components/EventoAdversoModal.jsx` (4), `components/EventoDetalleModal.jsx` (2),
  `components/OrdenDetalleModal.jsx` (2) — se abren desde Órdenes/Tecnovigilancia,
  flujo frecuente del piloto.
- `pages/Alertas.jsx` (2), `pages/Copilot.jsx` (3, incluye burbuja de respuesta IA
  con contraste invertido en modo claro).

**Modales/componentes transversales (uso en varios flujos):**
- `components/ConfirmDialog.jsx` (1), `components/FilterBar.jsx` (1),
  `components/HistorialModal.jsx` (1), `components/NuevaOrdenModal.jsx` (2),
  `components/OCRScannerModal.jsx` (5), `components/TripleValidationModal.jsx` (3,
  inputs de Token QR/Inventario/Serie con contraste degradado, no invisible),
  `components/charts/DegradationChart.jsx` (1), `components/charts/MaintenanceChart.jsx` (1).

**Secundaria (módulos admin, menor tráfico en el piloto):**
- `pages/QRBatch.jsx` (8 — el más afectado del lote), `pages/Analitica.jsx` (6,
  título + 4 KPIs principales), `pages/Reportes.jsx` (3), `pages/AuditPage.jsx` (2),
  `pages/ChecklistPage.jsx` (2), `pages/Almacen.jsx` (1), `pages/Tecnovigilancia.jsx` (1),
  `pages/Trazabilidad.jsx` (1).

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

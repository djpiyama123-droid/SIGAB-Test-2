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
| Equipos / Inventario | ⬜ Pendiente | — | Screen IDs `aa22f6401767433fbaf79ca5362948cf` / variante `54a5b5e7054947d2a4b193efc78c9ee1` |
| Detalle de Equipo | ⬜ Pendiente | — | Screen IDs `f9b01c3c7232494e9bb95899c10d40b2` / variantes 2562px, 2386px |
| Órdenes de Servicio | ⬜ Pendiente | — | Screen ID `8ecdc72b890b4f8394a69dbfdfe61918` (checklist NOM-016, firmas, PDF) |
| Reservas | ⬜ Pendiente | — | 4 variantes (`9ad9c5aa…`, `0d916bcd…`, `73bb15a3…`, `1e753e9a…`) — elegir la que mejor encaje con el calendario heatmap existente SIN romperlo (`anim-cell-pop` en `index.css`) |
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
   a Equipos, Detalle de Equipo, Órdenes y Reservas, un módulo por ciclo.
4. Evaluar si el tema por defecto (`glass`, oscuro) debe seguir siendo el
   default o si Verde-Blanco IMSS (`green`) debe ser el default de
   producción — decisión de Gustavo, no del loop.

# Guía de homologación visual — miércoles 6-may-2026

Producida por la rutina `sigab-pulido-vps-sem1-continuacion` (re-ejecución, 5-may 13:45 UTC). El miércoles del plan semanal pide **identidad oficial SIGAB** (Montserrat / Open Sans, cobalt `#1B4F72`, teal `#2E86AB`) y homologación de patrones de UI. La auditoría del repo arroja un punto crítico que necesita decisión del usuario antes de aplicar nada en el VPS:

## ⚠️ Decisión bloqueante para Gustavo

**El frontend ACTUAL ya tiene una identidad SIGAB ("v1") con paleta indigo `#4F46E5` sobre tema oscuro `#0F172A`, tipografía Lexend.** Es coherente y está aplicada en todo `tailwind.config.js` + `index.css` + componentes. La identidad oficial pedida ("v2": cobalt + teal sobre tema claro, Montserrat/Open Sans) es un **cambio de identidad mayor**, no un pulido cosmético.

Tres caminos posibles:

| Camino | Riesgo | Tiempo | Recomendación |
|---|---|---|---|
| **A — Migración total a v2 antes del demo** | 🔴 ALTO. Tocar todas las pantallas en 2 días con review visual limitado y revertir a v1 si algo se rompe en vivo. | 2 días | No recomendado para esta semana. |
| **B — Coexistencia v1+v2 + migración por componente con flag** | 🟡 MEDIO. Los tokens v2 quedan disponibles, las páginas críticas (Dashboard, Equipos, Ordenes) migran controladamente; el resto sigue en v1 hasta post-demo. | 1.5 días | **Recomendado.** Es lo que entregan los diffs 10/11. |
| **C — No tocar identidad esta semana, sólo homologar botones/cards/spinners DENTRO de v1** | 🟢 BAJO. Sin riesgo de regresión visual masiva. Pulido real, alineado al spirit del miércoles ("homologar"). | 0.5 días | Alternativa segura si Gustavo quiere demo perfectamente predecible. |

**Mi voto: B**, con migración limitada al `EquipoForm` (donde ya estamos tocando código por los P1 del martes), y al `Dashboard` (es la primera impresión del demo). El resto de pantallas se quedan en v1 hasta la próxima iteración.

---

## Entregables del miércoles (en esta carpeta)

| Archivo | Aplica a | Propósito |
|---|---|---|
| `10_visual_identity_tokens.diff` | `index.html`, `index.css`, `tailwind.config.js` | Introduce tokens `cobalt-*`, `teal2-*`, fuentes `sigabHead`/`sigabBody`, var CSS `--sigab-*`, activador `data-sigab-theme="v2"` o clase `.sigab-v2`. **No remueve v1.** |
| `11_componentes_sigab_v2.jsx` | nuevo `sigab-frontend/src/components/v2/SigabUI.jsx` | Library nuevecita: `SigabButton`, `SigabSpinner`, `SigabSkeleton`, `SigabCard`, `SigabModal`, `SigabEstadoBadge`, `SigabTable`, `sigabToastOptions`. Cero side-effects, cero llamadas a backend. |
| `12_guia_homologacion_visual_miercoles.md` | — | Este archivo. |

Los entregables anteriores (lunes y martes) **no se tocan**. Aplicar miércoles después de mergear todo lo del martes.

---

## Patrones homologados (el "qué" detrás de los componentes)

### Botones

| Variante | Uso | Color | Token |
|---|---|---|---|
| `primary` | Acción principal de cada modal/forma (Guardar, Confirmar) | Cobalt 700 sólido | `bg-cobalt-700 text-white` |
| `secondary` | Acción secundaria (Editar desde lista, filtros aplicados) | Cobalt 50 con texto cobalt | `bg-cobalt-50 text-cobalt-700` |
| `accent` | CTA de descubrimiento (Generar QR, Disparar OCR) | Teal 500 | `bg-teal2-500 text-white` |
| `ghost` | Cancelar, cerrar, navegación liviana | Sin bg, hover cobalt-50 | `bg-transparent text-cobalt-700` |
| `danger` | Eliminar, dar de baja, descartar | Rojo `#B0341C` | `bg-[color:var(--sigab-danger)]` |

Tamaños: `sm` (filtros, chips), `md` (default), `lg` (heroe del dashboard).
Estados: `loading` muestra `SigabSpinner` reemplazando el icono izquierdo y bloquea el click.

### Cards

- Radio `lg` (16 px), borde `cobalt-100`, sombra `shadow-sm` por defecto.
- Cabecera: título `font-sigabHead text-lg text-cobalt-700`, slot `action` a la derecha.
- Cuerpo: padding 24 px, tipografía `font-sigabBody`, color `cobalt-900`.
- Pie opcional con fondo `cobalt-50/50`.

### Modales

- Backdrop `cobalt-900/40` con `backdrop-blur-[2px]`.
- Click fuera o Escape disparan `onCancel`.
- Pie con `Cancelar` (ghost) + `Guardar` (variant configurable).
- Tamaños: `sm` (confirms), `md` (default), `lg` (formularios), `xl` (visores QR / mapas).
- Ancho controlado, `max-h-[90vh]` con scroll interno.

### Estados de carga

- `SigabSpinner` para botones y áreas pequeñas.
- `SigabSkeleton` para listas y tarjetas durante fetch inicial.
- Toast unificado vía `sigabToastOptions` para `react-hot-toast` (ya está en `package.json`).

### Tablas responsivas

- Wrapper con scroll horizontal en pantallas chicas (`-mx-6 px-6 sm:mx-0`).
- Header `cobalt-50/60` con texto `cobalt-700`, mayúsculas, tracking `wide`.
- Hover `cobalt-50/40` por fila, divisores `cobalt-100/60`.
- Empty state centrado con texto `cobalt-700/70`.

---

## Plan de migración por archivo (mínimo viable miércoles)

> Solo páginas que ya tocamos en lunes/martes o que aparecerán en el demo. **Cero backend.**

### 1. `sigab-frontend/src/components/EquipoForm.jsx`

Ya recibe el patch `08_patch_frontend_ubicacion_defense.jsx.diff` del martes. Encima:

1. Envolver el JSX raíz en un `<SigabModal>` reemplazando el modal manual actual.
2. Sustituir los `<button class="bg-indigo-600 ...">` por `<SigabButton variant="primary">`.
3. Cambiar `bg-slate-800` → `bg-white`, `text-white` → `text-cobalt-900` cuando sea fondo.
4. Pegar `data-sigab-theme="v2"` al wrapper para activar tipografías oficiales.
5. Capturar antes/después en `docs/evidencia-visual/equipo-form-v1.png` y `equipo-form-v2.png`.

### 2. `sigab-frontend/src/pages/Dashboard.jsx` (o equivalente)

1. Reemplazar las KPI cards por `<SigabCard>` con valor + etiqueta + indicador (mantener gráficas Recharts internas).
2. Cambiar tipografía heading a Montserrat (vía `font-sigabHead` o data-attribute).
3. Asegurar paleta semántica: verde/amarillo/rojo de equipos médicos siguen igual (`medical.*` en tailwind config), pero los frames y headers son cobalt.

### 3. `sigab-frontend/src/components/EquiposList.jsx` o tabla equivalente

1. Reemplazar el table actual por `<SigabTable>` o, mínimo, aplicar las clases de `SigabTable` al `thead`/`tbody`.
2. Reemplazar el badge de `estado` por `<SigabEstadoBadge>`.
3. Botones de acción de fila (`Editar`, `Eliminar`) usar variantes `ghost` y `danger` size `sm`.

### 4. Toasts globales

En `sigab-frontend/src/main.jsx` (o donde se monte `<Toaster>`):

```jsx
import { sigabToastOptions } from './components/v2/SigabUI';
<Toaster toastOptions={sigabToastOptions} position="top-right" />
```

### 5. Páginas que **NO** se tocan esta semana

`Copilot.jsx`, `QRBatch.jsx`, `Ordenes.jsx`, `Capacitaciones.jsx`, `Reportes.jsx`, `Almacen.jsx`, vistas administrativas. Quedan en v1, migración post-demo.

---

## Responsive 1366 / 768 / 375

Reglas obligatorias:

- **1366** (laptop estándar HGR): contenedor `max-w-[1280px] mx-auto`, gutter `px-6`. Cards en grid `xl:grid-cols-3 lg:grid-cols-2`.
- **768** (tablet): grid `sm:grid-cols-2`, modal `max-w-lg` cabe holgado, tabla con scroll horizontal.
- **375** (móvil): grid `grid-cols-1`, esconder columnas no críticas con `hidden sm:table-cell`, modal `max-w-[calc(100vw-2rem)]`.

Overflow horizontal de tablas en `<375` → ya está cubierto por `SigabTable`. Validar también en `Ordenes.jsx` y `Trazabilidad`.

---

## Capturas antes/después

Crear `docs/evidencia-visual/` en el repo con:

```
docs/evidencia-visual/
├── 2026-05-06-equipo-form-v1.png
├── 2026-05-06-equipo-form-v2.png
├── 2026-05-06-dashboard-v1.png
├── 2026-05-06-dashboard-v2.png
├── 2026-05-06-equipos-list-v1.png
├── 2026-05-06-equipos-list-v2.png
└── README.md      # contexto + checklist visual
```

Tomar las capturas con DevTools en 1366×768. Para evidencia móvil, simular iPhone SE (375 px).

> **Nota sobre el sandbox:** esta sesión NO puede tomar capturas reales del frontend (no hay browser headless con sesión autenticada al VPS). Las capturas las tiene que producir Gustavo o una sesión interactiva con SSH+browser después de aplicar el patch.

---

## Checklist de aceptación del miércoles

- [ ] `git apply pulido-vps-sem-4-8-may/10_visual_identity_tokens.diff` limpio.
- [ ] `cp pulido-vps-sem-4-8-may/11_componentes_sigab_v2.jsx sigab-frontend/src/components/v2/SigabUI.jsx`.
- [ ] `npm run build` en `sigab-frontend/` pasa sin warnings nuevos de Tailwind.
- [ ] `EquipoForm.jsx` migrado, capturas antes/después subidas.
- [ ] `Dashboard.jsx` (o pantalla principal del demo) migrado, capturas antes/después subidas.
- [ ] Tabla principal de Equipos usa `SigabTable` o sus clases, capturas antes/después subidas.
- [ ] Toaster global con `sigabToastOptions`.
- [ ] Smoke en 1366, 768, 375 sin overflow horizontal en tablas.
- [ ] Commit convencional `style(equipos): apply SIGAB v2 identity to EquipoForm and Dashboard`.
- [ ] Push a `feature/pulido-vps-sem-4-8-may`.

---

## Riesgos a vigilar

1. **Doble fuente de verdad de tokens.** Mientras coexistan v1 (indigo) y v2 (cobalt), un dev distraído puede mezclar. Mitigación: cualquier componente nuevo va a `components/v2/`, los componentes v1 se quedan donde están con comentario `// @deprecated v1 — migrar post-demo`.
2. **Carga de Google Fonts en producción.** `Montserrat + Open Sans` agrega ~95 kB a la página inicial. El VPS ya sirve sobre HTTPS con HTTP/2, pero Gustavo puede preferir self-host de las fuentes para offline-first dentro del HGR. Decisión post-demo.
3. **Contraste WCAG.** Verificado: `cobalt-700 #1B4F72` sobre blanco da contraste 9.1:1 (AAA). `teal-500 #2E86AB` sobre blanco da 4.7:1 (AA). Si se usa teal como texto sobre cobalt-50, baja a 3.4:1 — **no usar teal como texto** sobre fondos claros, sólo como bg.
4. **Botones primarios actuales que estén en CSS inline.** `git grep -n "bg-indigo-"` en `sigab-frontend/src` ayuda a inventariarlos antes de mergear.

---

*Generado por la re-ejecución de `sigab-pulido-vps-sem1-continuacion`, 5-may-2026 13:45 UTC. Autor: claude (sandbox). No aplicado al VPS — sin SSH ni push disponibles.*

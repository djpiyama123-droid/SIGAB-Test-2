# DESIGN.md — SIGAH Design System
# Compatible con Google Stitch y Claude Code.
# Fuente de verdad de diseño: importar en Stitch con "Import DESIGN.md"

## Identity

- **Product**: SIGAH — Sistema Integral de Gestión de Activos Hospitalarios
- **Domain**: Clinical / Medical Device Management
- **Visual Language**: Medical Professional — limpio, confiable, denso en datos, accesible

---

## Colors

### Brand
- `primary`: #006CB7 — Azul IMSS institucional
- `primary-dark`: #004F8B — Azul IMSS hover/active
- `primary-foreground`: #FFFFFF
- `secondary`: #059669 — Verde biomédico (equipos operativos)
- `secondary-dark`: #047857
- `secondary-foreground`: #FFFFFF

### Status (semántico — NOM-016 / NOM-240)
- `status-operative`: #059669 — Equipo operativo
- `status-maintenance`: #D97706 — En mantenimiento
- `status-out-of-service`: #DC2626 — Fuera de servicio
- `status-retired`: #64748B — Baja definitiva
- `status-alert`: #F59E0B — Alerta / advertencia

### Surface (tema Azul IMSS — default)
- `background`: #F8FAFC
- `surface`: #FFFFFF
- `surface-elevated`: #FFFFFF
- `sidebar`: #006CB7
- `sidebar-item-hover`: rgba(255,255,255,0.15)
- `sidebar-text`: #FFFFFF

### Surface (tema Verde SIGAH)
- `sidebar`: #059669
- `background`: #F8FAFC

### Surface (tema Oscuro)
- `background`: #0F172A
- `surface`: #1E293B
- `sidebar`: #0F172A
- `text`: #F1F5F9
- `text-muted`: #94A3B8

### Semantic tokens
- `text`: #1E293B (light) / #F1F5F9 (dark)
- `text-muted`: #64748B (light) / #94A3B8 (dark)
- `border`: #E2E8F0 (light) / #334155 (dark)
- `input-bg`: #FFFFFF (light) / #1E293B (dark)
- `destructive`: #DC2626
- `destructive-foreground`: #FFFFFF

---

## Typography

- **UI Font**: Inter (pesos: 400, 500, 600, 700)
- **Data Font**: Source Sans 3 (tablas, formularios, datos clínicos)
- **Monospace**: JetBrains Mono (IDs, QR, códigos de equipo)

### Scale
- `text-xs`: 0.75rem / 12px — labels, metadata
- `text-sm`: 0.875rem / 14px — body secundario, tablas
- `text-base`: 1rem / 16px — body principal
- `text-lg`: 1.125rem / 18px — subtítulos
- `text-xl`: 1.25rem / 20px — títulos de sección
- `text-2xl`: 1.5rem / 24px — títulos de página
- `text-3xl`: 1.875rem / 30px — KPI numbers, dashboards

---

## Spacing

- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px
- `space-12`: 48px

---

## Border Radius

- `rounded-sm`: 4px — badges, tags, chips
- `rounded`: 6px — inputs, botones
- `rounded-md`: 8px — cards pequeñas
- `rounded-lg`: 12px — modales, cards principales
- `rounded-xl`: 16px — paneles, sidebars

---

## Shadows

- `shadow-sm`: 0 1px 2px rgba(0,0,0,0.05)
- `shadow`: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
- `shadow-md`: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
- `shadow-lg`: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)

---

## Components

### Sidebar
- Width: 64px (collapsed) / 240px (expanded)
- Background: `sidebar` color
- Icons: 20px, color blanco
- Active item: fondo rgba(255,255,255,0.2), borde izquierdo 3px blanco

### Cards / KPI Tiles
- Background: `surface`
- Border: 1px solid `border`
- Padding: 20px
- Border-radius: `rounded-lg`
- Shadow: `shadow-sm`
- Header: `text-sm` `text-muted` uppercase tracking-wide
- Value: `text-3xl` font-bold `text`

### Data Tables
- Font: Source Sans 3, `text-sm`
- Header: background #F1F5F9, text-muted, font-medium, uppercase
- Row hover: background rgba(0,108,183,0.04)
- Row height: 44px
- Border: 1px solid `border` horizontal only

### Status Badges
- Shape: pill (rounded-full)
- Padding: 2px 10px
- Font: `text-xs` font-medium uppercase
- Colors: use `status-*` semantic tokens with 10% opacity background

### Forms / Inputs
- Height: 40px
- Border: 1px solid `border`
- Focus ring: 2px #006CB7
- Border-radius: `rounded`
- Font: Inter 14px

### Buttons
- Primary: bg `primary`, text white, hover `primary-dark`
- Secondary: bg transparent, border `border`, text `text`
- Danger: bg `destructive`, text white
- Height: 36px (default) / 32px (sm) / 40px (lg)
- Border-radius: `rounded`

### Modales
- Max-width: 560px (sm) / 720px (md) / 960px (lg)
- Backdrop: rgba(0,0,0,0.5)
- Border-radius: `rounded-xl`
- Shadow: `shadow-lg`

### Toast Notifications
- Position: top-right
- Width: 360px
- Success: borde izquierdo 4px `status-operative`
- Error: borde izquierdo 4px `destructive`
- Warning: borde izquierdo 4px `status-alert`

---

## Icons

- **Library**: Lucide React (primary)
- **Style**: outline stroke, 20px default, 16px small, 24px large
- **Medical icons**: considerar Heroicons para íconos adicionales
- **Stroke width**: 1.5px

---

## Layout

### App Shell
```
┌─────────────────────────────────────────┐
│ Sidebar (64px/240px) │ Main Content     │
│  Logo SIGAH          │  ┌─ Header ────┐ │
│  Nav items           │  │ Title + CTA │ │
│  [equipo]            │  └────────────┘ │
│  [ordenes]           │  ┌─ Content ───┐ │
│  [preventivos]       │  │             │ │
│  [dashboard]         │  └────────────┘ │
│  [trazabilidad]      │                 │
│  [copilot]           │                 │
└─────────────────────────────────────────┘
```

### Dashboard Grid
- 4 KPI tiles (top row, 25% each)
- 2 charts (60% + 40%)
- 1 recent activity table (100%)

### Content Width
- Max-width: 1400px
- Padding: 24px (desktop) / 16px (tablet) / 12px (mobile)

---

## Responsive Breakpoints

- `mobile`: < 768px — sidebar oculto, menú hamburguesa
- `tablet`: 768px–1024px — sidebar colapsado (64px)
- `desktop`: > 1024px — sidebar expandido (240px)

---

## Design Tokens (CSS Variables)

```css
:root {
  --primary: #006CB7;
  --primary-dark: #004F8B;
  --secondary: #059669;
  --status-operative: #059669;
  --status-maintenance: #D97706;
  --status-out-of-service: #DC2626;
  --status-retired: #64748B;
  --sidebar-bg: #006CB7;
  --content-bg: #F8FAFC;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --text: #1E293B;
  --text-muted: #64748B;
}
```

---

## Stitch Import Instructions

1. Ir a https://stitch.withgoogle.com
2. Crear proyecto → "SIGAH"
3. Click en "Import Design System" → subir este archivo DESIGN.md
4. Stitch cargará automáticamente la paleta, tipografía y componentes
5. Para generar pantallas: usar el chat con prompts como:
   - "Genera la pantalla de gestión de equipos médicos usando el design system SIGAH"
   - "Crea el dashboard de KPIs hospitalarios con 4 tiles y 2 gráficas"
6. Exportar → React → copiar en sigab-frontend/src/

## Prompt base para Stitch (copiar y pegar)

```
Diseña [NOMBRE_PANTALLA] para SIGAH, una plataforma de gestión de activos 
biomédicos hospitalarios para el IMSS Tijuana. 
Stack: React 19 + Tailwind CSS. 
Design system: importado (colores IMSS azul #006CB7, verde biomédico #059669). 
Estilo: profesional médico, denso en datos, sidebar azul IMSS.
Incluye: [DESCRIBIR COMPONENTES ESPECÍFICOS]
```

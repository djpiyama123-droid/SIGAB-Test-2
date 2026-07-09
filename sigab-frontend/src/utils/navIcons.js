// Mapa estático de iconos de navegación (Sidebar/Layout).
// Antes: `import * as Lucide from 'lucide-react'` + acceso dinámico
// `Lucide[item.icon_name]` -- eso impide el tree-shaking de Rollup (no puede
// saber en build-time qué iconos se usan) y mete TODA la librería lucide-react
// en el chunk principal. Con imports nombrados explícitos, solo estos iconos
// entran al bundle.
import {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  BrainCircuit,
  QrCode,
  CalendarClock,
  Calendar,
  Bell,
  FileBarChart,
  ShieldAlert,
  FileText,
  Building2,
} from 'lucide-react';

export const NAV_ICONS = {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  BrainCircuit,
  QrCode,
  CalendarClock,
  Calendar,
  Bell,
  FileBarChart,
  ShieldAlert,
  FileText,
  Building2,
};

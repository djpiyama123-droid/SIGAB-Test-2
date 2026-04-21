/**
 * SIGAB Constants
 * Los tokens de color y estado se mantienen en tokens.js.
 * Este archivo re-exporta para compatibilidad con código existente.
 */
export {
  Z,
  STATUS,
  STATUS_HEX,
  PRIORIDAD,
  PRIORIDAD_COLORS,
  ESTADO_COLORS,
  ESTADO_LABELS,
  ESTADO_DOT_COLORS,
  TV_ESTADO_COLORS,
  TV_SEVERIDAD_COLORS,
  TV_TIPO_LABELS,
  TV_ESTADO_LABELS,
  CHART_COLORS,
} from './tokens';

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon_name: 'LayoutDashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/scan', label: 'Escanear QR', icon_name: 'QrCode', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
  { path: '/equipos', label: 'Inventario', icon_name: 'Cpu', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { path: '/ordenes', label: 'Ordenes', icon_name: 'ClipboardList', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { path: '/preventivos', label: 'Preventivos', icon_name: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/alertas', label: 'Alertas', icon_name: 'Bell', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { path: '/reportes', label: 'Reportes', icon_name: 'FileBarChart', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/tecnovigilancia', label: 'Tecnovigilancia', icon_name: 'ShieldAlert', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { path: '/copilot', label: 'Copilot IA', icon_name: 'BrainCircuit', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  // ── Módulos ocultos para demo Clínica 1 (re-habilitar después) ──
  // { path: '/analitica', label: 'Predictivo', icon_name: 'Zap' },
  // { path: '/trazabilidad', label: 'Trazabilidad', icon_name: 'MapPin' },
  // { path: '/almacen', label: 'Almacén', icon_name: 'Package' },
  // { path: '/metrologia', label: 'Metrología', icon_name: 'ShieldCheck' },
  // { path: '/capacitaciones', label: 'Capacitaciones', icon_name: 'GraduationCap' },
  { path: '/qrbatch', label: 'Lote QR', icon_name: 'QrCode' },
  // { path: '/auditoria', label: 'Auditoría', icon_name: 'ShieldCheck' },
  // { path: '/checklists', label: 'Compliance', icon_name: 'CheckSquare' },
];

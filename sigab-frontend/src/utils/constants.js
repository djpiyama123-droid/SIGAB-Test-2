export const ESTADO_COLORS = {
  operativo: 'bg-emerald-500',
  en_mantenimiento: 'bg-yellow-500',
  fuera_servicio: 'bg-red-500',
  en_traslado: 'bg-blue-500',
  baja: 'bg-gray-500',
};

export const ESTADO_LABELS = {
  operativo: 'Operativo',
  en_mantenimiento: 'En Mtto.',
  fuera_servicio: 'Fuera Svc.',
  en_traslado: 'Traslado',
  baja: 'Baja',
};

export const ESTADO_DOT_COLORS = {
  operativo: 'bg-emerald-400',
  en_mantenimiento: 'bg-yellow-400',
  fuera_servicio: 'bg-red-400',
  en_traslado: 'bg-blue-400',
  baja: 'bg-gray-400',
};

export const PRIORIDAD_COLORS = {
  critica: 'bg-red-500/20 text-red-400',
  alta: 'bg-orange-500/20 text-orange-400',
  media: 'bg-yellow-500/20 text-yellow-400',
  baja: 'bg-slate-500/20 text-slate-400',
};

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/analitica', label: 'Predictivo', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/equipos', label: 'Equipos', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { path: '/ordenes', label: 'Ordenes', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { path: '/trazabilidad', label: 'Trazabilidad', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { path: '/preventivos', label: 'Preventivos', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/alertas', label: 'Alertas', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { path: '/reportes', label: 'Reportes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/tecnovigilancia', label: 'Tecnovigilancia', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { path: '/copilot', label: 'Copilot IA', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
];

export const TV_ESTADO_COLORS = {
  reportado:         'bg-blue-500/20 text-blue-400',
  en_investigacion:  'bg-yellow-500/20 text-yellow-400',
  documentado:       'bg-purple-500/20 text-purple-400',
  escalado_cofepris: 'bg-orange-500/20 text-orange-400',
  cerrado:           'bg-emerald-500/20 text-emerald-400',
  cancelado:         'bg-slate-500/20 text-slate-400',
};

export const TV_SEVERIDAD_COLORS = {
  critica:  'bg-red-600/30 text-red-300 border border-red-500',
  grave:    'bg-orange-500/20 text-orange-400',
  moderada: 'bg-yellow-500/20 text-yellow-400',
  leve:     'bg-slate-500/20 text-slate-400',
};

export const TV_TIPO_LABELS = {
  muerte:            'Muerte',
  lesion_grave:      'Lesion grave',
  deterioro_temporal:'Deterioro temporal',
  riesgo_potencial:  'Riesgo potencial',
  falla_funcional:   'Falla funcional',
};

export const TV_ESTADO_LABELS = {
  reportado:         'Reportado',
  en_investigacion:  'En investigacion',
  documentado:       'Documentado',
  escalado_cofepris: 'Escalado COFEPRIS',
  cerrado:           'Cerrado',
  cancelado:         'Cancelado',
};

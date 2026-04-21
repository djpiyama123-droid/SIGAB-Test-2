/**
 * SIGAB Design Tokens — Fuente única de verdad
 * Todos los colores, z-index y estados se definen aquí.
 */

// ── Z-INDEX SCALE ──────────────────────────────────────────────
export const Z = {
  dropdown:    20,
  sticky:      30,
  overlay:     40,
  modal:       50,
  modalNested: 60,
  confirm:     70,
  toast:       80,
};

// ── ESTADO DE EQUIPO — clases Tailwind ─────────────────────────
export const STATUS = {
  operativo: {
    bg:    'bg-emerald-500',
    dot:   'bg-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400',
    label: 'Operativo',
  },
  en_mantenimiento: {
    bg:    'bg-yellow-500',
    dot:   'bg-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400',
    label: 'En Mtto.',
  },
  fuera_servicio: {
    bg:    'bg-red-500',
    dot:   'bg-red-400',
    badge: 'bg-red-500/20 text-red-400',
    label: 'Fuera Svc.',
  },
  en_traslado: {
    bg:    'bg-blue-500',
    dot:   'bg-blue-400',
    badge: 'bg-blue-500/20 text-blue-400',
    label: 'Traslado',
  },
  baja: {
    bg:    'bg-slate-500',
    dot:   'bg-slate-400',
    badge: 'bg-slate-500/20 text-slate-400',
    label: 'Baja',
  },
};

// ── ESTADO HEX — para Recharts y estilos inline ───────────────
export const STATUS_HEX = {
  operativo:        '#10b981',
  en_mantenimiento: '#eab308',
  fuera_servicio:   '#ef4444',
  en_traslado:      '#3b82f6',
  baja:             '#64748b',
};

// ── PRIORIDAD ─────────────────────────────────────────────────
export const PRIORIDAD = {
  critica: 'bg-red-500/20 text-red-400',
  alta:    'bg-orange-500/20 text-orange-400',
  media:   'bg-yellow-500/20 text-yellow-400',
  baja:    'bg-slate-500/20 text-slate-400',
};

// Re-exportados para compatibilidad con código existente
export const ESTADO_COLORS = {
  operativo:        STATUS.operativo.bg,
  en_mantenimiento: STATUS.en_mantenimiento.bg,
  fuera_servicio:   STATUS.fuera_servicio.bg,
  en_traslado:      STATUS.en_traslado.bg,
  baja:             STATUS.baja.bg,
};

export const ESTADO_LABELS = {
  operativo:        STATUS.operativo.label,
  en_mantenimiento: STATUS.en_mantenimiento.label,
  fuera_servicio:   STATUS.fuera_servicio.label,
  en_traslado:      STATUS.en_traslado.label,
  baja:             STATUS.baja.label,
};

export const ESTADO_DOT_COLORS = {
  operativo:        STATUS.operativo.dot,
  en_mantenimiento: STATUS.en_mantenimiento.dot,
  fuera_servicio:   STATUS.fuera_servicio.dot,
  en_traslado:      STATUS.en_traslado.dot,
  baja:             STATUS.baja.dot,
};

export const PRIORIDAD_COLORS = PRIORIDAD;

// ── TECNOVIGILANCIA ───────────────────────────────────────────
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
  muerte:             'Muerte',
  lesion_grave:       'Lesión grave',
  deterioro_temporal: 'Deterioro temporal',
  riesgo_potencial:   'Riesgo potencial',
  falla_funcional:    'Falla funcional',
};

export const TV_ESTADO_LABELS = {
  reportado:         'Reportado',
  en_investigacion:  'En investigación',
  documentado:       'Documentado',
  escalado_cofepris: 'Escalado COFEPRIS',
  cerrado:           'Cerrado',
  cancelado:         'Cancelado',
};

// ── COLORES RECHARTS — paleta de gráficas ────────────────────
export const CHART_COLORS = [
  STATUS_HEX.operativo,
  STATUS_HEX.en_mantenimiento,
  STATUS_HEX.fuera_servicio,
  '#8b5cf6',  // violeta
  STATUS_HEX.baja,
  '#4f46e5',  // indigo sigab
  '#06b6d4',  // cyan
];

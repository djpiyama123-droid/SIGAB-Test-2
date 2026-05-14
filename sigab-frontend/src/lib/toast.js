// ============================================================
// toast.js — Adapter Sileo con API compatible react-hot-toast
//
// Permite migracion drop-in: cambiar
//   import toast from 'react-hot-toast';
// por
//   import toast from '@/lib/toast';
// (o el path relativo equivalente)
//
// Preserva el patron de SIGAB de reemplazar un toast por id:
//   const tid = toast.loading('Guardando...');
//   toast.success('Listo', { id: tid });   // descarta el loading y muestra success
//
// API expuesta (compatible con uso actual del proyecto):
//   toast.success(msg, opts?)  -> id
//   toast.error(msg, opts?)    -> id
//   toast.info(msg, opts?)     -> id
//   toast.warn(msg, opts?)     -> id   (alias de warning)
//   toast.warning(msg, opts?)  -> id
//   toast.loading(msg, opts?)  -> id   (sin auto-dismiss; cierra al reemplazar)
//   toast.dismiss(id)
//   toast.promise(p, { loading, success, error }) -> Promise<T>
//
// opts soportadas: { id, duration, description, button, position }
// ============================================================
import { sileo } from 'sileo';

// Paleta SIGAB (azul IMSS, biomedico, alertas)
const SIGAB_FILL = {
  success: '#10b981', // emerald-500
  error: '#ef4444',   // red-500
  warning: '#f59e0b', // amber-500
  info: '#006CB7',    // azul IMSS
  loading: '#64748b', // slate-500
};

function normalize(msg, opts = {}) {
  // Si el primer arg es objeto Sileo (caso avanzado), pasarlo tal cual
  if (typeof msg === 'object' && msg !== null && !('toString' in opts)) {
    return msg;
  }
  return {
    title: typeof msg === 'string' ? msg : String(msg),
    description: opts.description,
    duration: opts.duration ?? opts.duracion,
    button: opts.button,
    position: opts.position,
  };
}

// Sileo no permite reusar un id; emulamos "reemplazo por id" con dismiss + nuevo
function replaceIfNeeded(opts) {
  if (opts && opts.id) {
    try { sileo.dismiss(opts.id); } catch { /* no-op */ }
  }
}

const toast = {
  success: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.success({ fill: SIGAB_FILL.success, ...normalize(msg, opts) });
  },
  error: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.error({ fill: SIGAB_FILL.error, duration: opts?.duration ?? 6000, ...normalize(msg, opts) });
  },
  info: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.info({ fill: SIGAB_FILL.info, ...normalize(msg, opts) });
  },
  warning: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.warning({ fill: SIGAB_FILL.warning, ...normalize(msg, opts) });
  },
  // Alias para compatibilidad con codigo existente que usa toast.warn
  warn: (msg, opts) => toast.warning(msg, opts),
  loading: (msg, opts) => {
    replaceIfNeeded(opts);
    // duration: null -> no auto-dismiss en Sileo
    return sileo.show({
      type: 'loading',
      fill: SIGAB_FILL.loading,
      duration: null,
      ...normalize(msg, opts),
    });
  },
  dismiss: (id) => {
    if (id) sileo.dismiss(id);
    else sileo.clear();
  },
  promise: (p, msgs = {}) => {
    return sileo.promise(p, {
      loading: { title: msgs.loading || 'Procesando...', fill: SIGAB_FILL.loading },
      success: typeof msgs.success === 'function'
        ? (data) => ({ title: msgs.success(data), fill: SIGAB_FILL.success })
        : { title: msgs.success || 'Listo', fill: SIGAB_FILL.success },
      error: typeof msgs.error === 'function'
        ? (err) => ({ title: msgs.error(err), fill: SIGAB_FILL.error })
        : { title: msgs.error || 'Error', fill: SIGAB_FILL.error },
    });
  },
};

export default toast;
export { toast };

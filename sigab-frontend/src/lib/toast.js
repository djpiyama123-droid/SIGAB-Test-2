// ============================================================
// toast.js — Adapter Sileo con API compatible react-hot-toast
//
// Permite migracion drop-in: cambiar
//   import toast from 'react-hot-toast';
// por
//   import toast from '@/lib/toast';
// (o el path relativo equivalente)
//
// Preserva el patron de SIGAH de reemplazar un toast por id:
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

// Paleta SIGAH (azul IMSS, biomedico, alertas)
const SIGAH_FILL = {
  success: '#10b981', // emerald-500
  error: '#ef4444',   // red-500
  warning: '#f59e0b', // amber-500
  info: '#006CB7',    // azul IMSS
  loading: '#64748b', // slate-500
};

// Generador de ids únicos para cada toast. CRÍTICO: Sileo, cuando no recibe
// un `id` explícito, asigna internamente el id literal "sileo-default" a
// TODOS los toasts sin id (ver createToast() en sileo/dist/index.mjs). Su
// dismiss(id) programa un borrado diferido de "cualquier toast con ese id"
// ~600ms después (EXIT_DURATION). Si el toast de reemplazo (loading→success/
// error por el mismo id) no recibe también un id ÚNICO, hereda ese mismo
// "sileo-default" y el borrado diferido del toast viejo termina eliminando
// al toast NUEVO a los ~600ms — sin importar su `duration` real (p. ej. los
// 6000ms de un error). Esto hacía que success/error tras un loading()
// desaparecieran casi al instante (bug reproducido y confirmado en
// fix/os-flujo-2026-07-09: la OS sí se creaba/fallaba, pero el toast
// desaparecía antes de que el usuario pudiera leerlo).
let _uid = 0;
const genId = () => `sigah-toast-${Date.now()}-${_uid++}`;

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

// Sileo no permite reusar un id de forma segura (ver nota de genId arriba):
// emulamos "reemplazo por id" con dismiss del viejo + id NUEVO para el toast
// de reemplazo. Nunca reutilizar `opts.id` como id del toast nuevo.
function replaceIfNeeded(opts) {
  if (opts && opts.id) {
    try { sileo.dismiss(opts.id); } catch { /* no-op */ }
  }
}

const toast = {
  success: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.success({ fill: SIGAH_FILL.success, ...normalize(msg, opts), id: genId() });
  },
  error: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.error({ fill: SIGAH_FILL.error, duration: opts?.duration ?? 6000, ...normalize(msg, opts), id: genId() });
  },
  info: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.info({ fill: SIGAH_FILL.info, ...normalize(msg, opts), id: genId() });
  },
  warning: (msg, opts) => {
    replaceIfNeeded(opts);
    return sileo.warning({ fill: SIGAH_FILL.warning, ...normalize(msg, opts), id: genId() });
  },
  // Alias para compatibilidad con codigo existente que usa toast.warn
  warn: (msg, opts) => toast.warning(msg, opts),
  loading: (msg, opts) => {
    replaceIfNeeded(opts);
    // duration: null -> no auto-dismiss en Sileo
    return sileo.show({
      type: 'loading',
      fill: SIGAH_FILL.loading,
      duration: null,
      ...normalize(msg, opts),
      id: genId(),
    });
  },
  dismiss: (id) => {
    if (id) sileo.dismiss(id);
    else sileo.clear();
  },
  promise: (p, msgs = {}) => {
    return sileo.promise(p, {
      loading: { title: msgs.loading || 'Procesando...', fill: SIGAH_FILL.loading },
      success: typeof msgs.success === 'function'
        ? (data) => ({ title: msgs.success(data), fill: SIGAH_FILL.success })
        : { title: msgs.success || 'Listo', fill: SIGAH_FILL.success },
      error: typeof msgs.error === 'function'
        ? (err) => ({ title: msgs.error(err), fill: SIGAH_FILL.error })
        : { title: msgs.error || 'Error', fill: SIGAH_FILL.error },
    });
  },
};

export default toast;
export { toast };

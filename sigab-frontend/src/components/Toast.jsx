// ============================================================
// Toast.jsx — Sistema global de notificaciones para SIGAB
// Uso:
//   import { useToast } from './Toast';
//   const toast = useToast();
//   toast.success('Equipo creado');
//   toast.error('No se pudo guardar');
//   const tid = toast.loading('Guardando…');
//   toast.success('Listo', { id: tid });  // reemplaza el pendiente
// ============================================================
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const genId = () => {
    counter.current += 1;
    return `t_${Date.now()}_${counter.current}`;
  };

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Reemplaza un toast existente (por id) o lo crea.
  const upsert = useCallback(
    (mensaje, tipo, duracion, id) => {
      const theId = id || genId();
      setToasts((prev) => {
        const exists = prev.some((t) => t.id === theId);
        const nuevo = { id: theId, mensaje, tipo };
        return exists ? prev.map((t) => (t.id === theId ? nuevo : t)) : [...prev, nuevo];
      });
      if (duracion > 0) {
        setTimeout(() => remove(theId), duracion);
      }
      return theId;
    },
    [remove]
  );

  // Firma flexible: toast.success('msg')  o  toast.success('msg', { id, duration })
  const normalize = (opts) => {
    if (!opts) return {};
    if (typeof opts === 'number') return { duracion: opts };
    return { id: opts.id, duracion: opts.duration ?? opts.duracion };
  };

  const api = {
    success: (m, opts) => {
      const { id, duracion } = normalize(opts);
      return upsert(m, 'success', duracion ?? 4000, id);
    },
    error: (m, opts) => {
      const { id, duracion } = normalize(opts);
      return upsert(m, 'error', duracion ?? 6000, id);
    },
    info: (m, opts) => {
      const { id, duracion } = normalize(opts);
      return upsert(m, 'info', duracion ?? 4000, id);
    },
    warn: (m, opts) => {
      const { id, duracion } = normalize(opts);
      return upsert(m, 'warn', duracion ?? 5000, id);
    },
    loading: (m, opts) => {
      const { id } = normalize(opts);
      // loading no se auto-descarta; sólo se cierra al ser reemplazado
      return upsert(m, 'loading', 0, id);
    },
    dismiss: (id) => remove(id),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[200] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES = {
  success: { bg: 'bg-emerald-900/90 border-emerald-600', text: 'text-emerald-200', icon: '✓' },
  error:   { bg: 'bg-red-900/90 border-red-600',         text: 'text-red-200',     icon: '✕' },
  info:    { bg: 'bg-blue-900/90 border-blue-600',       text: 'text-blue-200',    icon: 'i' },
  warn:    { bg: 'bg-yellow-900/90 border-yellow-600',   text: 'text-yellow-200',  icon: '!' },
  loading: { bg: 'bg-slate-800/95 border-slate-500',     text: 'text-slate-200',   icon: '⏳' },
};

function ToastItem({ toast, onClose }) {
  const style = STYLES[toast.tipo] || STYLES.info;
  return (
    <div
      className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-3 animate-[slideIn_0.2s_ease-out] ${style.bg} ${style.text}`}
      role="alert"
    >
      <span className="font-bold text-base flex-shrink-0">{style.icon}</span>
      <p className="flex-1 text-sm">{toast.mensaje}</p>
      <button
        onClick={onClose}
        className="text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback que no rompe si se usa fuera del provider
    return {
      success: (m) => console.log('[toast.success]', m),
      error:   (m) => console.error('[toast.error]', m),
      info:    (m) => console.info('[toast.info]', m),
      warn:    (m) => console.warn('[toast.warn]', m),
    };
  }
  return ctx;
}

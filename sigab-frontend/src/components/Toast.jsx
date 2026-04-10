// ============================================================
// Toast.jsx — Sistema global de notificaciones para SIGAB
// Uso:
//   import { useToast } from './Toast';
//   const toast = useToast();
//   toast.success('Equipo creado');
//   toast.error('No se pudo guardar');
// ============================================================
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (mensaje, tipo = 'info', duracion = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, mensaje, tipo }]);
      if (duracion > 0) setTimeout(() => remove(id), duracion);
    },
    [remove]
  );

  const api = {
    success: (m, d) => push(m, 'success', d),
    error:   (m, d) => push(m, 'error', d ?? 6000),
    info:    (m, d) => push(m, 'info', d),
    warn:    (m, d) => push(m, 'warn', d),
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

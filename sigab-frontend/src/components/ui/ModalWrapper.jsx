/**
 * ModalWrapper — Overlay + dialog estándar con scroll correcto.
 *
 * Patrón correcto (resuelve "ventanas cortadas"):
 *   - Overlay:  fixed inset-0, flex, z-index de tokens
 *   - Dialog:   max-h-[90vh] overflow-y-auto flex flex-col
 *   - Header:   sticky top-0 dentro del dialog
 *
 * Uso:
 *   <ModalWrapper onClose={fn} maxWidth="max-w-2xl">
 *     <ModalWrapper.Header title="..." onClose={fn} />
 *     <div className="flex-1 overflow-y-auto p-5">contenido...</div>
 *     <ModalWrapper.Footer>botones...</ModalWrapper.Footer>
 *   </ModalWrapper>
 */
import { useEffect } from 'react';
import { Z } from '../../utils/tokens';

function ModalWrapper({
  children,
  onClose,
  maxWidth = 'max-w-2xl',
  zLevel = 'modal',
  className = '',
}) {
  const zIndex = Z[zLevel] ?? Z.modal;

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`
          relative bg-slate-800 border border-slate-700
          rounded-2xl shadow-2xl w-full ${maxWidth}
          max-h-[90vh] flex flex-col
          animate-slide-up
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Sub-componente: Header (sticky)
ModalWrapper.Header = function ModalHeader({ title, subtitle, onClose, icon: Icon }) {
  return (
    <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-5 py-4 rounded-t-2xl flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-semibold text-white truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Cerrar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Sub-componente: Footer (sticky bottom)
ModalWrapper.Footer = function ModalFooter({ children, className = '' }) {
  return (
    <div className={`sticky bottom-0 bg-slate-800 border-t border-slate-700 px-5 py-4 rounded-b-2xl flex-shrink-0 ${className}`}>
      {children}
    </div>
  );
};

export default ModalWrapper;

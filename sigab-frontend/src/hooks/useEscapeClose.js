import { useEffect } from 'react';

/**
 * useEscapeClose — cierra un modal con la tecla Escape.
 * Mismo patrón ya usado en components/ui/ModalWrapper.jsx, extraído a hook
 * para los modales que no lo consumen (implementan su propio overlay).
 *
 * @param {Function} onClose
 * @param {boolean} active — false para deshabilitar (ej. flujo obligatorio sin salida)
 */
export default function useEscapeClose(onClose, active = true) {
  useEffect(() => {
    if (!active || !onClose) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, active]);
}

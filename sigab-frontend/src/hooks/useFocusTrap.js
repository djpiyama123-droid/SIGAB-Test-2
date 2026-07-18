import { useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusables(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null
  );
}

/**
 * useFocusTrap — mantiene el foco de teclado dentro de un modal mientras está
 * abierto (Tab/Shift+Tab ciclan entre el primer y último elemento enfocable
 * del contenedor, en vez de escapar a la página de fondo).
 *
 * Complementa useEscapeClose: aquel cierra con Escape, este evita que Tab
 * saque el foco del modal mientras sigue abierto. Si al montar ningún
 * elemento del contenedor ya tiene el foco (ej. un input con autoFocus
 * propio), mueve el foco al primer elemento enfocable.
 *
 * @param {import('react').RefObject<HTMLElement>} containerRef
 * @param {boolean} active — false para desactivar (modal cerrado)
 */
export default function useFocusTrap(containerRef, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    if (!container.contains(document.activeElement)) {
      const focusables = getFocusables(container);
      if (focusables.length > 0) focusables[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables(container);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, active]);
}

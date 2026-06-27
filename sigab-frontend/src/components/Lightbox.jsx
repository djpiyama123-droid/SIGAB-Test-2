// ============================================================
// Lightbox.jsx — Visor de imágenes a pantalla completa
// ============================================================
// Visor modal presentacional (sin estado de servidor).
// Props:
//   open:        bool              — controlado por el padre
//   images:      string[]          — URLs absolutas
//   index:       number            — índice inicial (>=0)
//   alt:         string            — texto alternativo base (se compone "alt i/N")
//   referencial: bool              — si true, muestra chip "Imagen referencial"
//   onClose:     fn()              — cerrar (Esc, click fondo, X)
//   onIndexChange: fn(i)           — al navegar (←, →, swipe)
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';

export default function Lightbox({
  open,
  images = [],
  index = 0,
  alt = 'Imagen del equipo',
  referencial = false,
  onClose,
  onIndexChange,
}) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastFocusRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState(null);

  const total = images.length;
  const safeIndex = total > 0 ? Math.max(0, Math.min(index, total - 1)) : 0;
  const current = images[safeIndex];

  // ---------- Navegación ----------
  const goPrev = useCallback(() => {
    if (total < 2) return;
    const next = (safeIndex - 1 + total) % total;
    setZoom(1);
    onIndexChange?.(next);
  }, [safeIndex, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (total < 2) return;
    const next = (safeIndex + 1) % total;
    setZoom(1);
    onIndexChange?.(next);
  }, [safeIndex, total, onIndexChange]);

  // ---------- Teclado ----------
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom((z) => Math.min(z + 0.25, 4)); }
      else if (e.key === '-') { e.preventDefault(); setZoom((z) => Math.max(z - 0.25, 1)); }
      else if (e.key === '0') { e.preventDefault(); setZoom(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goPrev, goNext, onClose]);

  // ---------- Focus trap + restaurar foco al cerrar ----------
  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement;
    // Mover foco al botón cerrar al abrir
    const t = setTimeout(() => closeBtnRef.current?.focus(), 30);

    const onFocusIn = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        e.stopPropagation();
        closeBtnRef.current?.focus();
      }
    };
    document.addEventListener('focusin', onFocusIn);

    // Bloquear scroll del body mientras el modal está abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(t);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = prevOverflow;
      // Restaurar foco
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === 'function') {
        lastFocusRef.current.focus();
      }
    };
  }, [open]);

  // ---------- Swipe táctil ----------
  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    const threshold = 50;
    if (Math.abs(dx) > threshold) {
      if (dx > 0) goPrev(); else goNext();
    }
    setTouchStart(null);
  };

  // ---------- Reset zoom al cambiar de imagen ----------
  useEffect(() => { setZoom(1); }, [safeIndex]);

  if (!open || total === 0) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de imagen: ${alt} (${safeIndex + 1} de ${total})`}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6"
      onClick={(e) => {
        // Click en el fondo (no en hijos) cierra
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Contenedor imagen + controles */}
      <div className="relative w-full h-full flex flex-col items-center justify-center max-w-6xl">
        {/* Imagen con zoom */}
        <div
          className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-0"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <img
            key={current}
            src={current}
            alt={`${alt} — foto ${safeIndex + 1} de ${total}`}
            draggable={false}
            onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
            onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
            className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 cursor-zoom-${zoom > 1 ? 'out' : 'in'}`}
            style={{ transform: `scale(${zoom})` }}
          />

          {/* Badge referencial en el lightbox */}
          {referencial && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-amber-500/90 text-amber-950 shadow-lg ring-1 ring-amber-300/60 backdrop-blur">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Imagen referencial — no es el equipo real
              </span>
            </div>
          )}
        </div>

        {/* Toolbar inferior */}
        <div className="mt-2 sm:mt-4 flex items-center justify-between gap-2 sm:gap-4 w-full text-white">
          {/* Controles izquierda: cerrar */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor (Esc)"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Centro: contador + nombre */}
          <div className="flex-1 text-center min-w-0">
            {total > 1 && (
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs sm:text-sm font-mono tabular-nums">
                {safeIndex + 1} / {total}
              </span>
            )}
            {total > 1 && (
              <p className="hidden sm:block text-[11px] text-white/60 mt-1">
                Usa ← / → para navegar · Esc para cerrar · Click para zoom
              </p>
            )}
          </div>

          {/* Derecha: navegación + zoom */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 1))}
              disabled={zoom <= 1}
              aria-label="Reducir zoom"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM8 11h6" />
              </svg>
            </button>
            <span className="text-[11px] font-mono tabular-nums w-9 text-center text-white/80" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
              disabled={zoom >= 4}
              aria-label="Aumentar zoom"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6m-3-3h6" />
              </svg>
            </button>

            {total > 1 && (
              <>
                <span className="w-px h-5 bg-white/20 mx-1" aria-hidden="true" />
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Imagen anterior"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Imagen siguiente"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

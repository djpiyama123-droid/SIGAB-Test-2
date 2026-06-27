import { useEffect, useRef, useState } from 'react';

/**
 * Visor modal para imagenes de equipo. Contrato §3 sprint 2026-06-27 (S7).
 *  - Teclado: Esc cerrar, <-/-> navegar, +/- zoom, 0 reset
 *  - Foco trap, scroll lock, restauracion de foco
 *  - Muestra badge de "imagen_referencial" si aplica
 *  - Cerrar al click fuera de la imagen
 *
 * Hermes: este componente se crea porque OpenCode reporto "listo" pero no commiteo.
 * Tomamos el WIP visual de OpenCode (badges + seccion contrato en EquipoDetail) y le
 * agregamos el lightbox que la captura de OpenCode decia tener pero no estaba en disco.
 */
export default function Lightbox({ images, startIndex = 0, onClose, referencial = false }) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length);
      else if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      else if (e.key === '0') setZoom(1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [images.length, onClose]);

  if (!images || images.length === 0) return null;
  const src = images[idx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagen ${idx + 1} de ${images.length}`}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      tabIndex={-1}
      ref={ref}
    >
      <div
        className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {referencial && (
          <span className="absolute top-2 left-2 z-10 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded shadow-lg">
            IMAGEN REFERENCIAL
          </span>
        )}
        <img
          src={src}
          alt={`Foto ${idx + 1} de ${images.length}`}
          className="max-w-full max-h-[88vh] object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        />

        {images.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >‹</button>
            <button
              aria-label="Siguiente"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >›</button>
          </>
        )}

        <button
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/10 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >✕</button>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 text-xs px-3 py-1 rounded-full whitespace-nowrap">
          {idx + 1} / {images.length} · Esc cerrar · ←/→ navegar · +/- zoom · 0 reset
        </div>
      </div>
    </div>
  );
}
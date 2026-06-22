// ============================================================
// ConfirmDialog.jsx — Diálogo de confirmación reutilizable
// ============================================================
import { useEffect } from 'react';

export default function ConfirmDialog({
  open,
  titulo = '¿Confirmar acción?',
  mensaje = 'Esta acción no se puede deshacer.',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'peligro', // 'peligro' | 'normal'
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancelar?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancelar]);

  if (!open) return null;

  const colorBoton =
    variante === 'peligro'
      ? 'bg-red-600 hover:bg-red-500'
      : 'bg-emerald-600 hover:bg-emerald-500';

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              variante === 'peligro'
                ? 'bg-red-500/15 text-red-600'
                : 'bg-emerald-500/15 text-emerald-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-[var(--content-text)] text-base font-semibold">{titulo}</h3>
            <p className="text-[var(--content-muted)] text-sm mt-1">{mensaje}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirmar}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-${variante === 'peligro' ? 'red' : 'emerald'}-500 ${colorBoton}`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

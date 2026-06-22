import { useState, useEffect } from 'react';
import { api } from '../api/sigah';

/**
 * HistorialModal — Modal que muestra la timeline de trazabilidad de un equipo.
 *
 * Props:
 *   equipoId   — int: id del equipo
 *   equipoNombre — string: nombre para el título
 *   open       — boolean
 *   onClose    — fn
 */
export default function HistorialModal({ equipoId, equipoNombre, open, onClose }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !equipoId) return;
    setLoading(true);
    api.getTrazabilidadEquipo(equipoId)
      .then((res) => setMovimientos(res.movimientos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, equipoId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="historial-title"
        className="relative bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--content-border)]">
          <div>
            <h2 id="historial-title" className="text-base font-semibold text-[var(--content-text)]">Historial Completo</h2>
            <p className="text-xs text-[var(--content-muted)] mt-0.5">{equipoNombre}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--content-border)] focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-[var(--content-muted)] py-8 text-center text-sm">Cargando historial...</div>
          ) : movimientos.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <span className="text-3xl">📋</span>
              <p className="text-[var(--content-muted)] text-sm">Sin movimientos registrados</p>
              <p className="text-[var(--content-muted)] text-xs">Este equipo no tiene traslados en el sistema.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientos.map((m, i) => (
                <div key={m.id || i} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    {i < movimientos.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[var(--content-surface)] my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="bg-[var(--content-bg)]/50 border border-[var(--content-border)]/50 rounded-lg p-3 flex-1 mb-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-[var(--content-surface)] text-[var(--content-muted)] px-2 py-0.5 rounded text-xs">
                          {m.area_origen || 'Origen N/D'}
                          {m.piso_origen && ` • P${m.piso_origen}`}
                        </span>
                        <span className="text-[var(--content-muted)]">→</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-300">
                          {m.area_destino}
                          {m.piso_destino && ` • P${m.piso_destino}`}
                        </span>
                      </div>
                      <span className="text-[var(--content-muted)] text-xs flex-shrink-0">
                        {m.fecha_movimiento
                          ? new Date(m.fecha_movimiento).toLocaleDateString('es-MX')
                          : ''}
                      </span>
                    </div>
                    {m.motivo && (
                      <p className="text-[var(--content-muted)] text-xs mt-1.5">{m.motivo}</p>
                    )}
                    {m.usuario_nombre && (
                      <p className="text-[var(--content-muted)] text-xs mt-0.5">
                        Por: {m.usuario_nombre}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

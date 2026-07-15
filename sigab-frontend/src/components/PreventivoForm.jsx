// ============================================================
// PreventivoForm.jsx — Modal para programar un nuevo mantenimiento
// preventivo, pre-seleccionando el equipo (deep-link desde el mapa
// del hospital: /preventivos?equipoId=X&accion=nuevo).
// ============================================================
import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { useToast } from './Toast';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const VACIO = {
  tipo_preventivo: '',
  frecuencia_dias: 90,
  proxima_ejecucion: hoyISO(),
  descripcion_procedimiento: '',
};

/**
 * PreventivoForm — Modal de alta de un preventivo programado.
 *
 * Props:
 *   equipoId   — int|string: id del equipo pre-seleccionado
 *   open       — boolean
 *   onClose    — fn
 *   onCreated  — fn(preventivoCreado) — se invoca tras un POST exitoso
 */
export default function PreventivoForm({ equipoId, open, onClose, onCreated }) {
  const toast = useToast();
  const [equipo, setEquipo] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  // Reset del formulario y carga de datos del equipo cada vez que se abre.
  useEffect(() => {
    if (!open || !equipoId) return;
    setForm(VACIO);
    let cancelado = false; // evita que una respuesta tardía pinte el equipo equivocado
    api.getEquipo(equipoId)
      .then((res) => { if (!cancelado) setEquipo(res?.equipo || null); })
      .catch(() => { if (!cancelado) setEquipo(null); });
    return () => { cancelado = true; };
  }, [open, equipoId]);

  if (!open) return null;

  const handleChange = (campo) => (e) => {
    const valor = e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tipo_preventivo.trim()) {
      toast.error('Indica el tipo de preventivo');
      return;
    }
    if (!form.proxima_ejecucion) {
      toast.error('Indica la fecha de la próxima ejecución');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.crearPreventivo({
        equipo_id: Number(equipoId),
        tipo_preventivo: form.tipo_preventivo.trim(),
        frecuencia_dias: Number(form.frecuencia_dias) || 90,
        proxima_ejecucion: form.proxima_ejecucion,
        descripcion_procedimiento: form.descripcion_procedimiento.trim() || null,
      });
      toast.success('Preventivo programado');
      onCreated?.(res);
    } catch (err) {
      const detalle = err.response?.data?.detail || err.message || 'Error desconocido';
      toast.error(`No se pudo programar: ${detalle}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--content-border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--content-text)]">Nuevo Preventivo</h2>
            <p className="text-[var(--content-muted)] text-xs mt-0.5">
              {equipo
                ? `${equipo.nombre}${equipo.serie ? ` (${equipo.serie})` : ''}`
                : `Equipo #${equipoId}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[var(--content-muted)] hover:text-[var(--content-text)] p-1 rounded-lg hover:bg-[var(--content-border)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Tipo de preventivo *</label>
            <input
              type="text"
              value={form.tipo_preventivo}
              onChange={handleChange('tipo_preventivo')}
              placeholder="Ej. Limpieza y calibración anual"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--content-bg)] border border-[var(--content-border)] text-[var(--content-text)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Próxima ejecución *</label>
              <input
                type="date"
                value={form.proxima_ejecucion}
                onChange={handleChange('proxima_ejecucion')}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--content-bg)] border border-[var(--content-border)] text-[var(--content-text)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Frecuencia (días)</label>
              <input
                type="number"
                min="1"
                value={form.frecuencia_dias}
                onChange={handleChange('frecuencia_dias')}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--content-bg)] border border-[var(--content-border)] text-[var(--content-text)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Procedimiento (opcional)</label>
            <textarea
              value={form.descripcion_procedimiento}
              onChange={handleChange('descripcion_procedimiento')}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-[var(--content-bg)] border border-[var(--content-border)] text-[var(--content-text)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border border-[var(--content-border)] text-[var(--content-muted)] hover:bg-[var(--content-border)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 transition-colors"
            >
              {guardando ? 'Guardando…' : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

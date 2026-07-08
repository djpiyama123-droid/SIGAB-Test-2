import { useState } from 'react';
import { api } from '../api/sigah';

/**
 * NuevaOrdenModal — Modal reutilizable para crear Órdenes de Servicio.
 * Se usa desde Ordenes.jsx, FichaTecnica del mapa, y EquipoDetail.
 *
 * Props:
 *   open        — boolean: muestra u oculta el modal
 *   onClose     — fn: se llama al cancelar o crear exitosamente
 *   onCreated   — fn: callback opcional tras crear la OS (ej. refrescar lista)
 *   prefill     — object: valores iniciales { equipo_nombre, equipo_serie, area, piso }
 */
export default function NuevaOrdenModal({ open, onClose, onCreated, prefill = {} }) {
  const [form, setForm] = useState({
    equipo_nombre: prefill.equipo_nombre || '',
    equipo_serie: prefill.equipo_serie || '',
    tipo_mantenimiento: 'correctivo',
    falla_reportada: '',
    tecnico_nombre: '',
    area: prefill.area || '',
    piso: prefill.piso || '',
    prioridad: 'media',
    // ── v.3.2.0 — campos IMSS oficiales (porteo 2026-07-08) ──
    localizacion_completa: '',
    hora_inicio: '',
    hora_termino: '',
    tiempo_estimado_hrs: '',
    tiempo_real_hrs: '',
    recibe_conformidad_nombre: '',
    recibe_matricula: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      // Los campos opcionales vacíos se omiten (hora_inicio/tiempo_*_hrs no
      // aceptan cadena vacía en el backend — son time/Decimal nullable).
      const payload = { ...form, origen: 'dashboard' };
      ['hora_inicio', 'hora_termino', 'tiempo_estimado_hrs', 'tiempo_real_hrs'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      await api.crearOrden(payload);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al crear la orden. Verifica la conexión.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <form
        onSubmit={handleCrear}
        className="relative bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--content-text)]">Nueva Orden de Servicio</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--content-border)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['equipo_nombre', 'Equipo (nombre)', 'text'],
            ['equipo_serie', 'No. Serie', 'text'],
            ['tecnico_nombre', 'Técnico', 'text'],
            ['area', 'Área', 'text'],
            ['piso', 'Piso', 'text'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-[var(--content-muted)] block mb-1">{label}</label>
              <input
                value={form[k]}
                onChange={set(k)}
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Tipo</label>
            <select
              value={form.tipo_mantenimiento}
              onChange={set('tipo_mantenimiento')}
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]"
            >
              {['correctivo', 'preventivo', 'instalacion', 'calibracion'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={set('prioridad')}
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]"
            >
              {['baja', 'media', 'alta', 'critica'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Localización completa — v.3.2.0 */}
        <div>
          <label className="text-xs text-[var(--content-muted)] block mb-1">Localización completa del equipo o instalación</label>
          <input
            value={form.localizacion_completa}
            onChange={set('localizacion_completa')}
            placeholder="Detalle adicional de ubicación..."
            className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--content-muted)] block mb-1">Falla reportada *</label>
          <textarea
            required
            rows={3}
            value={form.falla_reportada}
            onChange={set('falla_reportada')}
            className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Horarios y tiempos — v.3.2.0 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de inicio</label>
            <input type="time" value={form.hora_inicio} onChange={set('hora_inicio')}
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de término</label>
            <input type="time" value={form.hora_termino} onChange={set('hora_termino')}
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">T. estimado (hrs)</label>
            <input type="number" min="0" step="0.5" value={form.tiempo_estimado_hrs} onChange={set('tiempo_estimado_hrs')} placeholder="1.0"
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">T. real (hrs)</label>
            <input type="number" min="0" step="0.5" value={form.tiempo_real_hrs} onChange={set('tiempo_real_hrs')} placeholder="(al cerrar)"
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        {/* Recibe de conformidad — v.3.2.0 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Recibe de conformidad (Nombre)</label>
            <input value={form.recibe_conformidad_nombre} onChange={set('recibe_conformidad_nombre')} placeholder="Nombre de quien recibe"
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Matrícula</label>
            <input value={form.recibe_matricula} onChange={set('recibe_matricula')} placeholder="Matrícula"
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// OrdenServicioRapidaModal.jsx — Crear OS pre-llenada desde el mapa
// v.3.2.0 — 2026-07-07: Refactor a formato IMSS oficial HGR1
//
// Nuevos campos (alineados con FORMATO ORDEN DE SERVICIO.xls):
//   - hora_inicio, hora_termino, tiempo_estimado, tiempo_real
//   - recibe_conformidad_nombre (quien recibe de conformidad)
//   - localizacion_completa (descripción completa del lugar)
//
// Se invoca desde el botón "Abrir Orden de Servicio" en FichaTecnica
// ============================================================
import { useState } from 'react';
import { api } from '../api/sigah';
import { useToast } from './Toast';

export default function OrdenServicioRapidaModal({ equipo, onClose, onCreada }) {
  const toast = useToast();
  const [form, setForm] = useState({
    falla_reportada: '',
    tipo_mantenimiento: 'correctivo',
    prioridad: equipo?.criticidad === 'alta' ? 'alta' : 'media',
    tecnico_nombre: '',
    descripcion_servicio: '',
    // ── v.3.2.0 — campos IMSS oficiales ──
    hora_inicio: '',
    hora_termino: '',
    tiempo_estimado: '',
    tiempo_real: '',
    recibe_conformidad_nombre: '',
    localizacion_completa: '',
  });
  const [guardando, setGuardando] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.falla_reportada.trim()) {
      toast.error('Describe la falla reportada');
      return;
    }

    setGuardando(true);
    const tid = toast.loading('Creando orden de servicio…');
    try {
      const payload = {
        equipo_id: equipo.id,
        equipo_nombre: equipo.nombre,
        equipo_marca: equipo.marca,
        equipo_modelo: equipo.modelo,
        equipo_serie: equipo.serie,
        equipo_inventario: equipo.no_inventario || equipo.inventario,
        ubicacion_fisica: form.localizacion_completa || equipo.ubicacion,
        localizacion: form.localizacion_completa,
        piso: equipo.piso,
        area: equipo.area,
        tipo_mantenimiento: form.tipo_mantenimiento,
        falla_reportada: form.falla_reportada,
        descripcion_servicio: form.descripcion_servicio,
        descripcion_trabajo: form.descripcion_servicio,
        tecnico_nombre: form.tecnico_nombre,
        recibe_conformidad_nombre: form.recibe_conformidad_nombre,
        hora_inicio: form.hora_inicio,
        hora_termino: form.hora_termino,
        tiempo_estimado: form.tiempo_estimado,
        tiempo_real: form.tiempo_real,
        prioridad: form.prioridad,
        origen: 'dashboard',
      };

      const res = await api.crearOrden(payload);
      toast.success(`Orden ${res.numero_orden} creada`, { id: tid });
      onCreada?.(res.numero_orden);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error desconocido';
      toast.error(`No se pudo crear la orden: ${msg}`, { id: tid });
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  if (!equipo) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — verde IMSS institucional */}
        <div
          className="p-5 border-b border-[var(--content-border)] flex justify-between items-start"
          style={{ background: 'linear-gradient(135deg, #2D6A27 0%, #1e4b1a 100%)', color: '#fff' }}
        >
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Nueva Orden de Servicio Biomédica
            </h2>
            <p className="text-emerald-100 text-sm mt-0.5">
              {equipo.nombre} · <span className="font-mono">{equipo.serie}</span>
            </p>
            <p className="text-emerald-200 text-xs mt-1 italic">
              Instituto Mexicano del Seguro Social · HGR No. 1 — IMSS Tijuana
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Datos del equipo (solo lectura) */}
        <div className="p-5 bg-[var(--content-bg)]/40 border-b border-[var(--content-border)]/50">
          <p className="text-xs font-semibold text-[var(--content-muted)] uppercase tracking-wider mb-2">
            1. Identificación del Equipo
          </p>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[var(--content-muted)]">Equipo</span>
              <p className="text-[var(--content-text)] font-medium">{equipo.nombre || '—'}</p>
            </div>
            <div>
              <span className="text-[var(--content-muted)]">Marca</span>
              <p className="text-[var(--content-text)] font-medium">{equipo.marca || '—'}</p>
            </div>
            <div>
              <span className="text-[var(--content-muted)]">Modelo</span>
              <p className="text-[var(--content-text)] font-medium">{equipo.modelo || '—'}</p>
            </div>
            <div>
              <span className="text-[var(--content-muted)]">No. Inventario</span>
              <p className="text-[var(--content-text)] font-medium font-mono">{equipo.no_inventario || equipo.inventario || '—'}</p>
            </div>
            <div>
              <span className="text-[var(--content-muted)]">No. Serie</span>
              <p className="text-[var(--content-text)] font-medium font-mono">{equipo.serie || '—'}</p>
            </div>
            <div className="col-span-3">
              <span className="text-[var(--content-muted)]">Ubicación</span>
              <p className="text-[var(--content-text)] font-medium">{equipo.area || '—'}{equipo.piso ? ` · Piso ${equipo.piso}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ── 2. TIPO Y PRIORIDAD ── */}
          <p className="text-xs font-semibold text-[var(--content-muted)] uppercase tracking-wider">
            2. Tipo de Servicio y Prioridad
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Tipo de mantenimiento *</label>
              <select
                value={form.tipo_mantenimiento}
                onChange={set('tipo_mantenimiento')}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)]"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="instalacion">Instalación</option>
                <option value="calibracion">Calibración</option>
                <option value="verificacion">Verificación / Inspección</option>
                <option value="baja">Baja / Decomisión</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Prioridad *</label>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="prio" value="alta" checked={form.prioridad === 'alta'} onChange={set('prioridad')} className="accent-red-600" />
                  <span className="text-red-600 font-semibold">ALTA</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="prio" value="media" checked={form.prioridad === 'media'} onChange={set('prioridad')} className="accent-amber-600" />
                  <span className="text-amber-600 font-semibold">MEDIA</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="prio" value="baja" checked={form.prioridad === 'baja'} onChange={set('prioridad')} className="accent-emerald-600" />
                  <span className="text-emerald-600 font-semibold">BAJA</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── 3. LOCALIZACIÓN COMPLETA ── */}
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">
              Localización completa del equipo o instalación
            </label>
            <input
              value={form.localizacion_completa}
              onChange={set('localizacion_completa')}
              placeholder={`${equipo.area || 'Área'}${equipo.piso ? `, Piso ${equipo.piso}` : ''} — detalle adicional...`}
              className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* ── 4. FALLA REPORTADA ── */}
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Falla reportada / Motivo del servicio *</label>
            <textarea
              required
              rows={3}
              value={form.falla_reportada}
              onChange={set('falla_reportada')}
              placeholder="Describe el problema observado..."
              className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* ── 5. HORAS Y TIEMPOS (nuevo, del .xls) ── */}
          <p className="text-xs font-semibold text-[var(--content-muted)] uppercase tracking-wider">
            3. Horarios y Tiempos
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de inicio</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={set('hora_inicio')}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de término</label>
              <input
                type="time"
                value={form.hora_termino}
                onChange={set('hora_termino')}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">T. estimado (min)</label>
              <input
                type="number"
                min="0"
                value={form.tiempo_estimado}
                onChange={set('tiempo_estimado')}
                placeholder="60"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">T. real (min)</label>
              <input
                type="number"
                min="0"
                value={form.tiempo_real}
                onChange={set('tiempo_real')}
                placeholder="(al cerrar la OS)"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* ── 6. TÉCNICO Y RECIBE ── */}
          <p className="text-xs font-semibold text-[var(--content-muted)] uppercase tracking-wider">
            4. Técnico y Recibe de Conformidad
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Técnico asignado</label>
              <input
                value={form.tecnico_nombre}
                onChange={set('tecnico_nombre')}
                placeholder="Nombre del Ing. Biomédico"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Recibe de conformidad (Nombre)</label>
              <input
                value={form.recibe_conformidad_nombre}
                onChange={set('recibe_conformidad_nombre')}
                placeholder="Nombre de quien recibe"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* ── 7. NOTAS / DESCRIPCIÓN DEL TRABAJO ── */}
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">
              Descripción del trabajo / Notas adicionales
            </label>
            <textarea
              rows={2}
              value={form.descripcion_servicio}
              onChange={set('descripcion_servicio')}
              placeholder="Acciones realizadas o por realizar..."
              className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{ background: '#2D6A27' }}
            >
              {guardando && (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {guardando ? 'Creando...' : 'Crear Orden de Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
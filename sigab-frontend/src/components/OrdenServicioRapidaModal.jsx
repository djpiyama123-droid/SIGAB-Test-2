// ============================================================
// OrdenServicioRapidaModal.jsx — Crear OS pre-llenada desde el mapa
// v.3.2.0 — 2026-07-08: porteo del formato IMSS oficial (rama
// feat/orden-servicio-imss-oficial-2026-07-07, commit 63c849e, base v3)
// adaptado al design system v4 "Verde-Blanco IMSS" (tokens de tema
// var(--content-*)/var(--accent-*), 4 temas via data-theme).
//
// 7 secciones numeradas (Identificación / Tipo+Prioridad / Localización /
// Falla / Horarios y Tiempos / Técnico y Recibe / Notas). Nuevos campos:
//   - hora_inicio, hora_termino, tiempo_estimado_hrs, tiempo_real_hrs
//   - recibe_conformidad_nombre, recibe_matricula (quien recibe de conformidad)
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
    localizacion_completa: '',
    hora_inicio: '',
    hora_termino: '',
    tiempo_estimado_hrs: '',
    tiempo_real_hrs: '',
    recibe_conformidad_nombre: '',
    recibe_matricula: '',
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
        ubicacion_fisica: equipo.ubicacion,
        localizacion_completa: form.localizacion_completa,
        piso: equipo.piso,
        area: equipo.area,
        tipo_mantenimiento: form.tipo_mantenimiento,
        falla_reportada: form.falla_reportada,
        descripcion_servicio: form.descripcion_servicio,
        tecnico_nombre: form.tecnico_nombre,
        recibe_conformidad_nombre: form.recibe_conformidad_nombre,
        recibe_matricula: form.recibe_matricula,
        hora_inicio: form.hora_inicio || undefined,
        hora_termino: form.hora_termino || undefined,
        tiempo_estimado_hrs: form.tiempo_estimado_hrs || undefined,
        tiempo_real_hrs: form.tiempo_real_hrs || undefined,
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

  const inputCls = 'w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-[var(--content-muted)] focus:outline-none focus:border-[var(--accent)]';
  const labelCls = 'text-xs text-[var(--content-muted)] block mb-1';
  const sectionCls = 'text-xs font-semibold text-[var(--accent-dark)] uppercase tracking-wider';

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — institucional IMSS, theme-safe (sin fondo fijo mezclado con texto de tema) */}
        <div className="p-5 border-b-2 border-[var(--accent)] flex justify-between items-start bg-[var(--accent-light)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--content-text)] flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent-dark)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Nueva Orden de Servicio Biomédica
            </h2>
            <p className="text-[var(--content-muted)] text-sm mt-0.5">
              {equipo.nombre} · <span className="font-mono">{equipo.serie}</span>
            </p>
            <p className="text-[var(--content-muted)] text-xs mt-1 italic">
              Instituto Mexicano del Seguro Social · HGR No. 1 — IMSS Tijuana
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--content-muted)] hover:text-[var(--content-text)] rounded-lg hover:bg-[var(--content-border)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. Identificación del equipo (solo lectura) */}
        <div className="p-5 bg-[var(--content-bg)]/40 border-b border-[var(--content-border)]/50">
          <p className={`${sectionCls} mb-2`}>1. Identificación del Equipo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[var(--content-muted)]">Ubicación</span>
              <p className="text-[var(--content-text)] font-medium">{equipo.area || '—'}{equipo.piso ? ` · Piso ${equipo.piso}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ── 2. TIPO Y PRIORIDAD ── */}
          <p className={sectionCls}>2. Tipo de Servicio y Prioridad</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo de mantenimiento *</label>
              <select
                value={form.tipo_mantenimiento}
                onChange={set('tipo_mantenimiento')}
                className={inputCls}
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
              <label className={labelCls}>Prioridad *</label>
              <div className="flex gap-4 text-xs h-11 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
                  <input type="radio" name="prio" value="alta" checked={form.prioridad === 'alta'} onChange={set('prioridad')} className="w-4 h-4 accent-red-600" />
                  <span className="text-red-600 font-semibold">ALTA</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
                  <input type="radio" name="prio" value="media" checked={form.prioridad === 'media'} onChange={set('prioridad')} className="w-4 h-4 accent-amber-600" />
                  <span className="text-amber-600 font-semibold">MEDIA</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
                  <input type="radio" name="prio" value="baja" checked={form.prioridad === 'baja'} onChange={set('prioridad')} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-emerald-600 font-semibold">BAJA</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── 3. LOCALIZACIÓN COMPLETA ── */}
          <div>
            <label className={labelCls}>Localización completa del equipo o instalación</label>
            <input
              value={form.localizacion_completa}
              onChange={set('localizacion_completa')}
              placeholder={`${equipo.area || 'Área'}${equipo.piso ? `, Piso ${equipo.piso}` : ''} — detalle adicional...`}
              className={inputCls}
            />
          </div>

          {/* ── 4. FALLA REPORTADA ── */}
          <div>
            <label className={labelCls}>Falla reportada / Motivo del servicio *</label>
            <textarea
              required
              rows={3}
              value={form.falla_reportada}
              onChange={set('falla_reportada')}
              placeholder="Describe el problema observado..."
              className={inputCls}
            />
          </div>

          {/* ── 5. HORARIOS Y TIEMPOS ── */}
          <p className={sectionCls}>3. Horarios y Tiempos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Hora de inicio</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={set('hora_inicio')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Hora de término</label>
              <input
                type="time"
                value={form.hora_termino}
                onChange={set('hora_termino')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>T. estimado (hrs)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.tiempo_estimado_hrs}
                onChange={set('tiempo_estimado_hrs')}
                placeholder="1.0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>T. real (hrs)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.tiempo_real_hrs}
                onChange={set('tiempo_real_hrs')}
                placeholder="(al cerrar la OS)"
                className={inputCls}
              />
            </div>
          </div>

          {/* ── 6. TÉCNICO Y RECIBE DE CONFORMIDAD ── */}
          <p className={sectionCls}>4. Técnico y Recibe de Conformidad</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Técnico asignado</label>
              <input
                value={form.tecnico_nombre}
                onChange={set('tecnico_nombre')}
                placeholder="Nombre del Ing. Biomédico"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Recibe de conformidad (Nombre)</label>
              <input
                value={form.recibe_conformidad_nombre}
                onChange={set('recibe_conformidad_nombre')}
                placeholder="Nombre de quien recibe"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 sm:w-1/2">
              <label className={labelCls}>Matrícula (quien recibe)</label>
              <input
                value={form.recibe_matricula}
                onChange={set('recibe_matricula')}
                placeholder="Matrícula"
                className={inputCls}
              />
            </div>
          </div>

          {/* ── 7. NOTAS / DESCRIPCIÓN DEL TRABAJO ── */}
          <div>
            <label className={labelCls}>Descripción del trabajo / Notas adicionales</label>
            <textarea
              rows={2}
              value={form.descripcion_servicio}
              onChange={set('descripcion_servicio')}
              placeholder="Acciones realizadas o por realizar..."
              className={inputCls}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2 rounded-lg bg-[var(--content-surface)] hover:bg-[var(--content-border)] border border-[var(--content-border)] text-[var(--content-text)] text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[48px] px-5 py-2 rounded-lg bg-[var(--accent-dark)] hover:opacity-90 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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

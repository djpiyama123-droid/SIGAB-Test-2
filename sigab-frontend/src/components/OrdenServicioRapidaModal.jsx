// ============================================================
// OrdenServicioRapidaModal.jsx — Crear OS pre-llenada desde el mapa
// Se invoca desde el botón "Abrir Orden de Servicio" en FichaTecnica
// ============================================================
import { useState } from 'react';
import { api } from '../api/sigab';
import { useToast } from './Toast';

export default function OrdenServicioRapidaModal({ equipo, onClose, onCreada }) {
  const toast = useToast();
  const [form, setForm] = useState({
    falla_reportada: '',
    tipo_mantenimiento: 'correctivo',
    prioridad: equipo?.criticidad === 'alta' ? 'alta' : 'media',
    tecnico_nombre: '',
    descripcion_servicio: '',
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
    try {
      const payload = {
        equipo_id: equipo.id,
        equipo_nombre: equipo.nombre,
        equipo_marca: equipo.marca,
        equipo_modelo: equipo.modelo,
        equipo_serie: equipo.serie,
        ubicacion_fisica: equipo.ubicacion,
        piso: equipo.piso,
        area: equipo.area,
        tipo_mantenimiento: form.tipo_mantenimiento,
        falla_reportada: form.falla_reportada,
        descripcion_servicio: form.descripcion_servicio,
        tecnico_nombre: form.tecnico_nombre,
        prioridad: form.prioridad,
        origen: 'dashboard',
      };

      const res = await api.crearOrden(payload);
      onCreada?.(res.numero_orden);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error desconocido';
      toast.error(`No se pudo crear la orden: ${msg}`);
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  if (!equipo) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Nueva Orden de Servicio
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {equipo.nombre} · <span className="font-mono">{equipo.serie}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Datos del equipo (solo lectura) */}
        <div className="p-5 bg-slate-900/40 border-b border-slate-700/50">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Marca</span>
              <p className="text-slate-200 font-medium">{equipo.marca || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Modelo</span>
              <p className="text-slate-200 font-medium">{equipo.modelo || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Ubicación</span>
              <p className="text-slate-200 font-medium">{equipo.area || '—'}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Falla reportada *</label>
            <textarea
              required
              rows={3}
              value={form.falla_reportada}
              onChange={set('falla_reportada')}
              placeholder="Describe el problema observado..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tipo de mantenimiento</label>
              <select
                value={form.tipo_mantenimiento}
                onChange={set('tipo_mantenimiento')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="correctivo">Correctivo</option>
                <option value="preventivo">Preventivo</option>
                <option value="instalacion">Instalación</option>
                <option value="calibracion">Calibración</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={set('prioridad')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Técnico asignado</label>
            <input
              value={form.tecnico_nombre}
              onChange={set('tecnico_nombre')}
              placeholder="Nombre del biomédico"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Notas adicionales</label>
            <textarea
              rows={2}
              value={form.descripcion_servicio}
              onChange={set('descripcion_servicio')}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
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

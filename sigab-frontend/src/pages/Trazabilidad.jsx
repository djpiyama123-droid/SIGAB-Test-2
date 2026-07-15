import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { MapPin, ArrowRight, Plus, X } from 'lucide-react';
import toast from '../lib/toast';

// ─── Modal: Registrar Traslado ────────────────────────────────────────────────
function RegistrarTrasladoModal({ onClose, onSaved }) {
  const [equipos, setEquipos] = useState([]);
  const [form, setForm] = useState({
    equipo_id: '',
    area_destino: '',
    piso_destino: '',
    motivo: '',
    notas: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getEquipos({ limit: 200 })
      .then(data => setEquipos(data.equipos ?? data ?? []))
      .catch(() => toast.error('Error al cargar equipos'));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipo_id) return toast.error('Selecciona un equipo');
    if (!form.area_destino.trim()) return toast.error('Indica el área de destino');
    setSaving(true);
    try {
      await api.registrarTraslado({
        ...form,
        equipo_id: Number(form.equipo_id),
        piso_destino: form.piso_destino ? Number(form.piso_destino) : null,
      });
      toast.success('Traslado registrado en trazabilidad');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar traslado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-900/40">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Registrar Traslado
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Equipo *</label>
            <select required value={form.equipo_id} onChange={e => set('equipo_id', e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="">— Seleccionar equipo —</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre} — {eq.serie}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Área de destino *</label>
              <input required value={form.area_destino} onChange={e => set('area_destino', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ej. UCI, Urgencias, Quirófano" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Piso</label>
              <input type="number" min={1} value={form.piso_destino} onChange={e => set('piso_destino', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Motivo</label>
            <input value={form.motivo} onChange={e => set('motivo', e.target.value)}
              className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ej. Préstamo temporal, mantenimiento, reubicación" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Notas adicionales</label>
            <textarea rows={2} value={form.notas} onChange={e => set('notas', e.target.value)}
              className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-655 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="Observaciones del traslado..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar Traslado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Trazabilidad() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTraslado, setModalTraslado] = useState(false);

  const cargar = () => {
    setLoading(true);
    api.getTrazabilidad()
      .then(res => setMovimientos(res.movimientos ?? []))
      .catch(() => toast.error('No se pudo cargar la trazabilidad'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-text)] flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-500" />
            Trazabilidad de Equipos
          </h1>
          <p className="text-[var(--content-muted)] text-sm">Historial de movimientos y traslados — NOM-016</p>
        </div>
        <button
          onClick={() => setModalTraslado(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg active:scale-95 min-h-[44px] justify-center">
          <Plus className="h-4 w-4" />
          Registrar Traslado
        </button>
      </div>

      {loading ? (
        <div className="text-[var(--content-muted)] py-12 text-center">Cargando movimientos...</div>
      ) : movimientos.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl">
          <MapPin className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin movimientos registrados.</p>
          <button onClick={() => setModalTraslado(true)}
            className="mt-4 text-emerald-500 text-sm font-semibold hover:text-emerald-400 transition-colors">
            + Registrar primer traslado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {movimientos.map((m, i) => (
            <div key={m.id || i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                {i < movimientos.length - 1 && (
                  <div className="w-0.5 flex-1 bg-[var(--content-surface)] my-1" />
                )}
              </div>
              <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg p-4 flex-1 mb-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[var(--content-text)] text-sm font-medium">{m.equipo_nombre}</span>
                    <span className="text-[var(--content-muted)] text-xs ml-2 font-mono">{m.equipo_serie}</span>
                  </div>
                  <span className="text-[var(--content-muted)] text-xs">
                    {m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-MX') : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="bg-[var(--content-surface)] text-[var(--content-muted)] px-2 py-0.5 rounded text-xs">
                    {m.area_origen || 'Origen desconocido'}
                    {m.piso_origen && ` • P${m.piso_origen}`}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded text-xs border border-emerald-800">
                    {m.area_destino}
                    {m.piso_destino && ` • P${m.piso_destino}`}
                  </span>
                </div>
                {m.motivo && (
                  <p className="text-[var(--content-muted)] text-xs mt-1.5 font-medium">Motivo: {m.motivo}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTraslado && (
        <RegistrarTrasladoModal
          onClose={() => setModalTraslado(false)}
          onSaved={() => { setModalTraslado(false); cargar(); }}
        />
      )}
    </div>
  );
}

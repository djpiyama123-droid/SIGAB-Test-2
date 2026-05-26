import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { Users, GraduationCap, Calendar, Plus, ChevronRight, X } from 'lucide-react';
import toast from '../lib/toast';

// ─── Modal: Nuevo Registro de Capacitación ────────────────────────────────────
function NuevoRegistroModal({ onClose, onSaved }) {
  const [equipos, setEquipos] = useState([]);
  const [form, setForm] = useState({
    equipo_id: '',
    tema: '',
    fecha_capacitacion: new Date().toISOString().split('T')[0],
    instructor: '',
    personal_capacitado: '',
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
    if (!form.tema.trim()) return toast.error('Ingresa el tema de la capacitación');
    if (!form.personal_capacitado.trim()) return toast.error('Indica el personal capacitado');
    setSaving(true);
    try {
      await api.crearCapacitacion({
        ...form,
        equipo_id: Number(form.equipo_id),
      });
      toast.success('Capacitación registrada — cumplimiento NOM-016');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar capacitación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-500" />
            Nuevo Registro de Capacitación
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1 block">Equipo *</label>
            <select required value={form.equipo_id} onChange={e => set('equipo_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="">— Seleccionar equipo —</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre} — {eq.serie}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1 block">Tema de capacitación *</label>
            <input required value={form.tema} onChange={e => set('tema', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ej. Uso seguro del ventilador mecánico" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1 block">Fecha *</label>
              <input type="date" required value={form.fecha_capacitacion} onChange={e => set('fecha_capacitacion', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1 block">Instructor</label>
              <input value={form.instructor} onChange={e => set('instructor', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Nombre del instructor" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1 block">Personal capacitado *</label>
            <textarea required rows={3} value={form.personal_capacitado} onChange={e => set('personal_capacitado', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="Ej. Enf. García, Enf. López, Dr. Martínez (lista o descripción del grupo)" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar Capacitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Capacitaciones() {
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getCapacitaciones();
      setCapacitaciones(data.capacitaciones ?? data ?? []);
    } catch {
      toast.error('Error al cargar capacitaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-emerald-500" />
            Capacitación de Personal
          </h1>
          <p className="text-slate-400 mt-1">Cumplimiento NOM-016: Registro de formación en uso y seguridad de equipos.</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Cargando capacitaciones...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capacitaciones.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/40 border border-slate-700 hover:border-emerald-500/50 transition-all p-6 rounded-3xl group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500">
                  <Calendar className="h-6 w-6" />
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">
                  {item.fecha_capacitacion}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                {item.tema}
              </h3>
              <p className="text-sm text-slate-400 mb-4">{item.equipo_nombre} ({item.equipo_serie})</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>Instructor: <span className="text-white font-medium">{item.instructor || 'Por definir'}</span></span>
                </div>
                {item.personal_capacitado && (
                  <p className="text-xs text-slate-500 truncate" title={item.personal_capacitado}>
                    Personal: {item.personal_capacitado}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Evidencia Digital</span>
                  <ChevronRight className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            </div>
          ))}
          {capacitaciones.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl">
              <GraduationCap className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No hay registros de capacitación aún.</p>
              <button onClick={() => setModalNueva(true)}
                className="mt-4 text-emerald-500 text-sm font-semibold hover:text-emerald-400 transition-colors">
                + Agregar primer registro
              </button>
            </div>
          )}
        </div>
      )}

      {modalNueva && (
        <NuevoRegistroModal
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargar(); }}
        />
      )}
    </div>
  );
}

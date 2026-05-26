import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { ShieldCheck, Calendar, AlertCircle, Plus, FileText, X } from 'lucide-react';
import toast from '../lib/toast';

// ─── Modal: Nueva Calibración ─────────────────────────────────────────────────
function NuevaCalibracionModal({ onClose, onSaved }) {
  const [equipos, setEquipos] = useState([]);
  const [form, setForm] = useState({
    equipo_id: '',
    tipo_medicion: '',
    fecha_calibracion: new Date().toISOString().split('T')[0],
    entidad_calibradora: '',
    certificado_numero: '',
    vigencia_meses: 12,
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
    if (!form.tipo_medicion.trim()) return toast.error('Ingresa el tipo de medición');
    setSaving(true);
    try {
      await api.crearCalibracion({
        ...form,
        equipo_id: Number(form.equipo_id),
        vigencia_meses: Number(form.vigencia_meses),
      });
      toast.success('Calibración registrada correctamente');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar calibración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-955 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-900/40">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            Nueva Calibración
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Equipo *</label>
            <select required value={form.equipo_id} onChange={e => set('equipo_id', e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors">
              <option value="">— Seleccionar equipo —</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre} — {eq.serie}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Tipo de medición *</label>
              <input required value={form.tipo_medicion} onChange={e => set('tipo_medicion', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Ej. Presión arterial, Temperatura, Flujo O₂" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Fecha de calibración *</label>
              <input type="date" required value={form.fecha_calibracion} onChange={e => set('fecha_calibracion', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Vigencia (meses)</label>
              <input type="number" min={1} max={120} value={form.vigencia_meses} onChange={e => set('vigencia_meses', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Entidad calibradora</label>
              <input value={form.entidad_calibradora} onChange={e => set('entidad_calibradora', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-655 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Laboratorio NOM-028" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Número de certificado</label>
              <input value={form.certificado_numero} onChange={e => set('certificado_numero', e.target.value)}
                className="w-full bg-slate-900 border border-slate-855 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-655 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="CERT-2026-001" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar Calibración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Metrologia() {
  const [calibraciones, setCalibraciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getMetrologia();
      setCalibraciones(data.calibraciones ?? data ?? []);
    } catch {
      toast.error('Error al cargar metrología');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const proximos = calibraciones.filter(c => {
    const diff = new Date(c.proxima_calibracion) - new Date();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            Metrología y Calibración
          </h1>
          <p className="text-[var(--content-muted)] mt-1">Control de exactitud y certificados de instrumentos de medición.</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Nueva Calibración
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-[var(--content-border)] p-6 rounded-2xl">
          <p className="text-[var(--content-muted)] text-sm font-medium">Equipos Calibrados</p>
          <p className="text-3xl font-bold text-[var(--content-text)] mt-2">{calibraciones.length}</p>
        </div>
        <div className="bg-orange-900/10 border border-orange-900/50 p-6 rounded-2xl">
          <p className="text-orange-400/80 text-sm font-medium">Próximos a Vencer (30d)</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">{proximos.length}</p>
        </div>
        <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-2xl">
          <p className="text-red-400/80 text-sm font-medium">Vencidos / Fuera de Norma</p>
          <p className="text-3xl font-bold text-red-500 mt-2">
            {calibraciones.filter(c => new Date(c.proxima_calibracion) <= new Date()).length}
          </p>
        </div>
      </div>

      <div className="bg-[var(--content-bg)]/50 border border-[var(--content-border)] rounded-2xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[var(--content-bg)]/80 border-b border-[var(--content-border)]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase">Equipo / Serie</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase">Magnitud/Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase">Última</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase">Próxima</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase text-center">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase text-right">Certificado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--content-muted)]">Cargando calibraciones...</td></tr>
            ) : calibraciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center bg-slate-900/10 rounded-2xl">
                  <ShieldCheck className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Sin calibraciones registradas.</p>
                </td>
              </tr>
            ) : (
              calibraciones.map((c) => {
                const isPast = new Date(c.proxima_calibracion) <= new Date();
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--content-text)] group-hover:text-blue-400 transition-colors">{c.equipo_nombre}</p>
                      <p className="text-[10px] text-[var(--content-muted)] uppercase">{c.equipo_serie}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--content-muted)]">{c.tipo_medicion}</td>
                    <td className="px-6 py-4 text-sm text-[var(--content-muted)]">{c.fecha_calibracion}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${isPast ? 'text-red-500' : 'text-emerald-500'}`}>
                      {c.proxima_calibracion}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                        isPast ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      }`}>
                        {isPast ? 'REEMPLAZAR/CALIBRAR' : 'VIGENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (c.certificado_url) window.open(c.certificado_url, '_blank');
                          else toast('Certificado aún no cargado para este equipo', { icon: '📄' });
                        }}
                        title={c.certificado_url ? 'Abrir certificado' : 'Sin certificado'}
                        className="text-blue-400 hover:text-blue-300 shadow-sm">
                        <FileText className="h-5 w-5 ml-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalNueva && (
        <NuevaCalibracionModal
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargar(); }}
        />
      )}
    </div>
  );
}

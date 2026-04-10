import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';
import OrdenDetalleModal from '../components/OrdenDetalleModal';

const PRIORIDAD_BADGE = {
  critica: 'bg-red-900/60 text-red-300 border border-red-700',
  alta:    'bg-orange-900/60 text-orange-300 border border-orange-700',
  media:   'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  baja:    'bg-slate-700 text-slate-400',
};

const ESTADO_BADGE = {
  abierta:     'bg-red-900/40 text-red-400',
  en_progreso: 'bg-yellow-900/40 text-yellow-400',
  cerrada:     'bg-emerald-900/40 text-emerald-400',
  cancelada:   'bg-slate-700 text-slate-500',
};

const FILTROS_ESTADO = ['', 'abierta', 'en_progreso', 'cerrada'];
const FILTROS_TIPO   = ['', 'correctivo', 'preventivo', 'instalacion', 'calibracion'];

export default function Ordenes() {
  const [ordenes, setOrdenes]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [estadoFiltro, setEstado]     = useState('');
  const [tipoFiltro, setTipo]         = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({
    equipo_nombre: '', equipo_serie: '', tipo_mantenimiento: 'correctivo',
    tipo_formato: 'correctivo_corto',
    falla_reportada: '', tecnico_nombre: '', area: '', piso: '', prioridad: 'media',
  });
  const [guardando, setGuardando]     = useState(false);
  const [selectedOrden, setSelectedOrden] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrdenes({
        estado: estadoFiltro || undefined,
        tipo: tipoFiltro || undefined,
      });
      setOrdenes(res.ordenes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, tipoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.crearOrden({ ...form, origen: 'dashboard' });
      setShowForm(false);
      setForm({ equipo_nombre:'', equipo_serie:'', tipo_mantenimiento:'correctivo',
                tipo_formato:'correctivo_corto',
                falla_reportada:'', tecnico_nombre:'', area:'', piso:'', prioridad:'media' });
      cargar();
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrar = async (id) => {
    await api.cerrarOrden(id);
    cargar();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Órdenes de Servicio</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? '✕ Cancelar' : '+ Nueva OS'}
        </button>
      </div>

      {/* Formulario crear */}
      {showForm && (
        <form onSubmit={handleCrear}
          className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Nueva Orden de Servicio</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['equipo_nombre','Equipo (nombre)','text'],
              ['equipo_serie','No. Serie','text'],
              ['tecnico_nombre','Técnico','text'],
              ['area','Área','text'],
              ['piso','Piso','text'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-slate-400 block mb-1">{label}</label>
                <input value={form[k]} onChange={set(k)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600" />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={set('prioridad')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
                {['baja','media','alta','critica'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Formato IMSS</label>
              <select value={form.tipo_formato} onChange={set('tipo_formato')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
                <option value="correctivo_corto">Correctivo Corto</option>
                <option value="correctivo_largo">Correctivo Largo (Complejo)</option>
                <option value="preventivo">Mantenimiento Preventivo</option>
                <option value="orden_entrega">Orden de Entrega (Contrato Externo)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Falla reportada *</label>
            <textarea required rows={3} value={form.falla_reportada} onChange={set('falla_reportada')}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600" />
          </div>
          <button type="submit" disabled={guardando}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Crear Orden'}
          </button>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center">Estado:</span>
        {FILTROS_ESTADO.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              estadoFiltro === e ? 'bg-emerald-800/60 text-emerald-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
        <span className="text-xs text-slate-500 self-center ml-3">Tipo:</span>
        {FILTROS_TIPO.map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tipoFiltro === t ? 'bg-blue-800/60 text-blue-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-slate-400 py-8 text-center">Cargando órdenes...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-slate-500 py-8 text-center">Sin órdenes con ese filtro.</div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 text-left">
                  {['# Orden','Equipo','Falla','Técnico','Área','Fecha','Estado','Prioridad','Acción'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenes.map((os) => (
                  <tr key={os.id}
                    onClick={() => setSelectedOrden(os.id)}
                    className="border-t border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-300 text-xs">{os.numero_orden}</td>
                    <td className="px-4 py-3 text-white">{os.equipo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{os.falla_reportada || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{os.tecnico_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{os.area || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{os.fecha}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[os.estado] || ''}`}>
                        {os.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORIDAD_BADGE[os.prioridad] || ''}`}>
                        {os.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {os.estado !== 'cerrada' && os.estado !== 'cancelada' && (
                        <button onClick={() => handleCerrar(os.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline">
                          Cerrar Rápido
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-slate-600 text-xs border-t border-slate-700">
            {ordenes.length} órdenes
          </div>
        </div>
      )}

      {selectedOrden && (
        <OrdenDetalleModal
          ordenId={selectedOrden}
          onClose={() => setSelectedOrden(null)}
          onUpdated={cargar}
        />
      )}
    </div>
  );
}

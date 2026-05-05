/**
 * @module pages/Ordenes
 * @description Gestión de Órdenes de Servicio (OS) del sistema SIGAB.
 *
 * Funcionalidades:
 * - Listado con filtros por estado (abierta/en_progreso/cerrada) y tipo
 * - Creación de nuevas OS con formulario inline (folio auto-generado)
 * - Cierre de órdenes con confirmación
 * - Modal de detalle completo (OrdenDetalleModal)
 * - Integración con Casillas CENEVAL (OrdenCasillasForm)
 *
 * @requires api/sigab — Cliente HTTP centralizado
 * @requires components/OrdenDetalleModal — Vista detallada de la OS
 * @requires components/OrdenCasillasForm — Formulario CENEVAL
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';
import OrdenDetalleModal from '../components/OrdenDetalleModal';
import OrdenCasillasForm from '../components/OrdenCasillasForm';
import { useToast } from '../components/Toast';

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
  const toast = useToast();
  const [tab, setTab]                 = useState('activas'); // 'activas' | 'historico'
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
  // Casillas CENEVAL
  const [showCasillas, setShowCasillas]     = useState(false);
  const [casillasOrdenId, setCasillasOrdenId] = useState(null);
  const [casillasEquipo, setCasillasEquipo]   = useState({});
  // Archivo histórico ORDENESIMSS
  const [archivos, setArchivos]             = useState([]);
  const [archivosTotal, setArchivosTotal]   = useState(0);
  const [archivosPag, setArchivosPag]       = useState(1);
  const [archivoBuscar, setArchivoBuscar]   = useState('');
  const [archivosLoading, setArchivosLoading] = useState(false);

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
      toast.error('No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, tipoFiltro]); // eslint-disable-line

  const cargarArchivos = useCallback(async (pagina = 1, buscar = '') => {
    setArchivosLoading(true);
    try {
      const res = await api.getArchivosHistoricos({ page: pagina, buscar: buscar || undefined, limit: 30 });
      setArchivos(res.archivos || []);
      setArchivosTotal(res.total || 0);
      setArchivosPag(pagina);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el archivo histórico');
    } finally {
      setArchivosLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (tab === 'historico') cargarArchivos(1, archivoBuscar);
  }, [tab]); // eslint-disable-line

  const handleCrear = async (e) => {
    e.preventDefault();
    // Validación mínima antes de POST
    if (!form.falla_reportada.trim()) {
      toast.error('Describe la falla reportada');
      return;
    }
    if (!form.equipo_nombre.trim() && !form.equipo_serie.trim()) {
      toast.error('Especifica nombre del equipo o número de serie');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.crearOrden({ ...form, origen: 'dashboard' });
      toast.success(`Orden ${res.numero_orden || ''} creada`);
      setShowForm(false);
      setForm({ equipo_nombre:'', equipo_serie:'', tipo_mantenimiento:'correctivo',
                tipo_formato:'correctivo_corto',
                falla_reportada:'', tecnico_nombre:'', area:'', piso:'', prioridad:'media' });
      cargar();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Error al crear la orden');
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrar = async (id) => {
    if (!window.confirm('¿Cerrar esta orden de servicio?')) return;
    const tid = toast.loading('Cerrando orden...');
    try {
      await api.cerrarOrden(id);
      toast.success('Orden cerrada', { id: tid });
      cargar();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cerrar la orden', { id: tid });
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Órdenes de Servicio</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCasillasOrdenId(null); setCasillasEquipo({}); setShowCasillas(true); }}
            className="hidden md:block px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            📋 Nueva OS (Casillas)
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="hidden md:block px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            {showForm ? '✕ Cancelar' : '+ Nueva OS'}
          </button>
        </div>
      </div>

      {/* FAB Móvil */}
      <div className="md:hidden fixed bottom-6 right-6 z-[40] flex flex-col gap-3">
        <button
          onClick={() => { setCasillasOrdenId(null); setCasillasEquipo({}); setShowCasillas(true); }}
          className="w-12 h-12 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg shadow-teal-900/50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Nueva OS (Casillas)"
        >
          📋
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${showForm ? 'bg-red-600 shadow-red-900/50' : 'bg-emerald-600 shadow-emerald-900/50'}`}
        >
          {showForm ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {[['activas','Órdenes Activas'],['historico',`Archivo Histórico (${archivosTotal || 858})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Archivo Histórico ORDENESIMSS ─────────────────────── */}
      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={archivoBuscar}
              onChange={(e) => setArchivoBuscar(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargarArchivos(1, archivoBuscar)}
              placeholder="Buscar por folio, serie, tipo..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600"
            />
            <button onClick={() => cargarArchivos(1, archivoBuscar)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
              Buscar
            </button>
          </div>

          {archivosLoading ? (
            <div className="text-slate-400 py-8 text-center">Cargando archivos...</div>
          ) : archivos.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">Sin resultados.</div>
          ) : (
            <>
              {/* Vista móvil: cards */}
              <div className="block sm:hidden space-y-2">
                {archivos.map((a) => (
                  <a key={a.nombre} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="block bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-emerald-600 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-emerald-400">{a.folio}</span>
                      <span className="text-xs text-slate-500">{a.anio}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{a.tipo} — Serie: {a.serie}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{a.nombre}</div>
                  </a>
                ))}
              </div>

              {/* Vista escritorio: tabla */}
              <div className="hidden sm:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 text-left">
                        {['Folio','Tipo','Año','No. Serie','Archivo'].map((h) => (
                          <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.map((a) => (
                        <tr key={a.nombre} className="border-t border-slate-700/50 hover:bg-slate-700/40 transition-colors">
                          <td className="px-4 py-2 font-mono text-xs text-emerald-400">{a.folio}</td>
                          <td className="px-4 py-2 text-xs text-slate-300 capitalize">{a.tipo}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{a.anio}</td>
                          <td className="px-4 py-2 text-xs text-slate-400">{a.serie}</td>
                          <td className="px-4 py-2">
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                              Ver PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 flex items-center justify-between text-slate-500 text-xs border-t border-slate-700">
                  <span>{archivosTotal} documentos en total</span>
                  <div className="flex gap-2">
                    <button onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                      disabled={archivosPag <= 1}
                      className="px-2 py-1 bg-slate-700 rounded disabled:opacity-30 hover:bg-slate-600">
                      ‹ Ant
                    </button>
                    <span className="self-center">Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                    <button onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                      disabled={archivosPag >= Math.ceil(archivosTotal / 30)}
                      className="px-2 py-1 bg-slate-700 rounded disabled:opacity-30 hover:bg-slate-600">
                      Sig ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Paginación móvil */}
              <div className="flex sm:hidden justify-between items-center text-xs text-slate-500">
                <button onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                  disabled={archivosPag <= 1}
                  className="px-3 py-1.5 bg-slate-700 rounded disabled:opacity-30">‹ Ant</button>
                <span>Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                <button onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                  disabled={archivosPag >= Math.ceil(archivosTotal / 30)}
                  className="px-3 py-1.5 bg-slate-700 rounded disabled:opacity-30">Sig ›</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Órdenes Activas ──────────────────────────────────── */}
      {tab === 'activas' && <>

      {/* Formulario crear */}
      {showForm && (
        <form onSubmit={handleCrear}
          className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Nueva Orden de Servicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          {/* Vista móvil: Cards */}
          <div className="block sm:hidden divide-y divide-slate-700/50">
            {ordenes.map((os) => (
              <div
                key={os.id}
                onClick={() => setSelectedOrden(os.id)}
                className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-emerald-400">{os.numero_orden}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ESTADO_BADGE[os.estado] || ''}`}>
                    {os.estado?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-white text-sm font-bold mb-1">{os.equipo_nombre || 'Sin nombre'}</h3>
                <p className="text-slate-400 text-xs mb-3 line-clamp-2">{os.falla_reportada || 'Sin reporte'}</p>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600">👤</span> {os.tecnico_nombre || '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600">📍</span> {os.area || '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600">📅</span> {os.fecha}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/30">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORIDAD_BADGE[os.prioridad] || ''}`}>
                    {os.prioridad}
                  </span>
                  <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setCasillasOrdenId(os.id);
                        setCasillasEquipo({ nombre: os.equipo_nombre, serie: os.equipo_serie, area: os.area, piso: os.piso });
                        setShowCasillas(true);
                      }}
                      className="px-3 py-1 bg-teal-600/20 text-teal-400 rounded-lg border border-teal-500/30 text-xs"
                    >
                      📋 CENEVAL
                    </button>
                    {os.estado !== 'cerrada' && os.estado !== 'cancelada' && (
                      <button onClick={() => handleCerrar(os.id)}
                        className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 text-xs">
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista escritorio: Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium whitespace-nowrap"># Orden</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Equipo</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">Falla</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Técnico</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Área</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">Prioridad</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((os) => (
                  <tr key={os.id}
                    onClick={() => setSelectedOrden(os.id)}
                    className="border-t border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-300 text-xs whitespace-nowrap">{os.numero_orden}</td>
                    <td className="px-4 py-3 text-white text-xs max-w-[120px] truncate">{os.equipo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate hidden sm:table-cell">{os.falla_reportada || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{os.tecnico_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{os.area || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{os.fecha}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[os.estado] || ''}`}>
                        {os.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORIDAD_BADGE[os.prioridad] || ''}`}>
                        {os.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {os.estado !== 'cerrada' && os.estado !== 'cancelada' && (
                          <button onClick={() => handleCerrar(os.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline">
                            Cerrar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCasillasOrdenId(os.id);
                            setCasillasEquipo({ nombre: os.equipo_nombre, serie: os.equipo_serie, area: os.area, piso: os.piso });
                            setShowCasillas(true);
                          }}
                          className="text-xs text-teal-400 hover:text-teal-300 hover:underline"
                        >
                          📋
                        </button>
                      </div>
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

      {/* Modal Casillas CENEVAL */}
      {showCasillas && (
        <OrdenCasillasForm
          ordenId={casillasOrdenId}
          equipoData={casillasEquipo}
          onGuardado={() => { cargar(); }}
          onCerrar={() => setShowCasillas(false)}
        />
      )}

      </> /* fin tab activas */}
    </div>
  );
}

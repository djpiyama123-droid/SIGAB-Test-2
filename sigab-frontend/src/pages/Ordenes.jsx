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
import { SigabButton, SigabCard, SigabSpinner } from '../components/v2/SigabUI';
import { useToast } from '../components/Toast';

const PRIORIDAD_BADGE = {
  critica: 'bg-rose-50 text-rose-700 border border-rose-200',
  alta:    'bg-amber-50 text-amber-700 border border-amber-200',
  media:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  baja:    'bg-sigab-surface-alt text-sigab-text-muted border border-sigab-border',
};

const ESTADO_BADGE = {
  abierta:     'bg-rose-50 text-rose-700',
  en_progreso: 'bg-amber-50 text-amber-700',
  cerrada:     'bg-emerald-50 text-emerald-700',
  cancelada:   'bg-sigab-surface-alt text-sigab-text-muted',
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
    <div className="sigab-v2 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-cobalt-900">Órdenes de Servicio</h1>
        <div className="flex flex-wrap gap-2">
          <SigabButton
            variant="accent"
            onClick={() => { setCasillasOrdenId(null); setCasillasEquipo({}); setShowCasillas(true); }}
            iconLeft="📋"
          >
            Nueva OS (Casillas)
          </SigabButton>
          <SigabButton
            variant="primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? '✕ Cancelar' : '+ Nueva OS'}
          </SigabButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sigab-border">
        {[['activas','Órdenes Activas'],['historico',`Archivo Histórico (${archivosTotal || 858})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-teal2-500 text-teal2-600'
                : 'border-transparent text-sigab-text-muted hover:text-sigab-text'
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
              className="flex-1 bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-teal2-500/50"
            />
            <SigabButton onClick={() => cargarArchivos(1, archivoBuscar)} variant="primary">
              Buscar
            </SigabButton>
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
                    className="block bg-sigab-surface border border-sigab-border rounded-[var(--sigab-radius-lg)] p-3 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-cobalt-600">{a.folio}</span>
                      <span className="text-xs text-sigab-text-muted">{a.anio}</span>
                    </div>
                    <div className="text-xs text-sigab-text mt-1">{a.tipo} — Serie: {a.serie}</div>
                    <div className="text-xs text-sigab-text-muted mt-0.5 truncate">{a.nombre}</div>
                  </a>
                ))}
              </div>

              {/* Vista escritorio: tabla */}
              <div className="hidden sm:block bg-sigab-surface rounded-[var(--sigab-radius-lg)] border border-sigab-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-sigab-surface-alt text-sigab-text-muted text-left">
                        {['Folio','Tipo','Año','No. Serie','Archivo'].map((h) => (
                          <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.map((a) => (
                        <tr key={a.nombre} className="border-t border-sigab-border hover:bg-sigab-bg transition-colors">
                          <td className="px-4 py-2 font-mono text-xs font-bold text-cobalt-600">{a.folio}</td>
                          <td className="px-4 py-2 text-xs text-sigab-text capitalize">{a.tipo}</td>
                          <td className="px-4 py-2 text-xs text-sigab-text-muted">{a.anio}</td>
                          <td className="px-4 py-2 text-xs text-sigab-text">{a.serie}</td>
                          <td className="px-4 py-2">
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-teal2-600 hover:text-teal2-700 hover:underline">
                              Ver PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-sigab-text-muted text-xs border-t border-sigab-border bg-sigab-surface-alt">
                  <span>{archivosTotal} documentos en total</span>
                  <div className="flex gap-2 items-center">
                    <SigabButton onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                      disabled={archivosPag <= 1} variant="secondary" size="sm">
                      ‹ Ant
                    </SigabButton>
                    <span className="self-center">Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                    <SigabButton onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                      disabled={archivosPag >= Math.ceil(archivosTotal / 30)} variant="secondary" size="sm">
                      Sig ›
                    </SigabButton>
                  </div>
                </div>
              </div>

              {/* Paginación móvil */}
              <div className="flex sm:hidden justify-between items-center text-xs text-sigab-text-muted mt-3">
                <SigabButton onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                  disabled={archivosPag <= 1} variant="secondary" size="sm">‹ Ant</SigabButton>
                <span>Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                <SigabButton onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                  disabled={archivosPag >= Math.ceil(archivosTotal / 30)} variant="secondary" size="sm">Sig ›</SigabButton>
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
          className="bg-sigab-surface border border-sigab-border shadow-sm rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-cobalt-900">Nueva Orden de Servicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['equipo_nombre','Equipo (nombre)','text'],
              ['equipo_serie','No. Serie','text'],
              ['tecnico_nombre','Técnico','text'],
              ['area','Área','text'],
              ['piso','Piso','text'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-sigab-text-muted block mb-1">{label}</label>
                <input value={form[k]} onChange={set(k)}
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
              </div>
            ))}
            <div>
              <label className="text-xs text-sigab-text-muted block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={set('prioridad')}
                className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-teal2-500/50">
                {['baja','media','alta','critica'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-sigab-text-muted block mb-1">Formato IMSS</label>
              <select value={form.tipo_formato} onChange={set('tipo_formato')}
                className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-teal2-500/50">
                <option value="correctivo_corto">Correctivo Corto</option>
                <option value="correctivo_largo">Correctivo Largo (Complejo)</option>
                <option value="preventivo">Mantenimiento Preventivo</option>
                <option value="orden_entrega">Orden de Entrega (Contrato Externo)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-sigab-text-muted block mb-1">Falla reportada *</label>
            <textarea required rows={3} value={form.falla_reportada} onChange={set('falla_reportada')}
              className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
          </div>
          <SigabButton type="submit" disabled={guardando} variant="primary">
            {guardando ? 'Guardando...' : 'Crear Orden'}
          </SigabButton>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-sigab-text-muted self-center">Estado:</span>
        {FILTROS_ESTADO.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-[var(--sigab-radius-md)] text-xs font-semibold capitalize transition-colors border ${
              estadoFiltro === e ? 'bg-teal2-50 text-teal2-700 border-teal2-200' : 'bg-sigab-surface border-sigab-border text-sigab-text-muted hover:bg-sigab-bg hover:text-sigab-text'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
        <span className="text-xs text-sigab-text-muted self-center ml-3">Tipo:</span>
        {FILTROS_TIPO.map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 rounded-[var(--sigab-radius-md)] text-xs font-semibold capitalize transition-colors border ${
              tipoFiltro === t ? 'bg-cobalt-50 text-cobalt-700 border-cobalt-200' : 'bg-sigab-surface border-sigab-border text-sigab-text-muted hover:bg-sigab-bg hover:text-sigab-text'
            }`}>
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-sigab-text-muted py-8 text-center flex justify-center"><SigabSpinner label="Cargando órdenes..." /></div>
      ) : ordenes.length === 0 ? (
        <div className="text-sigab-text-muted py-8 text-center bg-sigab-surface border border-sigab-border rounded-xl">Sin órdenes con ese filtro.</div>
      ) : (
        <div className="bg-sigab-surface rounded-[var(--sigab-radius-lg)] border border-sigab-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sigab-surface-alt text-sigab-text-muted text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"># Orden</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Equipo</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden sm:table-cell">Falla</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden md:table-cell">Técnico</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden md:table-cell">Área</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden sm:table-cell">Prioridad</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((os) => (
                  <tr key={os.id}
                    onClick={() => setSelectedOrden(os.id)}
                    className="border-t border-sigab-border hover:bg-sigab-bg cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-cobalt-600 text-xs whitespace-nowrap">{os.numero_orden}</td>
                    <td className="px-4 py-3 text-sigab-text text-xs max-w-[120px] truncate">{os.equipo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs max-w-xs truncate hidden sm:table-cell">{os.falla_reportada || '—'}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs hidden md:table-cell">{os.tecnico_nombre || '—'}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs hidden md:table-cell">{os.area || '—'}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs hidden md:table-cell">{os.fecha}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_BADGE[os.estado] || ''}`}>
                        {os.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PRIORIDAD_BADGE[os.prioridad] || ''}`}>
                        {os.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {os.estado !== 'cerrada' && os.estado !== 'cancelada' && (
                          <button onClick={() => handleCerrar(os.id)}
                            className="text-xs text-teal2-600 hover:text-teal2-700 hover:underline font-semibold">
                            Cerrar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCasillasOrdenId(os.id);
                            setCasillasEquipo({ nombre: os.equipo_nombre, serie: os.equipo_serie, area: os.area, piso: os.piso });
                            setShowCasillas(true);
                          }}
                          className="text-xs text-cobalt-600 hover:text-cobalt-700 hover:underline"
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
          <div className="px-4 py-3 text-sigab-text-muted text-xs border-t border-sigab-border bg-sigab-surface-alt">
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

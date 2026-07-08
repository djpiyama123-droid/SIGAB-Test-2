/**
 * @module pages/Ordenes
 * @description Gestión de Órdenes de Servicio (OS) del sistema SIGAH.
 *
 * Funcionalidades:
 * - Listado con filtros por estado (abierta/en_progreso/cerrada) y tipo
 * - Creación de nuevas OS con formulario inline (folio auto-generado)
 * - Cierre de órdenes con confirmación
 * - Modal de detalle completo (OrdenDetalleModal)
 * - Integración con Casillas CENEVAL (OrdenCasillasForm)
 *
 * @requires api/sigah — Cliente HTTP centralizado
 * @requires components/OrdenDetalleModal — Vista detallada de la OS
 * @requires components/OrdenCasillasForm — Formulario CENEVAL
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/sigah';
import OrdenDetalleModal from '../components/OrdenDetalleModal';
import OrdenCasillasForm from '../components/OrdenCasillasForm';
import OCRScannerModal from '../components/OCRScannerModal';
import { useToast } from '../components/Toast';
import FormatoViewer from '../components/formatos/FormatoViewer';
import { Camera, ClipboardList, Plus, X } from 'lucide-react';

const PRIORIDAD_BADGE = {
  critica: 'bg-red-900/60 text-red-300 border border-red-700',
  alta:    'bg-orange-900/60 text-orange-300 border border-orange-700',
  media:   'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  baja:    'bg-[var(--content-surface)] text-[var(--content-muted)]',
};

const ESTADO_BADGE = {
  abierta:     'bg-red-900/40 text-red-400',
  en_progreso: 'bg-yellow-900/40 text-yellow-400',
  cerrada:     'bg-emerald-900/40 text-emerald-400',
  cancelada:   'bg-[var(--content-surface)] text-[var(--content-muted)]',
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
    // ── v.3.2.0 — campos IMSS oficiales (porteo 2026-07-08) ──
    localizacion_completa: '', hora_inicio: '', hora_termino: '',
    tiempo_estimado_hrs: '', tiempo_real_hrs: '',
    recibe_conformidad_nombre: '', recibe_matricula: '',
  });
  const [guardando, setGuardando]     = useState(false);
  const [selectedOrden, setSelectedOrden] = useState(null);
  // Visor de formatos IMSS (autoprint=true dispara impresión al abrir post-creación)
  const [formatoOrden, setFormatoOrden]     = useState(null);
  const [formatoAutoprint, setFormatoAutoprint] = useState(false);
  // Casillas CENEVAL
  const [showCasillas, setShowCasillas]     = useState(false);
  const [casillasOrdenId, setCasillasOrdenId] = useState(null);
  const [casillasEquipo, setCasillasEquipo]   = useState({});
  // Escaneo IMSS (cámara / archivo) → pre-llena form de Nueva OS
  const [showScanIMSS, setShowScanIMSS]     = useState(false);
  // Archivo histórico ORDENESIMSS
  const [archivos, setArchivos]             = useState([]);
  const [archivosTotal, setArchivosTotal]   = useState(0);
  const [archivosPag, setArchivosPag]       = useState(1);
  const [archivoBuscar, setArchivoBuscar]   = useState('');
  const [archivosLoading, setArchivosLoading] = useState(false);
  // Autocomplete equipo + catálogos
  const [equipoSug,  setEquipoSug]  = useState([]);
  const [showEqSug,  setShowEqSug]  = useState(false);
  const [areasOpts,  setAreasOpts]  = useState([]);
  const [pisosOpts,  setPisosOpts]  = useState([]);
  const equipoRef  = useRef(null);
  const buscarTimer = useRef(null);

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
    api.getAreasCatalogo()
       .then((res) => { setAreasOpts(res.areas || []); setPisosOpts(res.pisos || []); })
       .catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (equipoRef.current && !equipoRef.current.contains(e.target)) setShowEqSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
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
      // Los campos opcionales vacíos se omiten (hora_inicio/tiempo_*_hrs no
      // aceptan cadena vacía en el backend — son time/Decimal nullable).
      const payload = { ...form, origen: 'dashboard' };
      ['hora_inicio', 'hora_termino', 'tiempo_estimado_hrs', 'tiempo_real_hrs'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      const res = await api.crearOrden(payload);
      toast.success(`Orden ${res.numero_orden || ''} creada`);
      setShowForm(false);
      const formSnapshot = { ...form };
      setForm({ equipo_nombre:'', equipo_serie:'', tipo_mantenimiento:'correctivo',
                tipo_formato:'correctivo_corto',
                falla_reportada:'', tecnico_nombre:'', area:'', piso:'', prioridad:'media',
                localizacion_completa:'', hora_inicio:'', hora_termino:'',
                tiempo_estimado_hrs:'', tiempo_real_hrs:'',
                recibe_conformidad_nombre:'', recibe_matricula:'' });
      cargar();
      // Abrir el formato IMSS automáticamente con autoprint
      setFormatoAutoprint(true);
      setFormatoOrden({
        id: res.orden_id,
        numero_orden: res.numero_orden,
        tipo_mantenimiento: formSnapshot.tipo_mantenimiento,
        equipo_nombre: formSnapshot.equipo_nombre,
        equipo_serie: formSnapshot.equipo_serie,
        falla_reportada: formSnapshot.falla_reportada,
        tecnico_nombre: formSnapshot.tecnico_nombre,
        area: formSnapshot.area,
        piso: formSnapshot.piso,
        prioridad: formSnapshot.prioridad,
        localizacion_completa: formSnapshot.localizacion_completa,
        hora_inicio: formSnapshot.hora_inicio,
        hora_termino: formSnapshot.hora_termino,
        tiempo_estimado_hrs: formSnapshot.tiempo_estimado_hrs,
        tiempo_real_hrs: formSnapshot.tiempo_real_hrs,
        recibe_conformidad_nombre: formSnapshot.recibe_conformidad_nombre,
        recibe_matricula: formSnapshot.recibe_matricula,
        fecha: new Date().toISOString().split('T')[0],
      });
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

  const buscarEquipos = (val) => {
    setForm((f) => ({ ...f, equipo_nombre: val }));
    clearTimeout(buscarTimer.current);
    if (val.length < 2) { setEquipoSug([]); setShowEqSug(false); return; }
    buscarTimer.current = setTimeout(async () => {
      try {
        const res = await api.getEquipos({ buscar: val, limit: 6 });
        setEquipoSug(res.equipos || []);
        setShowEqSug(true);
      } catch { setEquipoSug([]); }
    }, 280);
  };

  const seleccionarEquipo = (eq) => {
    setForm((f) => ({
      ...f,
      equipo_nombre: eq.nombre || '',
      equipo_serie:  eq.serie  || '',
      area:          eq.area   || f.area,
      piso:          eq.piso   || f.piso,
    }));
    setShowEqSug(false);
    setEquipoSug([]);
  };

  const handleTipoFormatoChange = (e) => {
    const val = e.target.value;
    let tipoMaint = 'correctivo';
    if (val === 'preventivo') tipoMaint = 'preventivo';
    else if (val === 'predictivo') tipoMaint = 'predictivo';
    
    setForm((f) => ({
      ...f,
      tipo_formato: val,
      tipo_mantenimiento: tipoMaint,
    }));
  };

  // Pre-llena el form de Nueva OS con los datos extraídos por el escaneo IMSS
  const handleScanIMSSConfirm = (datos) => {
    setForm((f) => ({
      ...f,
      equipo_nombre: datos.equipo_nombre || f.equipo_nombre,
      equipo_serie: datos.equipo_serie || f.equipo_serie,
      tipo_mantenimiento: datos.tipo_mantenimiento || f.tipo_mantenimiento,
      falla_reportada: datos.descripcion_servicio || f.falla_reportada,
      tecnico_nombre: datos.tecnico_nombre || f.tecnico_nombre,
      area: datos.area || f.area,
      piso: datos.piso || f.piso,
      prioridad: datos.prioridad || f.prioridad,
    }));
    setShowForm(true);
    toast.success('Datos pre-llenados desde el escaneo. Revisa antes de guardar.');
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--content-text)]">Órdenes de Servicio</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowScanIMSS(true)}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 bg-[#006CB7]/20 border border-[#006CB7]/40 text-[#5bb3e8] hover:bg-[#006CB7] hover:text-white active:scale-[0.97] text-sm font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006CB7]/50"
            title="Escanear formato OS IMSS con cámara o foto"
          >
            <Camera className="h-4 w-4" />
            Escanear OS IMSS
          </button>
          <button
            onClick={() => { setCasillasOrdenId(null); setCasillasEquipo({}); setShowCasillas(true); }}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 bg-[var(--content-surface)] border border-[var(--content-border)] text-[var(--content-text)] hover:bg-[#006CB7] hover:border-[#006CB7] hover:text-white active:scale-[0.97] text-sm font-medium rounded-xl transition-all duration-150"
          >
            <ClipboardList className="h-4 w-4" />
            Nueva OS (Casillas)
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`hidden md:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 ${showForm ? 'bg-rose-600 hover:bg-rose-500 text-white focus-visible:ring-rose-500/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500/50'}`}
          >
            {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Nueva OS</>}
          </button>
        </div>
      </div>

      {/* FAB Móvil */}
      <div className="md:hidden fixed bottom-6 right-6 z-[40] flex flex-col gap-3">
        <button
          onClick={() => setShowScanIMSS(true)}
          className="w-12 h-12 bg-[#006CB7] hover:bg-[#005a9e] text-white rounded-full shadow-lg shadow-[#006CB7]/30 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
          title="Escanear OS IMSS"
        >
          <Camera className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setCasillasOrdenId(null); setCasillasEquipo({}); setShowCasillas(true); }}
          className="w-12 h-12 bg-[var(--content-surface)] hover:bg-[#006CB7] text-[var(--content-text)] hover:text-white border border-[var(--content-border)] rounded-full shadow-lg flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
          title="Nueva OS (Casillas)"
        >
          <ClipboardList className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 ${showForm ? 'bg-rose-600 shadow-rose-900/50' : 'bg-emerald-600 shadow-emerald-900/50'}`}
        >
          {showForm ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--content-border)]">
        {[['activas','Órdenes Activas'],['historico',`Archivo Histórico (${archivosTotal || 858})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[var(--content-muted)] hover:text-[var(--content-muted)]'
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
              className="flex-1 bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
            />
            <button onClick={() => cargarArchivos(1, archivoBuscar)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white text-sm font-medium rounded-xl transition-all duration-150">
              Buscar
            </button>
          </div>

          {archivosLoading ? (
            <div className="text-[var(--content-muted)] py-8 text-center">Cargando archivos...</div>
          ) : archivos.length === 0 ? (
            <div className="text-[var(--content-muted)] py-8 text-center">Sin resultados.</div>
          ) : (
            <>
              {/* Vista móvil: cards */}
              <div className="block sm:hidden space-y-2">
                {archivos.map((a) => (
                  <a key={a.nombre} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="block bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg p-3 hover:border-emerald-600 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-emerald-400">{a.folio}</span>
                      <span className="text-xs text-[var(--content-muted)]">{a.anio}</span>
                    </div>
                    <div className="text-xs text-[var(--content-muted)] mt-1">{a.tipo} — Serie: {a.serie}</div>
                    <div className="text-xs text-[var(--content-muted)] mt-0.5 truncate">{a.nombre}</div>
                  </a>
                ))}
              </div>

              {/* Vista escritorio: tabla */}
              <div className="hidden sm:block bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--content-bg)]/60 text-[var(--content-muted)] text-left">
                        {['Folio','Tipo','Año','No. Serie','Archivo'].map((h) => (
                          <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.map((a) => (
                        <tr key={a.nombre} className="border-t border-[var(--content-border)]/50 hover:bg-[var(--content-border)]/40 transition-colors">
                          <td className="px-4 py-2 font-mono text-xs text-emerald-400">{a.folio}</td>
                          <td className="px-4 py-2 text-xs text-[var(--content-muted)] capitalize">{a.tipo}</td>
                          <td className="px-4 py-2 text-xs text-[var(--content-muted)]">{a.anio}</td>
                          <td className="px-4 py-2 text-xs text-[var(--content-muted)]">{a.serie}</td>
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
                <div className="px-4 py-2 flex items-center justify-between text-[var(--content-muted)] text-xs border-t border-[var(--content-border)]">
                  <span>{archivosTotal} documentos en total</span>
                  <div className="flex gap-2">
                    <button onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                      disabled={archivosPag <= 1}
                      className="px-2 py-1 bg-[var(--content-surface)] rounded disabled:opacity-30 hover:bg-[var(--content-border)]">
                      ‹ Ant
                    </button>
                    <span className="self-center">Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                    <button onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                      disabled={archivosPag >= Math.ceil(archivosTotal / 30)}
                      className="px-2 py-1 bg-[var(--content-surface)] rounded disabled:opacity-30 hover:bg-[var(--content-border)]">
                      Sig ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Paginación móvil */}
              <div className="flex sm:hidden justify-between items-center text-xs text-[var(--content-muted)]">
                <button onClick={() => cargarArchivos(archivosPag - 1, archivoBuscar)}
                  disabled={archivosPag <= 1}
                  className="px-3 py-1.5 bg-[var(--content-surface)] rounded disabled:opacity-30">‹ Ant</button>
                <span>Pág {archivosPag} / {Math.ceil(archivosTotal / 30)}</span>
                <button onClick={() => cargarArchivos(archivosPag + 1, archivoBuscar)}
                  disabled={archivosPag >= Math.ceil(archivosTotal / 30)}
                  className="px-3 py-1.5 bg-[var(--content-surface)] rounded disabled:opacity-30">Sig ›</button>
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
          className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-[var(--content-text)]">Nueva Orden de Servicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Equipo — autocompletado en tiempo real */}
            <div className="relative" ref={equipoRef}>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Equipo (nombre)</label>
              <input
                value={form.equipo_nombre}
                onChange={(e) => buscarEquipos(e.target.value)}
                onFocus={() => equipoSug.length > 0 && setShowEqSug(true)}
                placeholder="Escribe 2+ caracteres para buscar…"
                autoComplete="off"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600"
              />
              {showEqSug && equipoSug.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {equipoSug.map((eq) => (
                    <li key={eq.id}
                      onMouseDown={() => seleccionarEquipo(eq)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-900/40 border-b border-[var(--content-border)] last:border-0">
                      <div className="font-medium text-[var(--content-text)]">{eq.nombre}</div>
                      <div className="text-xs text-[var(--content-muted)]">
                        {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                        {eq.serie ? ` · Serie: ${eq.serie}` : ''}
                        {eq.area  ? ` · ${eq.area}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* No. Serie — auto-rellenado al seleccionar equipo */}
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">No. Serie</label>
              <input value={form.equipo_serie} onChange={set('equipo_serie')}
                placeholder="Auto-completado al seleccionar equipo"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>

            {/* Técnico */}
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Técnico</label>
              <input value={form.tecnico_nombre} onChange={set('tecnico_nombre')}
                placeholder="Nombre del técnico responsable"
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>

            {/* Área — select del catálogo de áreas del hospital */}
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Área</label>
              {areasOpts.length > 0 ? (
                <select value={form.area} onChange={set('area')}
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]">
                  <option value="">— selecciona un área —</option>
                  {areasOpts.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <input value={form.area} onChange={set('area')}
                  placeholder="Área del equipo"
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
              )}
            </div>

            {/* Piso — select del catálogo o auto-rellenado */}
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Piso</label>
              {pisosOpts.length > 0 ? (
                <select value={form.piso} onChange={set('piso')}
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]">
                  <option value="">— selecciona un piso —</option>
                  {pisosOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input value={form.piso} onChange={set('piso')}
                  placeholder="Piso / nivel"
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
              )}
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={set('prioridad')}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]">
                {['baja','media','alta','critica'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[var(--content-muted)] block mb-1">Formato IMSS</label>
              <select value={form.tipo_formato} onChange={handleTipoFormatoChange}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)]">
                <option value="correctivo_corto">Correctivo Corto</option>
                <option value="correctivo_largo">Correctivo Largo (Complejo)</option>
                <option value="preventivo">Mantenimiento Preventivo</option>
                <option value="predictivo">Mantenimiento Predictivo (IA)</option>
                <option value="orden_entrega">Orden de Entrega (Contrato Externo)</option>
              </select>
            </div>
          </div>

          {/* Localización completa — v.3.2.0 (formato IMSS oficial) */}
          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Localización completa del equipo o instalación</label>
            <input value={form.localizacion_completa} onChange={set('localizacion_completa')}
              placeholder="Detalle adicional de ubicación..."
              className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
          </div>

          <div>
            <label className="text-xs text-[var(--content-muted)] block mb-1">Falla reportada *</label>
            <textarea required rows={3} value={form.falla_reportada} onChange={set('falla_reportada')}
              className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
          </div>

          {/* Horarios y tiempos — v.3.2.0 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de inicio</label>
              <input type="time" value={form.hora_inicio} onChange={set('hora_inicio')}
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Hora de término</label>
              <input type="time" value={form.hora_termino} onChange={set('hora_termino')}
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">T. estimado (hrs)</label>
              <input type="number" min="0" step="0.5" value={form.tiempo_estimado_hrs} onChange={set('tiempo_estimado_hrs')} placeholder="1.0"
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">T. real (hrs)</label>
              <input type="number" min="0" step="0.5" value={form.tiempo_real_hrs} onChange={set('tiempo_real_hrs')} placeholder="(al cerrar)"
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
          </div>

          {/* Recibe de conformidad — v.3.2.0 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Recibe de conformidad (Nombre)</label>
              <input value={form.recibe_conformidad_nombre} onChange={set('recibe_conformidad_nombre')} placeholder="Nombre de quien recibe"
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] block mb-1">Matrícula</label>
              <input value={form.recibe_matricula} onChange={set('recibe_matricula')} placeholder="Matrícula"
                className="w-full min-h-[44px] bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-emerald-600" />
            </div>
          </div>

          <button type="submit" disabled={guardando}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Crear Orden'}
          </button>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[var(--content-muted)] self-center">Estado:</span>
        {FILTROS_ESTADO.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              estadoFiltro === e ? 'bg-emerald-800/60 text-emerald-300' : 'bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
        <span className="text-xs text-[var(--content-muted)] self-center ml-3">Tipo:</span>
        {FILTROS_TIPO.map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tipoFiltro === t ? 'bg-blue-800/60 text-blue-300' : 'bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
            }`}>
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-[var(--content-muted)] py-8 text-center">Cargando órdenes...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-[var(--content-muted)] py-8 text-center">Sin órdenes con ese filtro.</div>
      ) : (
        <div className="bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden">
          {/* Vista móvil: Cards */}
          <div className="block sm:hidden divide-y divide-slate-700/50">
            {ordenes.map((os) => (
              <div
                key={os.id}
                onClick={() => setSelectedOrden(os.id)}
                className="p-4 hover:bg-[var(--content-border)]/30 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-emerald-400">{os.numero_orden}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ESTADO_BADGE[os.estado] || ''}`}>
                    {os.estado?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-[var(--content-text)] text-sm font-bold mb-1">{os.equipo_nombre || 'Sin nombre'}</h3>
                <p className="text-[var(--content-muted)] text-xs mb-3 line-clamp-2">{os.falla_reportada || 'Sin reporte'}</p>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-[11px] text-[var(--content-muted)]">
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--content-muted)]">👤</span> {os.tecnico_nombre || '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--content-muted)]">📍</span> {os.area || '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--content-muted)]">📅</span> {os.fecha}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--content-border)]/30">
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
                <tr className="bg-[var(--content-bg)]/60 text-[var(--content-muted)] text-left">
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
                    className="border-t border-[var(--content-border)]/50 hover:bg-[var(--content-border)]/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-[var(--content-muted)] text-xs whitespace-nowrap">{os.numero_orden}</td>
                    <td className="px-4 py-3 text-[var(--content-text)] text-xs max-w-[120px] truncate">{os.equipo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs max-w-xs truncate hidden sm:table-cell">{os.falla_reportada || '—'}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs hidden md:table-cell">{os.tecnico_nombre || '—'}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs hidden md:table-cell">{os.area || '—'}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs hidden md:table-cell">{os.fecha}</td>
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
                      <div className="flex gap-2 flex-wrap">
                        {os.estado !== 'cerrada' && os.estado !== 'cancelada' && (
                          <button onClick={() => handleCerrar(os.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline">
                            Cerrar
                          </button>
                        )}
                        <button
                          onClick={() => setFormatoOrden(os)}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline whitespace-nowrap"
                          title="Ver / Imprimir Formato IMSS"
                        >
                          🖨 Formato
                        </button>
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
                        <button
                          onClick={async () => {
                            try {
                              const blob = await api.descargarPdfCasillas(os.id);
                              api.triggerDownload(blob, `CENEVAL_${os.id}.pdf`);
                            } catch (err) {
                              const status = err.response?.status;
                              if (status === 404) toast.error('Esta orden no tiene casillas CENEVAL registradas');
                              else toast.error('Error al generar PDF CENEVAL');
                            }
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                          title="Descargar PDF CENEVAL"
                        >
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[var(--content-muted)] text-xs border-t border-[var(--content-border)]">
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
          onGuardado={async () => {
            cargar();
            setShowCasillas(false);
            if (casillasOrdenId) {
              try {
                const res = await api.getOrden(casillasOrdenId);
                setFormatoAutoprint(true);
                setFormatoOrden(res.orden || res);
              } catch { /* silencioso si falla la carga */ }
            }
          }}
          onCerrar={() => setShowCasillas(false)}
        />
      )}

      {/* Modal Escaneo OS IMSS (cámara/archivo → OCR Gemma → pre-llena form) */}
      {showScanIMSS && (
        <OCRScannerModal
          onClose={() => setShowScanIMSS(false)}
          onConfirm={handleScanIMSSConfirm}
        />
      )}

      </> /* fin tab activas */}

      {/* Visor de formato IMSS */}
      {formatoOrden && (
        <FormatoViewer
          orden={formatoOrden}
          autoprint={formatoAutoprint}
          onClose={() => { setFormatoOrden(null); setFormatoAutoprint(false); }}
        />
      )}
    </div>
  );
}

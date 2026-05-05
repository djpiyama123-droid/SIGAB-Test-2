/**
 * @module pages/Equipos
 * @description Inventario completo de Equipos Biomédicos — SIGAB Clínica 1.
 *
 * Funcionalidades:
 * - Doble vista: tarjetas (cards) y tabla (grid)
 * - Filtrado avanzado: estado, área, piso, criticidad, tipo, marca, búsqueda libre
 * - Paginación real con limit/offset
 * - Ordenamiento configurable
 * - Imágenes de equipos desde BD
 * - Alta de nuevos equipos (EquipoForm modal)
 * - Vista detallada con historial de OS y traslados (EquipoDetail)
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/sigab';
import EquipoCard from '../components/EquipoCard';
import EquipoTable from '../components/EquipoTable';
import EquipoDetail from '../components/EquipoDetail';
import EquipoForm from '../components/EquipoForm';
import { useToast } from '../components/Toast';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';

const VISTAS = { tarjeta: 'tarjeta', tabla: 'tabla' };
const PAGE_SIZE = 50;

const ORDEN_OPTIONS = [
  { value: 'nombre', label: 'Nombre A-Z' },
  { value: 'nombre_desc', label: 'Nombre Z-A' },
  { value: 'estado', label: 'Estado (crítico primero)' },
  { value: 'criticidad', label: 'Criticidad' },
  { value: 'marca', label: 'Marca' },
  { value: 'area', label: 'Área' },
  { value: 'serie', label: 'N° Serie' },
  { value: 'reciente', label: 'Más reciente' },
];

export default function Equipos() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({});
  const [vista, setVista] = useState(VISTAS.tabla);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [orden, setOrden] = useState('nombre');
  const [creando, setCreando] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);

  // Catálogos para filtros
  const [areas, setAreas] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [buscarText, setBuscarText] = useState('');

  // Cargar catálogos al montar
  useEffect(() => {
    api.getAreasCatalogo()
      .then((res) => {
        setAreas(res?.areas || []);
        setPisos(res?.pisos || []);
      })
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filtros,
        limit: PAGE_SIZE,
        offset,
        orden,
      };
      const res = await api.getEquipos(params);
      setEquipos(res.equipos || []);
      setTotal(res.total || 0);
      if (res.catalogos) {
        setMarcas(res.catalogos.marcas || []);
        setTipos(res.catalogos.tipos || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
    }
  }, [filtros, offset, orden]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);
  
  // Efecto para abrir equipo específico desde URL (ej. desde el mapa del dashboard)
  useEffect(() => {
    const id = searchParams.get('equipoId');
    if (id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('equipoId');
      setSearchParams(newParams, { replace: true });
      api.getEquipo(id)
        .then(res => {
          if (res?.equipo) setSeleccionado(res.equipo);
        })
        .catch(() => {});
    }
  }, [searchParams, setSearchParams]);

  // Reset offset when filters change
  const updateFiltros = (newFiltros) => {
    setOffset(0);
    setFiltros(newFiltros);
  };

  const handleBuscar = (e) => {
    const val = e.target.value;
    setBuscarText(val);
    clearTimeout(window._sigabEquiposSearch);
    window._sigabEquiposSearch = setTimeout(() => {
      updateFiltros({ ...filtros, buscar: val || undefined });
    }, 400);
  };

  const handleEquipoCreado = () => {
    setCreando(false);
    cargar();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const activeFilterCount = Object.keys(filtros).filter(k => filtros[k]).length;

  const handleExportarCsv = async () => {
    try {
      setExportandoCsv(true);
      const params = { ...filtros, buscar: buscarText || undefined };
      const res = await api.descargarEquiposCsv(params);
      const filename = `inventario_sigab_${new Date().toISOString().split('T')[0]}.csv`;
      api.triggerDownload(res, filename);
      toast.success('Archivo CSV exportado exitosamente');
    } catch (error) {
      toast.error('No se pudo exportar el archivo CSV');
      console.error(error);
    } finally {
      setExportandoCsv(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            Inventario de Equipos
          </h1>
          <p className="text-slate-400 text-sm mt-1 ml-[52px]">
            {total} equipos registrados · HGR No.1 IMSS
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Vista toggle */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {Object.values(VISTAS).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                  vista === v
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v === 'tarjeta' ? '⊞ Tarjetas' : '≡ Tabla'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportarCsv}
            disabled={exportandoCsv}
            className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {exportandoCsv ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span className="hidden sm:inline">{exportandoCsv ? 'Exportando...' : 'Exportar CSV'}</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Equipo
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setBuscarText(''); updateFiltros({}); }}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Row 1: Búsqueda + Orden */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, serie, marca, modelo, inventario..."
              value={buscarText}
              onChange={handleBuscar}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>
          <select
            value={orden}
            onChange={(e) => { setOffset(0); setOrden(e.target.value); }}
            className="px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            {ORDEN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Filtros selectivos */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filtros.estado || ''}
            onChange={(e) => updateFiltros({ ...filtros, estado: e.target.value || undefined })}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Todos los estados</option>
            <option value="operativo">✅ Operativo</option>
            <option value="en_mantenimiento">🔧 En Mantenimiento</option>
            <option value="fuera_servicio">🔴 Fuera de Servicio</option>
            <option value="en_traslado">🚚 En Traslado</option>
            <option value="baja">⬛ Baja</option>
          </select>

          <select
            value={filtros.criticidad || ''}
            onChange={(e) => updateFiltros({ ...filtros, criticidad: e.target.value || undefined })}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Todas las criticidades</option>
            <option value="alta">🔴 Alta</option>
            <option value="media">🟡 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>

          <select
            value={filtros.area || ''}
            onChange={(e) => updateFiltros({ ...filtros, area: e.target.value || undefined })}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={filtros.piso || ''}
            onChange={(e) => updateFiltros({ ...filtros, piso: e.target.value || undefined })}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Todos los pisos</option>
            {pisos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {marcas.length > 0 && (
            <select
              value={filtros.marca || ''}
              onChange={(e) => updateFiltros({ ...filtros, marca: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          {tipos.length > 0 && (
            <select
              value={filtros.tipo_equipo || ''}
              onChange={(e) => updateFiltros({ ...filtros, tipo_equipo: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
            <p className="text-slate-400 text-sm animate-pulse">Cargando inventario...</p>
          </div>
        </div>
      ) : equipos.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-base font-medium">No se encontraron equipos</p>
          <p className="text-slate-500 text-sm mt-1">Intenta con otros filtros de búsqueda</p>
        </div>
      ) : vista === VISTAS.tarjeta ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipos.map((eq) => (
            <EquipoCard key={eq.id} equipo={eq} onClick={setSeleccionado} />
          ))}
        </div>
      ) : (
        <EquipoTable equipos={equipos} onChange={cargar} />
      )}

      {/* Paginación */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-slate-500 text-sm">
            Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total} equipos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-slate-400 text-sm px-2">
              Pág. {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {creando && (
        <EquipoForm
          onClose={() => setCreando(false)}
          onSaved={handleEquipoCreado}
        />
      )}

      {/* Detalle (vista tarjeta) */}
      {seleccionado && (
        <EquipoDetail
          equipo={seleccionado}
          onClose={() => setSeleccionado(null)}
          onChange={() => {
            setSeleccionado(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

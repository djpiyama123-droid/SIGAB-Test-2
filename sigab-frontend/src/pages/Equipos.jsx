import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';
import EquipoCard from '../components/EquipoCard';
import EquipoTable from '../components/EquipoTable';
import EquipoDetail from '../components/EquipoDetail';
import EquipoForm from '../components/EquipoForm';
import FilterBar from '../components/FilterBar';
import { useToast } from '../components/Toast';

const VISTAS = { tarjeta: 'tarjeta', tabla: 'tabla' };

export default function Equipos() {
  const toast = useToast();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({});
  const [vista, setVista] = useState(VISTAS.tabla);
  const [total, setTotal] = useState(0);
  const [creando, setCreando] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardEquipos(filtros);
      setEquipos(res.equipos || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
    }
  }, [filtros]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);

  const handleEquipoCreado = () => {
    setCreando(false);
    cargar();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario de Equipos</h1>
          <p className="text-slate-400 text-sm">{total} equipos en el sistema</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector de vista */}
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

          {/* Botón nuevo equipo */}
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

      {/* Filtros */}
      <FilterBar filtros={filtros} onChange={setFiltros} />

      {/* Contenido */}
      {loading ? (
        <div className="text-slate-400 py-12 text-center">Cargando equipos...</div>
      ) : equipos.length === 0 ? (
        <div className="text-slate-500 py-12 text-center">
          No se encontraron equipos con los filtros seleccionados.
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

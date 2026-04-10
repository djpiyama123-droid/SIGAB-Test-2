import { useState, useEffect } from 'react';
import { api } from '../api/sigab';

export default function FilterBar({ filtros = {}, onChange }) {
  const [areas, setAreas] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [buscar, setBuscar] = useState(filtros.buscar || '');

  useEffect(() => {
    api.getAreasCatalogo()
      .then((res) => {
        setAreas(res?.areas || []);
        setPisos(res?.pisos || []);
      })
      .catch(() => {});
  }, []);

  const handleBuscar = (e) => {
    const val = e.target.value;
    setBuscar(val);
    clearTimeout(window._sigabSearch);
    window._sigabSearch = setTimeout(() => {
      onChange({ ...filtros, buscar: val || undefined });
    }, 400);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {/* Buscador */}
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar equipo, serie, marca..."
          value={buscar}
          onChange={handleBuscar}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Filtro estado */}
      <select
        value={filtros.estado || ''}
        onChange={(e) => onChange({ ...filtros, estado: e.target.value || undefined })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
      >
        <option value="">Todos los estados</option>
        <option value="operativo">Operativo</option>
        <option value="en_mantenimiento">En Mantenimiento</option>
        <option value="fuera_servicio">Fuera de Servicio</option>
        <option value="en_traslado">En Traslado</option>
        <option value="baja">Baja</option>
      </select>

      {/* Filtro area */}
      <select
        value={filtros.area || ''}
        onChange={(e) => onChange({ ...filtros, area: e.target.value || undefined })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
      >
        <option value="">Todas las areas</option>
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Filtro piso */}
      <select
        value={filtros.piso || ''}
        onChange={(e) => onChange({ ...filtros, piso: e.target.value || undefined })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-600"
      >
        <option value="">Todos los pisos</option>
        {pisos.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Reset */}
      {Object.keys(filtros).filter(k => filtros[k]).length > 0 && (
        <button
          onClick={() => { setBuscar(''); onChange({}); }}
          className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}

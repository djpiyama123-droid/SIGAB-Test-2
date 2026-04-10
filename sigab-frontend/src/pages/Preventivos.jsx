import { useState, useEffect } from 'react';
import { api } from '../api/sigab';

function diasRestantes(fecha) {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha) - new Date()) / 86400000);
  return diff;
}

function BadgeVencimiento({ fecha }) {
  const dias = diasRestantes(fecha);
  if (dias === null) return null;
  if (dias < 0)
    return (
      <span className="bg-red-900/60 text-red-300 text-xs px-2 py-0.5 rounded font-medium">
        Vencido hace {Math.abs(dias)}d
      </span>
    );
  if (dias === 0)
    return (
      <span className="bg-red-900/60 text-red-300 text-xs px-2 py-0.5 rounded font-medium">
        Vence hoy
      </span>
    );
  if (dias <= 7)
    return (
      <span className="bg-orange-900/60 text-orange-300 text-xs px-2 py-0.5 rounded font-medium">
        {dias}d restantes
      </span>
    );
  return (
    <span className="bg-emerald-900/40 text-emerald-400 text-xs px-2 py-0.5 rounded font-medium">
      {dias}d restantes
    </span>
  );
}

export default function Preventivos() {
  const [preventivos, setPreventivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos | vencidos | proximos

  const cargar = () => {
    setLoading(true);
    api.getPreventivos()
      .then((res) => setPreventivos(res.preventivos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleEjecutar = async (id) => {
    try {
      await api.ejecutarPreventivo(id);
      cargar();
    } catch (err) {
      console.error(err);
    }
  };

  const visibles = preventivos.filter((pp) => {
    const dias = diasRestantes(pp.proxima_ejecucion);
    if (filtro === 'vencidos') return dias !== null && dias < 0;
    if (filtro === 'proximos') return dias !== null && dias >= 0 && dias <= 30;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Mantenimientos Preventivos</h1>
        <p className="text-slate-400 text-sm">
          Programación y seguimiento de preventivos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[['todos','Todos'],['vencidos','Vencidos'],['proximos','Próximos 30d']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === v ? 'bg-emerald-800/60 text-emerald-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Cargando preventivos...</div>
      ) : visibles.length === 0 ? (
        <div className="text-slate-500 py-12 text-center">
          Sin preventivos en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((pp) => {
            const dias = diasRestantes(pp.proxima_ejecucion);
            const urgente = dias !== null && dias <= 3;
            return (
              <div key={pp.id}
                className={`bg-slate-800 rounded-xl border p-5 ${
                  urgente ? 'border-red-700' : 'border-slate-700'
                }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium text-sm">
                        {pp.tipo_preventivo}
                      </h3>
                      <BadgeVencimiento fecha={pp.proxima_ejecucion} />
                    </div>
                    <p className="text-slate-400 text-xs">
                      {pp.equipo_nombre}
                      {pp.equipo_serie && (
                        <span className="ml-1 font-mono text-slate-500">
                          ({pp.equipo_serie})
                        </span>
                      )}
                    </p>
                    {pp.equipo_area && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        Área: {pp.equipo_area}
                      </p>
                    )}
                    {pp.descripcion_procedimiento && (
                      <p className="text-slate-600 text-xs mt-2 line-clamp-2">
                        {pp.descripcion_procedimiento}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Próxima ejecución</p>
                      <p className="text-white text-sm font-mono">
                        {pp.proxima_ejecucion}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      Cada {pp.frecuencia_dias} días
                    </p>
                    <button onClick={() => handleEjecutar(pp.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors">
                      ✓ Marcar ejecutado
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

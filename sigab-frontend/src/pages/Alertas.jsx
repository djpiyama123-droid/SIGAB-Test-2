import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';

const PRIORIDAD_STYLE = {
  critica: { bar: 'bg-red-500',    badge: 'bg-red-900/50 text-red-300',    icon: '🚨' },
  alta:    { bar: 'bg-orange-500', badge: 'bg-orange-900/50 text-orange-300', icon: '⚠️' },
  media:   { bar: 'bg-yellow-500', badge: 'bg-yellow-900/50 text-yellow-300', icon: '📋' },
  baja:    { bar: 'bg-slate-500',  badge: 'bg-slate-700 text-slate-400',    icon: 'ℹ️' },
};

export default function Alertas() {
  const [alertas, setAlertas]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState(''); // '' | critica | alta | media | baja

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlertasPendientes();
      setAlertas(res.alertas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const marcar = async (id) => {
    await api.marcarLeida(id);
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  const marcarTodas = async () => {
    await api.marcarTodasLeidas();
    setAlertas([]);
  };

  const visibles = filtro ? alertas.filter((a) => a.prioridad === filtro) : alertas;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Alertas</h1>
          <p className="text-slate-400 text-sm">
            {alertas.length} alertas pendientes
          </p>
        </div>
        {alertas.length > 0 && (
          <button onClick={marcarTodas}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
            ✓ Marcar todas leídas
          </button>
        )}
      </div>

      {/* Filtro por prioridad */}
      <div className="flex gap-2">
        {['', 'critica', 'alta', 'media', 'baja'].map((p) => (
          <button key={p} onClick={() => setFiltro(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filtro === p ? 'bg-emerald-800/60 text-emerald-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {p || 'Todas'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-slate-400 py-12 text-center">Cargando alertas...</div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-4xl">✅</span>
          <p className="text-slate-400">Sin alertas pendientes</p>
          <p className="text-slate-600 text-sm">El sistema está en buen estado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((a) => {
            const style = PRIORIDAD_STYLE[a.prioridad] || PRIORIDAD_STYLE.baja;
            return (
              <div key={a.id}
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex">
                {/* Barra lateral de prioridad */}
                <div className={`w-1 flex-shrink-0 ${style.bar}`} />

                <div className="flex-1 p-4 flex items-start gap-4">
                  <span className="text-xl flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${style.badge}`}>
                        {a.prioridad}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {a.tipo?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-white text-sm">{a.mensaje}</p>
                    {(a.equipo_nombre || a.equipo_serie) && (
                      <p className="text-slate-500 text-xs mt-1">
                        Equipo: {a.equipo_nombre} {a.equipo_serie && `(${a.equipo_serie})`}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right space-y-1">
                    <p className="text-slate-600 text-xs">
                      {a.created_at ? new Date(a.created_at).toLocaleString('es-MX') : ''}
                    </p>
                    <button onClick={() => marcar(a.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      Marcar leída →
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

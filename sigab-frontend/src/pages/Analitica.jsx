import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

export default function Analitica() {
  const [metricas, setMetricas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await api.getFiabilidad();
      if (res.ok) {
        setMetricas(res.fiabilidad || []);
      }
    } catch (error) {
      toast.error('Error cargando métricas predictivas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
      </div>
    );
  }

  const enRiesgo = metricas.filter(m => m.riesgo === 'Crítico');

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white">Analítica Predictiva</h1>
        <p className="mt-2 text-slate-400">
          Metodología <span className="font-semibold text-emerald-400">Industria 4.0</span> · Fiabilidad y predicción de fallas operativas (MTBF y MTTR).
        </p>
      </header>

      {/* KPI Resumen */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-6">
          <p className="text-sm font-medium text-slate-400">Equipos en Riesgo Crítico</p>
          <p className="mt-2 text-4xl font-black text-red-500">{enRiesgo.length}</p>
          <p className="mt-1 text-xs text-red-400">Probabilidad de falla &gt; 90%</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Promedio MTBF Global</p>
          <p className="mt-2 text-4xl font-black text-emerald-400">
            {metricas.length > 0 ? Math.round(metricas.reduce((a, b) => a + b.mtbf_dias, 0) / metricas.length) : 0}
            <span className="text-lg text-slate-500 ml-2">días</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Tiempo Medio Entre Fallas</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Promedio MTTR Global</p>
          <p className="mt-2 text-4xl font-black text-blue-400">
            {metricas.length > 0 ? (metricas.reduce((a, b) => a + b.mttr_horas, 0) / metricas.length).toFixed(1) : 0}
            <span className="text-lg text-slate-500 ml-2">horas</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Tiempo Medio de Reparación</p>
        </div>
      </div>

      {/* Tabla detallada */}
      <h2 className="text-xl font-bold text-slate-200 mb-4">Análisis por Equipo</h2>
      <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Serie / Modelo</th>
                <th className="px-4 py-3">Criticidad</th>
                <th className="px-4 py-3">Riesgo Falla</th>
                <th className="px-4 py-3 whitespace-nowrap">MTBF (días)</th>
                <th className="px-4 py-3 whitespace-nowrap">MTTR (horas)</th>
                <th className="px-4 py-3">Estado Predictivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {metricas.map((m) => (
                <tr key={m.equipo_id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-bold text-white">{m.modelo}</p>
                    <p className="text-xs text-slate-500">{m.marca} · {m.serie}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
                      ${m.criticidad === 'alta' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                      {m.criticidad.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-700 rounded-full h-2 max-w-[100px]">
                        <div 
                          className={`h-2 rounded-full ${m.color === 'red' ? 'bg-red-500' : m.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(m.probabilidad_falla_pct, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{m.probabilidad_falla_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono">{m.mtbf_dias}</td>
                  <td className="px-4 py-4 font-mono">{m.mttr_horas}</td>
                  <td className="px-4 py-4">
                    <span className={`flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border
                      ${m.riesgo === 'Crítico' ? 'bg-red-900/50 border-red-500 text-red-300' : 
                        m.riesgo === 'Medio' ? 'bg-orange-900/50 border-orange-500 text-orange-300' : 
                        'bg-emerald-900/50 border-emerald-500 text-emerald-300'}`}>
                      <div className={`h-2 w-2 rounded-full ${m.riesgo === 'Crítico' ? 'bg-red-400 animate-pulse' : m.riesgo === 'Medio' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                      {m.riesgo}
                    </span>
                  </td>
                </tr>
              ))}
              {metricas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No hay suficientes datos de correctivos para calcular historiales MTBF.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

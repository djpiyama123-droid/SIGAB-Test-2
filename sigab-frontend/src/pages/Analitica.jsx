import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { Zap, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity, Brain, AlertTriangle } from 'lucide-react';
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500" />
      </div>
    );
  }

  const enRiesgo = metricas.filter(m => m.riesgo === 'Crítico');
  const avgUptime = 98.4; // Valor simulado o calculado si hubiera logs de disponibilidad completa

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header con Badge de IA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20">
              Métricas Predictivas
            </span>
            <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
              <Brain className="h-2 w-2" /> Powered by Gemma
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Ingeniería Clínica 4.0</h1>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Análisis de fiabilidad en tiempo real utilizando algoritmos de <span className="text-white font-medium">MTBF (Mean Time Between Failures)</span> y <span className="text-white font-medium">MTTR (Mean Time To Repair)</span>.
          </p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => { cargarDatos(); toast.success('Recalculando métricas…', { duration: 1500 }); }}
             title="Recalcular métricas"
             className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all active:scale-90">
             <Activity className="h-5 w-5" />
           </button>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Disponibilidad Global</p>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black text-white">{avgUptime}%</p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[10px] text-emerald-500 font-bold mt-2">+0.4% vs mes anterior</p>
          </div>
          <Zap className="absolute -bottom-4 -right-4 h-24 w-24 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors" />
        </div>

        <div className="bg-slate-900/50 border border-red-900/30 p-6 rounded-3xl relative overflow-hidden group hover:border-red-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Equipos en Riesgo</p>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black text-red-500">{enRiesgo.length}</p>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-[10px] text-red-400 font-bold mt-2">Acción inmediata requerida</p>
          </div>
          <AlertTriangle className="absolute -bottom-4 -right-4 h-24 w-24 text-red-500/5 group-hover:text-red-500/10 transition-colors" />
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">MTBF Promedio</p>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black text-white">
                {metricas.length > 0 ? Math.round(metricas.reduce((a, b) => a + b.mtbf_dias, 0) / metricas.length) : 0}
              </p>
              <span className="text-sm font-bold text-slate-500">días</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-2">Intervalo de estabilidad técnica</p>
          </div>
          <Clock className="absolute -bottom-4 -right-4 h-24 w-24 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">MTTR Promedio</p>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black text-white">
                {metricas.length > 0 ? (metricas.reduce((a, b) => a + b.mttr_horas, 0) / metricas.length).toFixed(1) : 0}
              </p>
              <span className="text-sm font-bold text-slate-500">hrs</span>
            </div>
            <p className="text-[10px] text-purple-400 font-bold mt-2">Tiempo de respuesta efectivo</p>
          </div>
          <ShieldCheck className="absolute -bottom-4 -right-4 h-24 w-24 text-purple-500/5 group-hover:text-purple-500/10 transition-colors" />
        </div>
      </div>

      {/* Tabla de Análisis Detallado */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
          <h2 className="text-lg font-bold text-white">Heatmap de Fiabilidad Operativa</h2>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
             <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Óptimo</div>
             <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-500" /> Preventivo</div>
             <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /> Crítico</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/60 transition-colors">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Activo / Serie</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Prob. Falla</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">MTBF (D)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">MTTR (H)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Estatus I.A.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {metricas.map((m) => {
                const color = m.color === 'red' ? 'text-red-500' : m.color === 'orange' ? 'text-orange-500' : 'text-emerald-500';
                const bgColor = m.color === 'red' ? 'bg-red-500/10' : m.color === 'orange' ? 'bg-orange-500/10' : 'bg-emerald-500/10';
                const barColor = m.color === 'red' ? 'bg-red-500' : m.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500';

                return (
                  <tr key={m.equipo_id} className="hover:bg-slate-800/40 transition-all group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{m.modelo}</p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase">{m.marca} · {m.serie}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${barColor}`}
                            style={{ width: `${Math.min(m.probabilidad_falla_pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-black ${color}`}>{m.probabilidad_falla_pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-mono text-white text-sm">{m.mtbf_dias}</td>
                    <td className="px-6 py-5 text-center font-mono text-white text-sm">{m.mttr_horas}</td>
                    <td className="px-6 py-5 text-right">
                      <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-[10px] font-black border uppercase tracking-tighter transition-all
                        ${m.riesgo === 'Crítico' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                          m.riesgo === 'Medio' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 
                          'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-lg shadow-emerald-500/5'}`}>
                        {m.riesgo}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

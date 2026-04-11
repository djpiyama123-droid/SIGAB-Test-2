import { useDashboard } from '../hooks/useDashboard';
import StatsCards from '../components/StatsCards';
import AlertaBanner from '../components/AlertaBanner';
import EquipoTable from '../components/EquipoTable';
import FilterBar from '../components/FilterBar';
import HospitalMap from '../components/HospitalMap';
import DashboardCharts from '../components/DashboardCharts';
import TripleValidationModal from '../components/TripleValidationModal';
import { ShieldCheck, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { resumen, equipos, alertas, filtros, setFiltros, loading, error } =
    useDashboard();
  const [showPokaYoke, setShowPokaYoke] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-3 items-center text-slate-400">
          <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Cargando SIGAB...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-red-400 font-medium">Error de conexión con el backend</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <p className="text-slate-600 text-xs">
            Asegúrate que FastAPI corre en{' '}
            <code className="bg-slate-800 px-1 rounded">localhost:8000</code>
          </p>
        </div>
      </div>
    );
  }

  const alertasCriticas = alertas.filter((a) => a.prioridad === 'critica');

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm">
          Vista general del inventario biomédico — HGR No.1
        </p>
      </div>

      {/* Acciones Rápidas Habilidades 3 y 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setShowPokaYoke(true)}
          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-700/20 border border-emerald-500/30 hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Triple Validación Poka-Yoke</h3>
              <p className="text-xs text-emerald-300/60">Verificación QR + Inventario + Serie</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">Iniciar</span>
        </button>

        <button 
          onClick={() => navigate('/checklists')}
          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border border-blue-500/30 hover:border-blue-500 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
              <ClipboardCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Auditoría NOM-016</h3>
              <p className="text-xs text-blue-300/60">Checklists de cumplimiento normativo</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Ejecutar</span>
        </button>
      </div>

      <TripleValidationModal 
        isOpen={showPokaYoke} 
        onClose={() => setShowPokaYoke(false)}
        onValidated={(eq) => console.log("Validado:", eq)} 
      />

      {/* Alertas críticas en tiempo real */}
      {alertasCriticas.length > 0 && (
        <AlertaBanner alertas={alertasCriticas} />
      )}

      {/* KPIs */}
      <StatsCards resumen={resumen} />

      {/* Gráficas de Tendencia */}
      <DashboardCharts resumen={resumen} />

      {/* Mapa Interactivo de Activos */}
      <HospitalMap />

      {/* Filtros */}
      <FilterBar filtros={filtros} onChange={setFiltros} />

      {/* Tabla principal de equipos */}
      <EquipoTable equipos={equipos} />
    </div>
  );
}

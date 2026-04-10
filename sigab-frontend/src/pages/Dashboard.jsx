import { useDashboard } from '../hooks/useDashboard';
import StatsCards from '../components/StatsCards';
import AlertaBanner from '../components/AlertaBanner';
import EquipoTable from '../components/EquipoTable';
import FilterBar from '../components/FilterBar';
import HospitalMap from '../components/HospitalMap';
import DashboardCharts from '../components/DashboardCharts';

export default function Dashboard() {
  const { resumen, equipos, alertas, filtros, setFiltros, loading, error } =
    useDashboard();

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

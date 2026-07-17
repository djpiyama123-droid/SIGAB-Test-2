import MiniDonutChart from './charts/MiniDonutChart';
import MiniGroupedBarChart from './charts/MiniGroupedBarChart';
import { STATUS_HEX } from '../utils/tokens';

// Use centralized STATUS_HEX tokens as single source of truth
const COLORS = STATUS_HEX;

const LABEL_MAP = {
  operativo: 'Operativo',
  en_mantenimiento: 'Mantenimiento',
  fuera_servicio: 'Fuera de Serv.',
  en_traslado: 'Traslado',
  baja: 'Baja'
};

export default function DashboardCharts({ resumen }) {
  if (!resumen) return null;

  const equiposData = (resumen.equipos_por_estado || []).map(item => ({
    name: LABEL_MAP[item.estado] || item.estado,
    value: item.total,
    color: COLORS[item.estado] || '#ffffff'
  }));

  const ordenesData = (resumen.ordenes_por_mes || []).map(item => {
    // Convert 'YYYY-MM' to short month name (e.g. 'Jan')
    const [year, month] = item.mes.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleString('es-ES', { month: 'short' });
    return {
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      Total: item.total
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-4">Equipos por Estado</h3>
        <MiniDonutChart data={equiposData} height={220} />
      </div>

      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-4">Órdenes de Servicio (últimos 6 meses)</h3>
        <MiniGroupedBarChart
          data={ordenesData}
          series={[{ key: 'Total', label: 'Órdenes', color: '#3b82f6' }]}
          height={240}
        />
      </div>
    </div>
  );
}

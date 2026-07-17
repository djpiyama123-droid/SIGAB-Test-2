import MiniGroupedBarChart from './MiniGroupedBarChart';

const data = [
  { name: 'Ene', programadas: 12, completadas: 10 },
  { name: 'Feb', programadas: 15, completadas: 14 },
  { name: 'Mar', programadas: 10, completadas: 11 },
  { name: 'Abr', programadas: 18, completadas: 16 },
];

const series = [
  { key: 'programadas', label: 'Programadas', color: '#3b82f6' },
  { key: 'completadas', label: 'Completadas', color: '#10B981' },
];

export default function MaintenanceChart() {
  return (
    <div className="w-full h-72">
      <MiniGroupedBarChart data={data} series={series} height={288} />
    </div>
  );
}

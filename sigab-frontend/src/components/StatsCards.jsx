import { Link } from 'react-router-dom';

export default function StatsCards({ resumen }) {
  if (!resumen) return null;

  const cards = [
    {
      label: 'Equipos Operativos',
      value: resumen.equipos_por_estado?.find((e) => e.estado === 'operativo')?.total || 0,
      color: 'emerald',
      path: '/equipos?estado=operativo',
    },
    {
      label: 'En Mantenimiento',
      value: resumen.equipos_por_estado?.find((e) => e.estado === 'en_mantenimiento')?.total || 0,
      color: 'yellow',
      path: '/equipos?estado=en_mantenimiento',
    },
    {
      label: 'Tickets Abiertos',
      value: resumen.tickets_abiertos,
      color: 'blue',
      path: '/ordenes?estado=abierta',
    },
    {
      label: 'Alertas Pendientes',
      value: resumen.alertas_pendientes,
      color: resumen.alertas_pendientes > 0 ? 'red' : 'slate',
      path: '/alertas',
    },
    {
      label: 'Preventivos Vencidos',
      value: resumen.preventivos_vencidos,
      color: resumen.preventivos_vencidos > 0 ? 'red' : 'emerald',
      path: '/preventivos',
    },
  ];

  const colorMap = {
    emerald: 'bg-emerald-900/40 border-emerald-700 text-emerald-400',
    yellow: 'bg-yellow-900/40 border-yellow-700 text-yellow-400',
    blue: 'bg-blue-900/40 border-blue-700 text-blue-400',
    red: 'bg-red-900/40 border-red-700 text-red-400',
    slate: 'bg-slate-800 border-slate-700 text-slate-400',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <Link to={card.path} key={i}>
          <div className={`rounded-xl border p-4 transition-transform hover:scale-105 hover:shadow-lg cursor-pointer ${colorMap[card.color]}`}>
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="text-sm mt-1">{card.label}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

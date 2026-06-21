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

  // Tints suaves + borde de color para el acento semántico; el texto va por
  // variables de tema para mantener contraste en blue/green/dark/glass.
  const colorMap = {
    emerald: 'bg-emerald-500/15 border-emerald-500/40',
    yellow: 'bg-amber-500/15 border-amber-500/40',
    blue: 'bg-blue-500/15 border-blue-500/40',
    red: 'bg-red-500/15 border-red-500/40',
    slate: 'bg-[var(--content-surface)] border-[var(--content-border)]',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <Link to={card.path} key={i}>
          <div className={`rounded-xl border p-4 transition-transform hover:scale-105 hover:shadow-lg cursor-pointer ${colorMap[card.color]}`}>
            <div className="text-3xl font-bold text-[var(--content-text)]">{card.value}</div>
            <div className="text-sm mt-1 text-[var(--content-muted)]">{card.label}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

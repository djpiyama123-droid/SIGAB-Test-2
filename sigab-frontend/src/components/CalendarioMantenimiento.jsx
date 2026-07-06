// ============================================================
// CalendarioMantenimiento.jsx — vista de calendario para el
// próximo mantenimiento de un equipo. Reutiliza el mismo lenguaje
// visual del heatmap de actividad de pages/Reservas.jsx (celdas
// redondeadas, escala de color por urgencia, animación de entrada
// anim-cell-pop) adaptado a un solo mes con un día objetivo.
// ============================================================
const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DOW_CORTO = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// fecha_proximo_mantenimiento llega como "YYYY-MM-DD" (columna DATE, sin hora).
// new Date("YYYY-MM-DD") la interpreta como medianoche UTC (spec ISO 8601) — en
// timezones detrás de UTC (Tijuana, UTC-7) eso cae al día local ANTERIOR. Se
// arma la fecha a mano en hora local para que el día de calendario no se corra.
function parseDiaLocal(fecha) {
  if (!fecha) return null;
  const m = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

// Pura y testeable: clasifica la urgencia de una fecha objetivo respecto a "hoy".
export function estadoMantenimiento(fecha, hoy = new Date()) {
  const target = parseDiaLocal(fecha);
  if (!target) return null;

  const hoySinHora = new Date(hoy);
  hoySinHora.setHours(0, 0, 0, 0);
  const soloFecha = new Date(target);
  soloFecha.setHours(0, 0, 0, 0);
  const diffDias = Math.round((soloFecha - hoySinHora) / 86400000);

  const estado = diffDias < 0 ? 'vencido' : diffDias <= 7 ? 'urgente' : 'programado';
  const color = estado === 'vencido' ? '#dc2626' : estado === 'urgente' ? '#f59e0b' : '#16a34a';
  const etiqueta =
    estado === 'vencido' ? `Vencido hace ${Math.abs(diffDias)}d`
    : diffDias === 0 ? 'Hoy'
    : `En ${diffDias}d`;
  const chipClase =
    estado === 'vencido' ? 'bg-red-500/10 text-red-500 border-red-500/20'
    : estado === 'urgente' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';

  return { target, diffDias, estado, color, etiqueta, chipClase };
}

export default function CalendarioMantenimiento({ fecha }) {
  const info = estadoMantenimiento(fecha);

  if (!info) {
    return (
      <div className="text-sm text-[var(--content-muted)] text-center py-6 border border-dashed border-[var(--content-border)] rounded-xl">
        Sin fecha de próximo mantenimiento programada
      </div>
    );
  }

  const { target, estado, color, etiqueta: etiquetaEstado, chipClase } = info;
  const year = target.getFullYear();
  const month = target.getMonth();
  const diaObjetivo = target.getDate();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();

  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--content-text)] capitalize">
          {MESES_LARGO[month]} {year}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${chipClase}`}>
          {etiquetaEstado}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW_CORTO.map((d, i) => (
          <div key={`dow-${i}`} className="text-center text-[9px] text-[var(--content-muted)]">{d}</div>
        ))}
        {celdas.map((d, i) => {
          const esObjetivo = d === diaObjetivo;
          return (
            <div
              key={i}
              title={esObjetivo ? `Próximo mantenimiento: ${d}/${month + 1}/${year}` : undefined}
              className={`anim-cell-pop aspect-square rounded-md flex items-center justify-center text-[11px] font-mono ${
                !d ? '' : esObjetivo ? 'text-white font-bold' : 'text-[var(--content-muted)]'
              }`}
              style={{
                backgroundColor: !d ? 'transparent' : esObjetivo ? color : 'var(--content-bg)',
                boxShadow: esObjetivo ? `0 0 0 2px var(--content-surface), 0 0 0 4px ${color}` : undefined,
                animationDelay: `${i * 8}ms`,
              }}
            >
              {d || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

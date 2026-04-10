import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_DOT_COLORS } from '../utils/constants';

export default function EquipoCard({ equipo, onClick }) {
  return (
    <div
      className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 cursor-pointer transition-all"
      onClick={() => onClick?.(equipo)}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[equipo.estado]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT_COLORS[equipo.estado]}`}></span>
          {ESTADO_LABELS[equipo.estado]}
        </span>
        {equipo.criticidad === 'alta' && (
          <span className="text-red-400 text-xs font-medium">CRITICO</span>
        )}
      </div>

      <h3 className="text-white font-semibold text-sm mb-1">{equipo.nombre}</h3>
      <p className="text-slate-400 text-xs">{equipo.marca} — {equipo.modelo}</p>

      <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-xs text-slate-500">
        <span>{equipo.area || '—'}</span>
        <span className="font-mono">{equipo.serie}</span>
      </div>

      {(equipo.tickets_abiertos > 0 || equipo.alertas_pendientes > 0) && (
        <div className="mt-2 flex gap-2">
          {equipo.tickets_abiertos > 0 && (
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {equipo.tickets_abiertos} ticket{equipo.tickets_abiertos > 1 ? 's' : ''}
            </span>
          )}
          {equipo.alertas_pendientes > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
              {equipo.alertas_pendientes} alerta{equipo.alertas_pendientes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

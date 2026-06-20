import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_DOT_COLORS } from '../utils/constants';

export default function EquipoCard({ equipo, onClick }) {
  return (
    <div
      className="bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden hover:border-[var(--content-border)] cursor-pointer transition-all group"
      onClick={() => onClick?.(equipo)}
    >
      {/* Imagen del equipo */}
      <div className="relative h-36 bg-[var(--content-bg)]/50 flex items-center justify-center overflow-hidden">
        {equipo.imagen_url ? (
          <img
            src={equipo.imagen_url}
            alt={equipo.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--content-muted)]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span className="text-[10px] uppercase tracking-widest">{equipo.tipo_equipo || 'Equipo'}</span>
          </div>
        )}
        {/* Badge de estado */}
        <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-sm ${ESTADO_COLORS[equipo.estado]} bg-opacity-90`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT_COLORS[equipo.estado]}`}></span>
          {ESTADO_LABELS[equipo.estado]}
        </span>
        {equipo.criticidad === 'alta' && (
          <span className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Crítico
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-[var(--content-text)] font-semibold text-sm mb-1 truncate">{equipo.nombre}</h3>
        <p className="text-[var(--content-muted)] text-xs truncate">{equipo.marca} — {equipo.modelo}</p>

        <div className="mt-3 pt-3 border-t border-[var(--content-border)]/50 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[var(--content-muted)]">Área</span>
            <p className="text-[var(--content-muted)] truncate">{equipo.area || '—'}</p>
          </div>
          <div>
            <span className="text-[var(--content-muted)]">Serie</span>
            <p className="text-[var(--content-muted)] font-mono truncate">{equipo.serie}</p>
          </div>
        </div>

        {(equipo.tickets_abiertos > 0 || equipo.alertas_pendientes > 0) && (
          <div className="mt-2 flex gap-2">
            {equipo.tickets_abiertos > 0 && (
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                {equipo.tickets_abiertos} ticket{equipo.tickets_abiertos > 1 ? 's' : ''}
              </span>
            )}
            {equipo.alertas_pendientes > 0 && (
              <span className="bg-yellow-100 text-yellow-600 text-xs px-2 py-0.5 rounded-full">
                {equipo.alertas_pendientes} alerta{equipo.alertas_pendientes > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

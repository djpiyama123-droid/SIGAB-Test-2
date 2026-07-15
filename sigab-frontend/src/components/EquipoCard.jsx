import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_DOT_COLORS } from '../utils/constants';

// P3-Bug3: helper que cuenta total de fotos de un equipo (imagen_url + JSON fotos).
// Devuelve { total, hasPrincipal } — usado para badge "fotos incompletas".
export function countEquipoFotos(equipo) {
  if (!equipo) return { total: 0, hasPrincipal: false };
  const hasPrincipal = Boolean(equipo.imagen_url);
  let extras = 0;
  if (equipo.fotos) {
    try { extras = JSON.parse(equipo.fotos).filter(Boolean).length; }
    catch { extras = 0; }
  }
  return { total: (hasPrincipal ? 1 : 0) + extras, hasPrincipal };
}

export default function EquipoCard({ equipo, onClick }) {
  const { total: totalFotos, hasPrincipal } = countEquipoFotos(equipo);
  const fotosIncompletas = totalFotos < 3;
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
        {/* P3-Bug3: badge fotos incompletas — solo aparece si <3 fotos */}
        {fotosIncompletas && (
          <span
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm bg-amber-900/70 text-amber-200 border border-amber-700/50"
            title={hasPrincipal ? `Solo ${totalFotos} foto(s); recomienda ≥3 (frontal, placa, panorámica)` : 'Sin foto principal'}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {hasPrincipal ? `Fotos incompletas (${totalFotos}/3)` : 'Sin foto'}
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
    </div>
  );
}

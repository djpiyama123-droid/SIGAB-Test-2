import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_DOT_COLORS } from '../utils/constants';
import { getMediaUrl } from '../api/sigah';

const ADQUISICION_LABELS = {
  recurso_propio: 'Recurso Propio',
  contrato_consolidado: 'Consolidado',
  garantia: 'Garantía',
  subrogado: 'Subrogado'
};

const ADQUISICION_COLORS = {
  recurso_propio: 'bg-blue-500/20 text-blue-400 border border-blue-700/40',
  contrato_consolidado: 'bg-emerald-500/20 text-emerald-400 border border-emerald-700/40',
  garantia: 'bg-amber-500/20 text-amber-400 border border-amber-700/40',
  subrogado: 'bg-purple-500/20 text-purple-400 border border-purple-700/40'
};

// Cuenta fotos en equipo.fotos (array, JSON string, CSV o URL única) sin duplicar
// la lógica completa de normalizarFotos (EquipoForm/EquipoDetail) — aquí solo
// necesitamos el conteo para el badge.
function contarFotos(equipo) {
  const f = equipo.fotos;
  if (Array.isArray(f)) return f.filter(Boolean).length;
  if (typeof f === 'string' && f.trim() && f !== '[]' && f !== 'null') {
    try {
      const parsed = JSON.parse(f);
      return Array.isArray(parsed) ? parsed.filter(Boolean).length : 1;
    } catch {
      return f.split(',').map((x) => x.trim()).filter(Boolean).length;
    }
  }
  return equipo.imagen_url ? 1 : 0;
}

export default function EquipoCard({ equipo, onClick, onQR }) {
  const fotosIncompletas = contarFotos(equipo) < 3;
  return (
    <div
      className="bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden hover:border-[var(--content-border)] cursor-pointer transition-all group"
      onClick={() => onClick?.(equipo)}
    >
      {/* Imagen del equipo */}
      <div className="relative h-36 bg-[var(--content-bg)]/50 flex items-center justify-center overflow-hidden">
        {equipo.qr_token && (
          <button
            onClick={(e) => { e.stopPropagation(); onQR?.(equipo); }}
            title="Ver código QR"
            aria-label="Ver código QR del equipo"
            className="absolute bottom-2 right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-[var(--content-surface)]/90 backdrop-blur-sm border border-[var(--content-border)] text-[var(--content-text)] hover:bg-[var(--content-surface)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        )}
        {equipo.imagen_url ? (
          <img
            src={getMediaUrl(equipo.imagen_url)}
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
        {/* Indicador de imagen referencial (S9 sprint 2026-06-27) */}
        {equipo.imagen_referencial && (
          <span
            title="Imagen referencial (no es el equipo real)"
            aria-label="Imagen referencial — la foto NO es del equipo real"
            className="absolute right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md ring-2 ring-black/30"
            style={{ top: equipo.criticidad === 'alta' ? '2.25rem' : '0.5rem' }}
          >
            !
          </span>
        )}
        {fotosIncompletas && (
          <span className="absolute bottom-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
            ⚠ Fotos incompletas
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-[var(--content-text)] font-semibold text-sm mb-1 truncate">{equipo.nombre}</h3>
        <p className="text-[var(--content-muted)] text-xs truncate">{equipo.marca} — {equipo.modelo}</p>
        {equipo.tipo_adquisicion && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-2 ${ADQUISICION_COLORS[equipo.tipo_adquisicion] || ADQUISICION_COLORS.recurso_propio}`}>
            {ADQUISICION_LABELS[equipo.tipo_adquisicion] || 'Recurso Propio'}
          </span>
        )}

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

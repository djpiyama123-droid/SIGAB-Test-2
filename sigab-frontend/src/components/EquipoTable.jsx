import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import EquipoDetail from './EquipoDetail';
import QRPanel from './QRPanel';
import { countEquipoFotos } from './EquipoCard';

const CRITICIDAD_BADGE = {
  alta: 'bg-red-500/20 text-red-400 border border-red-700/50',
  media: 'bg-yellow-500/20 text-yellow-400 border border-yellow-700/50',
  baja: 'bg-[var(--content-surface)] text-[var(--content-muted)] border border-[var(--content-border)]',
};

export default function EquipoTable({ equipos, onChange }) {
  const [selected, setSelected] = useState(null);
  const [qrEquipo, setQrEquipo] = useState(null);
  const navigate = useNavigate();

  const handleQR = (e, eq) => {
    e.stopPropagation();
    setQrEquipo(eq);
  };

  const handleTickets = (e, eq) => {
    e.stopPropagation();
    setSelected(eq);
  };

  return (
    <>
      {/* Vista móvil: tarjetas compactas */}
      <div className="block md:hidden space-y-2">
        {equipos.map((eq) => {
          const { total: totalFotosEq, hasPrincipal: hasPrincEq } = countEquipoFotos(eq);
          const fotosIncEq = totalFotosEq < 3;
          return (
          <div key={eq.id}
            onClick={() => setSelected(eq)}
            className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl p-4 cursor-pointer hover:border-[var(--content-border)] active:bg-slate-700/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {eq.imagen_url && (
                  <img src={eq.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <div className="min-w-0">
                  <p className="text-[var(--content-text)] font-medium text-sm truncate">{eq.nombre}</p>
                  <p className="text-[var(--content-muted)] text-xs truncate">{eq.marca} {eq.modelo}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[eq.estado] || 'bg-gray-500'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {ESTADO_LABELS[eq.estado] || eq.estado}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {eq.serie && <span className="font-mono text-emerald-400 text-xs">Serie: {eq.serie}</span>}
              {eq.inventario && <span className="font-mono text-blue-400 text-xs">NII: {eq.inventario}</span>}
              {eq.area && <span className="text-[var(--content-muted)] text-xs">{eq.area}{eq.piso ? ` · Piso ${eq.piso}` : ''}</span>}
            </div>
            {fotosIncEq && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-900/30 text-amber-300 border border-amber-700/40">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {hasPrincEq ? `Fotos incompletas (${totalFotosEq}/3)` : 'Sin foto'}
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-2">
                {eq.tickets_abiertos > 0 && (
                  <button onClick={(e) => handleTickets(e, eq)}
                    className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-700/40">
                    {eq.tickets_abiertos} orden{eq.tickets_abiertos !== 1 ? 'es' : ''}
                  </button>
                )}
                {eq.criticidad && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CRITICIDAD_BADGE[eq.criticidad] || ''}`}>
                    {eq.criticidad}
                  </span>
                )}
              </div>
              {eq.qr_token && (
                <button onClick={(e) => handleQR(e, eq)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded-lg border border-emerald-700/40">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  QR
                </button>
              )}
            </div>
          </div>
          );
        })}
        <p className="text-[var(--content-muted)] text-xs text-center py-1">{equipos.length} equipos</p>
      </div>

      {/* Vista escritorio: tabla completa */}
      <div className="hidden md:block bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
          <table className="w-full text-sm min-w-[1060px]">
            <thead>
              <tr className="bg-[var(--content-bg)]/50 text-[var(--content-muted)] text-left">
                <th className="px-3 py-3 font-medium w-10"></th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">N° Inventario IMSS</th>
                <th className="px-3 py-3 font-medium">N° Serie</th>
                <th className="px-3 py-3 font-medium">Nombre</th>
                <th className="px-3 py-3 font-medium">Marca / Modelo</th>
                <th className="px-3 py-3 font-medium">Criticidad</th>
                <th className="px-3 py-3 font-medium">Piso</th>
                <th className="px-3 py-3 font-medium">Área</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Órdenes</th>
                <th className="px-3 py-3 font-medium text-center">Imprimir QR</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((eq) => (
                <tr
                  key={eq.id}
                  className="border-t border-[var(--content-border)]/50 hover:bg-[var(--content-border)]/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(eq)}
                >
                  {/* Thumbnail */}
                  <td className="px-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--content-bg)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {eq.imagen_url ? (
                        <img
                          src={eq.imagen_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <svg className="w-4 h-4 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[eq.estado] || 'bg-gray-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                      {ESTADO_LABELS[eq.estado] || eq.estado}
                    </span>
                  </td>

                  {/* N° Inventario IMSS */}
                  <td className="px-3 py-3">
                    {eq.inventario ? (
                      <span className="font-mono text-blue-400 text-xs font-semibold">
                        HGR1-{eq.inventario}
                      </span>
                    ) : (
                      <span className="text-[var(--content-muted)] text-xs italic">Sin asignar</span>
                    )}
                  </td>

                  {/* N° Serie */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-emerald-400 text-xs font-semibold">
                      {eq.serie || <span className="text-[var(--content-muted)] italic">Sin asignar</span>}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-[var(--content-text)] font-medium max-w-[200px]">
                    <div className="truncate">{eq.nombre}</div>
                    {fotosIncEq && (
                      <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-900/30 text-amber-300 border border-amber-700/40"
                            title={hasPrincEq ? `Solo ${totalFotosEq} foto(s); recomienda ≥3` : 'Sin foto principal'}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        {hasPrincEq ? `Fotos ${totalFotosEq}/3` : 'Sin foto'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--content-muted)] text-xs">{eq.marca} / {eq.modelo}</td>

                  <td className="px-3 py-3">
                    {eq.criticidad && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CRITICIDAD_BADGE[eq.criticidad] || ''}`}>
                        {eq.criticidad}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-[var(--content-muted)] text-xs">{eq.piso || '—'}</td>
                  <td className="px-3 py-3 text-[var(--content-muted)] text-xs max-w-[150px] truncate">{eq.area || '—'}</td>
                  <td className="px-3 py-3 text-[var(--content-muted)] text-xs capitalize">{eq.tipo_equipo || '—'}</td>

                  {/* Órdenes de Servicio (tickets) */}
                  <td className="px-3 py-3" onClick={(e) => eq.tickets_abiertos > 0 && handleTickets(e, eq)}>
                    {eq.tickets_abiertos > 0 ? (
                      <button
                        className="inline-flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium transition-colors border border-red-700/40"
                        title="Ver órdenes de servicio abiertas"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {eq.tickets_abiertos} abierta{eq.tickets_abiertos !== 1 ? 's' : ''}
                      </button>
                    ) : (
                      <span className="text-[var(--content-muted)] text-xs">—</span>
                    )}
                  </td>

                  {/* Botón Imprimir QR */}
                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleQR(e, eq)}
                      disabled={!eq.qr_token}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-400 text-xs font-semibold rounded-lg transition-colors border border-emerald-700/40"
                      title="Abrir módulo de impresión de QR"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[var(--content-muted)] text-sm border-t border-[var(--content-border)]">
          Mostrando {equipos.length} equipos en esta página
        </div>
      </div>

      {/* Modal detalle */}
      {selected && (
        <EquipoDetail
          equipo={selected}
          onClose={() => setSelected(null)}
          onChange={() => {
            setSelected(null);
            onChange?.();
          }}
        />
      )}

      {/* QR Panel — módulo de impresión */}
      {qrEquipo && (
        <QRPanel
          equipo={qrEquipo}
          onClose={() => setQrEquipo(null)}
        />
      )}
    </>
  );
}

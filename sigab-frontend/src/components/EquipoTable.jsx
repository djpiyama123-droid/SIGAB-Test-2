import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import EquipoDetail from './EquipoDetail';
import QRPanel from './QRPanel';

const CRITICIDAD_BADGE = {
  alta: 'bg-red-500/20 text-red-400 border border-red-700/50',
  media: 'bg-yellow-500/20 text-yellow-400 border border-yellow-700/50',
  baja: 'bg-slate-700 text-slate-300 border border-slate-600',
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
          <table className="w-full text-sm min-w-[1060px]">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-left">
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
                  className="border-t border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(eq)}
                >
                  {/* Thumbnail */}
                  <td className="px-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {eq.imagen_url ? (
                        <img
                          src={eq.imagen_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                      <span className="text-slate-600 text-xs italic">Sin asignar</span>
                    )}
                  </td>

                  {/* N° Serie */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-emerald-400 text-xs font-semibold">
                      {eq.serie || <span className="text-slate-600 italic">Sin asignar</span>}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-white font-medium max-w-[200px] truncate">{eq.nombre}</td>
                  <td className="px-3 py-3 text-slate-300 text-xs">{eq.marca} / {eq.modelo}</td>

                  <td className="px-3 py-3">
                    {eq.criticidad && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CRITICIDAD_BADGE[eq.criticidad] || ''}`}>
                        {eq.criticidad}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-slate-400 text-xs">{eq.piso || '—'}</td>
                  <td className="px-3 py-3 text-slate-400 text-xs max-w-[150px] truncate">{eq.area || '—'}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs capitalize">{eq.tipo_equipo || '—'}</td>

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
                      <span className="text-slate-700 text-xs">—</span>
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
        <div className="px-4 py-3 text-slate-500 text-sm border-t border-slate-700">
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

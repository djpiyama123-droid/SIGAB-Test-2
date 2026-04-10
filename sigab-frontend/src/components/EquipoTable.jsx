import { useState } from 'react';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import EquipoDetail from './EquipoDetail';
import QRPanel from './QRPanel';

export default function EquipoTable({ equipos, onChange }) {
  const [selected, setSelected] = useState(null);
  const [qrEquipo, setQrEquipo] = useState(null);

  return (
    <>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Serie</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Marca / Modelo</th>
                <th className="px-4 py-3 font-medium">Piso</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 font-medium">Alertas</th>
                <th className="px-4 py-3 font-medium">Ult. Mtto.</th>
                <th className="px-4 py-3 font-medium text-center">QR</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((eq) => (
                <tr
                  key={eq.id}
                  className="border-t border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(eq)}
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[eq.estado] || 'bg-gray-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                      {ESTADO_LABELS[eq.estado] || eq.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{eq.serie}</td>
                  <td className="px-4 py-3 text-white font-medium">{eq.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{eq.marca} / {eq.modelo}</td>
                  <td className="px-4 py-3 text-slate-400">{eq.piso || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{eq.area || '—'}</td>
                  <td className="px-4 py-3">
                    {eq.tickets_abiertos > 0 && (
                      <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">
                        {eq.tickets_abiertos}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {eq.alertas_pendientes > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                        {eq.alertas_pendientes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{eq.ultimo_mantenimiento || '—'}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setQrEquipo(eq)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Generar QR"
                    >
                      📱
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-slate-500 text-sm border-t border-slate-700">
          Mostrando {equipos.length} equipos
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
      {/* QR Panel */}
      {qrEquipo && (
        <QRPanel
          equipo={qrEquipo}
          onClose={() => setQrEquipo(null)}
        />
      )}
    </>
  );
}

// ============================================================
// HistorialEquipoModal.jsx — Vista completa de historial técnico
// Se invoca desde el botón "Ver Historial Completo" en FichaTecnica
// ============================================================
import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { useToast } from './Toast';

const TABS = [
  { id: 'ordenes', label: 'Órdenes de Servicio' },
  { id: 'traslados', label: 'Traslados' },
  { id: 'preventivos', label: 'Preventivos' },
];

export default function HistorialEquipoModal({ equipo, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState('ordenes');
  const [data, setData] = useState({ ordenes: [], traslados: [], preventivos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!equipo?.id) return;
    setLoading(true);
    api.getHistorialEquipo(equipo.id)
      .then((res) => setData({
        ordenes: res.ordenes || [],
        traslados: res.traslados || [],
        preventivos: res.preventivos || [],
      }))
      .catch((err) => {
        toast.error('No se pudo cargar el historial');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [equipo?.id]); // eslint-disable-line

  if (!equipo) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-white">Historial Técnico</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {equipo.nombre} · <span className="font-mono">{equipo.serie}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-5">
          {TABS.map((t) => {
            const count = data[t.id]?.length || 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'text-white border-emerald-500'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center text-slate-400 py-12">Cargando historial...</div>
          ) : tab === 'ordenes' ? (
            <ListaOrdenes ordenes={data.ordenes} />
          ) : tab === 'traslados' ? (
            <ListaTraslados traslados={data.traslados} />
          ) : (
            <ListaPreventivos preventivos={data.preventivos} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ListaOrdenes({ ordenes }) {
  if (ordenes.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">Sin órdenes registradas</p>;
  }
  return (
    <div className="space-y-3">
      {ordenes.map((os) => (
        <div key={os.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-mono text-emerald-400 text-sm">{os.numero_orden}</p>
              <p className="text-white text-sm font-medium mt-0.5">
                {os.tipo_mantenimiento}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  os.estado === 'cerrada'
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : os.estado === 'cancelada'
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-yellow-900/50 text-yellow-400'
                }`}
              >
                {os.estado?.replace('_', ' ')}
              </span>
              <p className="text-slate-500 text-xs mt-1">{os.fecha}</p>
            </div>
          </div>
          {os.falla_reportada && (
            <p className="text-slate-400 text-xs mt-2">
              <span className="text-slate-500">Falla:</span> {os.falla_reportada}
            </p>
          )}
          {os.tecnico_nombre && (
            <p className="text-slate-500 text-xs mt-1">Técnico: {os.tecnico_nombre}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ListaTraslados({ traslados }) {
  if (traslados.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">Sin traslados registrados</p>;
  }
  return (
    <div className="space-y-3">
      {traslados.map((t) => (
        <div key={t.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
              {t.area_origen || '—'}
              {t.piso_origen && ` · P${t.piso_origen}`}
            </span>
            <span className="text-slate-500">→</span>
            <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-800">
              {t.area_destino}
              {t.piso_destino && ` · P${t.piso_destino}`}
            </span>
          </div>
          {t.motivo && <p className="text-slate-500 text-xs mt-2">Motivo: {t.motivo}</p>}
          <p className="text-slate-600 text-xs mt-1">
            {t.fecha_movimiento && new Date(t.fecha_movimiento).toLocaleString('es-MX')}
          </p>
        </div>
      ))}
    </div>
  );
}

function ListaPreventivos({ preventivos }) {
  if (preventivos.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">Sin preventivos programados</p>;
  }
  return (
    <div className="space-y-3">
      {preventivos.map((pp) => (
        <div key={pp.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <p className="text-white text-sm font-medium">{pp.tipo_preventivo}</p>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Cada {pp.frecuencia_dias} días</span>
            <span>Próx: {pp.proxima_ejecucion}</span>
          </div>
          {pp.ultima_ejecucion && (
            <p className="text-slate-600 text-xs mt-1">Última: {pp.ultima_ejecucion}</p>
          )}
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';
import { TV_ESTADO_COLORS, TV_SEVERIDAD_COLORS, TV_TIPO_LABELS, TV_ESTADO_LABELS } from '../utils/constants';
import EventoAdversoModal from '../components/EventoAdversoModal';
import EventoDetalleModal from '../components/EventoDetalleModal';
import { SigabButton, SigabSpinner } from '../components/v2/SigabUI';
import { useToast } from '../components/Toast';

const FILTROS_ESTADO = ['', 'reportado', 'en_investigacion', 'documentado', 'escalado_cofepris', 'cerrado'];
const FILTROS_SEVERIDAD = ['', 'critica', 'grave', 'moderada', 'leve'];

export default function Tecnovigilancia() {
  const toast = useToast();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstado] = useState('');
  const [severidadFiltro, setSeveridad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEventos({
        estado: estadoFiltro || undefined,
        severidad: severidadFiltro || undefined,
        busqueda: busqueda || undefined,
      });
      setEventos(res.eventos || []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los eventos de tecnovigilancia');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, severidadFiltro, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const formatFecha = (f) => {
    if (!f) return '—';
    try {
      return new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return String(f); }
  };

  return (
    <div className="sigab-v2 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-cobalt-900 font-sigabHead">Tecnovigilancia</h1>
          <p className="text-sm text-sigab-text-muted mt-0.5 font-sigabBody">
            NOM-240-SSA1-2012 — Reporte y seguimiento de eventos adversos
          </p>
        </div>
        <SigabButton
          variant="danger"
          onClick={() => setShowCrear(true)}
          iconLeft={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        >
          Reportar evento
        </SigabButton>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-sigab-text-muted font-sigabBody">Estado:</span>
        {FILTROS_ESTADO.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-[var(--sigab-radius-md)] text-xs font-semibold transition-colors border ${
              estadoFiltro === e
                ? 'bg-teal2-50 text-teal2-700 border-teal2-200'
                : 'bg-sigab-surface border-sigab-border text-sigab-text-muted hover:bg-sigab-bg hover:text-sigab-text'
            }`}>
            {e ? (TV_ESTADO_LABELS[e] || e) : 'Todos'}
          </button>
        ))}

        <span className="text-xs text-sigab-text-muted ml-3 font-sigabBody">Severidad:</span>
        {FILTROS_SEVERIDAD.map((s) => (
          <button key={s} onClick={() => setSeveridad(s)}
            className={`px-3 py-1.5 rounded-[var(--sigab-radius-md)] text-xs font-semibold capitalize transition-colors border ${
              severidadFiltro === s
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-sigab-surface border-sigab-border text-sigab-text-muted hover:bg-sigab-bg hover:text-sigab-text'
            }`}>
            {s || 'Todas'}
          </button>
        ))}

        <div className="ml-auto">
          <input
            type="text"
            placeholder="Buscar por No. reporte o dispositivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text placeholder:text-sigab-text-muted focus:outline-none focus:ring-2 focus:ring-teal2-500/50 w-72"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-sigab-text-muted py-8 text-center flex justify-center"><SigabSpinner label="Cargando eventos..." /></div>
      ) : eventos.length === 0 ? (
        <div className="text-sigab-text-muted py-12 text-center bg-sigab-surface border border-sigab-border rounded-xl">
          <svg className="w-12 h-12 mx-auto mb-3 text-sigab-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Sin eventos adversos registrados con ese filtro.
        </div>
      ) : (
        <div className="bg-sigab-surface rounded-[var(--sigab-radius-lg)] border border-sigab-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sigabBody">
              <thead>
                <tr className="bg-sigab-surface-alt text-sigab-text-muted text-left">
                  {['No. Reporte', 'Dispositivo', 'Tipo', 'Severidad', 'Estado', 'Fecha evento', 'Reportante'].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => (
                  <tr key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className="border-t border-sigab-border hover:bg-sigab-bg cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-cobalt-600 text-xs">{ev.numero_reporte}</td>
                    <td className="px-4 py-3 text-sigab-text">{ev.dispositivo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs font-semibold">
                      {TV_TIPO_LABELS[ev.tipo_evento] || ev.tipo_evento}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border border-transparent ${
                        ev.severidad === 'critica' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        ev.severidad === 'grave' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        ev.severidad === 'moderada' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {ev.severidad?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                        ev.estado === 'cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        ev.estado === 'documentado' ? 'bg-cobalt-50 text-cobalt-700 border-cobalt-200' :
                        ev.estado === 'escalado_cofepris' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {TV_ESTADO_LABELS[ev.estado] || ev.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs">{formatFecha(ev.fecha_evento)}</td>
                    <td className="px-4 py-3 text-sigab-text-muted text-xs font-semibold">{ev.reportante_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-sigab-text-muted text-xs border-t border-sigab-border bg-sigab-surface-alt font-sigabBody">
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modales */}
      {showCrear && (
        <EventoAdversoModal
          onClose={() => setShowCrear(false)}
          onCreated={(num) => {
            setShowCrear(false);
            toast.success(`Evento ${num || 'adverso'} registrado`);
            cargar();
          }}
        />
      )}

      {selectedId && (
        <EventoDetalleModal
          eventoId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={cargar}
        />
      )}
    </div>
  );
}

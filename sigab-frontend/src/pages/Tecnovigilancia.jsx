import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/sigah';
import { TV_ESTADO_COLORS, TV_SEVERIDAD_COLORS, TV_TIPO_LABELS, TV_ESTADO_LABELS } from '../utils/constants';
import EventoAdversoModal from '../components/EventoAdversoModal';
import EventoDetalleModal from '../components/EventoDetalleModal';
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
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-text)]">Tecnovigilancia</h1>
          <p className="text-sm text-[var(--content-muted)] mt-0.5">
            NOM-240-SSA1-2012 — Reporte y seguimiento de eventos adversos
          </p>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="hidden md:flex px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Reportar evento
        </button>
      </div>

      {/* FAB Móvil */}
      <div className="md:hidden fixed bottom-6 right-6 z-[40]">
        <button
          onClick={() => setShowCrear(true)}
          className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Reportar evento adverso"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[var(--content-muted)]">Estado:</span>
        {FILTROS_ESTADO.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              estadoFiltro === e
                ? 'bg-emerald-800/60 text-emerald-300'
                : 'bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
            }`}>
            {e ? (TV_ESTADO_LABELS[e] || e) : 'Todos'}
          </button>
        ))}

        <span className="text-xs text-[var(--content-muted)] ml-3">Severidad:</span>
        {FILTROS_SEVERIDAD.map((s) => (
          <button key={s} onClick={() => setSeveridad(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              severidadFiltro === s
                ? 'bg-red-800/60 text-red-300'
                : 'bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
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
            className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-emerald-600 w-72"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-[var(--content-muted)] py-8 text-center">Cargando eventos...</div>
      ) : eventos.length === 0 ? (
        <div className="text-[var(--content-muted)] py-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-[var(--content-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Sin eventos adversos registrados con ese filtro.
        </div>
      ) : (
        <div className="bg-[var(--content-surface)] rounded-xl border border-[var(--content-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--content-bg)]/60 text-[var(--content-muted)] text-left">
                  {['No. Reporte', 'Dispositivo', 'Tipo', 'Severidad', 'Estado', 'Fecha evento', 'Reportante'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => (
                  <tr key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className="border-t border-[var(--content-border)]/50 hover:bg-[var(--content-border)]/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-[var(--content-muted)] text-xs">{ev.numero_reporte}</td>
                    <td className="px-4 py-3 text-[var(--content-text)]">{ev.dispositivo_nombre || '—'}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs">
                      {TV_TIPO_LABELS[ev.tipo_evento] || ev.tipo_evento}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TV_SEVERIDAD_COLORS[ev.severidad] || ''}`}>
                        {ev.severidad?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TV_ESTADO_COLORS[ev.estado] || ''}`}>
                        {TV_ESTADO_LABELS[ev.estado] || ev.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs">{formatFecha(ev.fecha_evento)}</td>
                    <td className="px-4 py-3 text-[var(--content-muted)] text-xs">{ev.reportante_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[var(--content-muted)] text-xs border-t border-[var(--content-border)]">
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

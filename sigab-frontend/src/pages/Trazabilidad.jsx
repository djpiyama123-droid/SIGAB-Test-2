import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { useToast } from '../components/Toast';

export default function Trazabilidad() {
  const toast = useToast();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTrazabilidad()
      .then((res) => setMovimientos(res.movimientos || []))
      .catch((err) => {
        console.error(err);
        toast.error('No se pudo cargar la trazabilidad');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--content-text)]">Trazabilidad de Equipos</h1>
        <p className="text-[var(--content-muted)] text-sm">Historial de movimientos y traslados</p>
      </div>

      {loading ? (
        <div className="text-[var(--content-muted)] py-12 text-center">Cargando movimientos...</div>
      ) : movimientos.length === 0 ? (
        <div className="text-[var(--content-muted)] py-12 text-center">Sin movimientos registrados.</div>
      ) : (
        <div className="space-y-3">
          {movimientos.map((m, i) => (
            <div key={m.id || i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                {i < movimientos.length - 1 && (
                  <div className="w-0.5 flex-1 bg-[var(--content-surface)] my-1" />
                )}
              </div>
              <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg p-4 flex-1 mb-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-white text-sm font-medium">
                      {m.equipo_nombre}
                    </span>
                    <span className="text-[var(--content-muted)] text-xs ml-2 font-mono">
                      {m.equipo_serie}
                    </span>
                  </div>
                  <span className="text-[var(--content-muted)] text-xs">
                    {m.fecha_movimiento
                      ? new Date(m.fecha_movimiento).toLocaleString('es-MX')
                      : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="bg-[var(--content-surface)] text-[var(--content-muted)] px-2 py-0.5 rounded text-xs">
                    {m.area_origen || 'Origen desconocido'}
                    {m.piso_origen && ` • P${m.piso_origen}`}
                  </span>
                  <span className="text-[var(--content-muted)]">→</span>
                  <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-800">
                    {m.area_destino}
                    {m.piso_destino && ` • P${m.piso_destino}`}
                  </span>
                </div>
                {m.motivo && (
                  <p className="text-[var(--content-muted)] text-xs mt-1.5">
                    Motivo: {m.motivo}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

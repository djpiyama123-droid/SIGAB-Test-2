// ============================================================
// EquipoDetail.jsx — Modal de detalle de equipo con acciones
// Soporta: ver detalle, editar, eliminar
// ============================================================
import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import { useToast } from './Toast';
import EquipoForm from './EquipoForm';
import ConfirmDialog from './ConfirmDialog';
import QRPanel from './QRPanel';

export default function EquipoDetail({ equipo, onClose, onChange }) {
  const toast = useToast();
  const [historial, setHistorial] = useState({ ordenes: [], traslados: [] });
  const [editando, setEditando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (equipo?.id) {
      api.getHistorialEquipo(equipo.id)
        .then((res) => setHistorial({
          ordenes: res.ordenes || [],
          traslados: res.traslados || [],
        }))
        .catch((err) => {
          console.error(err);
          // No molestamos al usuario si falla, solo dejamos los datos vacíos
        });
    }
  }, [equipo?.id]);

  if (!equipo) return null;

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      const res = await api.eliminarEquipo(equipo.id);
      toast.success(res.mensaje || 'Equipo eliminado');
      setConfirmandoEliminar(false);
      onChange?.();
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      toast.error(`No se pudo eliminar: ${msg}`);
    } finally {
      setEliminando(false);
    }
  };

  const handleSavedEdit = () => {
    setEditando(false);
    onChange?.();
    toast.success('Cambios aplicados al inventario');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700 flex justify-between items-start">
            <div className="flex gap-4">
              {equipo.imagen_url && (
                <img
                  src={equipo.imagen_url}
                  alt={equipo.nombre}
                  className="w-16 h-16 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{equipo.nombre}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {equipo.marca} — {equipo.modelo}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Serie</span>
                <p className="text-white font-mono">{equipo.serie}</p>
              </div>
              <div>
                <span className="text-slate-500">Estado</span>
                <p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[equipo.estado]}`}>
                    {ESTADO_LABELS[equipo.estado]}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-slate-500">Piso</span>
                <p className="text-white">{equipo.piso || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Area</span>
                <p className="text-white">{equipo.area || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Inventario</span>
                <p className="text-white">{equipo.inventario || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Criticidad</span>
                <p className="text-white capitalize">{equipo.criticidad || '—'}</p>
              </div>
            </div>

            {/* Historial de ordenes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Historial de Ordenes</h3>
              {historial.ordenes.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin ordenes registradas</p>
              ) : (
                <div className="space-y-2">
                  {historial.ordenes.slice(0, 5).map((os, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white font-medium">{os.numero_orden}</span>
                        <span className="text-slate-500">{os.fecha}</span>
                      </div>
                      <p className="text-slate-400 mt-1">
                        {os.falla_reportada || os.tipo_mantenimiento}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          os.estado === 'cerrada'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {os.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Traslados */}
            {historial.traslados.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Traslados Recientes</h3>
                <div className="space-y-2">
                  {historial.traslados.slice(0, 5).map((t, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-sm flex justify-between">
                      <span className="text-white">
                        {t.area_origen} → {t.area_destino}
                      </span>
                      <span className="text-slate-500">{t.fecha_movimiento}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/40 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setConfirmandoEliminar(true)}
              className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                📱 QR
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {editando && (
        <EquipoForm
          equipo={equipo}
          onClose={() => setEditando(false)}
          onSaved={handleSavedEdit}
        />
      )}

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={confirmandoEliminar}
        titulo={`¿Eliminar ${equipo.nombre}?`}
        mensaje={`Se eliminará permanentemente el equipo con serie ${equipo.serie}. Las órdenes históricas se conservarán pero perderán el vínculo. Esta acción no se puede deshacer.`}
        textoConfirmar={eliminando ? 'Eliminando...' : 'Sí, eliminar'}
        variante="peligro"
        onConfirmar={handleEliminar}
        onCancelar={() => setConfirmandoEliminar(false)}
      />

      {/* QR Panel */}
      {showQR && (
        <QRPanel
          equipo={equipo}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}

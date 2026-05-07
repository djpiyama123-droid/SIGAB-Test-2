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
import OrdenDetalleModal from './OrdenDetalleModal';
import { QRCodeSVG } from 'qrcode.react';

export default function EquipoDetail({ equipo, onClose, onChange }) {
  const toast = useToast();
  const [historial, setHistorial] = useState({ ordenes: [], traslados: [] });
  const [editando, setEditando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [ordenAbierta, setOrdenAbierta] = useState(null); // OS clickeada en la lista

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
            {/* Info grid & QR Code */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 grid grid-cols-2 gap-4 text-sm w-full">
                <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex flex-col">
                  <span className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">N° Serie del Equipo</span>
                  <p className="text-emerald-400 font-mono text-lg font-semibold">{equipo.serie || 'NO ASIGNADO'}</p>
                </div>
                <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex flex-col">
                  <span className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">N° Inventario IMSS</span>
                  <p className="text-blue-400 font-mono text-lg font-semibold">{equipo.inventario ? `HGR1-${equipo.inventario}` : 'NO ASIGNADO'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Estado</span>
                  <p className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[equipo.estado]}`}>
                      {ESTADO_LABELS[equipo.estado]}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Criticidad</span>
                  <p className="text-white capitalize mt-1">{equipo.criticidad || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Piso</span>
                  <p className="text-white mt-1">{equipo.piso || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Area</span>
                  <p className="text-white mt-1">{equipo.area || '—'}</p>
                </div>
              </div>
              
              {/* QR Code Prominente */}
              {equipo.qr_token && (
                <div className="w-full md:w-auto bg-white p-4 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-2xl">
                  <QRCodeSVG
                    value={`${window.location.origin}/equipo/${equipo.qr_token}`}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="mt-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">QR Único</span>
                    <span className="text-xs font-mono text-slate-800 font-semibold">{equipo.qr_token}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fotos adicionales */}
            {(() => {
              try {
                const fotosArr = equipo.fotos ? JSON.parse(equipo.fotos) : [];
                if (fotosArr.length > 1) { // Only show if more than 1 image (first one is already at the top)
                  return (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Galería de Imágenes</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {fotosArr.map((foto, idx) => (
                           <div key={idx} className="relative flex-shrink-0 w-24 h-24 bg-black rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 cursor-pointer shadow-lg" onClick={() => window.open(foto, '_blank')}>
                             <img src={foto} className="object-cover w-full h-full hover:opacity-75 transition-opacity" />
                           </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
            })()}

            {/* Tickets / Órdenes de Servicio */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Tickets / Órdenes de Servicio
                </h3>
                {historial.ordenes.length > 0 && (
                  <span className="text-xs text-slate-500">{historial.ordenes.length} registro{historial.ordenes.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              {historial.ordenes.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin órdenes registradas</p>
              ) : (
                <div className="space-y-2">
                  {historial.ordenes.slice(0, 5).map((os, i) => {
                    // Click en cualquier parte de la card → abre OrdenDetalleModal con esa OS.
                    // Si además tiene pdf_url (archivo histórico ORDENESIMSS), un mini-icono lleva al PDF
                    // sin abrir el modal (stopPropagation).
                    const hasOsId = !!os.id;
                    return (
                      <div
                        key={i}
                        onClick={hasOsId ? () => setOrdenAbierta(os.id) : undefined}
                        role={hasOsId ? 'button' : undefined}
                        tabIndex={hasOsId ? 0 : undefined}
                        onKeyDown={hasOsId ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOrdenAbierta(os.id); } } : undefined}
                        className={`block bg-slate-900/50 rounded-lg p-3 text-sm ${hasOsId ? 'hover:bg-slate-800 hover:ring-1 ring-emerald-500/50 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/70' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${os.estado === 'cerrada' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                            <span className="text-emerald-300 font-mono text-xs font-bold truncate">
                              {os.numero_orden}
                            </span>
                            {os.pdf_url && (
                              <a
                                href={os.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                title="Abrir PDF original"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </a>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs whitespace-nowrap flex-shrink-0">{os.fecha}</span>
                        </div>
                        <p className="text-slate-400 mt-1.5 text-xs pl-4">
                          {os.falla_reportada || os.tipo_mantenimiento}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pl-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                            os.estado === 'cerrada'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : os.estado === 'en_progreso'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {os.estado?.replace('_', ' ')}
                          </span>
                          {os.tipo_mantenimiento && (
                            <span className="text-[10px] text-slate-600 capitalize">{os.tipo_mantenimiento}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

      {/* Modal detalle de OS al hacer click en un ticket de la lista */}
      {ordenAbierta && (
        <OrdenDetalleModal
          ordenId={ordenAbierta}
          onClose={() => setOrdenAbierta(null)}
          onUpdated={() => {
            // refrescar el historial de OS al cerrar
            api.getHistorialEquipo(equipo.id)
              .then((res) => setHistorial({
                ordenes: res.ordenes || [],
                traslados: res.traslados || [],
              }))
              .catch(() => {});
          }}
        />
      )}
    </>
  );
}

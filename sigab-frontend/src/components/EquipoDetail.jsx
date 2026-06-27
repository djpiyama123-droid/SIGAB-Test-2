// ============================================================
// EquipoDetail.jsx — Modal de detalle de equipo con acciones
// Soporta: ver detalle, editar, eliminar
// Cambios recientes (OpenCode · styles/equipo-media-2026):
//   - Header con foto principal clickeable → abre Lightbox
//   - Galería visible siempre (incluida cuando hay 1 sola foto)
//   - Miniaturas abren Lightbox (no `window.open`)
//   - Badge "Imagen referencial" cuando `equipo.imagen_referencial` === true
//   - Iconos PDF de OS con mejor affordance visual (siguen abriendo nueva pestaña)
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/sigah';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import { useToast } from './Toast';
import EquipoForm from './EquipoForm';
import ConfirmDialog from './ConfirmDialog';
import QRPanel from './QRPanel';
import OrdenDetalleModal from './OrdenDetalleModal';
import Lightbox from './Lightbox';
import { QRCodeSVG } from 'qrcode.react';

export default function EquipoDetail({ equipo, onClose, onChange }) {
  const toast = useToast();
  const [historial, setHistorial] = useState({ ordenes: [], traslados: [] });
  const [editando, setEditando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [ordenAbierta, setOrdenAbierta] = useState(null); // OS clickeada en la lista
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Array unificado y deduplicado de imágenes para el Lightbox.
  // Orden: imagen_url primero (es la principal), luego fotos adicionales.
  const imagenes = useMemo(() => {
    const principal = equipo?.imagen_url ? [equipo.imagen_url] : [];
    let extras = [];
    if (equipo?.fotos) {
      try {
        const parsed = JSON.parse(equipo.fotos);
        if (Array.isArray(parsed)) extras = parsed.filter(Boolean);
      } catch (_) {
        // JSON malformado — ignorar, no romper UI
      }
    }
    const all = [...principal, ...extras];
    // Deduplicar preservando orden
    return Array.from(new Set(all));
  }, [equipo?.imagen_url, equipo?.fotos]);

  const isReferencial = Boolean(equipo?.imagen_referencial);

  const openLightbox = (idx) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

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
          className="bg-[var(--content-surface)] rounded-2xl border border-[var(--content-border)] max-w-2xl w-full max-h-[85vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--content-border)] flex justify-between items-start gap-4">
            <div className="flex gap-4 min-w-0 flex-1">
              {imagenes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openLightbox(0)}
                  aria-label={`Ver foto del equipo ${equipo.nombre} en pantalla completa`}
                  title="Click para ver en pantalla completa"
                  className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-[var(--content-bg)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--content-border)] hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[var(--content-surface)] transition-all"
                >
                  <img
                    src={imagenes[0]}
                    alt={`Foto principal de ${equipo.nombre}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {/* Badge referencial sobre header */}
                  {isReferencial && (
                    <span
                      className="absolute top-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/95 text-amber-950 shadow ring-1 ring-amber-300/60 max-w-[calc(100%-0.5rem)] truncate"
                      title="Imagen referencial — no es el equipo real"
                    >
                      <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="truncate">Referencial</span>
                    </span>
                  )}
                  {/* Overlay hover con ícono de expandir */}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </span>
                  {/* Contador de fotos (esquina inferior derecha) */}
                  {imagenes.length > 1 && (
                    <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 text-white">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {imagenes.length}
                    </span>
                  )}
                </button>
              ) : (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-[var(--content-bg)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--content-border)]">
                  <svg className="w-8 h-8 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[var(--content-text)] truncate">{equipo.nombre}</h2>
                <p className="text-[var(--content-muted)] text-sm mt-1 truncate">
                  {equipo.marca} — {equipo.modelo}
                </p>
                {isReferencial && (
                  <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Imagen referencial — no es el equipo real</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="text-[var(--content-muted)] hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info grid & QR Code */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 grid grid-cols-2 gap-4 text-sm w-full">
                <div className="col-span-2 bg-[var(--content-bg)]/50 p-3 rounded-lg border border-[var(--content-border)]/50 flex flex-col">
                  <span className="text-[var(--content-muted)] text-xs uppercase tracking-wider mb-0.5">N° Serie del Equipo</span>
                  <p className="text-emerald-400 font-mono text-lg font-semibold">{equipo.serie || 'NO ASIGNADO'}</p>
                </div>
                <div className="col-span-2 bg-[var(--content-bg)]/50 p-3 rounded-lg border border-[var(--content-border)]/50 flex flex-col">
                  <span className="text-[var(--content-muted)] text-xs uppercase tracking-wider mb-0.5">N° Inventario IMSS</span>
                  <p className="text-blue-400 font-mono text-lg font-semibold">{equipo.inventario ? `HGR1-${equipo.inventario}` : 'NO ASIGNADO'}</p>
                </div>
                <div>
                  <span className="text-[var(--content-muted)]">Estado</span>
                  <p className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${ESTADO_COLORS[equipo.estado]}`}>
                      {ESTADO_LABELS[equipo.estado]}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[var(--content-muted)]">Criticidad</span>
                  <p className="text-white capitalize mt-1">{equipo.criticidad || '—'}</p>
                </div>
                <div>
                  <span className="text-[var(--content-muted)]">Piso</span>
                  <p className="text-[var(--content-text)] mt-1">{equipo.piso || '—'}</p>
                </div>
                <div>
                  <span className="text-[var(--content-muted)]">Area</span>
                  <p className="text-[var(--content-text)] mt-1">{equipo.area || '—'}</p>
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
                    <span className="text-[10px] uppercase font-bold text-[var(--content-muted)] tracking-widest block">QR Único</span>
                    <span className="text-xs font-mono text-[var(--content-muted)] font-semibold">{equipo.qr_token}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Galería de imágenes (siempre visible si hay al menos 1) */}
            {imagenes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--content-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Galería de Imágenes
                  </h3>
                  <span className="text-xs text-[var(--content-muted)]">
                    {imagenes.length} {imagenes.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {imagenes.map((foto, idx) => (
                    <button
                      key={`${foto}-${idx}`}
                      type="button"
                      onClick={() => openLightbox(idx)}
                      aria-label={`Ver foto ${idx + 1} de ${imagenes.length} en pantalla completa`}
                      className="group relative flex-shrink-0 w-24 h-24 bg-black rounded-lg overflow-hidden border border-[var(--content-border)] hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-lg transition-colors"
                    >
                      <img
                        src={foto}
                        alt=""
                        loading="lazy"
                        className="object-cover w-full h-full group-hover:opacity-75 transition-opacity"
                        onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                      />
                      {/* Indicador "foto actual" en miniatura si es la principal */}
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white">
                          Principal
                        </span>
                      )}
                      {/* Ícono de expandir al hover */}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none">
                        <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
                {imagenes.length > 1 && (
                  <p className="text-[11px] text-[var(--content-muted)] mt-2">
                    Tip: Click en cualquier miniatura abre el visor; usa ← / → para navegar y Esc para cerrar.
                  </p>
                )}
              </div>
            )}

            {/* Tickets / Órdenes de Servicio */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--content-muted)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Tickets / Órdenes de Servicio
                </h3>
                {historial.ordenes.length > 0 && (
                  <span className="text-xs text-[var(--content-muted)]">{historial.ordenes.length} registro{historial.ordenes.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              {historial.ordenes.length === 0 ? (
                <p className="text-[var(--content-muted)] text-sm">Sin órdenes registradas</p>
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
                        className={`block bg-[var(--content-bg)]/50 rounded-lg p-3 text-sm ${hasOsId ? 'hover:bg-[var(--content-surface)] hover:ring-1 ring-emerald-500/50 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/70' : ''}`}
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
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 border border-blue-500/30 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                title="Abrir PDF original del formato IMSS en nueva pestaña"
                                aria-label={`Abrir PDF del formato ${os.numero_orden} en nueva pestaña`}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                PDF
                              </a>
                            )}
                          </div>
                          <span className="text-[var(--content-muted)] text-xs whitespace-nowrap flex-shrink-0">{os.fecha}</span>
                        </div>
                        <p className="text-[var(--content-muted)] mt-1.5 text-xs pl-4">
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
                            <span className="text-[10px] text-[var(--content-muted)] capitalize">{os.tipo_mantenimiento}</span>
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
                <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-3">Traslados Recientes</h3>
                <div className="space-y-2">
                  {historial.traslados.slice(0, 5).map((t, i) => (
                    <div key={i} className="bg-[var(--content-bg)]/50 rounded-lg p-3 text-sm flex justify-between">
                      <span className="text-white">
                        {t.area_origen} → {t.area_destino}
                      </span>
                      <span className="text-[var(--content-muted)]">{t.fecha_movimiento}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div className="p-4 border-t border-[var(--content-border)] flex justify-between items-center bg-[var(--content-bg)]/40 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setConfirmandoEliminar(true)}
              className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[var(--content-surface)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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

      {/* Lightbox de imágenes (OpenCode · styles/equipo-media-2026) */}
      <Lightbox
        open={lightboxOpen}
        images={imagenes}
        index={lightboxIndex}
        alt={equipo?.nombre || 'Equipo'}
        referencial={isReferencial}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}

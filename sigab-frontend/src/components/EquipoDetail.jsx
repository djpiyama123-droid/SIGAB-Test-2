// ============================================================
// EquipoDetail.jsx — Modal de detalle de equipo con acciones
// Soporta: ver detalle, editar, eliminar
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/sigah';
import { ESTADO_COLORS, ESTADO_LABELS } from '../utils/constants';
import { useToast } from './Toast';
import EquipoForm from './EquipoForm';
import ConfirmDialog from './ConfirmDialog';
import QRPanel from './QRPanel';
import OrdenDetalleModal from './OrdenDetalleModal';
import OrdenServicioRapidaModal from './OrdenServicioRapidaModal';
import HistorialEquipoModal from './HistorialEquipoModal';
import CalendarioMantenimiento from './CalendarioMantenimiento';
import Lightbox from './Lightbox';
import { QRCodeSVG } from 'qrcode.react';

// Estados que se pueden asignar directo desde el modal de detalle sin pasar
// por EquipoForm completo. "en_traslado" y "baja" quedan fuera: dependen de
// otros flujos (traslados, baja definitiva) y no son un simple cambio de campo.
const ESTADOS_RAPIDOS = ['operativo', 'en_mantenimiento', 'fuera_servicio'];

export default function EquipoDetail({ equipo, onClose, onChange, onQuickUpdate }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);

  // Normaliza fotos a un array de URLs (puede venir como array, JSON string, CSV o URL única)
  const fotosArr = useMemo(() => {
    const f = equipo.fotos;
    if (!f) return [];
    if (Array.isArray(f)) return f.filter(Boolean);
    if (typeof f === 'string') {
      const s = f.trim();
      if (!s || s === '[]' || s === 'null') return [];
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [s];
      } catch {
        // CSV
        return s.split(',').map((x) => x.trim()).filter(Boolean);
      }
    }
    return [];
  }, [equipo.fotos]);

  const allImages = fotosArr.length > 0 ? fotosArr : (equipo.imagen_url ? [equipo.imagen_url] : []);
  const toast = useToast();
  const [historial, setHistorial] = useState({ ordenes: [], traslados: [] });
  const [documentos, setDocumentos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [ordenAbierta, setOrdenAbierta] = useState(null); // OS clickeada en la lista
  const [nuevaOrdenAbierta, setNuevaOrdenAbierta] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [estadoActual, setEstadoActual] = useState(equipo?.estado);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const recargarHistorial = () => {
    if (!equipo?.id) return;
    api.getHistorialEquipo(equipo.id)
      .then((res) => setHistorial({
        ordenes: res.ordenes || [],
        traslados: res.traslados || [],
      }))
      .catch(() => {});
  };

  useEffect(() => {
    setEstadoActual(equipo?.estado);
    if (equipo?.id) {
      recargarHistorial();
      api.getExpedienteEquipo(equipo.id)
        .then((res) => {
          setDocumentos(res.documentos || []);
          if ((res.ordenes || []).length) {
            setHistorial((h) => ({ ...h, ordenes: res.ordenes }));
          }
        })
        .catch(() => {});
    }
  }, [equipo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!equipo) return null;

  const handleCambiarEstado = async (nuevoEstado) => {
    if (!nuevoEstado || nuevoEstado === estadoActual || cambiandoEstado) return;
    const anterior = estadoActual;
    setEstadoActual(nuevoEstado);
    setCambiandoEstado(true);
    try {
      await api.updateEquipo(equipo.id, { estado: nuevoEstado });
      toast.success(`Estado actualizado a ${ESTADO_LABELS[nuevoEstado]}`);
      onQuickUpdate?.();
    } catch (err) {
      setEstadoActual(anterior);
      const msg = err.response?.data?.detail || err.message;
      toast.error(`No se pudo cambiar el estado: ${msg}`);
    } finally {
      setCambiandoEstado(false);
    }
  };

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
          <div className="p-6 border-b border-[var(--content-border)] flex justify-between items-start">
            <div className="flex gap-4">
              <div className="relative w-16 h-16 rounded-lg bg-[var(--content-bg)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--content-border)]">
                {/* Placeholder de fondo (visible si no hay imagen o si falla la carga) */}
                <svg className="w-7 h-7 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {equipo.imagen_url && (
                  <img
                    src={equipo.imagen_url}
                    alt={equipo.nombre}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    onClick={() => { setLightboxStart(0); setLightboxOpen(true); }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {equipo.imagen_referencial && (
                  <span
                    title="Imagen referencial (no es el equipo real)"
                    aria-label="Imagen referencial"
                    className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none"
                  >REFERENCIAL</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--content-text)]">{equipo.nombre}</h2>
                <p className="text-[var(--content-muted)] text-sm mt-1">
                  {equipo.marca} — {equipo.modelo}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-[var(--content-muted)] hover:text-[var(--content-text)] p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={estadoActual}
                      disabled={cambiandoEstado}
                      onChange={(e) => handleCambiarEstado(e.target.value)}
                      aria-label="Cambiar estado operativo del equipo"
                      title="Cambiar estado operativo"
                      className={`text-xs font-medium text-white rounded-full pl-2.5 pr-6 py-1 border-none appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-wait ${ESTADO_COLORS[estadoActual]}`}
                    >
                      {!ESTADOS_RAPIDOS.includes(estadoActual) && (
                        <option value={estadoActual} disabled>{ESTADO_LABELS[estadoActual]}</option>
                      )}
                      {ESTADOS_RAPIDOS.map((st) => (
                        <option key={st} value={st}>{ESTADO_LABELS[st]}</option>
                      ))}
                    </select>
                    {cambiandoEstado && (
                      <span className="w-3 h-3 border-2 border-[var(--content-muted)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--content-muted)]">Criticidad</span>
                  <p className="text-[var(--content-text)] capitalize mt-1">{equipo.criticidad || '—'}</p>
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

            {/* Contrato y Adquisición */}
            <div className="bg-[var(--content-bg)]/30 border border-[var(--content-border)]/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--content-muted)] flex items-center gap-2">
                📄 Cobertura y Contrato de Servicio
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--content-muted)] text-xs block">Tipo de Adquisición</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${
                    equipo.tipo_adquisicion === 'recurso_propio' ? 'bg-blue-500/20 text-blue-400 border border-blue-700/40' :
                    equipo.tipo_adquisicion === 'contrato_consolidado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-700/40' :
                    equipo.tipo_adquisicion === 'garantia' ? 'bg-amber-500/20 text-amber-400 border border-amber-700/40' :
                    'bg-purple-500/20 text-purple-400 border border-purple-700/40'
                  }`}>
                    {equipo.tipo_adquisicion === 'recurso_propio' ? 'Recurso Propio' :
                     equipo.tipo_adquisicion === 'contrato_consolidado' ? 'Consolidado' :
                     equipo.tipo_adquisicion === 'garantia' ? 'Garantía' :
                     equipo.tipo_adquisicion === 'subrogado' ? 'Subrogado' : 'Recurso Propio'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--content-muted)] text-xs block">N° Contrato / Servicio</span>
                  <span className="text-[var(--content-text)] font-medium block mt-1">{equipo.numero_contrato_servicio || equipo.numero_contrato || '—'}</span>
                </div>
                {equipo.proveedor_servicio && (
                  <div className="col-span-2">
                    <span className="text-[var(--content-muted)] text-xs block">Proveedor del Servicio</span>
                    <span className="text-[var(--content-text)] block mt-1">{equipo.proveedor_servicio}</span>
                  </div>
                )}
                {/* S9: Aviso prominente de imagen referencial dentro del bloque Contrato */}
                {equipo.imagen_referencial && (
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-amber-300 text-xs font-semibold leading-snug">
                      IMAGEN REFERENCIAL — Esta foto NO es del equipo real, se descargó de internet por marca/modelo con marca de agua.
                    </span>
                  </div>
                )}
                {equipo.contrato_pdf_url && (
                  <div className="col-span-2">
                    <a
                      href={equipo.contrato_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium text-xs bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      📂 Ver Documento de Contrato (PDF/Imagen)
                    </a>
                  </div>
                )}
                {(() => {
                  try {
                    if (equipo.hojas_servicio_urls) {
                      const urls = JSON.parse(equipo.hojas_servicio_urls);
                      if (urls && urls.length > 0) {
                        return (
                          <div className="col-span-2 space-y-2">
                            <span className="text-[var(--content-muted)] text-xs block">Hojas de Servicio Asociadas</span>
                            <div className="flex flex-wrap gap-2">
                              {urls.map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  📄 Hoja de Servicio #{index + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    }
                  } catch (e) {
                    console.error("Error parsing hojas_servicio_urls:", e);
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Próximo Mantenimiento — vista de calendario (petición Gustavo, punto 5) */}
            <div className="bg-[var(--content-bg)]/30 border border-[var(--content-border)]/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--content-muted)] flex items-center gap-2 mb-3">
                🗓️ Próximo Mantenimiento
              </h3>
              <CalendarioMantenimiento fecha={equipo.fecha_proximo_mantenimiento} />
            </div>

            {/* Galería de imágenes (S8: siempre visible si hay ≥1 imagen) */}
            {allImages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Galería de Imágenes
                  <span className="text-xs font-normal text-[var(--content-muted)]">
                    ({allImages.length} {allImages.length === 1 ? 'foto' : 'fotos'})
                  </span>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((foto, idx) => (
                    <button
                      key={`${foto}-${idx}`}
                      type="button"
                      onClick={() => { setLightboxStart(idx); setLightboxOpen(true); }}
                      aria-label={`Ver foto ${idx + 1} de ${allImages.length} en pantalla completa`}
                      className="relative flex-shrink-0 w-24 h-24 bg-black rounded-lg overflow-hidden border border-[var(--content-border)] hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-lg transition-colors group"
                    >
                      <img
                        src={foto}
                        alt=""
                        loading="lazy"
                        className="object-cover w-full h-full group-hover:opacity-75 transition-opacity"
                        onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                      />
                      <span className="absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--content-muted)] mt-2">
                  Click en cualquier miniatura abre el visor. Teclado: ← / → navegar, + / − zoom, 0 reset, Esc cerrar.
                </p>
              </div>
            )}
            {/* S8 placeholder cuando NO hay ninguna imagen */}
            {allImages.length === 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Galería de Imágenes
                </h3>
                <div className="bg-[var(--content-bg)]/30 border border-dashed border-[var(--content-border)] rounded-lg p-6 text-center">
                  <p className="text-[var(--content-muted)] text-sm">Sin imágenes disponibles</p>
                  <p className="text-[var(--content-muted)] text-xs mt-1">Este equipo no tiene foto principal ni fotos adicionales registradas.</p>
                </div>
              </div>
            )}

            {/* Contrato y Documentos (Expediente del Equipo) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--content-muted)]">Contrato y Documentos</h3>
                {documentos.length > 0 && (
                  <span className="text-xs text-[var(--content-muted)]">{documentos.length} archivo{documentos.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              {documentos.length === 0 ? (
                <p className="text-[var(--content-muted)] text-sm">Sin documentos anexos</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {documentos.map((doc) => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-2 rounded-lg border border-[var(--content-muted)]/20 hover:bg-black/5 text-sm">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--content-muted)]/30">{doc.formato}</span>
                      <span className="flex-1 truncate">{doc.clase} · {doc.nombre}</span>
                      <span className="text-[var(--content-muted)]">&#8599;</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

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
                                className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                title="Abrir PDF original"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
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
                      <span className="text-[var(--content-text)]">
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
              className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setNuevaOrdenAbierta(true)}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                🎫 Nueva OS
              </button>
              <button
                type="button"
                onClick={() => setHistorialAbierto(true)}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                🕒 Historial
              </button>
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                📱 QR
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm rounded-lg transition-colors"
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
          onUpdated={recargarHistorial}
        />
      )}

      {/* Acción rápida: crear Orden de Servicio para este equipo sin salir del detalle */}
      {nuevaOrdenAbierta && (
        <OrdenServicioRapidaModal
          equipo={equipo}
          onClose={() => setNuevaOrdenAbierta(false)}
          onCreada={() => {
            setNuevaOrdenAbierta(false);
            recargarHistorial();
          }}
        />
      )}

      {/* Acción rápida: historial técnico completo (incluye preventivos, no visible en este resumen) */}
      {historialAbierto && (
        <HistorialEquipoModal
          equipo={equipo}
          onClose={() => setHistorialAbierto(false)}
        />
      )}

      {/* Lightbox de fotos (S7 + S8 sprint 2026-06-27) */}
      {lightboxOpen && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          startIndex={Math.min(lightboxStart, allImages.length - 1)}
          referencial={!!equipo.imagen_referencial}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

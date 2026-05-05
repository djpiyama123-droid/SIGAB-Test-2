import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import OCRScannerModal from './OCRScannerModal';
import { useToast } from './Toast';

export default function OrdenDetalleModal({ ordenId, onClose, onUpdated }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Evidencias
  const [evidenciaFile, setEvidenciaFile] = useState(null);
  const [evidenciaTipo, setEvidenciaTipo] = useState('antes');
  const [subiendo, setSubiendo] = useState(false);

  // Finalizar / Cerrar
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [formFinal, setFormFinal] = useState({
    condiciones_encontradas: '',
    condicion_final: '',
    observaciones: '',
    recibe_conformidad_nombre: '',
    recibe_conformidad_matricula: ''
  });

  const handleOCRExtracted = (datos) => {
    setShowFinalizar(true);
    setFormFinal(f => ({
        ...f,
        condiciones_encontradas: `Datos OCR:\nFolio Externo: ${datos.folio || 'N/A'}\nCosto: $${datos.costo || '0.00'}\nIngeniero Asignado: ${datos.ingeniero_externo || 'N/A'}`,
        observaciones: `Piezas/Refacciones:\n${datos.refacciones || 'Servicio de mantenimiento externo.'}`,
        condicion_final: 'Operativo, en conformidad con proveedor externo.',
    }));
  };

  useEffect(() => {
    cargarOrden();
  }, [ordenId]);

  const cargarOrden = async () => {
    try {
      const res = await api.getOrden(ordenId);
      setData(res);
      setFormFinal({
        condiciones_encontradas: res.orden.condiciones_encontradas || '',
        condicion_final: res.orden.condicion_final || '',
        observaciones: res.orden.observaciones || '',
        recibe_conformidad_nombre: res.orden.recibe_conformidad_nombre || '',
        recibe_conformidad_matricula: res.orden.recibe_conformidad_matricula || ''
      });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el detalle de la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleEstado = async (estado) => {
    const tid = toast.loading(estado === 'en_progreso' ? 'Iniciando trabajo…' : 'Actualizando estado…');
    try {
      await api.cambiarEstadoOrden(ordenId, estado);
      toast.success(estado === 'en_progreso' ? 'Trabajo iniciado' : 'Estado actualizado', { id: tid });
      cargarOrden();
      onUpdated();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'No se pudo actualizar el estado', { id: tid });
    }
  };

  const handleSubirEvidencia = async (e) => {
    e.preventDefault();
    if (!evidenciaFile) {
      toast.warn('Selecciona una imagen antes de subir');
      return;
    }
    setSubiendo(true);
    const tid = toast.loading('Subiendo evidencia…');
    try {
      await api.subirEvidenciaOrden(ordenId, evidenciaTipo, '', evidenciaFile);
      setEvidenciaFile(null);
      toast.success(`Evidencia "${evidenciaTipo}" subida`, { id: tid });
      cargarOrden();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Error al subir evidencia', { id: tid });
    } finally {
      setSubiendo(false);
    }
  };

  const handleFinalizar = async (e) => {
    e.preventDefault();
    if (!formFinal.condiciones_encontradas.trim() || !formFinal.observaciones.trim() || !formFinal.condicion_final.trim()) {
      toast.warn('Completa las condiciones, trabajo realizado y condición final');
      return;
    }
    if (!formFinal.recibe_conformidad_nombre.trim()) {
      toast.warn('Indica quién recibe la conformidad');
      return;
    }
    const tid = toast.loading('Cerrando y firmando orden…');
    try {
      await api.finalizarOrden(ordenId, formFinal);
      toast.success('Orden cerrada correctamente', { id: tid });
      setShowFinalizar(false);
      cargarOrden();
      onUpdated();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Error al finalizar orden', { id: tid });
    }
  };

  const handleImprimir = () => {
    try {
      const url = api.getPdfOrdenUrl(ordenId);
      const token = localStorage.getItem('token');
      window.open(`${url}?token=${token}`, '_blank');
      toast.info('Abriendo PDF de la orden…');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo abrir el PDF');
    }
  };

  if (loading || !data) {
    return (
      <div className="sigab-v2 fixed inset-0 z-50 bg-cobalt-900/40 backdrop-blur-[2px] flex items-center justify-center">
        <div className="text-cobalt-100 font-sigabBody">Cargando detalles...</div>
      </div>
    );
  }

  const { orden, evidencias, materiales } = data;

  const Timeline = ({ estado }) => {
    const steps = ['abierta', 'en_progreso', 'cerrada'];
    const idx = steps.indexOf(estado === 'cancelada' ? 'abierta' : estado);
    return (
      <div className="flex items-center gap-2 my-4">
        {steps.map((st, i) => (
          <div key={st} className="flex items-center gap-2">
            <div className={`px-2 py-1 text-xs font-semibold rounded-full ${i <= idx ? 'bg-teal2-500 text-white' : 'bg-sigab-surface-alt text-sigab-text-muted border border-sigab-border'}`}>
              {st.replace('_', ' ').toUpperCase()}
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-1 ${i < idx ? 'bg-teal2-500' : 'bg-sigab-border'}`} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="sigab-v2 fixed inset-0 z-50 bg-cobalt-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-[var(--sigab-radius-lg)] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[var(--sigab-shadow-lg)] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-cobalt-100 sticky top-0 bg-white z-10 rounded-t-[var(--sigab-radius-lg)]">
          <div>
            <h2 className="text-lg font-sigabHead font-bold text-cobalt-900 flex items-center gap-3">
              Orden {orden.numero_orden}
              {orden.estado === 'cancelada' && <span className="text-xs bg-rose-600 px-2 py-0.5 rounded text-white font-sigabBody">CANCELADA</span>}
            </h2>
            <p className="text-sm text-sigab-text-muted mt-1 font-sigabBody">{orden.equipo_nombre} - Serie: {orden.equipo_serie}</p>
          </div>
          <div className="flex gap-2 font-sigabBody">
            <button onClick={handleImprimir} className="px-3 py-1.5 bg-cobalt-50 text-cobalt-700 hover:bg-cobalt-100 font-semibold text-sm rounded-[var(--sigab-radius-sm)] flex items-center gap-1 transition-colors">
              🖨️ PDF
            </button>
            <button onClick={onClose} className="p-2 text-sigab-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-[var(--sigab-radius-sm)]">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Timeline estado={orden.estado} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sigabBody">
            <div className="space-y-4">
              <div className="bg-sigab-surface-alt p-5 rounded-[var(--sigab-radius-lg)] border border-sigab-border shadow-sm">
                <h3 className="text-sm font-semibold text-teal2-600 mb-2 font-sigabHead">Detalles del Fallo</h3>
                <p className="text-sm text-sigab-text">{orden.falla_reportada}</p>
              </div>
              
              <div className="bg-sigab-surface-alt p-5 rounded-[var(--sigab-radius-lg)] border border-sigab-border shadow-sm">
                <h3 className="text-sm font-semibold text-cobalt-600 mb-2 font-sigabHead">Información</h3>
                <ul className="text-sm text-sigab-text space-y-1">
                  <li><strong className="font-semibold">Técnico:</strong> {orden.tecnico_nombre}</li>
                  <li><strong className="font-semibold">Fecha:</strong> {orden.fecha}</li>
                  <li><strong className="font-semibold">Formato IMSS:</strong> <span className="uppercase text-amber-600 font-semibold text-xs ml-1">{orden.tipo_formato.replace('_', ' ')}</span></li>
                </ul>
                {(orden.tipo_atencion === 'contrato' || orden.tipo_atencion === 'garantia') && orden.estado !== 'cerrada' && (
                  <button onClick={() => setShowOCR(true)} className="mt-4 w-full py-2 bg-white hover:bg-teal2-50 border border-teal2-500/50 text-teal2-700 rounded-[var(--sigab-radius-md)] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                    <span>✨</span> Escanear Reporte Físico (IA)
                  </button>
                )}
              </div>

              {orden.estado !== 'cerrada' && orden.estado !== 'cancelada' && !showFinalizar && (
                <div className="flex gap-2 mt-4">
                  {orden.estado === 'abierta' && (
                    <button onClick={() => handleEstado('en_progreso')} className="flex-1 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-[var(--sigab-radius-md)] text-sm font-semibold transition-colors hover:bg-amber-100">
                      ▶ Iniciar Trabajo
                    </button>
                  )}
                  {orden.estado === 'en_progreso' && (
                    <button onClick={() => setShowFinalizar(true)} className="flex-1 py-2 bg-teal2-500 hover:bg-teal2-600 text-white rounded-[var(--sigab-radius-md)] text-sm font-semibold transition-colors shadow-sm">
                      ✔ Finalizar y Cerrar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-sigab-surface-alt p-5 rounded-[var(--sigab-radius-lg)] border border-sigab-border shadow-sm">
                <h3 className="text-sm font-semibold text-cobalt-900 mb-3 font-sigabHead">Evidencias Fotográficas</h3>
                <div className="flex gap-3 overflow-x-auto pb-3">
                  {evidencias.length === 0 ? <p className="text-xs text-sigab-text-muted">Sin evidencias aún</p> : 
                    evidencias.map(ev => {
                      const isPDF = ev.ruta_archivo?.toLowerCase().endsWith('.pdf');
                      return (
                        <div key={ev.id} 
                             onClick={() => window.open(ev.ruta_archivo, '_blank')}
                             className="relative flex-shrink-0 w-24 h-24 bg-sigab-surface rounded-[var(--sigab-radius-sm)] overflow-hidden group cursor-pointer border border-sigab-border hover:border-teal2-500 shadow-sm transition-all">
                          {isPDF ? (
                            <div className="flex flex-col items-center justify-center w-full h-full bg-sigab-surface-alt text-sigab-text group-hover:bg-teal2-50 transition-colors">
                               <span className="text-3xl mb-1">📄</span>
                               <span className="text-[9px] text-center px-1 truncate w-full text-sigab-text-muted group-hover:text-teal2-700 font-semibold" title={ev.ruta_archivo.split('/').pop()}>
                                 {ev.ruta_archivo.split('/').pop()}
                               </span>
                            </div>
                          ) : (
                            <img src={ev.ruta_archivo} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" alt={ev.tipo} />
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-cobalt-900/80 backdrop-blur-sm text-[10px] text-white text-center py-1 uppercase tracking-wide font-semibold">
                            {ev.tipo}
                          </div>
                        </div>
                      );
                  })}
                </div>
                {orden.estado !== 'cerrada' && (
                  <form onSubmit={handleSubirEvidencia} className="mt-4 flex gap-2 items-center bg-white p-2 rounded-[var(--sigab-radius-md)] border border-sigab-border">
                    <select value={evidenciaTipo} onChange={e => setEvidenciaTipo(e.target.value)} className="bg-transparent border-none text-xs text-sigab-text font-semibold focus:outline-none focus:ring-0">
                      <option value="antes">Antes</option>
                      <option value="durante">Durante</option>
                      <option value="despues">Después</option>
                    </select>
                    <input type="file" accept="image/*" onChange={e => setEvidenciaFile(e.target.files[0])} className="text-xs text-sigab-text-muted w-full flex-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-cobalt-50 file:text-cobalt-700 hover:file:bg-cobalt-100" />
                    <button disabled={!evidenciaFile || subiendo} className="px-3 py-1.5 bg-cobalt-600 text-white text-xs font-semibold rounded-[var(--sigab-radius-sm)] hover:bg-cobalt-700 disabled:opacity-50 transition-colors">
                      {subiendo ? 'Subiendo...' : 'Subir'}
                    </button>
                  </form>
                )}
              </div>

              {showFinalizar && (
                <form onSubmit={handleFinalizar} className="bg-teal2-50 border border-teal2-200 p-5 rounded-[var(--sigab-radius-lg)] space-y-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-teal2-800 font-sigabHead">Datos de Cierre e Inspección</h3>
                  <textarea placeholder="Condiciones Encontradas..." required value={formFinal.condiciones_encontradas} onChange={e=>setFormFinal(f=>({...f, condiciones_encontradas: e.target.value}))} className="w-full bg-white border border-sigab-border text-xs text-sigab-text p-2.5 rounded-[var(--sigab-radius-md)] focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
                  <textarea placeholder="Trabajo / Descripción del Servicio / Partes Reemplazadas..." required value={formFinal.observaciones} onChange={e=>setFormFinal(f=>({...f, observaciones: e.target.value}))} className="w-full bg-white border border-sigab-border text-xs text-sigab-text p-2.5 rounded-[var(--sigab-radius-md)] focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
                  <textarea placeholder="Condiciones Finales Operativas..." required value={formFinal.condicion_final} onChange={e=>setFormFinal(f=>({...f, condicion_final: e.target.value}))} className="w-full bg-white border border-sigab-border text-xs text-sigab-text p-2.5 rounded-[var(--sigab-radius-md)] focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
                  <div className="flex gap-3">
                    <input type="text" placeholder="Recibido Por (Nombre)" required value={formFinal.recibe_conformidad_nombre} onChange={e=>setFormFinal(f=>({...f, recibe_conformidad_nombre: e.target.value}))} className="w-1/2 bg-white border border-sigab-border text-xs text-sigab-text p-2.5 rounded-[var(--sigab-radius-md)] focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
                    <input type="text" placeholder="Matrícula" value={formFinal.recibe_conformidad_matricula} onChange={e=>setFormFinal(f=>({...f, recibe_conformidad_matricula: e.target.value}))} className="w-1/2 bg-white border border-sigab-border text-xs text-sigab-text p-2.5 rounded-[var(--sigab-radius-md)] focus:outline-none focus:ring-2 focus:ring-teal2-500/50" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setShowFinalizar(false)} className="flex-1 py-2 bg-white border border-sigab-border text-sigab-text-muted font-semibold rounded-[var(--sigab-radius-md)] text-sm hover:bg-sigab-surface transition-colors shadow-sm">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-teal2-600 text-white font-semibold rounded-[var(--sigab-radius-md)] text-sm hover:bg-teal2-700 transition-colors shadow-sm">Firmar y Cerrar</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      {showOCR && <OCRScannerModal onClose={() => setShowOCR(false)} onConfirm={handleOCRExtracted} />}
    </div>
  );
}

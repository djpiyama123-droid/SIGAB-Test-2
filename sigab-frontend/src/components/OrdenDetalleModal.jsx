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
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
        <div className="text-white">Cargando detalles...</div>
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
            <div className={`px-2 py-1 text-xs font-semibold rounded-full ${i <= idx ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {st.replace('_', ' ').toUpperCase()}
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-1 ${i < idx ? 'bg-emerald-600' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              Orden {orden.numero_orden}
              {orden.estado === 'cancelada' && <span className="text-xs bg-red-600 px-2 py-0.5 rounded text-white">CANCELADA</span>}
            </h2>
            <p className="text-sm text-slate-400">{orden.equipo_nombre} - Serie: {orden.equipo_serie}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleImprimir} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg flex items-center gap-1">
              🖨️ PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Timeline estado={orden.estado} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">Detalles del Fallo</h3>
                <p className="text-sm text-slate-300">{orden.falla_reportada}</p>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Información</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li><strong>Técnico:</strong> {orden.tecnico_nombre}</li>
                  <li><strong>Fecha:</strong> {orden.fecha}</li>
                  <li><strong>Formato IMSS:</strong> <span className="uppercase text-yellow-400 text-xs">{orden.tipo_formato.replace('_', ' ')}</span></li>
                </ul>
                {(orden.tipo_atencion === 'contrato' || orden.tipo_atencion === 'garantia') && orden.estado !== 'cerrada' && (
                  <button onClick={() => setShowOCR(true)} className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] flex items-center justify-center gap-2">
                    <span>✨</span> Escanear Reporte Físico (IA)
                  </button>
                )}
              </div>

              {orden.estado !== 'cerrada' && orden.estado !== 'cancelada' && !showFinalizar && (
                <div className="flex gap-2">
                  {orden.estado === 'abierta' && (
                    <button onClick={() => handleEstado('en_progreso')} className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-semibold transition-colors">
                      ▶ Iniciar Trabajo
                    </button>
                  )}
                  {orden.estado === 'en_progreso' && (
                    <button onClick={() => setShowFinalizar(true)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
                      ✔ Finalizar y Cerrar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Evidencias Fotográficas</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {evidencias.length === 0 ? <p className="text-xs text-slate-500">Sin evidencias aún</p> : 
                    evidencias.map(ev => {
                      const isPDF = ev.ruta_archivo?.toLowerCase().endsWith('.pdf');
                      return (
                        <div key={ev.id} 
                             onClick={() => window.open(ev.ruta_archivo, '_blank')}
                             className="relative flex-shrink-0 w-24 h-24 bg-black rounded overflow-hidden group cursor-pointer border border-transparent hover:border-emerald-500 transition-colors">
                          {isPDF ? (
                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition-colors">
                               <span className="text-3xl mb-1">📄</span>
                               <span className="text-[9px] text-center px-1 truncate w-full text-slate-400 group-hover:text-white" title={ev.ruta_archivo.split('/').pop()}>
                                 {ev.ruta_archivo.split('/').pop()}
                               </span>
                            </div>
                          ) : (
                            <img src={ev.ruta_archivo} className="object-cover w-full h-full group-hover:opacity-75 transition-opacity" alt={ev.tipo} />
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center p-0.5 uppercase tracking-wide">
                            {ev.tipo}
                          </div>
                        </div>
                      );
                  })}
                </div>
                {orden.estado !== 'cerrada' && (
                  <form onSubmit={handleSubirEvidencia} className="mt-3 flex gap-2 items-center">
                    <select value={evidenciaTipo} onChange={e => setEvidenciaTipo(e.target.value)} className="bg-slate-800 border bg-slate-700 text-xs text-white p-1.5 rounded">
                      <option value="antes">Antes</option>
                      <option value="durante">Durante</option>
                      <option value="despues">Después</option>
                    </select>
                    <input type="file" accept="image/*" onChange={e => setEvidenciaFile(e.target.files[0])} className="text-xs text-slate-400 w-full" />
                    <button disabled={!evidenciaFile || subiendo} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 disabled:opacity-50">
                      {subiendo ? 'Subiendo' : 'Subir'}
                    </button>
                  </form>
                )}
              </div>

              {showFinalizar && (
                <form onSubmit={handleFinalizar} className="bg-slate-900 border border-emerald-500/50 p-4 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-400">Datos de Cierre e Inspección</h3>
                  <textarea placeholder="Condiciones Encontradas..." required value={formFinal.condiciones_encontradas} onChange={e=>setFormFinal(f=>({...f, condiciones_encontradas: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                  <textarea placeholder="Trabajo / Descripción del Servicio / Partes Reemplazadas..." required value={formFinal.observaciones} onChange={e=>setFormFinal(f=>({...f, observaciones: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                  <textarea placeholder="Condiciones Finales Operativas..." required value={formFinal.condicion_final} onChange={e=>setFormFinal(f=>({...f, condicion_final: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Recibido Por (Nombre)" required value={formFinal.recibe_conformidad_nombre} onChange={e=>setFormFinal(f=>({...f, recibe_conformidad_nombre: e.target.value}))} className="w-1/2 bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                    <input type="text" placeholder="Matrícula" value={formFinal.recibe_conformidad_matricula} onChange={e=>setFormFinal(f=>({...f, recibe_conformidad_matricula: e.target.value}))} className="w-1/2 bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setShowFinalizar(false)} className="flex-1 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-600">Cancelar</button>
                    <button type="submit" className="flex-1 py-1.5 bg-emerald-600 text-white font-semibold rounded text-sm hover:bg-emerald-500">Firmar y Cerrar</button>
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

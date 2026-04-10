import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { TV_ESTADO_COLORS, TV_SEVERIDAD_COLORS, TV_TIPO_LABELS, TV_ESTADO_LABELS } from '../utils/constants';
import toast from 'react-hot-toast';

const TIMELINE_STEPS = ['reportado', 'en_investigacion', 'documentado', 'escalado_cofepris', 'cerrado'];
const TIPO_EVIDENCIA_OPTS = ['foto_dispositivo', 'reporte_clinico', 'bitacora', 'comunicacion_fabricante', 'otro'];

export default function EventoDetalleModal({ eventoId, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Paneles de accion
  const [showInvestigar, setShowInvestigar] = useState(false);
  const [showEscalar, setShowEscalar] = useState(false);
  const [showCerrar, setShowCerrar] = useState(false);
  const [formInv, setFormInv] = useState({ hallazgos: '', causa_raiz: '', estado: 'en_investigacion' });
  const [folioCofepris, setFolioCofepris] = useState('');
  const [conclusion, setConclusion] = useState('');

  // Evidencias
  const [evidFile, setEvidFile] = useState(null);
  const [evidTipo, setEvidTipo] = useState('foto_dispositivo');
  const [evidDesc, setEvidDesc] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => { cargarEvento(); }, [eventoId]);

  const cargarEvento = async () => {
    try {
      const res = await api.getEvento(eventoId);
      setData(res);
      if (res.evento) {
        setFormInv({
          hallazgos: res.evento.hallazgos || '',
          causa_raiz: res.evento.causa_raiz || '',
          estado: res.evento.estado === 'reportado' ? 'en_investigacion' : 'documentado',
        });
        setConclusion(res.evento.conclusion || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPdf = async () => {
    const tid = toast.loading('Generando PDF NOM-240...');
    try {
      const blob = await api.descargarPdfNom240(eventoId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('PDF generado', { id: tid });
    } catch (err) {
      toast.error('Error al generar PDF', { id: tid });
    }
  };

  const handleInvestigar = async () => {
    const tid = toast.loading('Guardando investigacion...');
    try {
      await api.investigarEvento(eventoId, formInv);
      toast.success('Investigacion registrada', { id: tid });
      setShowInvestigar(false);
      cargarEvento();
      onUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error', { id: tid });
    }
  };

  const handleEscalar = async () => {
    const tid = toast.loading('Escalando a COFEPRIS...');
    try {
      await api.escalarEvento(eventoId, folioCofepris);
      toast.success('Escalado a COFEPRIS', { id: tid });
      setShowEscalar(false);
      cargarEvento();
      onUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error', { id: tid });
    }
  };

  const handleCerrar = async () => {
    const tid = toast.loading('Cerrando reporte...');
    try {
      await api.cerrarEvento(eventoId, conclusion);
      toast.success('Reporte cerrado', { id: tid });
      setShowCerrar(false);
      cargarEvento();
      onUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error', { id: tid });
    }
  };

  const handleCancelar = async () => {
    if (!window.confirm('Esta seguro de cancelar este reporte? Esta accion no se puede revertir.')) return;
    const tid = toast.loading('Cancelando...');
    try {
      await api.cambiarEstadoEvento(eventoId, 'cancelado');
      toast.success('Reporte cancelado', { id: tid });
      cargarEvento();
      onUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error', { id: tid });
    }
  };

  const handleSubirEvidencia = async (e) => {
    e.preventDefault();
    if (!evidFile) return;
    setSubiendo(true);
    try {
      await api.subirEvidenciaEvento(eventoId, evidTipo, evidDesc, evidFile);
      setEvidFile(null);
      setEvidDesc('');
      cargarEvento();
    } catch (err) {
      console.error(err);
    } finally {
      setSubiendo(false);
    }
  };

  const formatFecha = (f) => {
    if (!f) return '—';
    try {
      return new Date(f).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return String(f); }
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
        <div className="text-white">Cargando detalles...</div>
      </div>
    );
  }

  const { evento, evidencias } = data;
  const estado = evento.estado;
  const isTerminal = estado === 'cerrado' || estado === 'cancelado';

  // Timeline
  const Timeline = () => {
    const idx = TIMELINE_STEPS.indexOf(estado === 'cancelado' ? 'reportado' : estado);
    return (
      <div className="flex items-center gap-1">
        {TIMELINE_STEPS.map((st, i) => (
          <div key={st} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 text-center px-1 py-1.5 text-[10px] font-semibold rounded-md whitespace-nowrap ${
              i <= idx ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' :
              'bg-slate-700/50 text-slate-500'
            }`}>
              {TV_ESTADO_LABELS[st]?.replace('Escalado COFEPRIS', 'COFEPRIS') || st}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`w-4 h-0.5 flex-shrink-0 ${i < idx ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {evento.numero_reporte}
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TV_SEVERIDAD_COLORS[evento.severidad] || ''}`}>
                  {evento.severidad?.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${TV_ESTADO_COLORS[estado] || ''}`}>
                  {TV_ESTADO_LABELS[estado]}
                </span>
                {estado === 'cancelado' && (
                  <span className="text-xs bg-red-600 px-2 py-0.5 rounded text-white">CANCELADO</span>
                )}
              </h2>
              <p className="text-sm text-slate-400">{evento.dispositivo_nombre}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDescargarPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg flex items-center gap-1">
              PDF NOM-240
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Timeline */}
          <Timeline />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── Panel izquierdo ── */}
            <div className="space-y-4">
              {/* Dispositivo */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">Dispositivo medico (snapshot)</h3>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  {[
                    ['Nombre', evento.dispositivo_nombre],
                    ['Marca', evento.dispositivo_marca],
                    ['Modelo', evento.dispositivo_modelo],
                    ['Serie', evento.dispositivo_serie],
                    ['Lote', evento.dispositivo_lote],
                    ['Reg. sanitario', evento.dispositivo_registro_sanitario],
                    ['Estado post-evento', evento.dispositivo_estado_post],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <span className="text-slate-500">{label}: </span>
                      <span className="text-slate-300">{val || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clasificacion */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Clasificacion</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Tipo: </span>
                    <span className="text-white">{TV_TIPO_LABELS[evento.tipo_evento] || evento.tipo_evento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Severidad: </span>
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${TV_SEVERIDAD_COLORS[evento.severidad] || ''}`}>
                      {evento.severidad?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fecha evento: </span>
                    <span className="text-slate-300">{formatFecha(evento.fecha_evento)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lugar: </span>
                    <span className="text-slate-300">{evento.lugar_evento || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Descripcion */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1">Descripcion del evento</h4>
                  <p className="text-sm text-slate-300">{evento.descripcion_evento}</p>
                </div>
                {evento.consecuencia_clinica && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Consecuencia clinica</h4>
                    <p className="text-sm text-slate-300">{evento.consecuencia_clinica}</p>
                  </div>
                )}
                {evento.accion_correctiva && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Accion correctiva</h4>
                    <p className="text-sm text-slate-300">{evento.accion_correctiva}</p>
                  </div>
                )}
              </div>

              {/* Paciente */}
              {evento.paciente_sexo !== 'no_aplica' && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-xs font-semibold text-yellow-400 mb-1">Paciente (anonimizado)</h3>
                  <div className="text-xs text-slate-400">
                    Sexo: <span className="text-slate-300">
                      {{ M: 'Masculino', F: 'Femenino', otro: 'Otro' }[evento.paciente_sexo] || 'N/A'}
                    </span>
                    {evento.paciente_edad && (
                      <> | Edad: <span className="text-slate-300">{evento.paciente_edad} anios</span></>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Panel derecho ── */}
            <div className="space-y-4">
              {/* Investigacion */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-purple-400 mb-2">Investigacion</h3>
                {evento.hallazgos || evento.causa_raiz ? (
                  <div className="space-y-2 text-xs">
                    {evento.investigador_nombre && (
                      <p className="text-slate-400">Investigador: <span className="text-slate-300">{evento.investigador_nombre}</span></p>
                    )}
                    {evento.fecha_investigacion && (
                      <p className="text-slate-400">Fecha: <span className="text-slate-300">{formatFecha(evento.fecha_investigacion)}</span></p>
                    )}
                    {evento.hallazgos && (
                      <div>
                        <h4 className="text-slate-400 font-semibold">Hallazgos</h4>
                        <p className="text-slate-300 mt-0.5">{evento.hallazgos}</p>
                      </div>
                    )}
                    {evento.causa_raiz && (
                      <div>
                        <h4 className="text-slate-400 font-semibold">Causa raiz</h4>
                        <p className="text-slate-300 mt-0.5">{evento.causa_raiz}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sin investigacion aun.</p>
                )}
              </div>

              {/* Escalado COFEPRIS */}
              {evento.enviado_cofepris && (
                <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-500/30">
                  <h3 className="text-sm font-semibold text-orange-400 mb-2">Escalado COFEPRIS</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Folio: <span className="text-orange-300 font-mono">{evento.folio_cofepris || 'Pendiente'}</span></p>
                    <p>Fecha envio: <span className="text-slate-300">{formatFecha(evento.fecha_envio_cofepris)}</span></p>
                  </div>
                </div>
              )}

              {/* Cierre */}
              {evento.conclusion && (
                <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/30">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2">Conclusion y cierre</h3>
                  <p className="text-xs text-slate-300">{evento.conclusion}</p>
                  <p className="text-xs text-slate-500 mt-1">Cerrado: {formatFecha(evento.fecha_cierre)}</p>
                </div>
              )}

              {/* Evidencias */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Evidencias</h3>
                {evidencias.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin evidencias aun</p>
                ) : (
                  <div className="space-y-2">
                    {evidencias.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2 text-xs bg-slate-800 rounded p-2">
                        {ev.ruta_archivo?.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                          <img src={ev.ruta_archivo} className="w-10 h-10 object-cover rounded" alt={ev.tipo} />
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-[10px]">
                            DOC
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="text-slate-400 uppercase tracking-wide text-[10px]">{ev.tipo}</span>
                          {ev.descripcion && <p className="text-slate-300">{ev.descripcion}</p>}
                          {ev.subido_por_nombre && <p className="text-slate-500">por {ev.subido_por_nombre}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isTerminal && (
                  <form onSubmit={handleSubirEvidencia} className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                    <div className="flex gap-2">
                      <select value={evidTipo} onChange={(e) => setEvidTipo(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-xs text-white p-1.5 rounded">
                        {TIPO_EVIDENCIA_OPTS.map((t) => (
                          <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="Descripcion..." value={evidDesc}
                        onChange={(e) => setEvidDesc(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 text-xs text-white px-2 py-1.5 rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input type="file" accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => setEvidFile(e.target.files[0])}
                        className="text-xs text-slate-400 flex-1" />
                      <button disabled={!evidFile || subiendo}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 disabled:opacity-50">
                        {subiendo ? 'Subiendo...' : 'Subir'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ── Botones de accion contextuales ── */}
              {!isTerminal && (
                <div className="space-y-2">
                  {/* Iniciar investigacion */}
                  {estado === 'reportado' && !showInvestigar && (
                    <button onClick={() => setShowInvestigar(true)}
                      className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded-lg transition-colors">
                      Iniciar investigacion
                    </button>
                  )}

                  {/* Marcar como documentado */}
                  {estado === 'en_investigacion' && !showInvestigar && (
                    <button onClick={() => { setFormInv(f => ({ ...f, estado: 'documentado' })); setShowInvestigar(true); }}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors">
                      Documentar investigacion
                    </button>
                  )}

                  {/* Form investigacion */}
                  {showInvestigar && (
                    <div className="bg-slate-900 border border-yellow-500/30 p-4 rounded-lg space-y-3">
                      <h4 className="text-sm font-semibold text-yellow-400">
                        {formInv.estado === 'en_investigacion' ? 'Iniciar investigacion' : 'Documentar hallazgos'}
                      </h4>
                      <textarea rows={3} value={formInv.hallazgos}
                        onChange={(e) => setFormInv(f => ({ ...f, hallazgos: e.target.value }))}
                        placeholder="Hallazgos de la investigacion..."
                        className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                      <textarea rows={2} value={formInv.causa_raiz}
                        onChange={(e) => setFormInv(f => ({ ...f, causa_raiz: e.target.value }))}
                        placeholder="Causa raiz identificada..."
                        className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowInvestigar(false)}
                          className="flex-1 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-600">Cancelar</button>
                        <button onClick={handleInvestigar}
                          className="flex-1 py-1.5 bg-yellow-600 text-white font-semibold rounded text-sm hover:bg-yellow-500">Guardar</button>
                      </div>
                    </div>
                  )}

                  {/* Escalar a COFEPRIS */}
                  {estado === 'documentado' && !showEscalar && !showCerrar && (
                    <button onClick={() => setShowEscalar(true)}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors">
                      Escalar a COFEPRIS
                    </button>
                  )}

                  {showEscalar && (
                    <div className="bg-slate-900 border border-orange-500/30 p-4 rounded-lg space-y-3">
                      <h4 className="text-sm font-semibold text-orange-400">Escalar a COFEPRIS</h4>
                      <input type="text" value={folioCofepris}
                        onChange={(e) => setFolioCofepris(e.target.value)}
                        placeholder="Folio COFEPRIS (opcional, se puede agregar despues)"
                        className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowEscalar(false)}
                          className="flex-1 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-600">Cancelar</button>
                        <button onClick={handleEscalar}
                          className="flex-1 py-1.5 bg-orange-600 text-white font-semibold rounded text-sm hover:bg-orange-500">Escalar</button>
                      </div>
                    </div>
                  )}

                  {/* Cerrar reporte */}
                  {(estado === 'documentado' || estado === 'escalado_cofepris') && !showCerrar && !showEscalar && (
                    <button onClick={() => setShowCerrar(true)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
                      Cerrar reporte
                    </button>
                  )}

                  {showCerrar && (
                    <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-lg space-y-3">
                      <h4 className="text-sm font-semibold text-emerald-400">Cerrar reporte</h4>
                      <textarea rows={3} value={conclusion}
                        onChange={(e) => setConclusion(e.target.value)}
                        placeholder="Conclusion final del reporte..."
                        className="w-full bg-slate-800 border border-slate-600 text-xs text-white p-2 rounded" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowCerrar(false)}
                          className="flex-1 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-600">Cancelar</button>
                        <button onClick={handleCerrar}
                          className="flex-1 py-1.5 bg-emerald-600 text-white font-semibold rounded text-sm hover:bg-emerald-500">Cerrar</button>
                      </div>
                    </div>
                  )}

                  {/* Cancelar reporte */}
                  {!isTerminal && !showInvestigar && !showEscalar && !showCerrar && (
                    <button onClick={handleCancelar}
                      className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs rounded-lg transition-colors">
                      Cancelar reporte
                    </button>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="text-[10px] text-slate-600 space-y-0.5">
                <p>Reportante: {evento.reportante_nombre || '—'}</p>
                <p>Creado: {formatFecha(evento.created_at)}</p>
                <p>Actualizado: {formatFecha(evento.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

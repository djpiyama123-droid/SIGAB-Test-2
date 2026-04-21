import React, { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { ClipboardList, CheckSquare, Save, Search, History } from 'lucide-react';
import toast from 'react-hot-toast';

const ChecklistPage = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [responses, setResponses] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchTemplates();
    fetchHistory();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.getChecklistTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar las plantillas de checklist');
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.getChecklistResultados();
      setHistory(data || []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el historial de compliance');
    }
  };

  const handleResponseChange = (questionIndex, value) => {
    setResponses({ ...responses, [questionIndex]: value });
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    const totalItems = selectedTemplate.items.length;
    const respondidas = Object.keys(responses).length;
    if (respondidas < totalItems) {
      toast.error(`Faltan ${totalItems - respondidas} preguntas por responder`);
      return;
    }
    setLoading(true);
    const tid = toast.loading('Certificando auditoría…');
    try {
      await api.ejecutarChecklist({
        checklist_id: selectedTemplate.id,
        resultados: responses,
        area_id: null,
        observaciones
      });
      toast.success('Checklist guardado y auditado', { id: tid });
      setSelectedTemplate(null);
      setResponses({});
      setObservaciones('');
      fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo guardar el checklist', { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-blue-500" />
          Cumplimiento NOM-016-SSA3-2012
        </h1>
        <p className="mt-1 text-slate-400">Verificación de infraestructura y equipamiento para hospitales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!selectedTemplate ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Selecciona una Plantilla Normativa</h2>
              <div className="grid grid-cols-1 gap-4">
                {templates.map(tmp => (
                  <button
                    key={tmp.id}
                    onClick={() => setSelectedTemplate(tmp)}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-blue-600/10 hover:border-blue-500 transition-all text-left"
                  >
                    <h3 className="font-bold text-white">{tmp.nombre}</h3>
                    <p className="text-sm text-slate-400 uppercase tracking-tighter">{tmp.categoria}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-blue-500/30 p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-white">{selectedTemplate.nombre}</h2>
                <button onClick={() => setSelectedTemplate(null)} className="text-slate-500 hover:text-white">Cambiar</button>
              </div>

              <div className="space-y-4">
                {selectedTemplate.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <p className="text-slate-200 mb-3">{item.pregunta}</p>
                    <div className="flex gap-4">
                      {['SI', 'NO', 'N/A'].map(val => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={responses[idx] === val}
                            onChange={() => handleResponseChange(idx, val)}
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-bold text-slate-400">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase">Observaciones Adicionales</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(responses).length < selectedTemplate.items.length}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                  loading ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <Save className="h-5 w-5" />
                Finalizar y Certificar Auditoría
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-slate-500" />
              Historial Compliance
            </h3>
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] uppercase font-bold text-blue-400">{h.checklist_nombre}</span>
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Ejecutado por: {h.usuario_nombre}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(h.fecha_ejecucion).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPage;

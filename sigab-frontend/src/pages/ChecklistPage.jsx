import React, { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { ClipboardList, CheckSquare, Save, Search, History } from 'lucide-react';
import toast from '../lib/toast';

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
        <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-emerald-500" />
          Cumplimiento NOM-016-SSA3-2012
        </h1>
        <p className="mt-1 text-[var(--content-muted)]">Verificación de infraestructura y equipamiento para hospitales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!selectedTemplate ? (
            <div className="bg-[var(--content-bg)] rounded-2xl border border-[var(--content-border)] p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-[var(--content-text)]">Selecciona una Plantilla Normativa</h2>
              <div className="grid grid-cols-1 gap-4">
                {templates.map(tmp => (
                  <button
                    key={tmp.id}
                    onClick={() => setSelectedTemplate(tmp)}
                    className="p-4 rounded-xl border border-[var(--content-border)] bg-[var(--content-surface)] hover:bg-emerald-600/10 hover:border-emerald-500 transition-all text-left"
                  >
                    <h3 className="font-bold text-[var(--content-text)]">{tmp.nombre}</h3>
                    <p className="text-sm text-[var(--content-muted)] uppercase tracking-tighter">{tmp.categoria}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--content-bg)] rounded-2xl border border-emerald-500/30 p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-[var(--content-text)]">{selectedTemplate.nombre}</h2>
                <button onClick={() => setSelectedTemplate(null)} className="text-[var(--content-muted)] hover:text-[var(--content-text)]">Cambiar</button>
              </div>

              <div className="space-y-4">
                {selectedTemplate.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[var(--content-border)] bg-[var(--content-bg)]">
                    <p className="text-[var(--content-text)] mb-3">{item.pregunta}</p>
                    <div className="flex gap-4">
                      {['SI', 'NO', 'N/A'].map(val => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={responses[idx] === val}
                            onChange={() => handleResponseChange(idx, val)}
                            className="w-4 h-4 text-emerald-600 bg-[var(--content-surface)] border-[var(--content-border)] focus:ring-emerald-500"
                          />
                          <span className="text-sm font-bold text-[var(--content-muted)]">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--content-muted)] uppercase">Observaciones Adicionales</label>
                <textarea
                  className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl p-3 text-[var(--content-text)] focus:ring-2 focus:ring-emerald-500 outline-none"
                  rows="3"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(responses).length < selectedTemplate.items.length}
                className={`w-full py-4 rounded-xl font-bold text-[var(--content-text)] flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                  loading ? 'bg-[var(--content-surface)]' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <Save className="h-5 w-5" />
                Finalizar y Certificar Auditoría
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--content-bg)] rounded-2xl border border-[var(--content-border)] p-6">
            <h3 className="text-lg font-bold text-[var(--content-text)] flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-[var(--content-muted)]" />
              Historial Compliance
            </h3>
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-[var(--content-surface)] border border-[var(--content-border)]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">{h.checklist_nombre}</span>
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-[var(--content-muted)] font-medium">Ejecutado por: {h.usuario_nombre}</p>
                  <p className="text-[10px] text-[var(--content-muted)] mt-1">{new Date(h.fecha_ejecucion).toLocaleString()}</p>
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

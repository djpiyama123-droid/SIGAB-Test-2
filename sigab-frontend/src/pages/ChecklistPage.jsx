import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckSquare, Save, Search, History } from 'lucide-react';

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
      const resp = await fetch('/api/checklists/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await resp.json();
      setTemplates(data);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      const resp = await fetch('/api/checklists/resultados', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await resp.json();
      setHistory(data);
    } catch (err) { console.error(err); }
  };

  const handleResponseChange = (questionIndex, value) => {
    setResponses({ ...responses, [questionIndex]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/checklists/ejecutar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          checklist_id: selectedTemplate.id,
          resultados: responses,
          area_id: null,
          observaciones
        })
      });
      if (resp.ok) {
        alert("Checklist guardado y auditado exitosamente.");
        setSelectedTemplate(null);
        setResponses({});
        setObservaciones('');
        fetchHistory();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-blue-500" />
          Cumplimiento NOM-016-SSA3-2012
        </h1>
        <p className="mt-1 text-gray-400">Verificación de infraestructura y equipamiento para hospitales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!selectedTemplate ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Selecciona una Plantilla Normativa</h2>
              <div className="grid grid-cols-1 gap-4">
                {templates.map(tmp => (
                  <button
                    key={tmp.id}
                    onClick={() => setSelectedTemplate(tmp)}
                    className="p-4 rounded-xl border border-gray-800 bg-gray-800/50 hover:bg-blue-600/10 hover:border-blue-500 transition-all text-left"
                  >
                    <h3 className="font-bold text-white">{tmp.nombre}</h3>
                    <p className="text-sm text-gray-400 uppercase tracking-tighter">{tmp.categoria}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-blue-500/30 p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-white">{selectedTemplate.nombre}</h2>
                <button onClick={() => setSelectedTemplate(null)} className="text-gray-500 hover:text-white">Cambiar</button>
              </div>

              <div className="space-y-4">
                {selectedTemplate.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-gray-800 bg-gray-900">
                    <p className="text-gray-200 mb-3">{item.pregunta}</p>
                    <div className="flex gap-4">
                      {['SI', 'NO', 'N/A'].map(val => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={responses[idx] === val}
                            onChange={() => handleResponseChange(idx, val)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-bold text-gray-400">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase">Observaciones Adicionales</label>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(responses).length < selectedTemplate.items.length}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                  loading ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <Save className="h-5 w-5" />
                Finalizar y Certificar Auditoría
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-gray-500" />
              Historial Compliance
            </h3>
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-gray-800/50 border border-gray-700">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] uppercase font-bold text-blue-400">{h.checklist_nombre}</span>
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">Ejecutado por: {h.usuario_nombre}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{new Date(h.fecha_ejecucion).toLocaleString()}</p>
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

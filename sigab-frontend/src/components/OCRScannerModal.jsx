import { useState, useRef } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

export default function OCRScannerModal({ onClose, onConfirm }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      await handleScan(selected);
    }
  };

  const handleScan = async (fileToScan) => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.scanOCR(fileToScan);
      if (res.ok) {
        setScanResult(res.datos.campos_identificados);
        toast.success("Análisis IA completado");
      }
    } catch (err) {
      toast.error("Hubo un error analizando la imagen");
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const aceptarDatos = () => {
    if (scanResult) {
      onConfirm(scanResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Zona VIsual - Lado Izquierdo */}
        <div className="md:w-1/2 p-6 bg-slate-950 border-r border-slate-800 flex flex-col items-center justify-center relative min-h-[300px]">
          {!preview ? (
            <div 
              className="w-full h-64 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50 transition-all text-slate-400 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</span>
              <p className="font-medium text-slate-300">Click para Escanear Hoja Físíca</p>
              <p className="text-xs mt-2">Formatos Soportados: PNG, JPG</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center group">
              <img src={preview} alt="Documento escaneado" className="max-h-[60vh] object-contain rounded opacity-80" />
              {scanning && (
                <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center border-t-2 border-b-2 border-emerald-400 animate-[scan_2s_ease-in-out_infinite]">
                  <div className="flex bg-slate-900/90 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/50 shadow-emerald-500/20 shadow-lg items-center gap-2">
                    <span className="animate-spin relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                    Analizando Motores de Red Neuronal...
                  </div>
                </div>
              )}
              <button 
                onClick={() => { setFile(null); setPreview(null); setScanResult(null); }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors text-white"
              >
                Escanear otra imagen
              </button>
            </div>
          )}
          <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>

        {/* Zona Formulario Extraido - Lado Derecho */}
        <div className="md:w-1/2 p-6 flex flex-col bg-slate-900">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">✨</span> Extracción Inteligente
              </h3>
              <p className="text-sm text-slate-500">El modelo IA detectará patrones automáticamente.</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
             {!file && !scanning && !scanResult && (
               <div className="text-center text-slate-500 py-10">
                 <div className="text-4xl mb-3">🤖</div>
                 Esperando un archivo físico para inicializar.
               </div>
             )}
             
             {scanning && (
               <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-slate-800 rounded"></div>
                  <div className="h-10 bg-slate-800 rounded"></div>
                  <div className="h-24 bg-slate-800 rounded"></div>
               </div>
             )}

             {scanResult && (
               <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Folio Extraído</label>
                  <input type="text" className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" 
                    defaultValue={scanResult.folio || ''} 
                    onChange={e => setScanResult({...scanResult, folio: e.target.value})} 
                  />
                  {!scanResult.folio && <p className="text-xs text-orange-400 mt-1">No se detectó folio automático.</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Costo ($)</label>
                  <input type="text" className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" 
                    defaultValue={scanResult.costo || ''} 
                    onChange={e => setScanResult({...scanResult, costo: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Ingeniero Reportado</label>
                  <input type="text" className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" 
                    defaultValue={scanResult.ingeniero_externo || ''} 
                    onChange={e => setScanResult({...scanResult, ingeniero_externo: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Materiales / Refacciones Encontradas</label>
                  <textarea className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none" 
                    defaultValue={scanResult.refacciones || ''} 
                    onChange={e => setScanResult({...scanResult, refacciones: e.target.value})} 
                  />
                </div>
               </>
             )}
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">Cancelar</button>
             <button 
               onClick={aceptarDatos} 
               disabled={!scanResult}
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium flex gap-2 items-center"
             >
               Confirmar Extracción
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}

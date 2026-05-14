/**
 * OCRScannerModal — Captura de Orden de Servicio IMSS via cámara nativa o archivo.
 *
 * Modos de entrada:
 *   📷 Cámara: getUserMedia({ facingMode: 'environment' }) → preview en vivo → captura.
 *   📁 Archivo: <input type=file capture=environment> (fallback mobile / desktop).
 *
 * Después de capturar, llama a `api.scanImssOS(file, false)` que ejecuta:
 *   1. Gemma 3:4b local (Ollama) con prompt SIGAB-IMSS-OS-V3.
 *   2. Si confianza < 0.6 o falla, fallback a Gemini 1.5 Flash.
 *
 * El modal renderiza TODOS los campos detectados de forma editable. Al confirmar:
 *   - onConfirm(scanResult) entrega los datos al padre (que los pre-llena en el form).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/sigab';
import toast from '../lib/toast';

// Etiquetas legibles en español para los campos extraídos por Gemma
const FIELD_LABELS = {
  numero_orden: 'Folio',
  fecha: 'Fecha',
  tipo_mantenimiento: 'Tipo de mantenimiento',
  prioridad: 'Prioridad',
  equipo_serie: 'No. de serie',
  equipo_nombre: 'Nombre equipo',
  equipo_marca: 'Marca',
  equipo_modelo: 'Modelo',
  equipo_inventario: 'Inv. IMSS',
  ubicacion_fisica: 'Localización',
  area: 'Área',
  piso: 'Piso',
  hora_inicio: 'Hora inicio',
  hora_termino: 'Hora término',
  tiempo_estimado_min: 'Tiempo estimado (min)',
  tiempo_real_min: 'Tiempo real (min)',
  descripcion_servicio: 'Descripción / Falla',
  observaciones: 'Observaciones',
  causa_raiz: 'Causa raíz',
  tecnico_nombre: 'Técnico',
  tecnico_matricula: 'Matrícula técnico',
  valida_nombre: 'Validó',
  recibe_nombre: 'Recibe conformidad',
  recibe_servicio: 'Servicio receptor',
};

// Campos textareables (multi-línea)
const LONG_FIELDS = new Set(['descripcion_servicio', 'observaciones', 'causa_raiz']);

// Campos que NO mostramos en el form de revisión (metadatos del extractor)
const HIDDEN_FIELDS = new Set([
  'engine',
  'confianza_global',
  'poka_yoke_validaciones',
  'refacciones',
  'error',
]);

export default function OCRScannerModal({ onClose, onConfirm }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'file'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [streaming, setStreaming] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Cámara: arrancar getUserMedia ───────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      console.warn('getUserMedia falló, usando fallback file input:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Permítelo en la configuración del navegador.'
          : 'No se pudo abrir la cámara. Usa el modo "Archivo" para subir una foto.'
      );
      setStreaming(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Arranca/detiene cámara cuando cambia el modo
  useEffect(() => {
    if (mode === 'camera' && !preview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, preview]);

  // ── Capturar frame del video → blob → escanear ──────────────────
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const f = new File([blob], `os_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(f);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        await handleScan(f);
      },
      'image/jpeg',
      0.9
    );
  }, [stopCamera]);

  // ── Cargar archivo desde <input type=file> ──────────────────────
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      await handleScan(selected);
    }
  };

  // ── Llamar al backend con la imagen ─────────────────────────────
  const handleScan = async (fileToScan) => {
    setScanning(true);
    setScanResult(null);
    const tid = toast.loading('Analizando con IA (Gemma 3:4b)…', { duration: 60000 });
    try {
      const res = await api.scanImssOS(fileToScan, false);
      if (res.ok && res.campos_identificados) {
        setScanResult(res.campos_identificados);
        const conf = res.campos_identificados.confianza_global;
        const engine = res.campos_identificados.engine || 'gemma';
        toast.success(
          `Análisis completado · ${engine === 'gemma' ? '🏠 local' : '☁ cloud'} · ${
            Math.round((conf || 0) * 100)
          }% confianza`,
          { id: tid }
        );
      } else {
        toast.error(res.detail || 'El análisis no devolvió datos útiles', { id: tid });
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.status === 422
          ? 'La imagen no parece ser un formato OS IMSS válido'
          : err?.response?.data?.detail || 'Error analizando la imagen';
      toast.error(msg, { id: tid });
    } finally {
      setScanning(false);
    }
  };

  const aceptarDatos = () => {
    if (scanResult) {
      onConfirm(scanResult);
      toast.success('Datos extraídos confirmados');
      onClose();
    }
  };

  const reintentar = () => {
    setFile(null);
    setPreview(null);
    setScanResult(null);
    if (mode === 'camera') startCamera();
  };

  const updateField = (key, value) => {
    setScanResult((prev) => ({ ...prev, [key]: value }));
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* ── Zona Visual (izquierda) ── */}
        <div className="md:w-1/2 p-4 bg-slate-950 border-r border-slate-800 flex flex-col">
          {/* Tabs Cámara / Archivo */}
          <div className="flex gap-1 mb-4 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => { setMode('camera'); setPreview(null); setScanResult(null); }}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                mode === 'camera' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📷 Cámara
            </button>
            <button
              onClick={() => { setMode('file'); setPreview(null); setScanResult(null); stopCamera(); }}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                mode === 'file' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📁 Archivo
            </button>
          </div>

          {/* Vista cámara o preview o file picker */}
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            {!preview && mode === 'camera' && !cameraError && (
              <div className="relative w-full">
                <video
                  ref={videoRef}
                  className="w-full max-h-[55vh] rounded-lg bg-slate-800 object-contain"
                  playsInline muted
                />
                {streaming && (
                  <button
                    onClick={captureFromCamera}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 w-16 h-16 rounded-full shadow-lg border-4 border-emerald-500 hover:scale-105 transition-transform flex items-center justify-center text-2xl"
                    aria-label="Capturar"
                  >
                    📸
                  </button>
                )}
              </div>
            )}

            {!preview && mode === 'camera' && cameraError && (
              <div className="text-center text-slate-400 p-6">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="text-sm mb-3">{cameraError}</p>
                <button
                  onClick={() => setMode('file')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
                >
                  Usar Archivo
                </button>
              </div>
            )}

            {!preview && mode === 'file' && (
              <div
                className="w-full h-64 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50 transition-all text-slate-400 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</span>
                <p className="font-medium text-slate-300">Click para seleccionar imagen</p>
                <p className="text-xs mt-2">PNG · JPG · WEBP — máx 15 MB</p>
              </div>
            )}

            {preview && (
              <div className="relative w-full flex flex-col items-center">
                <img
                  src={preview}
                  alt="Captura"
                  className="max-h-[55vh] object-contain rounded opacity-90"
                />
                {scanning && (
                  <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center border-t-2 border-b-2 border-emerald-400 animate-[scan_2s_ease-in-out_infinite]">
                    <div className="flex bg-slate-900/90 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/50 shadow-emerald-500/20 shadow-lg items-center gap-2">
                      <span className="animate-spin relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      Analizando con Gemma 3:4b…
                    </div>
                  </div>
                )}
                <button
                  onClick={reintentar}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors text-white"
                >
                  ↺ Capturar otra
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* ── Zona Formulario Extraído (derecha) ── */}
        <div className="md:w-1/2 p-4 flex flex-col bg-slate-900 overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">✨</span> Extracción IMSS · v3
              </h3>
              <p className="text-xs text-slate-500">Gemma 3:4b local · Gemini fallback · SIGAB-IMSS-OS-V3</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {!file && !scanning && !scanResult && (
              <div className="text-center text-slate-500 py-12">
                <div className="text-5xl mb-3">🤖</div>
                <p className="font-medium text-slate-400">Esperando captura…</p>
                <p className="text-xs mt-2">
                  Asegúrate que la hoja esté bien iluminada y el banner <code className="text-emerald-400">SIGAB-IMSS-OS-V3</code> sea visible.
                </p>
              </div>
            )}

            {scanning && (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-9 bg-slate-800 rounded"></div>
                ))}
              </div>
            )}

            {scanResult && (
              <>
                {/* Banner de motor + confianza */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 mb-2">
                  <span className="text-xs text-slate-400">
                    Motor: <span className="text-emerald-400 font-mono">{scanResult.engine || 'gemma'}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    Confianza:{' '}
                    <span
                      className={`font-mono font-semibold ${
                        (scanResult.confianza_global || 0) >= 0.7
                          ? 'text-emerald-400'
                          : (scanResult.confianza_global || 0) >= 0.5
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {Math.round((scanResult.confianza_global || 0) * 100)}%
                    </span>
                  </span>
                </div>

                {/* Render dinámico de TODOS los campos extraídos */}
                {Object.entries(scanResult)
                  .filter(([k]) => !HIDDEN_FIELDS.has(k))
                  .map(([key, val]) => {
                    const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
                    const isLong = LONG_FIELDS.has(key);
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
                          {label}
                        </label>
                        {isLong ? (
                          <textarea
                            value={val || ''}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 h-20 resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val ?? ''}
                            onChange={(e) => updateField(key, e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 ${
                              val ? 'border-emerald-500/30 text-emerald-300' : 'border-slate-700 text-slate-400'
                            }`}
                          />
                        )}
                        {val == null && (
                          <p className="text-[10px] text-amber-400 mt-0.5">⚠ No detectado — completar manualmente</p>
                        )}
                      </div>
                    );
                  })}

                {/* Refacciones extraídas (si las hay) */}
                {Array.isArray(scanResult.refacciones) && scanResult.refacciones.length > 0 && (
                  <div className="border-t border-slate-800 pt-2">
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                      Refacciones detectadas ({scanResult.refacciones.length})
                    </label>
                    <ul className="space-y-1 text-xs">
                      {scanResult.refacciones.map((r, i) => (
                        <li key={i} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                          {r.cantidad}× {r.descripcion} {r.folio ? `(${r.folio})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 mt-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={aceptarDatos}
              disabled={!scanResult}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium flex gap-2 items-center text-sm"
            >
              ✓ Confirmar y pre-llenar OS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

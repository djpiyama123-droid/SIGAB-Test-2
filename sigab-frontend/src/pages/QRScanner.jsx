import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // trasera por defecto
  const [manualInput, setManualInput] = useState('');

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const handleResult = useCallback((text) => {
    stopCamera();
    setSuccess(text);
    try { navigator.vibrate?.(200); } catch (_) {}

    // Si es URL completa que contiene /equipo/ → extraer token y navegar
    if (text.includes('/equipo/')) {
      const token = text.split('/equipo/').pop().split('?')[0].split('#')[0];
      setTimeout(() => navigate(`/equipo/${token}`), 600);
      return;
    }
    // Si parece un token (alfanumérico 12-20 chars) → navegar directo
    if (/^[a-zA-Z0-9_-]{8,32}$/.test(text.trim())) {
      setTimeout(() => navigate(`/equipo/${text.trim()}`), 600);
      return;
    }
    // Es una URL externa completa → seguirla
    if (text.startsWith('http')) {
      setTimeout(() => { window.location.href = text; }, 600);
    }
  }, [navigate, stopCamera]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      handleResult(code.data);
      return;
    }
    animRef.current = requestAnimationFrame(scanFrame);
  }, [handleResult]);

  const startCamera = useCallback(async (mode = facingMode) => {
    setError(null);
    setSuccess(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      animRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Actívalo en la configuración de tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró cámara en este dispositivo.');
      } else {
        setError(`Error de cámara: ${err.message}`);
      }
    }
  }, [facingMode, scanFrame]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []); // eslint-disable-line

  const toggleCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    stopCamera();
    setTimeout(() => startCamera(next), 300);
  };

  const handleManual = (e) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    handleResult(val);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => { stopCamera(); navigate(-1); }}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-white font-semibold text-base">Escanear QR de Equipo</h1>
          <p className="text-slate-500 text-xs">Sistema SIGAB — HGR No.1 IMSS</p>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-4 gap-5">

        {/* Cámara */}
        <div className="relative w-full max-w-sm">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* Canvas oculto para procesamiento */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay de esquinas */}
            {scanning && !success && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Oscurecer bordes */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Zona de escaneo central */}
                <div className="absolute inset-[20%] rounded-xl">
                  {/* Esquinas animadas */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  {/* Línea de escaneo animada */}
                  <div className="absolute left-2 right-2 h-0.5 bg-emerald-400/70 animate-scan-line top-1/2" />
                </div>
              </div>
            )}

            {/* Estado de éxito */}
            {success && (
              <div className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-sm">QR detectado</p>
                <p className="text-emerald-300 text-xs">Redirigiendo...</p>
              </div>
            )}

            {/* Error de cámara */}
            {error && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-3 p-6">
                <div className="w-14 h-14 rounded-full bg-red-900/50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm text-center">{error}</p>
                <button onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                  Reintentar
                </button>
              </div>
            )}
          </div>

          {/* Botón cambiar cámara */}
          {scanning && (
            <button
              onClick={toggleCamera}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              title="Cambiar cámara"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        {/* Instrucción */}
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Apunta la cámara al código QR pegado en el equipo biomédico.
          El sistema cargará su ficha técnica automáticamente.
        </p>

        {/* Separador */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-600 text-xs">o ingresa manualmente</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Input manual */}
        <form onSubmit={handleManual} className="flex gap-2 w-full max-w-sm">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Token o URL del equipo..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-600 placeholder-slate-600"
          />
          <button type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
            Ver
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center max-w-xs pb-6">
          Requiere HTTPS o localhost para acceso a cámara en navegadores modernos.
        </p>
      </div>

      {/* Animación de línea de escaneo */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

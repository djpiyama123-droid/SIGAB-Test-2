import { useState } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

const BACKEND_URL = 'http://localhost:8000';

export default function QRPanel({ equipo, onClose }) {
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);

  const handleGenerarQR = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_URL}/api/equipos/${equipo.id}/qr`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setQrUrl(objectUrl);
    } catch (err) {
      toast.error('Error al generar QR');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarEtiqueta = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_URL}/api/equipos/${equipo.id}/qr/label`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      toast.success('Etiqueta A6 generada');
    } catch (err) {
      toast.error('Error al generar etiqueta');
      console.error(err);
    }
  };

  const handleCopiarURL = () => {
    const publicUrl = `${window.location.origin}/equipo/${equipo.qr_token}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada al portapapeles');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
          <div>
            <h2 className="text-sm font-bold text-white">Código QR</h2>
            <p className="text-xs text-slate-500">{equipo.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* QR Preview */}
          <div className="bg-white rounded-xl p-4 flex items-center justify-center min-h-[200px]">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="max-w-full w-48 h-48 object-contain" />
            ) : (
              <div className="text-center space-y-3">
                <div className="text-6xl opacity-30">📱</div>
                <p className="text-slate-600 text-sm">Genera el QR para este equipo</p>
              </div>
            )}
          </div>

          {/* Token info */}
          {equipo.qr_token && (
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Token QR</span>
                <button
                  onClick={handleCopiarURL}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Copiar URL pública
                </button>
              </div>
              <p className="text-sm font-mono text-slate-300 break-all">
                {equipo.qr_token}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                URL: {window.location.origin}/equipo/{equipo.qr_token}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerarQR}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : '📱'}
              {loading ? 'Generando...' : qrUrl ? 'Regenerar QR' : 'Generar QR'}
            </button>
            <button
              onClick={handleDescargarEtiqueta}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              🏷️ Etiqueta A6
            </button>
          </div>

          {/* Download QR */}
          {qrUrl && (
            <a
              href={qrUrl}
              download={`qr_${equipo.serie || equipo.id}.png`}
              className="block w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors text-center"
            >
              ⬇ Descargar QR PNG
            </a>
          )}
        </div>

        {/* Footer tip */}
        <div className="bg-slate-900/50 border-t border-slate-700 px-4 py-3">
          <p className="text-[10px] text-slate-600 text-center leading-relaxed">
            Al escanear el QR, cualquier persona puede ver la ficha pública del equipo
            sin necesidad de iniciar sesión. Ideal para impresión de etiquetas y auditorías.
          </p>
        </div>
      </div>
    </div>
  );
}

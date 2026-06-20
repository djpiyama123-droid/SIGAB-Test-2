import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, ShieldCheck, QrCode, ClipboardList, PenTool } from 'lucide-react';
import { useToast } from './Toast';

const TripleValidationModal = ({ isOpen, onClose, onValidated }) => {
  const toast = useToast();
  const [data, setData] = useState({ qr_token: '', inventario: '', serie: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleValidate = async () => {
    setLoading(true);
    setResult(null);
    const tid = toast.loading('Validando triple coincidencia…');
    try {
      const resp = await fetch('/api/equipos/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      const res = await resp.json();
      setResult(res);
      if (res.ok) {
        toast.success(`Equipo ${res.equipo?.nombre || ''} validado`, { id: tid });
        if (onValidated) onValidated(res.equipo);
      } else {
        toast.error(res.detail || 'Inconsistencia detectada', { id: tid });
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo validar — revise la conexión', { id: tid });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[var(--content-bg)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-white/10 p-2 backdrop-blur-md">
              <img 
                src="/imss_logo.png" 
                alt="IMSS" 
                className="h-10 w-auto brightness-200"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Poka-Yoke: Triple Validación</h2>
              <p className="text-sm text-emerald-100 italic">Validación obligatoria de integridad del activo</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-5">
            {/* Input QR */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--content-muted)]">
                <QrCode className="h-4 w-4" /> 1. Token QR del Equipo
              </label>
              <input
                type="text"
                placeholder="Escanee o ingrese token..."
                className="w-full rounded-xl border-2 border-[var(--content-border)] bg-[var(--content-surface)] p-4 text-[var(--content-text)] transition-all focus:border-emerald-500 focus:outline-none"
                value={data.qr_token}
                onChange={(e) => setData({ ...data, qr_token: e.target.value })}
              />
            </div>

            {/* Input Inventario */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--content-muted)]">
                <ClipboardList className="h-4 w-4" /> 2. Inventario Institucional
              </label>
              <input
                type="text"
                placeholder="Número de inventario..."
                className="w-full rounded-xl border-2 border-[var(--content-border)] bg-[var(--content-surface)] p-4 text-[var(--content-text)] transition-all focus:border-emerald-500 focus:outline-none"
                value={data.inventario}
                onChange={(e) => setData({ ...data, inventario: e.target.value })}
              />
            </div>

            {/* Input Serie */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--content-muted)]">
                <PenTool className="h-4 w-4" /> 3. Número de Serie (Fabricante)
              </label>
              <input
                type="text"
                placeholder="S/N del fabricante..."
                className="w-full rounded-xl border-2 border-[var(--content-border)] bg-[var(--content-surface)] p-4 text-[var(--content-text)] transition-all focus:border-emerald-500 focus:outline-none"
                value={data.serie}
                onChange={(e) => setData({ ...data, serie: e.target.value })}
              />
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className={`mt-6 rounded-xl border-2 p-4 animate-in fade-in slide-in-from-top-4 duration-300 ${
              result.ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
            }`}>
              <div className="flex items-start gap-3">
                {result.ok ? (
                  <CheckCircle className="mt-1 h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="mt-1 h-5 w-5 text-red-600" />
                )}
                <div>
                  <h4 className={`font-bold ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.ok ? 'Validación Exitosa' : 'Inconsistencia Detectada'}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--content-muted)]">
                    {result.ok 
                      ? `Equipo: ${result.equipo.nombre} (${result.equipo.serie})`
                      : result.detail
                    }
                  </p>
                  {!result.ok && result.matches && (
                    <div className="mt-2 flex gap-4 text-xs font-medium uppercase tracking-wider">
                      <span className={result.matches.inventario ? 'text-emerald-600' : 'text-red-600'}>
                        {result.matches.inventario ? '✓ Inventario Ok' : '✗ Inventario Mal'}
                      </span>
                      <span className={result.matches.serie ? 'text-emerald-600' : 'text-red-600'}>
                        {result.matches.serie ? '✓ Serie Ok' : '✗ Serie Mal'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-[var(--content-surface)] p-4 font-bold text-[var(--content-muted)] transition-colors hover:bg-[var(--content-border)]"
            >
              Cancelar
            </button>
            <button
              onClick={handleValidate}
              disabled={loading || !data.qr_token || !data.inventario || !data.serie}
              className={`flex-[2] flex items-center justify-center gap-2 rounded-xl p-4 font-bold shadow-lg transition-transform active:scale-95 ${
                loading ? 'bg-[var(--content-surface)] text-[var(--content-muted)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--content-border)] border-t-[var(--content-muted)]" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Validar Triple Coincidencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripleValidationModal;

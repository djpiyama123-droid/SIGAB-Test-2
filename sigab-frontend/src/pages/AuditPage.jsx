import React, { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { ShieldCheck, RefreshCw, FileText, Verified, ShieldAlert } from 'lucide-react';
import toast from '../lib/toast';

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLogs();
      setLogs(data.logs || data.eventos || []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la bitácora de auditoría');
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    const tid = toast.loading('Verificando integridad de la cadena SHA-256…');
    try {
      const data = await api.verificarCadena();
      setVerification(data);
      if (data.integridad_ok || data.valida) {
        toast.success(`Cadena íntegra (${data.total_registros} registros)`, { id: tid });
      } else {
        toast.error(data.mensaje || 'Integridad comprometida', { id: tid });
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo verificar la cadena', { id: tid });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarBitacora = async () => {
    const tid = toast.loading('Generando bitácora PDF…');
    try {
      const blob = await api.descargarBitacoraPdf();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Bitácora generada', { id: tid });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar la bitácora PDF', { id: tid });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            Auditoría NOM-016 Compliance
          </h1>
          <p className="mt-1 text-slate-400">Log inalterable con hashing encadenado SHA-256 según normativa NOM-016-SSA3-2012.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleVerify}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95 ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verificar Cadena de Bloques
          </button>
          <button
            onClick={handleGenerarBitacora}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700">
            <FileText className="h-4 w-4" />
            Generar Bitácora PDF
          </button>
        </div>
      </div>

      {/* Verification Alert */}
      {verification && (
        <div className={`flex items-center gap-3 rounded-2xl border-2 p-4 animate-in zoom-in duration-300 ${
          verification.integridad_ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-red-500/30 bg-red-500/5 text-red-400'
        }`}>
          {verification.integridad_ok ? <Verified className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
          <div>
            <p className="font-bold">{verification.mensaje}</p>
            <p className="text-sm opacity-80">Total de registros verificados: {verification.total_registros}</p>
          </div>
        </div>
      )}

      {/* Audit Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
        <table className="w-full text-left">
          <thead className="border-b border-slate-800 bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Acción</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Entidad</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Hash Registro (SHA-256)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-slate-800/30">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-white">{log.usuario_nombre || 'SISTEMA'}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-tight ${
                    log.accion === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400' :
                    log.accion === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                    log.accion === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {log.accion}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  <span className="font-bold text-slate-300">{log.entidad}</span> #{log.entidad_id}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="font-mono text-[10px] text-slate-500 truncate w-32" title={log.hash_registro}>
                      {log.hash_registro}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditPage;

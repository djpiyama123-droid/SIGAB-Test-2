import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { ShieldCheck, Calendar, AlertCircle, Plus, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Metrologia() {
  const [calibraciones, setCalibraciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getMetrologia();
      setCalibraciones(data.calibraciones || data || []);
    } catch (err) {
      toast.error('Error al cargar metrología');
    } finally {
      setLoading(false);
    }
  };

  const proximos = calibraciones.filter(c => {
     const diff = new Date(c.proxima_calibracion) - new Date();
     return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000); // 30 dias
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            Metrología y Calibración
          </h1>
          <p className="text-slate-400 mt-1">Control de exactitud y certificados de instrumentos de medición.</p>
        </div>
        <button
          onClick={() => toast('Registro de nueva calibración — disponible en la próxima fase del módulo', { icon: 'ℹ️' })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Nueva Calibración
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm">Equipos Calibrados</p>
          <p className="text-3xl font-bold text-white mt-2">{calibraciones.length}</p>
        </div>
        <div className="bg-orange-900/10 border border-orange-900/50 p-6 rounded-2xl">
          <p className="text-orange-400/80 text-sm">Próximos a Vencer (30d)</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">{proximos.length}</p>
        </div>
        <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-2xl">
          <p className="text-red-400/80 text-sm">Vencidos/Fuera de Norma</p>
          <p className="text-3xl font-bold text-red-500 mt-2">
            {calibraciones.filter(c => new Date(c.proxima_calibracion) <= new Date()).length}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Equipo / Serie</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Magnitud/Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Última</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Próxima</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Certificado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {calibraciones.map((c) => {
              const isPast = new Date(c.proxima_calibracion) <= new Date();
              return (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{c.equipo_nombre}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{c.equipo_serie}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{c.tipo_medicion}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{c.fecha_calibracion}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${isPast ? 'text-red-500' : 'text-emerald-500'}`}>
                    {c.proxima_calibracion}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                      isPast ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    }`}>
                      {isPast ? 'REEMPLAZAR/CALIBRAR' : 'VIGENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        if (c.certificado_url) {
                          window.open(c.certificado_url, '_blank');
                        } else {
                          toast('Certificado aún no cargado para este equipo', { icon: '📄' });
                        }
                      }}
                      title={c.certificado_url ? 'Abrir certificado' : 'Sin certificado'}
                      className="text-blue-400 hover:text-blue-300 shadow-sm">
                      <FileText className="h-5 w-5 ml-auto" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { Users, GraduationCap, Calendar, Plus, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Capacitaciones() {
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getCapacitaciones();
      setCapacitaciones(data.capacitaciones || data || []);
    } catch (err) {
      toast.error('Error al cargar capacitaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-emerald-500" />
            Capacitación de Personal
          </h1>
          <p className="text-slate-400 mt-1">Cumplimiento NOM-016: Registro de formación en uso y seguridad de equipos.</p>
        </div>
        <button
          onClick={() => toast('Captura de nuevo registro — disponible en la próxima fase del módulo', { icon: 'ℹ️' })}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capacitaciones.map((item) => (
          <div
            key={item.id}
            onClick={() => toast(`Evidencia de "${item.tema}" — detalle disponible en la próxima fase`, { icon: '📂' })}
            className="bg-slate-800/40 border border-slate-700 hover:border-emerald-500/50 transition-all p-6 rounded-3xl group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">
                {item.fecha_capacitacion}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
              {item.tema}
            </h3>
            <p className="text-sm text-slate-400 mb-4">{item.equipo_nombre} ({item.equipo_serie})</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Instructor: <span className="text-white font-medium">{item.instructor || 'Por definir'}</span></span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Evidencia Digital</span>
                <ChevronRight className="h-4 w-4 text-emerald-500 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
        {capacitaciones.length === 0 && (
           <div className="col-span-full py-20 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl">
              <GraduationCap className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No hay registros de capacitación aún.</p>
           </div>
        )}
      </div>
    </div>
  );
}
